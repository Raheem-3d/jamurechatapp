import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emitToUser, getSocketIO } from "@/lib/socket-server";
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis";
import { produceKafkaEvent } from "@/lib/kafka";
import { runAutomationEngine } from "@/lib/automation-engine";
import {
  Task,
  AutomationRule,
  User,
  Tag,
  TaskStatus,
  Stage,
} from "@prisma/client";
import { id } from "date-fns/locale";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { subDays, subHours, addMinutes } from "date-fns";

// ========== Type Definitions ==========
type Operator =
  | "equals"
  | "not_equals"
  | "contains"
  | "changed"
  | "before"
  | "after";

interface Condition {
  field: string;
  operator: Operator;
  value: any;
}

interface Action {
  type:
    | "move_stage"
    | "assign_user"
    | "set_due_date"
    | "add_tag"
    | "remove_tag"
    | "send_notification"
    | "change_status"
    | "set_priority"
    | "create_subtask"
    | "archive_task"
    | "log_message"
    | "set_custom_field";
  value: any;
  metadata?: Record<string, any>;
}

type TriggerType =
  | "status_change"
  | "stage_change"
  | "priority_change"
  | "due_date_approaching"
  | "due_date_passed"
  | "task_created"
  | "task_assigned"
  | "tag_added"
  | "comment_added"
  | "file_uploaded"
  | "specific_task"
  | "time_based"
  | "completion_percentage";

interface TaskWithRelations extends Task {
  tags?: Tag[];
  assignee?: User | null;
  stage?: Stage | null;
  previousValues?: Partial<Task>;
}

interface AutomationContext {
  previousTask: Partial<TaskWithRelations>;
  currentTask: Partial<TaskWithRelations>;
  changes: Record<string, any>;
  userId: string;
}

interface Notification {
  type: string;
  userId: string;
  content: string;
  metadata?: Record<string, any>;
}

