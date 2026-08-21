import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { emitToUser } from "@/lib/socket-server"
import { randomUUID } from "crypto"

// GET - Fetch reminders for current user or all (if admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const assigneeId = searchParams.get("assigneeId")
    const includeAll = searchParams.get("includeAll") === "true"

    const whereClause: any = {}

    // If user is org admin and wants to see all reminders
  if (user.role === "ORG_ADMIN" && includeAll) {
      // No filter - get all reminders
  } else if (assigneeId && user.role === "ORG_ADMIN") {
      // Org admin viewing specific user's reminders
      whereClause.assigneeId = assigneeId
    } else {
      // Regular user - only their own reminders
  whereClause.OR = [{ assigneeId: user.id }, { creatorId: user.id }]
    }

    const rawReminders = await db.reminder.findMany({
      where: whereClause,
      include: {
        user_reminder_creatorIdTouser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        user_reminder_assigneeIdTouser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        remindAt: "asc",
      },
    })

    const reminders = rawReminders.map((r: any) => ({
      ...r,
      creator: r.creator || r.user_reminder_creatorIdTouser,
      assignee: r.assignee || r.user_reminder_assigneeIdTouser,
    }))

    return NextResponse.json(reminders)
  } catch (error) {
    console.error("Error fetching reminders:", error)
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 })
  }
}

// POST - Create new reminder
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, remindAt, assigneeId, assigneeIds, priority, type } = body

    if (!title || !remindAt) {
      return NextResponse.json({ error: "Title and remind time are required" }, { status: 400 })
    }

    const rawAssigneeIds: string[] = Array.isArray(assigneeIds) && assigneeIds.length > 0
      ? assigneeIds
      : [assigneeId || user.id]

    const targetAssigneeIds = Array.from(new Set(rawAssigneeIds))

    const isUserAdmin =
      user.role === "ORG_ADMIN" ||
      user.role === "SUPER_ADMIN" ||
      user.role === "ADMIN" ||
      user.role === "MANAGER"

    const assigningToOthers = targetAssigneeIds.some((id) => id !== user.id)
    if (assigningToOthers && !isUserAdmin) {
      return NextResponse.json({ error: "Only organization admins and managers can assign reminders to other users" }, { status: 403 })
    }

    const validUsers = await db.user.findMany({
      where: { id: { in: targetAssigneeIds } },
      select: { id: true },
    })

    if (validUsers.length === 0) {
      return NextResponse.json({ error: "Assignee not found" }, { status: 404 })
    }

    const validAssigneeIds = validUsers.map((u) => u.id)

    const createdReminders = await Promise.all(
      validAssigneeIds.map(async (targetId) => {
        const rawReminder = await db.reminder.create({
          data: {
            id: randomUUID(),
            title,
            description,
            remindAt: new Date(remindAt),
            priority: priority || "MEDIUM",
            type: type || "GENERAL",
            creatorId: user.id,
            assigneeId: targetId,
            updatedAt: new Date(),
          },
          include: {
            user_reminder_creatorIdTouser: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            user_reminder_assigneeIdTouser: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        })

        const reminder = {
          ...rawReminder,
          creator: (rawReminder as any).creator || (rawReminder as any).user_reminder_creatorIdTouser,
          assignee: (rawReminder as any).assignee || (rawReminder as any).user_reminder_assigneeIdTouser,
        }

        emitToUser(targetId, 'jf', reminder)
        return reminder
      })
    )

    return NextResponse.json(
      createdReminders.length === 1 ? createdReminders[0] : createdReminders,
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating reminder:", error)
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 })
  }
}
