import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDbSchema } from "@/lib/db-init";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await ensureDbSchema();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, timeSpent: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const timeLogs = await db.taskTimeLog.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group time spent by user for manager tracking
    const userBreakdownMap: Record<string, { user: any; totalSeconds: number }> = {};
    for (const log of timeLogs) {
      const uId = log.userId;
      if (!userBreakdownMap[uId]) {
        userBreakdownMap[uId] = {
          user: log.user,
          totalSeconds: 0,
        };
      }
      userBreakdownMap[uId].totalSeconds += log.duration || 0;
    }

    const userBreakdown = Object.values(userBreakdownMap);

    return NextResponse.json({
      taskId: task.id,
      taskTitle: task.title,
      totalTimeSpent: task.timeSpent || 0,
      timeLogs,
      userBreakdown,
    });
  } catch (error) {
    console.error("Error fetching task time logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    await ensureDbSchema();
    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await req.json();
    const duration = parseInt(body.duration, 10); // in seconds
    const description = body.description || null;

    if (isNaN(duration) || duration <= 0) {
      return NextResponse.json(
        { error: "Valid duration in seconds is required" },
        { status: 400 }
      );
    }

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Create log
    const log = await db.taskTimeLog.create({
      data: {
        taskId,
        userId,
        duration,
        description,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    // Update aggregate timeSpent on Task
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        timeSpent: { increment: duration },
      },
    });

    return NextResponse.json({
      success: true,
      log,
      totalTimeSpent: updatedTask.timeSpent,
    });
  } catch (error) {
    console.error("Error logging task time:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
