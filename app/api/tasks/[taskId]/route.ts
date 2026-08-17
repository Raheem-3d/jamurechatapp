import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { emitToUser } from "@/lib/socket-server"
import { sendEmail } from "@/lib/email"

export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> | { taskId: string } }) {
  try {
    const { taskId } = await params
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user: any = await getSessionOrMobileUser(req as any)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const orgId = user.organizationId

    const task = await db.task.findUnique({
      where: {
        id: taskId,
      },
      include: {
        creator: true,
        assignments: {
          include: {
            user: true,
          },
        },
        comments: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        channel: true,
      },
    })

    if (!task || (orgId && (task as any).organizationId && (task as any).organizationId !== orgId)) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 })
    }

    // Check if user is authorized to view this task
    const isCreator = task.creatorId === user.id
    const isAssignee = task.assignments.some((assignment: any) => assignment.userId === user.id)

    if (!isCreator && !isAssignee) {
      return NextResponse.json({ message: "You are not authorized to view this task" }, { status: 403 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}



export async function PATCH(req: Request, { params }: { params: Promise<{ taskId: string }> | { taskId: string } }) {
  try {
    const { taskId } = await params
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user: any = await getSessionOrMobileUser(req as any)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { status } = await req.json()

    const orgId = user.organizationId
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: true,
        channel: true, // Make sure task has a relation to a channel
      },
    })

    if (!task || (orgId && (task as any).organizationId && (task as any).organizationId !== orgId)) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 })
    }

    const isCreator = task.creatorId === user.id
    const isAssignee = task.assignments.some((a: any) => a.userId === user.id)

    if (!isCreator && !isAssignee) {
      return NextResponse.json({ message: "You are not authorized to update this task" }, { status: 403 })
    }

    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: { status },
    })

    if (updatedTask.status === "DONE") {
      const { silenceTaskReminders } = await import("@/lib/reminder-processor")
      await silenceTaskReminders(taskId)
    }

    // Notify all assignees except the one who made the update
    for (const assignment of task.assignments) {
      if (assignment.userId === user.id) continue // skip self

      const updatedBy = user.name || user.email || "Someone"
      const notification = await db.notification.create({
        data: {
          type: "TASK_ASSIGNED",
          content: `Task "${updatedTask.title}" status updated to "${updatedTask.status}" by ${updatedBy}`,
          userId: assignment.userId,
          read: false,
        },
      })

      emitToUser(assignment.userId, "new-notification", notification)

      // Send Email
      try {
        const assignee = await db.user.findUnique({
          where: { id: assignment.userId },
        })
        if (assignee?.email) {
          await sendEmail({
            to: assignee.email,
            subject: `Task Updated: ${updatedTask.title}`,
            html: `
              <p>Hello ${assignee.name || "there"},</p>
              <p>The task <strong>${updatedTask.title}</strong> has been updated to status: <strong>${updatedTask.status}</strong> by ${updatedBy}.</p>
              <p>Thanks,<br/>Task Manager</p>
            `,
          })
        }
      } catch (emailError) {
        console.error("❌ Failed to send email:", emailError)
      }
    }

    return NextResponse.json(updatedTask)

  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}



