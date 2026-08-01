import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = params;
    const body = await req.json();
    const { userId, isMuted } = body;

    const targetUserId = userId || session.user.id;

    // Mute or unmute all reminders associated with this task for the target user
    await db.reminder.updateMany({
      where: {
        taskId,
        assigneeId: targetUserId,
      },
      data: {
        isMuted: Boolean(isMuted),
      },
    });

    return NextResponse.json({
      success: true,
      taskId,
      userId: targetUserId,
      isMuted: Boolean(isMuted),
    });
  } catch (error) {
    console.error("Error updating task mute settings:", error);
    return NextResponse.json(
      { error: "Failed to update mute settings" },
      { status: 500 }
    );
  }
}
