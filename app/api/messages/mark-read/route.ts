import { type NextRequest, NextResponse } from "next/server";
import { getSessionOrMobileUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { ensureDbSchema } from "@/lib/db-init";

export async function POST(request: NextRequest) {
  try {
    await ensureDbSchema();
    const user = await getSessionOrMobileUser(request as any);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const body = await request.json().catch(() => ({}));
    const { senderId, channelId, messageIds } = body || {};

    let targetMessages: { id: string; seenBy: any }[] = [];

    if (Array.isArray(messageIds) && messageIds.length > 0) {
      targetMessages = await db.message.findMany({
        where: { id: { in: messageIds } },
        select: { id: true, seenBy: true },
      });
    } else if (senderId) {
      // Find direct messages sent by senderId to current userId
      targetMessages = await db.message.findMany({
        where: {
          receiverId: userId,
          senderId: senderId,
          channelId: null,
        },
        select: { id: true, seenBy: true },
      });
    } else if (channelId) {
      // Find messages in channelId sent by anyone other than current userId
      targetMessages = await db.message.findMany({
        where: {
          channelId: channelId,
          senderId: { not: userId },
        },
        select: { id: true, seenBy: true },
      });
    }

    const parseSeen = (seenBy: any): string[] => {
      if (!seenBy) return [];
      if (Array.isArray(seenBy)) return seenBy;
      if (typeof seenBy === "string") {
        try {
          const parsed = JSON.parse(seenBy);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          return seenBy.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
      return [];
    };

    let markedCount = 0;
    for (const msg of targetMessages) {
      const seenArr = parseSeen(msg.seenBy);
      if (!seenArr.includes(userId)) {
        const nextSeen = [...seenArr, userId];
        await db.message.update({
          where: { id: msg.id },
          data: { seenBy: JSON.stringify(nextSeen) },
        });
        markedCount++;
      }
    }

    return NextResponse.json({ success: true, markedCount });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
