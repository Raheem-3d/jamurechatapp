import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emitToUser } from "@/lib/socket-server";

// Helper to generate IDs
const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// GET /api/tasks/[taskId]/subtasks - List all subtasks / intermediate tasks for this project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const records = await db.record.findMany({
      where: { parentTaskId: taskId },
      include: {
        stage: { select: { id: true, name: true, color: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, subtasks: records });
  } catch (error: any) {
    console.error("Error fetching subtasks:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch subtasks" },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[taskId]/subtasks - Create a simple intermediate task / subtask under an existing project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    // Verify parent project exists
    const parentTask = await db.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, organizationId: true },
    });

    if (!parentTask) {
      return NextResponse.json({ error: "Parent project not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      title,
      description = "",
      priority = "MEDIUM",
      deadline,
      startDate,
      endDate,
      assigneeIds = [],
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Subtask title is required" }, { status: 400 });
    }

    // Find or create default stage for this parent project
    let stage = await db.stage.findFirst({
      where: { taskId },
      orderBy: { order: "asc" },
    });

    if (!stage) {
      stage = await db.stage.create({
        data: {
          id: genId("stage"),
          name: "To Do",
          color: "#3b82f6",
          taskId,
          order: 0,
          updatedAt: new Date(),
        },
      });
    }

    let dueDateObj: Date | null = null;
    let startDateObj: Date | null = null;
    let endDateObj: Date | null = null;

    if (deadline) {
      dueDateObj = new Date(deadline);
    }
    if (startDate) {
      startDateObj = new Date(startDate);
    }
    if (endDate) {
      endDateObj = new Date(endDate);
      if (!dueDateObj) dueDateObj = endDateObj;
    }

    const recordId = genId("rec");
    const validAssigneeIds = Array.isArray(assigneeIds) ? assigneeIds.filter(Boolean) : [];

    // Create the simple subtask record
    const createdRecord = await db.record.create({
      data: {
        id: recordId,
        title: title.trim(),
        description: description ? description.trim() : "",
        priority: priority.toUpperCase(),
        status: "TODO",
        isComplete: false,
        stageId: stage.id,
        parentTaskId: taskId,
        createdBy: userId,
        dueDate: dueDateObj,
        startDate: startDateObj,
        endDate: endDateObj,
        customFields: JSON.stringify({ isQuickSubtask: true }),
        updatedAt: new Date(),
        assignees: validAssigneeIds.length > 0 ? {
          create: validAssigneeIds.map((uId: string) => ({
            id: genId("ta"),
            userId: uId,
            taskId,
            updatedAt: new Date(),
          })),
        } : undefined,
      },
      include: {
        stage: { select: { id: true, name: true, color: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    });

    // Also ensure task level assignment so assignee can view the parent task
    const taskAssignmentDb = (db as any).taskassignment || (db as any).taskAssignment;
    for (const uId of validAssigneeIds) {
      try {
        await taskAssignmentDb.create({
          data: {
            id: genId("ta"),
            taskId,
            userId: uId,
            updatedAt: new Date(),
          },
        });
      } catch {
        // Ignore duplicate task level assignment
      }

      // Notify assigned user
      try {
        const notif = await db.notification.create({
          data: {
            id: genId("notif"),
            type: "TASK_ASSIGNED",
            content: `You were assigned to quick task "${title}" in project "${parentTask.title}"`,
            userId: uId,
            taskId,
          },
        });
        emitToUser(uId, "new-notification", notif);
        emitToUser(uId, "task:assigned", { taskId, taskTitle: parentTask.title });
      } catch (err) {
        console.error("Failed to notify assignee:", err);
      }
    }

    // Log Activity
    try {
      const taskActivityDb = (db as any).taskactivity || (db as any).taskActivity;
      await taskActivityDb.create({
        data: {
          id: genId("act"),
          taskId,
          userId,
          type: "subtask_created",
          description: `Created quick subtask "${title}"`,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Quick task created successfully",
      subtask: createdRecord,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating quick subtask:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create quick task" },
      { status: 500 }
    );
  }
}
