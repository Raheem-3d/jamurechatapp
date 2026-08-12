import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    const filterRole = searchParams.get("role");
    const filterTaskId = searchParams.get("taskId");
    const departmentId = searchParams.get("departmentId");

    const isAdmin =
      currentUser.isSuperAdmin ||
      currentUser.role === "SUPER_ADMIN" ||
      currentUser.role === "ORG_ADMIN";
    const hasUserScope =
      isAdmin && Boolean(filterUserId || departmentId || filterRole);

    // Fetch departments and users (restricted if non-admin)
    const [departments, allUsers] = await Promise.all([
      isAdmin
        ? db.department.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      isAdmin
        ? db.user.findMany({
            select: {
              id: true,
              name: true,
              email: true,
              departmentId: true,
              role: true,
            },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([
            {
              id: currentUser.id,
              name: currentUser.name || "Me",
              email: currentUser.email,
              departmentId: currentUser.departmentId,
              role: currentUser.role,
            },
          ]),
    ]);

    let scopedUserIds: string[] = [];
    if (hasUserScope) {
      const scopedUsers = await db.user.findMany({
        where: {
          ...(filterUserId ? { id: filterUserId } : {}),
          ...(departmentId ? { departmentId } : {}),
          ...(filterRole ? { role: filterRole as any } : {}),
        },
        select: { id: true },
      });
      scopedUserIds = scopedUsers.map((u) => u.id);
      if (scopedUserIds.length === 0) scopedUserIds = ["__no_matching_user__"];
    }

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

    // 1. Task Metrics
    const taskWhere: any = { ...dateFilter };
    if (!isAdmin) {
      taskWhere.OR = [
        { creatorId: currentUser.id },
        { assignments: { some: { userId: currentUser.id } } },
      ];
    } else if (hasUserScope) {
      taskWhere.OR = [
        { creatorId: { in: scopedUserIds } },
        { assignments: { some: { userId: { in: scopedUserIds } } } },
      ];
    }

    const [totalTasks, tasksByStatus, tasksByPriority, overdueTasks] =
      await Promise.all([
        db.task.count({ where: taskWhere }),
        db.task.groupBy({
          by: ["status"],
          where: taskWhere,
          _count: { _all: true },
        }),
        db.task.groupBy({
          by: ["priority"],
          where: taskWhere,
          _count: { _all: true },
        }),
        db.task.count({
          where: {
            ...taskWhere,
            status: { not: "DONE" },
            deadline: { lt: new Date() },
          },
        }),
      ]);

    // 2. Record & Stage Metrics
    const recordWhere: any = { ...dateFilter };
    if (!isAdmin) {
      recordWhere.OR = [
        { createdBy: currentUser.id },
        { assignees: { some: { userId: currentUser.id } } },
      ];
    } else {
      if (filterTaskId) recordWhere.parentTaskId = filterTaskId;
      if (hasUserScope) {
        recordWhere.OR = [
          { createdBy: { in: scopedUserIds } },
          { assignees: { some: { userId: { in: scopedUserIds } } } },
        ];
      }
    }

    const [totalRecords, completedRecords, recordsByStage] = await Promise.all([
      db.record.count({ where: recordWhere }),
      db.record.count({
        where: {
          AND: [
            recordWhere,
            {
              OR: [
                { isComplete: true },
                {
                  status: {
                    in: [
                      "COMPLETED",
                      "completed",
                      "DONE",
                      "done",
                      "FINISHED",
                      "finished",
                    ],
                  },
                },
              ],
            },
          ],
        },
      }),
      db.record.groupBy({
        by: ["stageId"],
        where: recordWhere,
        _count: { _all: true },
      }),
    ]);

    // 3. Stage Details Mapping
    const stages = await db.stage.findMany({
      select: { id: true, name: true, color: true, taskId: true },
    });
    const stageMap = new Map(stages.map((s) => [s.id, s]));

    const stageBreakdown = recordsByStage.map((item) => {
      const stage = item.stageId ? stageMap.get(item.stageId) : null;
      return {
        stageId: item.stageId || "unassigned",
        stageName: stage ? stage.name : null,
        color: stage ? stage.color : "#94a3b8",
        count: item._count._all,
      };
    });

    // 4. Tag Metrics
    const tags = await db.tag.findMany({
      where: hasUserScope ? { records: { some: recordWhere } } : undefined,
      include: {
        records: { where: recordWhere, select: { id: true } },
      },
      orderBy: { name: "asc" },
    });

    const tagBreakdown = tags
      .map((t) => ({ id: t.id, name: t.name, count: t.records.length }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10);

    // 5. Automation Rule Metrics
    const [totalAutomations, enabledAutomations] = await Promise.all([
      db.automationRule.count({
        where: hasUserScope ? { userId: { in: scopedUserIds } } : undefined,
      }),
      db.automationRule.count({
        where: hasUserScope
          ? { enabled: true, userId: { in: scopedUserIds } }
          : { enabled: true },
      }),
    ]);

    // 6. User Activity & Productivity
    const userWhere: any = {};
    if (!isAdmin) {
      userWhere.id = currentUser.id;
    } else if (hasUserScope) {
      userWhere.id = { in: scopedUserIds };
    }

    const users = await db.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        department: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            createdTasks: true,
            createdRecords: true,
            sentMessages: true,
          },
        },
      },
      take: 20,
    });

    // 7. Channel & Chat Metrics
    const scopedPeopleFilter = hasUserScope
      ? {
          OR: [
            { creatorId: { in: scopedUserIds } },
            { members: { some: { userId: { in: scopedUserIds } } } },
          ],
        }
      : undefined;
    const [totalChannels, totalMessages] = await Promise.all([
      db.channel.count({ where: scopedPeopleFilter }),
      db.message.count({
        where: hasUserScope
          ? {
              OR: [
                { senderId: { in: scopedUserIds } },
                { receiverId: { in: scopedUserIds } },
              ],
            }
          : undefined,
      }),
    ]);

    // 8. File & Media Storage Metrics (Parsing Messages)
    const messagesWithFiles = await db.message.findMany({
      where: {
        AND: [
          {
            OR: [{ fileUrl: { not: null } }, { attachments: { not: null } }],
          },
          ...(hasUserScope
            ? [
                {
                  OR: [
                    { senderId: { in: scopedUserIds } },
                    { receiverId: { in: scopedUserIds } },
                  ],
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        fileUrl: true,
        fileName: true,
        fileType: true,
        attachments: true,
        createdAt: true,
      },
      take: 500,
    });

    let photoCount = 0;
    let videoCount = 0;
    let docCount = 0;
    let audioCount = 0;

    messagesWithFiles.forEach((msg) => {
      const processType = (type?: string, name?: string) => {
        const t = (type || "").toLowerCase();
        const n = (name || "").toLowerCase();
        if (t.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(n))
          photoCount++;
        else if (t.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(n))
          videoCount++;
        else if (t.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(n))
          audioCount++;
        else docCount++;
      };

      if (msg.fileUrl) processType(msg.fileType || "", msg.fileName || "");
      if (Array.isArray(msg.attachments)) {
        msg.attachments.forEach((att: any) =>
          processType(
            att.fileType || att.mimeType || "",
            att.fileName || att.name || "",
          ),
        );
      }
    });

    return NextResponse.json(
      {
        departments,
        allUsers,
        selectedDepartmentId: departmentId || null,
        selectedUserId: filterUserId || null,
        selectedRole: filterRole || null,
        kpis: {
          totalTasks,
          overdueTasks,
          completionRate:
            totalTasks > 0
              ? Math.round(((totalTasks - overdueTasks) / totalTasks) * 100)
              : 100,
          totalRecords,
          completedRecords,
          totalAutomations,
          enabledAutomations,
          totalChannels,
          totalMessages,
          totalFiles: photoCount + videoCount + docCount + audioCount,
        },
        taskStatusBreakdown: tasksByStatus.map((item) => ({
          status: item.status,
          count: item._count._all,
        })),
        taskPriorityBreakdown: tasksByPriority.map((item) => ({
          priority: item.priority,
          count: item._count._all,
        })),
        stageBreakdown,
        tagBreakdown,
        userProductivity: users.map((u) => ({
          id: u.id,
          name: u.name || "User",
          email: u.email,
          image: u.image,
          role: u.role,
          tasksCreated: u._count.createdTasks,
          recordsCreated: u._count.createdRecords,
          messagesSent: u._count.sentMessages,
        })),
        fileStorageBreakdown: {
          photos: photoCount,
          videos: videoCount,
          docs: docCount,
          audio: audioCount,
          total: photoCount + videoCount + docCount + audioCount,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching dashboard overview reports:", error);
    return NextResponse.json(
      { message: "Failed to fetch analytics overview", error: error.message },
      { status: 500 },
    );
  }
}
