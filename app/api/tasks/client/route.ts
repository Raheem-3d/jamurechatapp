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

    const recentTasks = allTasks.slice(0, 3);

    const assignedTasks = allTasks.filter((t) =>
      t.assignments?.some((a: any) => a.userId === user.id)
    );
    const createdTasks = allTasks.filter((t) => t.creatorId === user.id);

    return NextResponse.json({
      recentTasks,
      assignedTasks,
      createdTasks,
      tasks: allTasks,
    });
  } catch (error) {
    console.error("Error fetching client tasks:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
