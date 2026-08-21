import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(
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
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 })
    }

    // Only assignee can mute/unmute their own reminders
    if (existingReminder.assigneeId !== user.id) {
      return NextResponse.json({ error: "Only assignees can mute/unmute reminders" }, { status: 403 })
    }

    const rawUpdatedReminder = await db.reminder.update({
      where: { id },
      data: {
        isMuted: !existingReminder.isMuted,
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

    const updatedReminder = {
      ...rawUpdatedReminder,
      creator: (rawUpdatedReminder as any).creator || (rawUpdatedReminder as any).user_reminder_creatorIdTouser,
      assignee: (rawUpdatedReminder as any).assignee || (rawUpdatedReminder as any).user_reminder_assigneeIdTouser,
    }

    return NextResponse.json({
      success: true,
      reminder: updatedReminder,
      action: updatedReminder.isMuted ? "muted" : "unmuted",
    })
  } catch (error) {
    console.error("Error toggling mute:", error)
    return NextResponse.json({ error: "Failed to toggle mute" }, { status: 500 })
  }
}
