import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { department: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isAdmin = session.user?.role === "ORG_ADMIN";
    const isClient = session.user?.role === "CLIENT";

    // Client: recent channels
    const recentChannelsForClient = await db.channel.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
      include: {
        department: true,
        _count: {
          select: { messages: true },
        },
      },
    });

    // Assignee: recent channels
    const recentChannelsForAssignee = await db.channel.findMany({
      where: {
        members: {
          some: { userId },
        },
        NOT: [
          { name: { contains: "internal" } },
          { name: { startsWith: "task" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        department: true,
        _count: { select: { messages: true } },
      },
    });

    const recentChannels = user.role === "ORG_ADMIN" 
      ? recentChannelsForAssignee 
      : user.role === "CLIENT"
        ? recentChannelsForClient
        : recentChannelsForAssignee;

    // Fetch recent tasks
    const recentTasks = await db.task.findMany({
      where: {
        OR: [
          { creatorId: userId },
          {
            assignments: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        creator: true,
        assignments: {
          include: {
            user: true,
          },
        },
        channel: true,
      },
    });

    // Fetch recent direct messages
    const recentDirectMessages = await db.message.findMany({
      where: {
        OR: [
          {
            senderId: userId,
            receiverId: { not: null },
          },
          {
            receiverId: userId,
          },
        ],
        channelId: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        sender: true,
        receiver: true,
      },
    });

    // Get unique users from direct messages
    const uniqueUsers = new Map();
    recentDirectMessages.forEach((message) => {
      const otherUserId =
        message.senderId === userId
          ? message.receiverId
          : message.senderId;
      const otherUser =
        message.senderId === userId ? message.receiver : message.sender;

      if (otherUserId && otherUser && !uniqueUsers.has(otherUserId)) {
        uniqueUsers.set(otherUserId, {
          id: otherUser.id,
          name: otherUser.name || "Unknown User",
          email: otherUser.email,
          image: otherUser.image,
          lastMessage: message,
        });
      }
    });

    const recentContacts = Array.from(uniqueUsers.values()).slice(0, 5);

    // Fetch department users for admin/employee
    const departmentUsersData =
      isClient || !user.departmentId
        ? []
        : await db.user.findMany({
            where: {
              departmentId: user.departmentId,
              id: { not: userId },
              organizationId: user.organizationId,
            },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
            orderBy: {
              name: "asc",
            },
          });

    // Calculate stats
    const completedTasksCount = recentTasks.filter(
      (t) => t.status === "DONE"
    ).length;

    const assignedTasksCount = recentTasks.filter((t) =>
      t.assignments.some((a) => a.userId === userId)
    ).length;

    const pendingTasksCount = recentTasks.filter(
      (t) => t.status === "PENDING"
    ).length;

    const inProgressTasksCount = recentTasks.filter(
      (t) => t.status === "IN_PROGRESS"
    ).length;

    // Fetch analytics data for charts
    // 1. Task completion trend (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    const taskTrendData = await Promise.all(
      last7Days.map(async (date) => {
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const completed = await db.task.count({
          where: {
            status: "DONE",
            updatedAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
            OR: [
              { creatorId: userId },
              { assignments: { some: { userId: userId } } },
            ],
          },
        });

        const created = await db.task.count({
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
            OR: [
              { creatorId: userId },
              { assignments: { some: { userId: userId } } },
            ],
          },
        });

        return {
          date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          completed,
          created,
        };
      })
    );

    // 2. Task status distribution for Pie Chart
    const taskStatusData = [
      { name: "Completed", value: completedTasksCount, fill: "#10b981" },
      { name: "In Progress", value: inProgressTasksCount, fill: "#f59e0b" },
      { name: "Pending", value: pendingTasksCount, fill: "#6366f1" },
    ];

    // 3. Performance metrics for Radar Chart
    const totalTasks = recentTasks.length;
    const completionRate =
      totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;
    const activeChannelsCount = recentChannels.length;
    const messagesCount = recentChannels.reduce(
      (sum, ch) => sum + (ch._count?.messages || 0),
      0
    );
    const contactsCount = recentContacts.length;

    const performanceData = [
      { metric: "Task Completion", value: Math.min(completionRate, 100) },
      {
        metric: "Active Channels",
        value: Math.min((activeChannelsCount / 10) * 100, 100),
      },
      {
        metric: "Communication",
        value: Math.min((messagesCount / 50) * 100, 100),
      },
      {
        metric: "Collaboration",
        value: Math.min((contactsCount / 10) * 100, 100),
      },
      {
        metric: "Productivity",
        value: Math.min(
          ((completedTasksCount + inProgressTasksCount) / (totalTasks || 1)) *
            100,
          100
        ),
      },
    ];

    return NextResponse.json({
      recentChannels,
      recentTasks,
      recentContacts,
      departmentUsersData,
      completedTasksCount,
      assignedTasksCount,
      pendingTasksCount,
      inProgressTasksCount,
      taskTrendData,
      taskStatusData,
      performanceData,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
