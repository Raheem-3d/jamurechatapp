import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isSuperAdmin as checkIsSuperAdmin } from "@/lib/org";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const user: any = (session as any).user || {};
    const orgId = user.organizationId;
    const userIsSuperAdmin = Boolean(user.isSuperAdmin || checkIsSuperAdmin(user.email));

    let whereClause: any = {};

    if (!userIsSuperAdmin) {
      if (orgId) {
        whereClause.organizationId = orgId;
      }
      whereClause.OR = [
        { creatorId: user.id },
        {
          assignments: {
            some: {
              userId: user.id,
            },
          },
        },
      ];
    }

    const allTasks = await db.task.findMany({
      where: whereClause,
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        assignments: {
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
        },
        channel: true,
      },
    });

    // Attach matching channels by taskReferenceId if task.channel is missing
    try {
      const taskIds = allTasks.map((t: any) => t.id);
      if (taskIds.length > 0) {
        const taskChannels = await db.channel.findMany({
          where: {
            taskReferenceId: { in: taskIds },
          },
          select: {
            id: true,
            name: true,
            taskReferenceId: true,
          },
        });
        const channelMap = new Map(taskChannels.map((c: any) => [c.taskReferenceId, c]));
        allTasks.forEach((t: any) => {
          if (!t.channel && channelMap.has(t.id)) {
            t.channel = channelMap.get(t.id);
          }
        });
      }
    } catch (e) {
      console.error("Error attaching channels to allTasks in client route:", e);
    }

    // Separate Projects from Standalone Quick Tasks:
    const checkIsQuickTask = (t: any) => {
      if (!t) return false;
      if (t.description && (t.description.includes("<!-- type:quick-task -->") || t.description.includes("<!-- quick-task -->") || t.description.includes("[QUICK_TASK]"))) {
        return true;
      }
      if (t.customFields) {
        if (typeof t.customFields === "object" && (t.customFields.isQuickTask || t.customFields.isQuickSubtask)) return true;
        if (typeof t.customFields === "string" && (t.customFields.includes("isQuickTask") || t.customFields.includes("isQuickSubtask"))) return true;
      }
      if (t.title && (t.title.toLowerCase().startsWith("quick task") || t.title.toLowerCase().startsWith("quick subtask"))) {
        return true;
      }
      return false;
    };

    const quickTasks = allTasks.filter(checkIsQuickTask);
    const projectTasks = allTasks.filter((t: any) => !checkIsQuickTask(t));

    return NextResponse.json({
      recentTasks: projectTasks,
      assignedTasks: projectTasks.filter((t) =>
        t.assignments?.some((a: any) => a.userId === user.id)
      ),
      createdTasks: projectTasks.filter((t) => t.creatorId === user.id),
      tasks: projectTasks,
      quickTasks,
    });
  } catch (error) {
    console.error("Error fetching client tasks:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