export async function PUT(req: Request, { params }: { params: Promise<{ taskId: string }> | { taskId: string } }) {
  try {
    const { taskId } = await params
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user: any = await getSessionOrMobileUser(req as any)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is org admin or manager
    const userRec = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, name: true, email: true },
    })

    if (!userRec || (userRec.role !== "ORG_ADMIN" && userRec.role !== "MANAGER")) {
      return NextResponse.json({ message: "Only organization admins and managers can update tasks" }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, status, priority, deadline, deadlineRange, deadlineStart, deadlineEnd, assignees } = body

    // Compute updated deadline dates for calendar & task tracking
    let finalDeadline: Date | null = null
    let finalDeadlineStart: Date | null = null
    let finalDeadlineEnd: Date | null = null

    if (deadlineRange?.from) {
      finalDeadlineStart = new Date(deadlineRange.from)
      finalDeadlineEnd = new Date(deadlineRange.to ?? deadlineRange.from)
      finalDeadline = finalDeadlineEnd
    } else if (deadlineStart || deadlineEnd) {
      finalDeadlineStart = deadlineStart ? new Date(deadlineStart) : (deadlineEnd ? new Date(deadlineEnd) : null)
      finalDeadlineEnd = deadlineEnd ? new Date(deadlineEnd) : (deadlineStart ? new Date(deadlineStart) : null)
      finalDeadline = finalDeadlineEnd || finalDeadlineStart
    } else if (deadline) {
      const d = new Date(deadline)
      finalDeadlineStart = d
      finalDeadlineEnd = d
      finalDeadline = d
    }

    const orgId = user.organizationId
    const task = await db.task.findUnique({
      where: {
        id: taskId,
      },
      include: {
        assignments: true,
        channel: true,
      },
    })

    if (!task || (orgId && (task as any).organizationId && (task as any).organizationId !== orgId)) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 })
    }

    // Delete old assignments
    await db.taskAssignment.deleteMany({
      where: {
        taskId: taskId,
      },
    })

    // Create new assignments
    if (assignees && assignees.length > 0) {
      await Promise.all(
        assignees.map((userId: string) =>
          db.taskAssignment.create({ data: { taskId: taskId, userId } })
        )
      )
    }

    // Update task details with synchronized deadline, deadlineStart and deadlineEnd
    let updatedTask
    try {
      updatedTask = await db.task.update({
        where: {
          id: taskId,
        },
        data: {
          title,
          description,
          status,
          priority,
          deadline: finalDeadline,
          // @ts-ignore
          deadlineStart: finalDeadlineStart,
          // @ts-ignore
          deadlineEnd: finalDeadlineEnd,
        },
      })
    } catch (e: any) {
      // Fallback if schema doesn't have deadlineStart/deadlineEnd
      updatedTask = await db.task.update({
        where: {
          id: taskId,
        },
        data: {
          title,
          description,
          status,
          priority,
          deadline: finalDeadline,
        },
      })
    }

    if (updatedTask.status === "DONE") {
      const { silenceTaskReminders } = await import("@/lib/reminder-processor")
      await silenceTaskReminders(taskId)
    }

    const currentAssigneeIds = task.assignments.map((a: any) => a.userId)
    const assigneesToRemove = currentAssigneeIds.filter((id: any) => !assignees.includes(id))
    const assigneesToAdd = assignees.filter((id: any) => !currentAssigneeIds.includes(id))

    if (assigneesToRemove.length > 0) {
      await db.taskAssignment.deleteMany({
        where: {
          taskId: taskId,
          userId: { in: assigneesToRemove },
        },
      })
    }

    if (assigneesToAdd.length > 0) {
      const assignmentPromises = assigneesToAdd.map((userId: string) =>
        db.taskAssignment.create({ data: { taskId: taskId, userId } })
      )
      await Promise.all(assignmentPromises)

      if (task.channel) {
        const channelMemberPromises = assigneesToAdd.map((userId: string) =>
          db.channelMember.create({
            data: { userId, channelId: task.channel.id },
          })
        )
        await Promise.all(channelMemberPromises)
      }

      // 🔡 Emit task assignment events to new assignees for real-time updates
      for (const userId of assigneesToAdd) {
        emitToUser(userId, "task:assigned", {
          taskId: taskId,
          taskTitle: task.title,
          taskPriority: task.priority,
        });
      }
    }

    const finalTask = await db.task.findUnique({
      where: { id: taskId },
      include: {
        creator: true,
        assignments: { include: { user: true } },
        channel: true,
      },
    })

    // 🔔 Send notifications to all assignees (except updater)
    const updatedBy = userRec.name || userRec.email || "Someone"
    const notificationContent = `Task "${finalTask?.title}" was updated by ${updatedBy}`

    for (const assignment of finalTask?.assignments || []) {
      if (assignment.userId === user.id) continue

      const notification = await db.notification.create({
        data: {
         type: "TASK_ASSIGNED",
          content: notificationContent,
          userId: assignment.userId,
          read: false,
        },
      })

      emitToUser(assignment.userId, "new-notification", notification)
    }

    return NextResponse.json(finalTask)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ taskId: string }> | { taskId: string } }) {
  try {
    const { taskId } = await params
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user: any = await getSessionOrMobileUser(req as any)
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is org admin or manager
    const userRec = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, name: true, email: true },
    })

    if (!userRec || (userRec.role !== "ORG_ADMIN" && userRec.role !== "MANAGER")) {
      return NextResponse.json({ message: "Only organization admins and managers can delete tasks" }, { status: 403 })
    }

    const orgId = user.organizationId
    const task = await db.task.findUnique({
      where: {
        id: taskId,
      },
      include: {
        assignments: true,
        channel: true,
        comments: true,
      },
    })

    if (!task || (orgId && (task as any).organizationId && (task as any).organizationId !== orgId)) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 })
    }

    // Delete related records first
    // Delete task assignments
    await db.taskAssignment.deleteMany({
      where: {
        taskId: taskId,
      },
    })

    // Delete task comments
    await db.taskComment.deleteMany({
      where: {
        taskId: taskId,
      },
    })

    // Delete associated notifications
    await db.notification.deleteMany({
      where: {
        taskId: taskId,
      },
    })

    // If task has a channel, optionally delete it or just disassociate
    if (task.channelId) {
      // You can choose to delete the channel or just set task's channelId to null
      // For now, we'll just delete the task and leave the channel
    }

    // Delete the task
    await db.task.delete({
      where: {
        id: taskId,
      },
    })

    // Notify all assignees about task deletion
    const deletedBy = userRec.name || userRec.email || "Someone"
    for (const assignment of task.assignments) {
      const notification = await db.notification.create({
        data: {
          type: "TASK_ASSIGNED",
          content: `Task "${task.title}" was deleted by ${deletedBy}`,
          userId: assignment.userId,
          read: false,
        },
      })

      emitToUser(assignment.userId, "new-notification", notification)
    }

    return NextResponse.json({ message: "Task deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
