import { type NextRequest, NextResponse } from "next/server";
import { getSessionOrMobileUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import { ensureDbSchema } from "@/lib/db-init";

export async function GET(request: NextRequest) {
  try {
    await ensureDbSchema();
    const user = await getSessionOrMobileUser(request as any);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // 1. Unread Direct Messages sent to current user
    const dmMessages = await db.message.findMany({
      where: {
        receiverId: userId,
        channelId: null,
        senderId: { not: userId },
      },
      select: {
        senderId: true,
        seenBy: true,
      },
    });

    const dms: Record<string, number> = {};
    let totalDms = 0;

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

    for (const msg of dmMessages) {
      const seenArr = parseSeen(msg.seenBy);
      if (!seenArr.includes(userId)) {
        dms[msg.senderId] = (dms[msg.senderId] || 0) + 1;
        totalDms += 1;
      }
    }

    // 2. Unread Channel Messages
    const channelMemberDb = (db as any).channelmember || (db as any).channelMember;
    const userMemberships = await channelMemberDb.findMany({
      where: { userId },
      select: { channelId: true },
    });
    const userChannelIds = userMemberships.map((m: any) => m.channelId);

    const publicChannels = await db.channel.findMany({
      where: {
        isPublic: true,
        ...(user.organizationId ? { organizationId: user.organizationId } : {}),
      },
      select: { id: true },
    });
    const allAccessibleChannelIds = Array.from(
      new Set([...userChannelIds, ...publicChannels.map((c) => c.id)])
    );

    const channelMessages = await db.message.findMany({
      where: {
        channelId: { in: allAccessibleChannelIds },
        senderId: { not: userId },
      },
      select: {
        channelId: true,
        seenBy: true,
      },
    });

    const channels: Record<string, number> = {};
    let totalChannels = 0;

    for (const msg of channelMessages) {
      if (!msg.channelId) continue;
      const seenArr = parseSeen(msg.seenBy);
      if (!seenArr.includes(userId)) {
        channels[msg.channelId] = (channels[msg.channelId] || 0) + 1;
        totalChannels += 1;
      }
    }

    return NextResponse.json({
      dms,
      channels,
      totalDms,
      totalChannels,
      totalUnread: totalDms + totalChannels,
    });
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