// ========== Helper Functions ==========
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data),
  error: (message: string, error?: any) =>
    console.error(`[ERROR] ${message}`, error),
  debug: (message: string, data?: any) =>
    process.env.NODE_ENV === "development" &&
    console.debug(`[DEBUG] ${message}`, data),
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } },
) {
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as any)?.id as string | undefined;
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  const {
    title,
    description,
    dueDate,
    startDate,
    endDate,
    stageId,
    priority,
    isComplete,
    assigneeId,
    status,
    tags = [],
  } = await request.json();

  let finalDeadline: Date | null = null;
  let deadlineStart: Date | null = null;
  let deadlineEnd: Date | null = null;

  if (startDate && dueDate) {
    const from = new Date(startDate);
    const to = new Date(dueDate);
    deadlineStart = from;
    deadlineEnd = to;
    finalDeadline = to; // keep existing sorting/logic using deadline as the end of range
  } else if (dueDate) {
    const d = new Date(dueDate);
    deadlineStart = d;
    deadlineEnd = d;
    finalDeadline = d;
  }

  // 2️⃣ Normalize tags to string names
  const normalizedTagNames = tags.map((tag: any) =>
    typeof tag === "string" ? tag : tag.name,
  );

  // 3️⃣ Fetch existing tags
  const existingTags = await db.tag.findMany({
    where: { name: { in: normalizedTagNames } },
  });
  const existingTagNames = new Set(
    existingTags.map((t: any) => t.name as string),
  );

  // 4️⃣ Create any missing tags
  const newTagNames = normalizedTagNames.filter(
    (name: string) => !existingTagNames.has(name),
  );
  if (newTagNames.length > 0) {
    await db.tag.createMany({
      data: newTagNames.map((name: string) => ({ name })),
      skipDuplicates: true,
    });
  }

  // 5️⃣ Fetch all tags again (so we have IDs for connect)
  const allTags = await db.tag.findMany({
    where: { name: { in: normalizedTagNames } },
  });

  const assigneeIds = Array.isArray(assigneeId) ? assigneeId : [assigneeId];

  const newTask = await db.record.create({
    data: {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdBy: sessionUserId,
      parentTaskId: taskId,
      priority,
      isComplete,
      status,
      stageId,
      tags: {
        connect: allTags.map((tag: any) => ({ id: tag.id as string })),
      },
      // assignees: {
      //   connectOrCreate: assigneeIds.map((id) => ({
      //     where: { taskId_userId: { taskId, userId: id } },
      //     create: { taskId, userId: id },
      //   })),
      // },
        assignees: {
      create: assigneeIds.map((userId: string) => ({  // ✅ create, connectOrCreate nahi
        userId,
        taskId,  // parent taskId (foreign key requirement ke liye)
      })),
    },
    },
    include: {
      tags: true,
      assignees: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  // const notification = await db.notification.createMany({
  //   data: {
  //     type: "TASK_ASSIGNED",
  //     content: `You have been assigned to task: ${newTask.title}`,
  //     userId: assigneeId.toString(),
  //     taskId: newTask.id,
  //   },
  // });

   const notification = await db.notification.createMany({
        data: assigneeIds.map((userId: string) => ({
          type: "TASK_ASSIGNED",
          content: `You have been assigned to task: ${newTask.title}`,
          userId: userId,
          taskId: newTask.id,
        })),
      });

  // Emit via socket
  const notificationEmitted = emitToUser(
    assigneeId,
    "new-notification",
    notification,
  );


  // 📡 Emit task-assigned event so user's sidebar refreshes immediately
  emitToUser(assigneeId, "task:assigned", {
    taskId: newTask.id,
    taskTitle: newTask.title,
    taskPriority: newTask.priority,
  });
 

  // 7️⃣ Log activity
  await db.taskActivity.create({
    data: {
      taskId: taskId,
      userId: sessionUserId,
      type: "task_created",
      description: `Task "${newTask.title}" was created.`,
    },
  });

  if (finalDeadline) {
    await createAutomaticTaskReminders(
      taskId,
      newTask.title,
      new Date(finalDeadline),
      newTask.assignees.map((a: any) => a.userId),
    );
  }

  // 8️⃣ Run automation engine
  await runAutomationEngine({
    previousTask: {},
    currentTask: newTask,
    changes: { isNew: true },
    userId: sessionUserId,
  });

  // Invalidate Redis cache for this task workspace
  await cacheDel(`tasks:records:${taskId}`);

  // Fetch fresh task data after automation rules have executed
  const finalCreatedTask = await db.record.findUnique({
    where: { id: newTask.id },
    include: {
      stage: true,
      tags: true,
      assignees: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  const resultCreatedTask = finalCreatedTask || newTask;

  const socketIO = getSocketIO();
  if (socketIO) {
    socketIO.emit("task:created", resultCreatedTask);
  }

  // 📡 Produce asynchronous Kafka audit event (non-blocking)
  produceKafkaEvent("task-activity-events", {
    type: "task_created",
    taskId: resultCreatedTask.id,
    title: resultCreatedTask.title,
    userId: sessionUserId,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ task: resultCreatedTask }, { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } },
) {
  const { taskId } = await params;
  const cacheKey = `tasks:records:${taskId}`;

  try {
    // ⚡ Try fetching from Redis cache first
    const cachedRecords = await cacheGet(cacheKey);
    if (cachedRecords) {
      return NextResponse.json({ records: cachedRecords }, { status: 200 });
    }

    const records = await db.record.findMany({
      where: {
        parentTaskId: taskId,
      },
      include: {
        tags: true,
        assignees: true,
        createdByUser: true,
      },
    });

    // ⚡ Store in Redis cache with 5-minute TTL
    await cacheSet(cacheKey, records, 300);

    return NextResponse.json({ records }, { status: 200 });
  } catch (error) {
    console.error("Error fetching records:", error);
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 },
    );
  }
}

// export async function PATCH(
//   request: NextRequest,
//   { params }: { params: Promise<{ taskId: string }> },
// ) {
//   const session = await getServerSession(authOptions);
//   const sessionUserId = (session?.user as any)?.id as string | undefined;
//   if (!sessionUserId) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   const { taskId } = await params; // Await params first
//   const body = await request.json();





//   // Get current task with relationships
//   const currentTask = await db.record.findUnique({
//     where: { id: body.id },
//     include: {
//       stage: true,
//       tags: true,
//       assignees: true,
//     },
//   });

//   if (!currentTask) {
//     return NextResponse.json({ error: "Task not found" }, { status: 404 });
//   }



//   // Extract assignee user IDs from the request body (now from assignees array)
//   const assigneeUserIds = Array.isArray(body.assignees)
//     ? body.assignees.map((a: any) => a?.userId || a).filter(Boolean)
//     : [];



//   // Prepare update data
//   const updateData: any = {
//     title: body.title,
//     description: body.description,
//     priority: body.priority,
//     status: body.status,
//     parentTaskId: body.parentTaskId,
//     stageId: body.stageId,
//     isComplete: body.isComplete,
//     updatedAt: new Date(),
//   };

//   // Only update dates if provided, otherwise leave unchanged
//   if (body.dueDate !== undefined) {
//     updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
//   }
//   if (body.startDate !== undefined) {
//     updateData.startDate = body.startDate ? new Date(body.startDate) : null;
//   }
//   if (body.endDate !== undefined) {
//     updateData.endDate = body.endDate ? new Date(body.endDate) : null;
//   }

//   // Handle assignees - Use TaskAssignment model
//   if (body.assignees !== undefined) {
//     try {
//       // Delete all existing task assignments for this record
//       await db.taskAssignment.deleteMany({
//         where: { recordId: body.id },
//       });

//       // Create new task assignments
//       if (assigneeUserIds.length > 0) {
//         const newAssignments = await db.taskAssignment.createMany({
//           data: assigneeUserIds.map((userId: string) => ({
//             userId: userId,
//             recordId: body.id,
//             taskId: taskId,
//           })),
//           skipDuplicates: true,
//         });


//       }
//     } catch (assigneeError: any) {
//       console.error("Error handling task assignments:", assigneeError);
//       return NextResponse.json(
//         {
//           error: "Failed to update assignees",
//           details: assigneeError?.message,
//         },
//         { status: 500 },
//       );
//     }
//   }

//   // Handle tags if provided (support strings, {id}, {name}; fix names passed as ids)
//   if (Array.isArray(body.tags)) {
//     // Normalize incoming shapes
//     const raw = body.tags as any[];
//     const providedIds: string[] = raw
//       .map((t) => (typeof t === "string" ? undefined : t?.id))
//       .filter((v): v is string => Boolean(v));
//     const providedNames: string[] = raw
//       .map((t) => (typeof t === "string" ? (t as string) : t?.name))
//       .filter((v): v is string => Boolean(v));

//     // Some UIs send names inside id; detect ids that don't exist and treat them as names
//     const uniqueProvidedIds = Array.from(new Set(providedIds));
//     const foundById = uniqueProvidedIds.length
//       ? await db.tag.findMany({ where: { id: { in: uniqueProvidedIds } } })
//       : [];
//     const foundIdSet = new Set(foundById.map((t: any) => t.id as string));
//     const idsThatDontExistAsId = uniqueProvidedIds.filter(
//       (id) => !foundIdSet.has(id),
//     );
//     const allNames = Array.from(
//       new Set([...providedNames, ...idsThatDontExistAsId]),
//     );

//     // Ensure all names exist by creating missing ones
//     if (allNames.length > 0) {
//       const existingByName = await db.tag.findMany({
//         where: { name: { in: allNames } },
//       });
//       const existingNameSet = new Set(
//         existingByName.map((t: any) => (t.name as string).toLowerCase()),
//       );
//       const namesToCreate = allNames.filter(
//         (n) => !existingNameSet.has(n.toLowerCase()),
//       );
//       if (namesToCreate.length > 0) {
//         await db.tag.createMany({
//           data: namesToCreate.map((name) => ({ name })),
//           skipDuplicates: true,
//         });
//       }
//     }

//     // Collect final IDs: valid ids + ids from names
//     const byNames = allNames.length
//       ? await db.tag.findMany({ where: { name: { in: allNames } } })
//       : [];
//     const finalIds = new Set<string>();
//     foundById.forEach((t: any) => finalIds.add(t.id as string));
//     byNames.forEach((t: any) => finalIds.add(t.id as string));

//     updateData.tags = {
//       set: Array.from(finalIds).map((id) => ({ id })),
//     };
//   }

//   console.log(
//     "Update data (without assignees):",
//     JSON.stringify(updateData, null, 2),
//   );

//   const isStageTransition =
//     body.stageId && body.stageId !== currentTask.stageId;
//   const newStage = isStageTransition
//     ? await db.stage.findUnique({ where: { id: body.stageId } })
//     : null;

//   if (isStageTransition && newStage) {
//     updateData.isComplete = body.isComplete ?? newStage.isCompleted;

//     if (newStage.isCompleted && !currentTask.completedAt) {
//       updateData.completedAt = new Date();
//     } else if (currentTask.stage?.isCompleted && !newStage.isCompleted) {
//       updateData.completedAt = null;
//     }

//     // Ensure status is 'in_progress' when task is marked incomplete
//     if (updateData.isComplete === false) {
//       updateData.status = "in_progress";
//     }
//   }

//   try {
//     // Update the task (without assignees in updateData)
//     const updatedTask = await db.record.update({
//       where: { id: body.id },
//       data: updateData,
//       include: {
//         stage: true,
//         tags: true,
//         assignees: true, // This will now include the newly created assignees
//       },
//     });



//     const notification = await db.notification.createMany({
//       data: updatedTask.assignees.map((userId: string) => ({
//         type: "TASK_ASSIGNED",
//         content: `You have been assigned to task: ${updatedTask.title}`,
//         userId,
//         taskId: updatedTask.id,
//       })),
//     });

//     // Emit via socket
//     const notificationEmitted = emitToUser(
//       updatedTask.assignees,
//       "new-notification",
//       notification,
//     );


//     // 📡 Emit task-assigned event so user's sidebar refreshes immediately
//     emitToUser(updatedTask.assignees, "task:assigned", {
//       taskId: updatedTask.id,
//       taskTitle: updatedTask.title,
//       taskPriority: updatedTask.priority,
//     });


//     // Create activity log
//     await db.taskActivity.create({
//       data: {
//         taskId,
//         userId: sessionUserId,
//         type: isStageTransition ? "stage_changed" : "task_updated",
//         description: isStageTransition
//           ? `Task moved from ${currentTask.stage?.name} to ${newStage?.name}`
//           : "Task details updated",
//       },
//     });

//     // Check automation rules
//     await checkAutomationRules({
//       previousTask: currentTask,
//       currentTask: updatedTask,
//       changes: body,
//       userId: sessionUserId,
//     });

//     // ✅ Emit real-time update via socket.io
//     const socketIO = getSocketIO();
//     if (socketIO) {
//       // Emit to all users in the project/task room
//       socketIO.emit("task:updated", {
//         taskId: updatedTask.id,
//         parentTaskId: taskId,
//         task: updatedTask,
//         updatedBy: sessionUserId,
//         timestamp: new Date().toISOString(),
//       });
//       
//     }

//     return NextResponse.json({ task: updatedTask }, { status: 200 });
//   } catch (error) {
//     console.error("Error updating task:", error);
//     return NextResponse.json(
//       {
//         error: "Failed to update task",
//         details: (error as any)?.message,
//       },
//       { status: 500 },
//     );
//   }
// }



export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as any)?.id as string | undefined;
  if (!sessionUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;
  let body: any = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }



  // Get current task with relationships
  const currentTask = await db.record.findUnique({
    where: { id: body.id },
    include: {
      stage: true,
      tags: true,
      assignees: true,
    },
  });

  if (!currentTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }



  // Extract assignee user IDs from the request body
  const assigneeUserIds = Array.isArray(body.assignees)
    ? body.assignees.map((a: any) => a?.userId || a).filter(Boolean)
    : [];



  const statusStr = (body.status || "").toUpperCase();
  const isStatusCompleted = ["COMPLETED", "DONE", "FINISHED"].includes(statusStr);
  const finalIsComplete = body.isComplete !== undefined ? body.isComplete : isStatusCompleted;

  // Prepare update data
  const updateData: any = {
    title: body.title,
    description: body.description,
    priority: body.priority,
    status: body.status,
    parentTaskId: body.parentTaskId,
    stageId: body.stageId,
    isComplete: finalIsComplete || isStatusCompleted,
    updatedAt: new Date(),
  };

  // Only update dates if provided, otherwise leave unchanged
  if (body.dueDate !== undefined) {
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
  if (body.startDate !== undefined) {
    updateData.startDate = body.startDate ? new Date(body.startDate) : null;
  }
  if (body.endDate !== undefined) {
    updateData.endDate = body.endDate ? new Date(body.endDate) : null;
  }

  // Handle assignees - Use TaskAssignment model
  if (body.assignees !== undefined) {
    try {
      // Delete all existing task assignments for this record
      await db.taskAssignment.deleteMany({
        where: { recordId: body.id },
      });

      // Create new task assignments
      if (assigneeUserIds.length > 0) {
        const newAssignments = await db.taskAssignment.createMany({
          data: assigneeUserIds.map((userId: string) => ({
            userId: userId,
            recordId: body.id,
            taskId: taskId,
          })),
          skipDuplicates: true,
        });

   
      }


      const savedAssignments = await db.taskAssignment.findMany({
  where: { recordId: body.id },
});



    } catch (assigneeError: any) {
      console.error("Error handling task assignments:", assigneeError);
      return NextResponse.json(
        {
          error: "Failed to update assignees",
          details: assigneeError?.message,
        },
        { status: 500 },
      );
    }
  }

  // Handle tags if provided (support strings, {id}, {name}; fix names passed as ids)
  if (Array.isArray(body.tags)) {
    const raw = body.tags as any[];
    const providedIds: string[] = raw
      .map((t) => (typeof t === "string" ? undefined : t?.id))
      .filter((v): v is string => Boolean(v));
    const providedNames: string[] = raw
      .map((t) => (typeof t === "string" ? (t as string) : t?.name))
      .filter((v): v is string => Boolean(v));

    const uniqueProvidedIds = Array.from(new Set(providedIds));
    const foundById = uniqueProvidedIds.length
      ? await db.tag.findMany({ where: { id: { in: uniqueProvidedIds } } })
      : [];
    const foundIdSet = new Set(foundById.map((t: any) => t.id as string));
    const idsThatDontExistAsId = uniqueProvidedIds.filter(
      (id) => !foundIdSet.has(id),
    );
    const allNames = Array.from(
      new Set([...providedNames, ...idsThatDontExistAsId]),
    );

    if (allNames.length > 0) {
      const existingByName = await db.tag.findMany({
        where: { name: { in: allNames } },
      });
      const existingNameSet = new Set(
        existingByName.map((t: any) => (t.name as string).toLowerCase()),
      );
      const namesToCreate = allNames.filter(
        (n) => !existingNameSet.has(n.toLowerCase()),
      );
      if (namesToCreate.length > 0) {
        await db.tag.createMany({
          data: namesToCreate.map((name) => ({ name })),
          skipDuplicates: true,
        });
      }
    }

    const byNames = allNames.length
      ? await db.tag.findMany({ where: { name: { in: allNames } } })
      : [];
    const finalIds = new Set<string>();
    foundById.forEach((t: any) => finalIds.add(t.id as string));
    byNames.forEach((t: any) => finalIds.add(t.id as string));

    updateData.tags = {
      set: Array.from(finalIds).map((id) => ({ id })),
    };
  }

 

  const isStageTransition =
    body.stageId && body.stageId !== currentTask.stageId;
  const newStage = isStageTransition
    ? await db.stage.findUnique({ where: { id: body.stageId } })
    : null;

  if (isStageTransition && newStage) {
    updateData.isComplete = body.isComplete ?? newStage.isCompleted;

    if (newStage.isCompleted && !currentTask.completedAt) {
      updateData.completedAt = new Date();
    } else if (currentTask.stage?.isCompleted && !newStage.isCompleted) {
      updateData.completedAt = null;
    }

    if (updateData.isComplete === false) {
      updateData.status = "in_progress";
    }
  }

  try {
    // Update the task
    const updatedTask = await db.record.update({
      where: { id: body.id },
      data: updateData,
      include: {
        stage: true,
        tags: true,
        assignees: true,
      },
    });


    // ✅ FIX: Extract userId strings from TaskAssignment objects
    const updatedAssigneeUserIds = updatedTask.assignees.map(
      (assignment) => assignment.userId,
    );



    // ✅ FIX: Use userId strings, not TaskAssignment objects
    if (updatedAssigneeUserIds.length > 0) {

      const notification = await db.notification.createMany({
        data: updatedAssigneeUserIds.map((userId: string) => ({
          type: "TASK_ASSIGNED",
          content: `You have been assigned to task: ${updatedTask.title}`,
          userId: userId,
          taskId: updatedTask.id,
        })),
      });

      // ✅ FIX: Pass userId string array to emitToUser
      const notificationEmitted = emitToUser(
        updatedAssigneeUserIds,
        "new-notification",
        notification,
      );
    

      // ✅ FIX: Pass userId string array to emitToUser
      emitToUser(updatedAssigneeUserIds, "task:assigned", {
        taskId: updatedTask.id,
        taskTitle: updatedTask.title,
        taskPriority: updatedTask.priority,
      });
   
    }

    // Check if status changed
    const isStatusChanged = body.status && body.status !== currentTask.status;

    const formatStatusName = (statusStr?: string) => {
      if (!statusStr) return "";
      const statusMap: Record<string, string> = {
        not_started: "Not Started",
        in_progress: "In Progress",
        under_review: "Under Review",
        review: "Under Review",
        rework: "ReWork",
        completed: "Completed",
      };
      return statusMap[statusStr] || statusStr;
    };

    let activityType = "task_updated";
    let activityDesc = `Task "${updatedTask.title}" details updated`;

    if (isStageTransition && newStage) {
      activityType = "stage_changed";
      activityDesc = `Task "${updatedTask.title}" moved from ${currentTask.stage?.name || "Stage"} to ${newStage.name}`;
    } else if (isStatusChanged) {
      activityType = "status_changed";
      const oldStatus = formatStatusName(currentTask.status);
      const newStatus = formatStatusName(body.status);
      activityDesc = `Task "${updatedTask.title}" status changed from '${oldStatus}' to '${newStatus}'`;
    }

    // Create activity log
    await db.taskActivity.create({
      data: {
        taskId,
        userId: sessionUserId,
        type: activityType,
        description: activityDesc,
      },
    });

    // Check automation rules via dedicated engine
    await runAutomationEngine({
      previousTask: currentTask,
      currentTask: updatedTask,
      changes: body,
      userId: sessionUserId,
    });

    // Invalidate Redis cache for this task workspace
    await cacheDel(`tasks:records:${taskId}`);

    // Fetch fresh task data AFTER automation rules have executed
    const finalTask = await db.record.findUnique({
      where: { id: body.id },
      include: {
        stage: true,
        tags: true,
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    const resultTask = finalTask || updatedTask;

    // ✅ Emit real-time update via socket.io with the FRESH post-automation task
    const socketIO = getSocketIO();
    if (socketIO) {
      socketIO.emit("task:updated", {
        taskId: resultTask.id,
        parentTaskId: taskId,
        task: resultTask,
        updatedBy: sessionUserId,
        timestamp: new Date().toISOString(),
      });

      if (currentTask.stageId !== resultTask.stageId) {
        socketIO.emit("task:moved", {
          taskId: resultTask.id,
          newStageId: resultTask.stageId,
          stageName: resultTask.stage?.name || "",
        });
      }
    }

    // 📡 Produce asynchronous Kafka audit event (non-blocking)
    produceKafkaEvent("task-activity-events", {
      type: "task_updated",
      taskId: resultTask.id,
      title: resultTask.title,
      userId: sessionUserId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ task: resultTask }, { status: 200 });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      {
        error: "Failed to update task",
        details: (error as any)?.message,
      },
      { status: 500 },
    );
  }
}

// Export compatibility wrapper
export async function checkAutomationRules(context: any) {
  return runAutomationEngine(context);
}


async function createAutomaticTaskReminders(
  targetTaskId: string,
  taskTitle: string,
  deadline: Date,
  assigneeIds: string[],
) {
  let validTaskId: string | null = null;
  if (targetTaskId) {
    const existingTask = await db.task.findUnique({
      where: { id: targetTaskId },
      select: { id: true },
    });
    if (existingTask) {
      validTaskId = existingTask.id;
    }
  }

  const reminderIntervals = [
    { days: 4, hours: 0, label: "4 days before" },
    { days: 2, hours: 0, label: "2 days before" },
    { days: 1, hours: 0, label: "1 day before" },
    { days: 0, hours: 5, label: "5 hours before" },
    { days: 0, hours: 2, label: "2 hours before" },
  ];

  const reminderPromises = [];

  for (const assigneeId of assigneeIds) {
    for (const interval of reminderIntervals) {
      let reminderTime = new Date(deadline);

      if (interval.days > 0) {
        reminderTime = subDays(reminderTime, interval.days);
      }
      if (interval.hours > 0) {
        reminderTime = subHours(reminderTime, interval.hours);
      }

      // Only create reminder if it's in the future
      if (reminderTime > new Date()) {
        reminderPromises.push(
          db.reminder.create({
            data: {
              title: `Task Deadline Reminder: ${taskTitle}`,
              description: `This is an automatic reminder for your task "${taskTitle}" which is due ${interval.label}.`,
              remindAt: reminderTime,
              priority: interval.days === 0 ? "HIGH" : "MEDIUM",
              type: "TASK_DEADLINE",
              creatorId: assigneeId, // System-created, but assigned to user
              assigneeId: assigneeId,
              taskId: validTaskId,
              isAutomatic: true,
            },
          }),
        );
      }
    }
  }

  if (reminderPromises.length > 0) {
    await Promise.all(reminderPromises);
    console.log(
      `Created ${reminderPromises.length} automatic reminders for task: ${taskTitle}`,
    );
  }
}
