
import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET: Fetch task assignees
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { taskId } = await params

    // Fetch users assigned to the given task
    const assignees = await db.user.findMany({
      where: {
        taskassignment: {
          some: {
            taskId,
          },
        },
        ...(user.organizationId ? { organizationId: user.organizationId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        // avatar: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(assignees)
  } catch (error) {
    console.error('Error fetching task assignees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignees' },
      { status: 500 }
    )
  }
}


// POST: Assign user to task

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> | { taskId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const taskAssignmentDb = (db as any).taskassignment || (db as any).taskAssignment;

    // Check if already assigned
    const existing = await taskAssignmentDb.findFirst({
      where: {
        taskId,
        userId,
      },
    })

    if (existing) {
      return NextResponse.json({ error: "User already assigned" }, { status: 400 })
    }

    // Assign user
    await taskAssignmentDb.create({
      data: {
        taskId,
        userId,
        createdAt: new Date(),
      },
    })

  

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error assigning user:", error)
    return NextResponse.json({ error: "Failed to assign user" }, { status: 500 })
  }
}

// DELETE: Unassign user from task
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ taskId: string }> | { taskId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const user: any = (session as any)?.user || {}
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { taskId } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const taskAssignmentDb = (db as any).taskassignment || (db as any).taskAssignment;
    const taskActivityDb = (db as any).taskactivity || (db as any).taskActivity;

    // Delete assignment
    await taskAssignmentDb.deleteMany({
      where: {
        taskId,
        userId,
      },
    })

    // Log activity
    await taskActivityDb.create({
      data: {
        taskId,
        userId: user.id,
        type: "user_unassigned",
        description: "User unassigned from task",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unassigning user:", error)
    return NextResponse.json({ error: "Failed to unassign user" }, { status: 500 })
  }
}

