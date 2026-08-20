import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSessionOrMobileUser } from "@/lib/mobile-auth";
import { formatDurationFromHours } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const mobileUser = await getSessionOrMobileUser(req as any).catch(
      () => null,
    );
    const userId = (session?.user as any)?.id || mobileUser?.id;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Fetch user assigned or created tasks
    const tasks = await db.task.findMany({
      where: {
        OR: [{ creatorId: userId }, { assignments: { some: { userId } } }],
      },
      include: {
        assignments: { select: { userId: true, createdAt: true } },
        Stage: {
          orderBy: { order: "asc" },
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    let totalTasks = tasks.length;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let todoTasks = 0;

    let durationBrackets = {
      under1Day: 0,
      oneToThreeDays: 0,
      threeToSevenDays: 0,
      over7Days: 0,
    };

    let totalCompletionHours = 0;
    let completedCountForAvg = 0;

    const stagesSet = new Set<string>();

    const tasksReport = tasks.map((task: any) => {
      const isDone = task.status === "DONE";
      if (isDone) completedTasks++;
      else if (task.status === "IN_PROGRESS") inProgressTasks++;
      else todoTasks++;

      const createdDate = new Date(task.createdAt);
      const updatedDate = new Date(task.updatedAt);

      // Extract stage info
      const taskStages = task.Stage?.map((s: any) => s.name) || [];
      const stageName = taskStages.length > 0 ? taskStages[0] : null;
      if (stageName) {
        stagesSet.add(stageName);
      }

      // Duration & Timing calculation
      let durationHours = 0;
      const deadlineVal = task.deadlineEnd || task.deadline || task.deadlineStart;
      const deadlineDate = deadlineVal ? new Date(deadlineVal) : null;
      let completedEarly = false;
      let completedLate = false;
      let isOverdue = false;

      if (isDone) {
        durationHours = Math.max(
          0.5,
          (updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60),
        );
        totalCompletionHours += durationHours;
        completedCountForAvg++;

        if (durationHours < 24) durationBrackets.under1Day++;
        else if (durationHours <= 24 * 3) durationBrackets.oneToThreeDays++;
        else if (durationHours <= 24 * 7) durationBrackets.threeToSevenDays++;
        else durationBrackets.over7Days++;

        // Determine if task was completed before deadline / early
        if (deadlineDate) {
          if (updatedDate.getTime() <= deadlineDate.getTime()) {
            completedEarly = true;
          } else {
            completedLate = true;
          }
        } else {
          // If completed in less than 24 hours without a formal deadline, mark as completed early/fast
          if (durationHours <= 24) {
            completedEarly = true;
          }
        }
      } else {
        durationHours =
          (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60);

        if (deadlineDate && new Date().getTime() > deadlineDate.getTime()) {
          isOverdue = true;
        }
      }

      const durationFormatted = isDone
        ? formatDurationFromHours(durationHours)
        : `${formatDurationFromHours(durationHours)} (In Progress)`;

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        stage: stageName,
        stages: taskStages,
        assignedAt: task.createdAt,
        completedAt: isDone ? task.updatedAt : null,
        deadline: deadlineVal ? deadlineVal : null,
        completedEarly,
        completedLate,
        isOverdue,
        durationFormatted,
        durationHours: Math.round(durationHours * 10) / 10,
      };
    });

    const avgCompletionTimeHours =
      completedCountForAvg > 0
        ? Math.round((totalCompletionHours / completedCountForAvg) * 10) / 10
        : 0;

    const completionRatePercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      summary: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        avgCompletionTimeHours,
        completionRatePercentage,
      },
      availableStages: Array.from(stagesSet),
      statusChart: [
        { name: "Completed", value: completedTasks, color: "#10b981" },
        { name: "In Progress", value: inProgressTasks, color: "#f59e0b" },
        { name: "To Do", value: todoTasks, color: "#6366f1" },
      ].filter((d) => d.value > 0 || totalTasks === 0),
      durationChart: [
        {
          name: "< 1 Day",
          value: durationBrackets.under1Day,
          color: "#06b6d4",
        },
        {
          name: "1 - 3 Days",
          value: durationBrackets.oneToThreeDays,
          color: "#3b82f6",
        },
        {
          name: "3 - 7 Days",
          value: durationBrackets.threeToSevenDays,
          color: "#8b5cf6",
        },
        {
          name: "> 7 Days",
          value: durationBrackets.over7Days,
          color: "#ec4899",
        },
      ],
      tasksReport,
    });
  } catch (error) {
    console.error("Task analytics API error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
