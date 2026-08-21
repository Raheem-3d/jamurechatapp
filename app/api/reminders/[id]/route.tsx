import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET - Fetch specific reminder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rawReminder = await db.reminder.findUnique({
      where: { id },
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

    if (!rawReminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    }

    // Check permissions
    const canView =
      rawReminder.assigneeId === user.id ||
      rawReminder.creatorId === user.id ||
      user.role === "ADMIN" ||
      user.role === "ORG_ADMIN" ||
      user.role === "SUPER_ADMIN" ||
      user.role === "MANAGER"

    if (!canView) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const reminder = {
      ...rawReminder,
      creator: (rawReminder as any).creator || (rawReminder as any).user_reminder_creatorIdTouser,
      assignee: (rawReminder as any).assignee || (rawReminder as any).user_reminder_assigneeIdTouser,
    }

    return NextResponse.json(reminder)
  } catch (error) {
    console.error("Error fetching reminder:", error)
    return NextResponse.json({ error: "Failed to fetch reminder" }, { status: 500 })
  }
}

// PATCH - Update reminder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, remindAt, isMuted, priority, type } = body

    const existingReminder = await db.reminder.findUnique({
      where: { id },
    })

    if (!existingReminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    }

    // Check permissions
    const canEdit =
      existingReminder.assigneeId === user.id ||
      existingReminder.creatorId === user.id ||
      user.role === "ADMIN" ||
      user.role === "ORG_ADMIN" ||
      user.role === "SUPER_ADMIN" ||
      user.role === "MANAGER"

    if (!canEdit) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (remindAt !== undefined) updateData.remindAt = new Date(remindAt)
    if (isMuted !== undefined) updateData.isMuted = isMuted
    if (priority !== undefined) updateData.priority = priority
    if (type !== undefined) updateData.type = type

    const rawUpdatedReminder = await db.reminder.update({
      where: { id },
      data: updateData,
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

    const updatedReminder = {
      ...rawUpdatedReminder,
      creator: (rawUpdatedReminder as any).creator || (rawUpdatedReminder as any).user_reminder_creatorIdTouser,
      assignee: (rawUpdatedReminder as any).assignee || (rawUpdatedReminder as any).user_reminder_assigneeIdTouser,
    }

    return NextResponse.json(updatedReminder)
  } catch (error) {
    console.error("Error updating reminder:", error)
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 500 })
  }
}

// DELETE - Delete reminder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingReminder = await db.reminder.findUnique({
      where: { id },
    })

    if (!existingReminder) {
      return NextResponse.json({ success: true, message: "Reminder already deleted" })
    }

    // Check permissions
    const canDelete =
      existingReminder.creatorId === user.id ||
      existingReminder.assigneeId === user.id ||
      user.role === "ADMIN" ||
      user.role === "ORG_ADMIN" ||
      user.role === "SUPER_ADMIN" ||
      user.role === "MANAGER"

    if (!canDelete) {
      return NextResponse.json(
        { error: "Only creators, assignees, and admins can delete reminders" },
        { status: 403 }
      )
    }

    await db.reminder.deleteMany({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting reminder:", error)
    return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 })
  }
}
