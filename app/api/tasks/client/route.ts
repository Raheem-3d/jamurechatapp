import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getSessionUserWithPermissions } from "@/lib/org";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const user: any = (session as any).user || {};
    const orgId = user.organizationId;

    let isSuperAdmin = false;
    let canViewAll = false;

    try {
      const userWithPerms = await getSessionUserWithPermissions(req as any);
      isSuperAdmin = userWithPerms?.isSuperAdmin || false;
      let userPerms: any[] = [];
      try {
        userPerms = JSON.parse(String(userWithPerms?.permissions || "[]"));
      } catch {}
      canViewAll = hasPermission(
        userWithPerms?.role,
        "TASK_VIEW_ALL",
        isSuperAdmin,
        userPerms
      );
    } catch (e) {
      // Fallback if permission check fails
    }

    let whereClause: any = {};

    if (!isSuperAdmin) {
      if (orgId) {
        whereClause.organizationId = orgId;
      }
      if (!canViewAll) {
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
      assignedTasks: assignedTasks.length > 0 ? assignedTasks : (canViewAll ? allTasks : []),
      createdTasks: createdTasks.length > 0 ? createdTasks : (canViewAll ? allTasks : []),
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
