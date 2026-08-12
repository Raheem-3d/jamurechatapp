import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import("@/lib/mobile-auth");
    const currentUser = await getSessionOrMobileUser(req as any);

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");
    const receiverId = searchParams.get("receiverId");

    if (!channelId && !receiverId) {
      return NextResponse.json(
        { message: "Either channelId or receiverId must be provided" },
        { status: 400 }
      );
    }

    let whereCondition: any = { isPinned: true };

    if (channelId) {
      whereCondition.channelId = channelId;
    } else if (receiverId) {
      whereCondition.OR = [
        { senderId: currentUser.id, receiverId },
        { senderId: receiverId, receiverId: currentUser.id },
      ];
    }

    const pinnedMessages = await db.message.findMany({
      where: whereCondition,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      {
        count: pinnedMessages.length,
        pinnedMessages,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching pinned messages:", error);
    return NextResponse.json(
      { message: "Failed to fetch pinned messages", error: error.message },
      { status: 500 }
    );
  }
}
