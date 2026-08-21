import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getSessionUserWithPermissions } from "@/lib/org"
import { checkSuperAdmin } from "@/lib/permissions"

// GET /api/superadmin/tasks/[taskId] - Get task details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  try {
    const { taskId } = await params
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const rawTask = await db.task.findUnique({
      where: { id: taskId },
      include: {
        organization: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true, image: true }
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        taskcomment: {
          include: {
            user: {
              select: { id: true, name: true, image: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            taskcomment: true,
            assignments: true
          }
        }
      }
    })

    if (!rawTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const task = {
      ...rawTask,
      comments: (rawTask as any).comments || (rawTask as any).taskcomment || [],
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    )
  }
}

// PATCH /api/superadmin/tasks/[taskId] - Update task
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  try {
    const { taskId } = await params
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    const body = await req.json()
    const { title, description, status, priority, deadline } = body

    const rawTask = await db.task.update({
      where: { id: taskId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      },
      include: {
        organization: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true, image: true }
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        }
      }
    })

    const task = {
      ...rawTask,
      comments: (rawTask as any).comments || (rawTask as any).taskcomment || [],
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    )
  }
}

// DELETE /api/superadmin/tasks/[taskId] - Delete task
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  try {
    const { taskId } = await params
    const user = await getSessionUserWithPermissions()
    checkSuperAdmin(user.isSuperAdmin)

    // Delete related records first
    await db.$transaction([
      // Delete task assignments
      db.taskAssignment.deleteMany({
        where: { taskId }
      }),
      // Delete task comments
      db.taskComment.deleteMany({
        where: { taskId }
      }),
      // Delete the task
      db.task.delete({
        where: { id: taskId }
      })
    ])

    return NextResponse.json({ 
      success: true, 
      message: "Task deleted successfully" 
    })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    )
  }
}
