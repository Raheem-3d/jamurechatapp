// app/api/buzz/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { emitToChannel, emitToUser, getSocketIO } from "@/lib/socket-server";
import { db } from "@/lib/db";
import { buildBuzzNotificationData } from "@/lib/buzz-utils";

const BUZZ_LIMIT = 3;
const WINDOW_MS = 60_000;
const buzzCounter: Map<string, { count: number; resetAt: number }> = new Map();

function canBuzz(userId: string) {
  const now = Date.now();
  const current = buzzCounter.get(userId);
  if (!current || now > current.resetAt) {
    buzzCounter.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count < BUZZ_LIMIT) {
    current.count += 1;
    return true;
  }
  return false;
}

export async function getChannelMemberIds(
  channelId: string,
): Promise<string[]> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const channel = await db.channel.findUnique({
    where: { id: channelId },
    select: { members: { select: { userId: true } } },
  });

  if (!channel) return [];
  return channel.members.map((m) => m.userId).filter(Boolean) as string[];
}

export async function POST(req: Request) {
  try {
    const io = getSocketIO();
    if (!io) {
      return NextResponse.json(
        { error: "Socket server not ready" },
        { status: 503 },
      );
    }

    const session = await getServerSession(authOptions as any);
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId, receiverId, message, clientId } = await req.json();

    if (!channelId && !receiverId) {
      return NextResponse.json(
        { error: "channelId or receiverId required" },
        { status: 400 },
      );
    }

    if (!canBuzz(userId)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const sender = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const buzzInfo = buildBuzzNotificationData(
      sender?.name || sender?.email,
      message,
    );

    const payload = {
      channelId: channelId as string | undefined,
      receiverId: receiverId as string | undefined,
      fromUserId: userId,
      senderName: buzzInfo.senderName,
      message: buzzInfo.message,
      title: buzzInfo.title,
      clientId,
    };

    const emitBuzzEvent = async (
      buzzMsg: any,
      eventType: "direct" | "channel",
    ) => {
      try {
        const { pushCacheList } = require("@/lib/redis");
        const { produceKafkaEvent } = require("@/lib/kafka");
        const cacheKey =
          eventType === "direct"
            ? `buzz:dm:${[userId, receiverId].sort().join(":")}`
            : `buzz:channel:${channelId}`;

        pushCacheList(
          cacheKey,
          {
            ...payload,
            buzzMessage: buzzMsg,
            eventType,
            timestamp: new Date().toISOString(),
          },
          100,
        ).catch(() => {});
        produceKafkaEvent("buzz-events", {
          ...payload,
          buzzMessage: buzzMsg,
          eventType,
        }).catch(() => {});
      } catch (err) {
        // non-fatal fallback when Kafka/Redis are unavailable
      }
    };

    if (receiverId) {
      if (receiverId !== userId) {
        const buzzMsg = {
          id: `buzz_${Date.now()}`,
          content: buzzInfo.systemContent,
          isBuzz: true,
          senderId: userId,
          receiverId,
          clientId,
          status: "sent",
          createdAt: new Date().toISOString(),
          sender: {
            id: userId,
            name: buzzInfo.senderName,
            email: sender?.email || "",
            image: null,
          },
        };

        emitToUser(receiverId, "buzz", payload);
        emitToUser(receiverId, "new-message", buzzMsg);
        emitToUser(userId, "new-message", buzzMsg);
        void emitBuzzEvent(buzzMsg, "direct");
      }

      try {
        await db.message.create({
          data: {
            id: crypto.randomUUID(),
            content: buzzInfo.systemContent,
            senderId: userId,
            receiverId,
            isBuzz: true,
            updatedAt: new Date(),
          } as any,
        });
      } catch (_) {
        // keep going if DB schema differs
      }

      return NextResponse.json({ ok: true });
    }

    const memberIds = await getChannelMemberIds(channelId);
    const targets = memberIds.filter((id) => id && id !== userId);

    if (targets.length > 0) {
      targets.forEach((uid) => emitToUser(uid, "buzz", payload));
    }

    try {
      const buzzMsg = await db.message.create({
        data: {
          id: crypto.randomUUID(),
          content: buzzInfo.systemContent,
          senderId: userId,
          channelId,
          isBuzz: true,
          updatedAt: new Date(),
        } as any,
        include: {
          sender: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      });
      const emittedBuzzMsg = {
        ...buzzMsg,
        clientId,
        status: "sent",
      };

      emitToChannel(channelId, "new-message", emittedBuzzMsg);
      emitToChannel(channelId, "buzz", payload);
      emitToUser(userId, "new-message", emittedBuzzMsg);
      targets.forEach((uid) => emitToUser(uid, "new-message", emittedBuzzMsg));
      void emitBuzzEvent(emittedBuzzMsg, "channel");
    } catch (_) {
      const fallbackBuzzMsg = {
        id: `buzz_${Date.now()}`,
        content: buzzInfo.systemContent,
        isBuzz: true,
        senderId: userId,
        channelId,
        clientId,
        status: "sent",
        createdAt: new Date().toISOString(),
        sender: {
          id: userId,
          name: buzzInfo.senderName,
          email: sender?.email || "",
          image: null,
        },
      };
      emitToChannel(channelId, "new-message", fallbackBuzzMsg);
      emitToChannel(channelId, "buzz", payload);
      emitToUser(userId, "new-message", fallbackBuzzMsg);
      targets.forEach((uid) => emitToUser(uid, "new-message", fallbackBuzzMsg));
      void emitBuzzEvent(fallbackBuzzMsg, "channel");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/buzz error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
