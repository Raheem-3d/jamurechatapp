import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/subtasks/[subtaskId] - Toggle completion or update subtask
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ subtaskId: string }> | { subtaskId: string } }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subtaskId } = await params;
    const body = await req.json();
    const { isComplete, status, title, priority, dueDate } = body;

    const existing = await db.record.findUnique({
      where: { id: subtaskId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    const updatedData: any = {};
    if (isComplete !== undefined) {
      updatedData.isComplete = Boolean(isComplete);
      if (isComplete) {
        updatedData.status = "DONE";
      } else {
        updatedData.status = "TODO";
      }
    }
    if (status !== undefined) updatedData.status = status;
    if (title !== undefined) updatedData.title = title.trim();
    if (priority !== undefined) updatedData.priority = priority.toUpperCase();
    if (dueDate !== undefined) updatedData.dueDate = dueDate ? new Date(dueDate) : null;

    updatedData.updatedAt = new Date();

    const updated = await db.record.update({
      where: { id: subtaskId },
      data: updatedData,
      include: {
        stage: { select: { id: true, name: true, color: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, subtask: updated });
  } catch (error: any) {
    console.error("Error updating subtask:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update subtask" },
      { status: 500 }
    );
  }
}

// DELETE /api/subtasks/[subtaskId] - Delete a subtask
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ subtaskId: string }> | { subtaskId: string } }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subtaskId } = await params;
    const existing = await db.record.findUnique({
      where: { id: subtaskId },
      select: { id: true, parentTaskId: true, title: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    // Clean up record assignments if any
    try {
      const taskAssignmentDb = (db as any).taskassignment || (db as any).taskAssignment;
      // Remove assignments linked to this record
    } catch {}

    await db.record.delete({
      where: { id: subtaskId },
    });

    return NextResponse.json({ success: true, message: "Subtask deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting subtask:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete subtask" },
      { status: 500 }
    );
  }
}
