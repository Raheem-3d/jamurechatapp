import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  formatDistanceToNow,
  differenceInDays,
  differenceInHours,
  startOfDay,
  startOfWeek,
  startOfMonth,
} from "date-fns";

export async function GET(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import("@/lib/mobile-auth");
    const currentUser = await getSessionOrMobileUser(req as any);

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const filterUserId = searchParams.get("userId");
    const filterDeptId = searchParams.get("departmentId");
    const filterRole = searchParams.get("role");
    const filterTaskId = searchParams.get("taskId");
    const filterStageId = searchParams.get("stageId");
    const filterStatus = searchParams.get("status");
    const filterPriority = searchParams.get("priority");

    let dateFilter: any = {};
    if (startDateParam || endDateParam) {
      dateFilter.createdAt = {};
      if (startDateParam) {
        const start = new Date(startDateParam);
        start.setHours(0, 0, 0, 0);
        dateFilter.createdAt.gte = start;
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.lte = end;
      }
    }

    // Resolve user's team scope (users in the same department + logged-in user)
    let teamUserIds: string[] = [];
    if (currentUser.departmentId) {
      const deptUsers = await db.user.findMany({
        where: { departmentId: currentUser.departmentId },
        select: { id: true },
      });
      teamUserIds = deptUsers.map((u: any) => u.id);
    }

    const isSuperAdmin = Boolean(
      currentUser.isSuperAdmin || currentUser.role === "SUPER_ADMIN"
    );

    let baseTeamUserIds: string[] = Array.from(
      new Set([currentUser.id, ...teamUserIds])
    );

    if (isSuperAdmin && !currentUser.departmentId && !filterDeptId) {
      const orgUsers = await db.user.findMany({ select: { id: true } });
      baseTeamUserIds = orgUsers.map((u: any) => u.id);
    }

    let scopedUserIds: string[] = baseTeamUserIds;

    if (filterUserId) {
      if (baseTeamUserIds.includes(filterUserId) || isSuperAdmin) {
        scopedUserIds = [filterUserId];
      } else {
        scopedUserIds = ["__no_matching_user__"];
      }
    } else if (filterDeptId) {
      const deptUsers = await db.user.findMany({
        where: { departmentId: filterDeptId },
        select: { id: true },
      });
      const deptUserIds = deptUsers.map((u: any) => u.id);
      if (isSuperAdmin) {
        scopedUserIds = deptUserIds.length > 0 ? deptUserIds : ["__no_matching_user__"];
      } else {
        scopedUserIds = baseTeamUserIds.filter((id) => deptUserIds.includes(id));
        if (scopedUserIds.length === 0) scopedUserIds = ["__no_matching_user__"];
      }
    }

    // -------------------------------------------------------------
    // 1. TASK PERFORMANCE REPORT METRICS
    // -------------------------------------------------------------
    const taskWhere: any = {
      ...dateFilter,
      OR: [
        { creatorId: { in: scopedUserIds } },
        { assignments: { some: { userId: { in: scopedUserIds } } } },
      ],
    };

    if (filterTaskId) taskWhere.id = filterTaskId;
    if (filterStatus) taskWhere.status = filterStatus as any;
    if (filterPriority) taskWhere.priority = filterPriority as any;

    const rawTasks = await db.task.findMany({
      where: taskWhere,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        stage: true,
        taskcomment: { select: { id: true } },
        taskactivity: { orderBy: { timestamp: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    let completedTasksCount = 0;
    let pendingTasksCount = 0;
    let overdueTasksCount = 0;
    let completedToday = 0;
    let completedThisWeek = 0;
    let completedThisMonth = 0;

    let fastestTaskDuration: number | null = null;
    let slowestTaskDuration: number | null = null;
    let fastestTaskTitle: string | null = null;
    let slowestTaskTitle: string | null = null;

    const allTasksMapped = rawTasks.map((t: any) => {
      const isDone = t.status === "DONE";
      const isOverdue = !isDone && t.deadline && new Date(t.deadline) < now;

      const activities = t.taskactivity || [];
      const stages = t.stage || [];
      const comments = t.taskcomment || [];

      if (isDone) {
        completedTasksCount++;
        const doneActivity =
          activities.find(
            (a: any) =>
              a.type.toLowerCase().includes("status") &&
              a.description.toLowerCase().includes("done"),
          ) || activities[activities.length - 1];
        const completionDate = doneActivity
          ? new Date(doneActivity.timestamp)
          : new Date(t.updatedAt);

        if (completionDate >= todayStart) completedToday++;
        if (completionDate >= weekStart) completedThisWeek++;
        if (completionDate >= monthStart) completedThisMonth++;

        const completionDurationHours = Math.max(
          1,
          Math.round(
            (completionDate.getTime() - new Date(t.createdAt).getTime()) /
              (1000 * 60 * 60),
          ),
        );

        if (
          fastestTaskDuration === null ||
          completionDurationHours < fastestTaskDuration
        ) {
          fastestTaskDuration = completionDurationHours;
          fastestTaskTitle = t.title;
        }
        if (
          slowestTaskDuration === null ||
          completionDurationHours > slowestTaskDuration
        ) {
          slowestTaskDuration = completionDurationHours;
          slowestTaskTitle = t.title;
        }
      } else {
        pendingTasksCount++;
        if (isOverdue) overdueTasksCount++;
      }

      // Deadline calculations
      const allocatedDays = t.deadline
        ? Math.max(
            1,
            differenceInDays(new Date(t.deadline), new Date(t.createdAt)),
          )
        : 0;
      let deadlineStatus = "In Progress";
      let delayHours = 0;

      if (isDone) {
        if (!t.deadline) {
          deadlineStatus = "Completed (No Deadline)";
        } else if (new Date(t.updatedAt) <= new Date(t.deadline)) {
          deadlineStatus = "Completed Before Deadline";
        } else {
          deadlineStatus = "Completed After Deadline (Overdue)";
          delayHours = differenceInHours(
            new Date(t.updatedAt),
            new Date(t.deadline),
          );
        }
      } else if (isOverdue) {
        deadlineStatus = "Overdue";
        delayHours = differenceInHours(now, new Date(t.deadline!));
      }

      // Reassignments & Reopens
      const reassignCount = activities.filter((a: any) =>
        a.type.toLowerCase().includes("assign"),
      ).length;
      const reopenCount = activities.filter(
        (a: any) =>
          a.description.toLowerCase().includes("reopened") ||
          a.description.toLowerCase().includes("todo"),
      ).length;

      const currentStage =
        stages.length > 0 ? stages[stages.length - 1].name : null;

      const isQuickTask = Boolean(
        (t.description && (t.description.includes("<!-- type:quick-task -->") || t.description.includes("<!-- quick-task -->") || t.description.includes("[QUICK_TASK]"))) ||
        (t.customFields && (typeof t.customFields === "object" ? (t.customFields.isQuickTask || t.customFields.isQuickSubtask) : String(t.customFields).includes("isQuickTask") || String(t.customFields).includes("isQuickSubtask"))) ||
        (t.title && (t.title.toLowerCase().startsWith("quick task") || t.title.toLowerCase().startsWith("quick subtask")))
      );

      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        isQuickTask,
        creatorName: t.creator?.name || null,
        assignedUsers:
          Array.from(
            new Set(
              t.assignments
                .map((a: any) => a.user?.name || a.user?.email)
                .filter(Boolean)
            )
          ).join(", ") || null,
        currentStage,
        createdAt: t.createdAt,
        deadline: t.deadline,
        updatedAt: t.updatedAt,
        allocatedDays,
        timeSpentHours: Math.round((t.timeSpent || 0) / 3600),
        deadlineStatus,
        delayHours,
        reassignCount,
        reopenCount,
        commentsCount: comments.length,
        attachmentsCount: 0,
        stagesCount: stages.length,
      };
    });

    const detailedQuickTasks = allTasksMapped.filter((t: any) => t.isQuickTask);
    const detailedTasks = allTasksMapped.filter((t: any) => !t.isQuickTask);

    // -------------------------------------------------------------
    // 2. RECORD PERFORMANCE & COMPLETED RECORDS METRICS
    // -------------------------------------------------------------
    const recordWhere: any = {
      ...dateFilter,
      OR: [
        { createdBy: { in: scopedUserIds } },
        { assignees: { some: { userId: { in: scopedUserIds } } } },
        ...(rawTasks.length > 0
          ? [{ parentTaskId: { in: rawTasks.map((task: any) => task.id) } }]
          : []),
      ],
    };
    if (filterStageId) recordWhere.stageId = filterStageId;

    const rawRecords = await db.record.findMany({
      where: recordWhere,
      include: {
        user: { select: { id: true, name: true, email: true } },
        stage: true,
        assignees: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        tags: true,
        taskactivity: { orderBy: { timestamp: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    let completedRecordsCount = 0;
    let activeRecordsCount = 0;
    let overdueRecordsCount = 0;
    let recordsCompletedToday = 0;
    let recordsCompletedThisWeek = 0;
    let recordsCompletedThisMonth = 0;
    let reworkedRecordsCount = 0;

    const detailedRecords = rawRecords.map((r: any) => {
      const statusStr = (r.status || "").toUpperCase();
      const stageStr = (r.stage?.name || "").toUpperCase();
      const recordActivities = r.taskactivity || [];

      const isDone =
        Boolean(r.isComplete) ||
        ["COMPLETED", "DONE", "FINISHED", "CLOSED", "COMPLETE"].includes(
          statusStr,
        ) ||
        ["COMPLETED", "DONE", "FINISHED", "CLOSED", "COMPLETE"].some((term) =>
          stageStr.includes(term),
        );

      const isOverdue = !isDone && r.dueDate && new Date(r.dueDate) < now;

      if (isDone) {
        completedRecordsCount++;
        const doneDate = new Date(r.updatedAt);
        if (doneDate >= todayStart) recordsCompletedToday++;
        if (doneDate >= weekStart) recordsCompletedThisWeek++;
        if (doneDate >= monthStart) recordsCompletedThisMonth++;
      } else {
        activeRecordsCount++;
        if (isOverdue) overdueRecordsCount++;
      }

      // Calculate Rework Activity Count
      const reworkCount = recordActivities.filter((a: any) =>
        /reopen|rework|back|reject|reassign|redo/i.test(
          `${a.type} ${a.description}`,
        ),
      ).length;

      if (reworkCount > 0) {
        reworkedRecordsCount++;
      }

      // Calculate Deadline Status
      let deadlineStatus = "In Progress";
      const completedAtDate = isDone ? r.updatedAt : null;

      if (isDone) {
        if (!r.dueDate) {
          deadlineStatus = "Completed (No Deadline)";
        } else if (new Date(r.updatedAt) <= new Date(r.dueDate)) {
          deadlineStatus = "Completed On-Time";
        } else {
          deadlineStatus = "Completed Late";
        }
      } else if (isOverdue) {
        deadlineStatus = "Overdue (Deadline Passed)";
      } else {
        deadlineStatus = r.dueDate ? "Pending (In Progress)" : "In Progress";
      }

      return {
        id: r.id,
        title: r.title,
        status: isDone ? "COMPLETED" : isOverdue ? "OVERDUE" : "IN_PROGRESS",
        stageName: r.stage ? r.stage.name : null,
        creatorName: r.createdByUser?.name || r.user?.name || null,
        assignees:
          Array.from(
            new Set(
              r.assignees
                .map((a: any) => a.user?.name || a.user?.email)
                .filter(Boolean)
            )
          ).join(", ") || null,
        createdAt: r.createdAt,
        dueDate: r.dueDate,
        completedAt: completedAtDate,
        deadlineStatus,
        isComplete: isDone,
        tags: (r.tags || []).map((tg: any) => tg.name),
        activityCount: recordActivities.length,
        reworkCount,
        isReworked: reworkCount > 0,
      };
    });

    // -------------------------------------------------------------
    // 3. USER WORKLOAD REPORT METRICS
    // -------------------------------------------------------------
    const users = await db.user.findMany({
      where: { id: { in: scopedUserIds } },
      include: {
        taskassignment: { include: { task: true } },
        task: true,
        record: true,
        department: true,
      },
    });

    const userWorkload = users.map((u: any) => {
      const assignedTasks = u.taskassignment || [];
      const createdRecords = u.record || [];
      const totalAssignedTasks = assignedTasks.length;
      const completedTasks = assignedTasks.filter(
        (a: any) => a.task?.status === "DONE",
      ).length;
      const pendingTasks = assignedTasks.filter(
        (a: any) => a.task?.status !== "DONE",
      ).length;
      const overdueTasks = assignedTasks.filter(
        (a: any) =>
          a.task?.status !== "DONE" &&
          a.task?.deadline &&
          new Date(a.task.deadline) < now,
      ).length;

      return {
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        departmentName: u.department?.name || "General",
        totalAssignedTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        totalCreatedRecords: createdRecords.length,
        taskNames: assignedTasks.map((a: any) => a.task?.title).filter(Boolean).slice(0, 5),
      };
    });

    // -------------------------------------------------------------
    // 4. STAGE ANALYTICS METRICS
    // -------------------------------------------------------------
    const stages = await db.stage.findMany({
      include: {
        record: { where: recordWhere },
        task: true,
      },
    });

    const hasActiveReportFilter = Boolean(
      scopedUserIds.length > 0 || startDateParam || endDateParam || filterStageId,
    );
    const visibleStages = hasActiveReportFilter
      ? stages.filter((stage: any) => (stage.record || []).length > 0)
      : stages;

    const stageAnalytics = visibleStages.map((s: any) => {
      const stageRecords = s.record || [];
      const recordsCount = stageRecords.length;
      const completedRecordsInStage = stageRecords.filter(
        (r: any) =>
          r.isComplete ||
          ["COMPLETED", "DONE", "FINISHED", "CLOSED", "COMPLETE"].includes(
            String(r.status || "").toUpperCase(),
          ),
      ).length;
      const conversionRate =
        recordsCount > 0
          ? Math.round((completedRecordsInStage / recordsCount) * 100)
          : 0;
      const isBottleneck = recordsCount > 5 && conversionRate < 50;

      return {
        id: s.id,
        name: s.name,
        color: s.color,
        taskTitle: s.task?.title || "General",
        totalRecords: recordsCount,
        completedRecords: completedRecordsInStage,
        conversionRate,
        isBottleneck,
      };
    });

    // -------------------------------------------------------------
    // 5. TIMELINE & AUDIT TRAIL
    // -------------------------------------------------------------
    const taskActivityDb = (db as any).taskactivity || (db as any).taskActivity;
    const timelineActivities = await taskActivityDb.findMany({
      where: {
        OR: [
          { userId: { in: scopedUserIds } },
          { taskId: { in: rawTasks.map((t: any) => t.id) } },
          { record: recordWhere },
        ],
      },
      include: {
        user: { select: { name: true, email: true, image: true } },
        task: { select: { title: true } },
        record: { select: { title: true } },
      },
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    const timeline = timelineActivities.map((act: any) => ({
      id: act.id,
      timestamp: act.timestamp,
      type: act.type,
      description: act.description,
      userName: act.user?.name || act.user?.email || "System",
      taskTitle: act.task?.title || "Task",
      recordTitle: act.record?.title || null,
    }));

    // -------------------------------------------------------------
    // 6. TIME TRACKING LOGS REPORT METRICS
    // -------------------------------------------------------------
    let timeTrackingLogs: any[] = [];
    let totalDurationSeconds = 0;

    try {
      if (
        (db as any).taskTimeLog &&
        typeof (db as any).taskTimeLog.findMany === "function"
      ) {
        const rawTimeLogs = await (db as any).taskTimeLog.findMany({
          where: {
            OR: [{ userId: { in: scopedUserIds } }, { task: taskWhere }],
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            task: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

        timeTrackingLogs = rawTimeLogs.map((log: any) => {
          totalDurationSeconds += log.duration || 0;
          return {
            id: log.id,
            taskId: log.taskId,
            taskTitle: log.task?.title || null,
            userName: log.user?.name || log.user?.email || null,
            durationMinutes: Math.round((log.duration || 0) / 60),
            durationHours: ((log.duration || 0) / 3600).toFixed(1),
            description: log.description || null,
            createdAt: log.createdAt,
          };
        });
      }
    } catch (e) {
      console.warn("Time tracking logs fetch warning:", e);
    }

    // -------------------------------------------------------------
    // 7. AUTOMATION EXECUTION LOGS REPORT METRICS
    // -------------------------------------------------------------
    let automationReport: any[] = [];
    let automationLogs: any[] = [];

    try {
      const [automationRules, automationLogsRaw] = await Promise.all([
        (db as any).automationRule &&
        typeof (db as any).automationRule.findMany === "function"
          ? (db as any).automationRule.findMany({
              where: { userId: { in: scopedUserIds } },
              include: {
                user: { select: { name: true, email: true } },
              },
              take: 50,
            })
          : Promise.resolve([]),
        (db as any).automationLog &&
        typeof (db as any).automationLog.findMany === "function"
          ? (db as any).automationLog.findMany({
              where: {
                OR: [
                  { userId: { in: scopedUserIds } },
                  { rule: { userId: { in: scopedUserIds } } },
                ],
              },
              include: {
                rule: { select: { name: true } },
              },
              orderBy: { createdAt: "desc" },
              take: 50,
            })
          : Promise.resolve([]),
      ]);

      automationReport = automationRules.map((rule: any) => ({
        id: rule.id,
        name: rule.name,
        trigger: rule.trigger || null,
        enabled: rule.enabled,
        creatorName: rule.user?.name || null,
        lastTriggered: rule.lastTriggered,
        totalExecutions: automationLogsRaw.filter(
          (log: any) => log.ruleId === rule.id,
        ).length,
      }));

      automationLogs = automationLogsRaw.map((log: any) => ({
        id: log.id,
        ruleName: log.ruleName || log.rule?.name || null,
        status: log.status,
        triggerType: log.triggerType,
        actionSummary: log.actionSummary,
        executionTimeMs: log.executionTimeMs,
        errorDetails: log.errorDetails || null,
        createdAt: log.createdAt,
      }));
    } catch (e) {
      console.warn("Automation log fetch warning:", e);
    }

    return NextResponse.json(
      {
        summary: {
          totalTasks: detailedTasks.length,
          completedTasks: detailedTasks.filter((t: any) => t.status === "DONE").length,
          pendingTasks: detailedTasks.filter((t: any) => t.status !== "DONE").length,
          overdueTasks: detailedTasks.filter((t: any) => t.status !== "DONE" && t.deadline && new Date(t.deadline) < new Date()).length,
          totalQuickTasks: detailedQuickTasks.length,
          completedQuickTasks: detailedQuickTasks.filter((t: any) => t.status === "DONE").length,
          pendingQuickTasks: detailedQuickTasks.filter((t: any) => t.status !== "DONE").length,
          overdueQuickTasks: detailedQuickTasks.filter((t: any) => t.status !== "DONE" && t.deadline && new Date(t.deadline) < new Date()).length,
          completedToday,
          completedThisWeek,
          completedThisMonth,
          fastestTaskTitle,
          fastestTaskDuration,
          slowestTaskTitle,
          slowestTaskDuration,

          totalRecords: rawRecords.length,
          completedRecords: completedRecordsCount,
          activeRecords: activeRecordsCount,
          overdueRecords: overdueRecordsCount,
          reworkedRecords: reworkedRecordsCount,
          recordsCompletedToday,
          recordsCompletedThisWeek,
          recordsCompletedThisMonth,
          totalLoggedHours: (totalDurationSeconds / 3600).toFixed(1),
        },
        detailedTasks,
        detailedQuickTasks,
        detailedRecords,
        userWorkload,
        stageAnalytics,
        timeline,
        timeTrackingLogs,
        automationReport,
        automationLogs,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Detailed Reporting Endpoint Error:", error);
    return NextResponse.json(
      { message: "Failed to generate detailed reports", error: error.message },
      { status: 500 },
    );
  }
}
