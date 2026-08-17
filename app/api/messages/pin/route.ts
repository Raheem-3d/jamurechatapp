import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emitToUser, emitToChannel } from "@/lib/socket-server";

export async function POST(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import("@/lib/mobile-auth");
    const currentUser = await getSessionOrMobileUser(req as any);

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { messageId, pin } = await req.json();
    if (!messageId) {
      return NextResponse.json({ message: "Message ID is required" }, { status: 400 });
    }

    // Fetch target message
    const message = await db.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        channel: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ message: "Message not found" }, { status: 404 });
    }

    const isPinning = pin !== undefined ? Boolean(pin) : !message.isPinned;

    // Check permissions
    if (message.channelId && message.channel) {
      // Channel: Creator, Org Admin, Super Admin, or Channel Admin
      const isCreator = message.channel.creatorId === currentUser.id;
      const isOrgAdmin = currentUser.role === "ORG_ADMIN" || (currentUser as any).isSuperAdmin;
      const isChannelAdmin = message.channel.members.some(
        (m: any) => m.userId === currentUser.id && (m.isAdmin || (m as any).role === "ADMIN")
      );

      if (!isCreator && !isOrgAdmin && !isChannelAdmin) {
        return NextResponse.json(
          { message: "Only channel admins can pin or unpin messages" },
          { status: 403 }
        );
      }
    } else if (message.receiverId) {
      // DM: Both sender and receiver can pin/unpin
      const isParticipant =
        message.senderId === currentUser.id || message.receiverId === currentUser.id;
      if (!isParticipant) {
        return NextResponse.json(
          { message: "You cannot pin messages in this conversation" },
          { status: 403 }
        );
      }
    }

    // Update isPinned status in database
    const updatedMessage = await db.message.update({
      where: { id: messageId },
      data: { isPinned: isPinning },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Real-time broadcast via Socket.io
    const payload = {
      messageId: updatedMessage.id,
      isPinned: updatedMessage.isPinned,
      channelId: updatedMessage.channelId,
      receiverId: updatedMessage.receiverId,
      senderId: updatedMessage.senderId,
      pinnedBy: currentUser.name,
      message: updatedMessage,
    };

    if (updatedMessage.channelId) {
      emitToChannel(updatedMessage.channelId, "message:pinned-status", payload);
    } else if (updatedMessage.receiverId) {
      emitToUser(updatedMessage.receiverId, "message:pinned-status", payload);
      emitToUser(currentUser.id, "message:pinned-status", payload);
    }

    return NextResponse.json(
      {
        success: true,
        isPinned: updatedMessage.isPinned,
        message: updatedMessage,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error toggling message pin:", error);
    return NextResponse.json(
      { message: "Failed to update pinned message", error: error.message },
      { status: 500 }
    );
  }
}
