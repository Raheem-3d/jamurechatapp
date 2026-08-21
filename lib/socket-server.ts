import { Server as ServerIO } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type { NextApiResponse } from "next";
import {
  addReactionJSON,
  getMessageChannelId,
  getReactions,
  getMessagePeers,
  removeReactionJSON,
} from "./reactions";
import { db } from "./db";
import { buildBuzzNotificationData } from "./buzz-utils";

export interface SocketServer extends HTTPServer {
  io?: ServerIO;
}

export interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: SocketWithIO;
}

let io: ServerIO | null = null;

// ---------------------
// Helpers / Stubs
// ---------------------
async function getChannelMemberIds(channelId: string): Promise<string[]> {
  try {
    const rows = await db.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });
    return rows
      .map((r: { userId: string }) => r.userId)
      .filter(Boolean) as string[];
  } catch (e) {
    console.error("getChannelMemberIds failed for", channelId, e);
    return [];
  }
}

// Simple in-memory rate limiter per sender userId (token bucket-ish)
const BUZZ_LIMIT = 3; // max buzzes per WINDOW_MS
const WINDOW_MS = 60_000; // 1 minute
const buzzCounter = new Map<string, { count: number; resetAt: number }>();
function canBuzz(userId: string) {
  const now = Date.now();
  const entry = buzzCounter.get(userId);
  if (!entry || now > entry.resetAt) {
    buzzCounter.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count < BUZZ_LIMIT) {
    entry.count += 1;
    return true;
  }
  return false;
}

export function initializeSocketIO(server: HTTPServer) {
  if (io) {
    console.log("Socket.io already initialized");
    return io;
  }

  // Ensure reminder system background processor is running
  try {
    const reminderInit = require("./reminder-init");
    const fn =
      reminderInit.initializeReminderSystem ||
      reminderInit.default?.initializeReminderSystem ||
      reminderInit.default;
    if (typeof fn === "function") {
      fn();
    }
  } catch (e) {
    console.error("Failed to initialize reminder system:", e);
  }

  io = new ServerIO(server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["polling", "websocket"],
  });

  // Attempt to attach Redis adapter for multi-node cluster scaling
  try {
    const { initRedis, isRedisConnected } = require("./redis");
    const { pubClient, subClient, isConnected } = initRedis();
    const req = eval("require");
    const redisAdapterModule = req("@socket.io/redis-adapter");
    const isReady =
      isConnected &&
      pubClient?.status === "ready" &&
      subClient?.status === "ready";
    if (isReady && redisAdapterModule?.createAdapter) {
      io.adapter(redisAdapterModule.createAdapter(pubClient, subClient));
      console.log(
        "> [Socket.io] Redis adapter attached for multi-node scaling",
      );
    }
  } catch (e) {
    // Operating without Redis adapter (in-memory mode)
  }

  // online userId -> Set<socketId>
  const onlineUsers = new Map<string, Set<string>>();
  const offlineDisconnectTimers = new Map<string, NodeJS.Timeout>();

  io.on("connect", (socket) => {
    // console.log("✅ User connected:", socket.id);

    // --------------
    // USER ONLINE
    // --------------
    // Support both event names used across your code: "user-join" (old) and "user:online" (new)
    const onUserOnline = (userId: string) => {
      try {
        if (!userId) return;
        if (offlineDisconnectTimers.has(userId)) {
          clearTimeout(offlineDisconnectTimers.get(userId)!);
          offlineDisconnectTimers.delete(userId);
        }
        if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
        onlineUsers.get(userId)!.add(socket.id);
        socket.join(`user-${userId}`);
        socket.data.userId = userId;
        const onlineUserIds = Array.from(onlineUsers.keys());
        if (io) {
          io.emit("users-online", onlineUserIds);
          io.emit("user:status", { onlineUsers: onlineUserIds });
        }

        // When a user comes online, notify senders of pending messages (delivery confirmation)
        // This handles the case where user was offline and messages were sent
        void (async () => {
          try {
            const messages = await db.message.findMany({
              where: {
                receiverId: userId,
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                },
              },
              select: { senderId: true, id: true },
              take: 100,
            });

            // Group by sender and notify each sender that their messages are now delivered
            const sendersSet = new Set<string>();
            for (const msg of messages) {
              if (msg.senderId) sendersSet.add(msg.senderId);
            }

            for (const senderId of sendersSet) {
              const messageIds = messages
                .filter(
                  (m: { senderId: string; id: string }) =>
                    m.senderId === senderId,
                )
                .map((m: { senderId: string; id: string }) => m.id);
              if (messageIds.length > 0 && io) {
                io.to(`user-${senderId}`).emit("messages:delivered", {
                  messageIds,
                  recipientId: userId,
                });
              }
            }
          } catch (err) {
            console.error("Failed to find pending messages:", err);
          }
        })();
      } catch (err) {
        console.error("Error handling onUserOnline:", err);
      }
    };
    socket.on("user-join", onUserOnline);
    socket.on("user:online", ({ userId }: { userId: string }) =>
      onUserOnline(userId),
    );

    // --------------
    // USER OFFLINE
    // --------------
    socket.on("user-offline", (userId: string) => {
      handleUserDisconnect(userId, socket.id);
    });

    // --------------
    // CHANNEL JOIN/LEAVE
    // --------------
    socket.on("join-channel", (channelId: string) => {
      socket.join(`channel-${channelId}`);
      // console.log(`📺 Socket ${socket.id} joined channel: ${channelId}`);
    });

    socket.on("leave-channel", (channelId: string) => {
      socket.leave(`channel-${channelId}`);
      // console.log(`📺 Socket ${socket.id} left channel: ${channelId}`);
    });

    // --------------
    // MESSAGE EVENTS (kept as-is to match your current code)
    // --------------
    // socket.on("send-message", (data) => {
    //   console.log("📨 Broadcasting message:", data?.id);
    //   if (data?.channelId) {
    //     socket.to(`channel-${data.channelId}`).emit("new-message", data);
    //   } else if (data?.receiverId) {
    //     socket.to(`user-${data.receiverId}`).emit("new-message", data);
    //   }
    // });

    socket.on("send-message", (data, ack) => {
      try {
        const senderId: string | undefined = socket.data.userId;

        // Acknowledge to sender that server received the message
        ack?.(true);

        // Notify sender that message is saved/received by server => 'sent'
        if (senderId) {
          io!.to(`user-${senderId}`).emit("message:status-updated", {
            messageId: data?.id,
            status: "sent",
          });
        }

        if (data.channelId) {
          // Broadcast to all channel members (including sender for multi-device sync)
          io!.to(`channel-${data.channelId}`).emit("new-message", data);
          // Also emit to sender's personal room for consistency
          if (senderId) {
            io!.to(`user-${senderId}`).emit("new-message", data);
          }
        } else if (data.receiverId) {
          // Emit to receiver's personal room (works for DM)
          io!.to(`user-${data.receiverId}`).emit("new-message", data);

          // If the recipient is currently online (has sockets), consider the message delivered
          const recipientSockets = onlineUsers.get(data.receiverId as string);
          if (recipientSockets && recipientSockets.size > 0 && senderId) {
            io!.to(`user-${senderId}`).emit("message:status-updated", {
              messageId: data?.id,
              status: "delivered",
            });
          }
        }
      } catch (e) {
        console.error("send-message error:", e);
        ack?.(false);
      }
    });

    // ---------------------
    // MESSAGE STATUS UPDATES (from clients)
    // ---------------------
    socket.on(
      "message:status-update",
      async (payload: { messageId: string; status: string }) => {
        try {
          const { messageId, status } = payload || {};
          if (!messageId) return;

          // Find sender of the message so we can notify them
          const msg = await db.message.findUnique({
            where: { id: messageId },
            select: { senderId: true },
          });
          const senderId = msg?.senderId;
          if (!senderId) return;

          // Broadcast status update to the message sender
          io!
            .to(`user-${senderId}`)
            .emit("message:status-updated", { messageId, status });
        } catch (err) {
          console.error("message:status-update handler error", err);
        }
      },
    );

    // ---------------------
    // MARK AS READ (persist and notify senders)
    // payload: { messageIds: string[] }
    // ---------------------
    socket.on("mark-as-read", async (payload: { messageIds: string[] }) => {
      try {
        const readerId: string | undefined = socket.data.userId as any;
        const messageIds = Array.isArray(payload?.messageIds)
          ? payload.messageIds
          : [];
        if (!readerId || messageIds.length === 0) return;

        const parseSeenBy = (seenBy: any): string[] => {
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

        const updatedSenders = new Set<string>();

        for (const mid of messageIds) {
          try {
            const existing = await db.message.findUnique({
              where: { id: mid },
              select: {
                seenBy: true,
                senderId: true,
              },
            });

            const prev = parseSeenBy(existing?.seenBy);

            if (!prev.includes(readerId)) {
              const next = [...prev, readerId];
              await db.message.update({
                where: { id: mid },
                data: {
                  seenBy: JSON.stringify(next),
                },
              });
            }
            if (existing?.senderId) updatedSenders.add(existing.senderId);
          } catch (e) {
            console.error("Failed to mark message read", mid, e);
          }
        }

        // Notify each sender that their messages were read
        for (const s of updatedSenders) {
          io!.to(`user-${s}`).emit("messages:read", { messageIds, readerId });
        }
      } catch (err) {
        console.error("mark-as-read handler error", err);
      }
    });

    socket.on("send-notification", (data) => {
      console.log("🔔 Broadcasting notification to user:", data?.userId);
      if (!data?.userId) return;
      socket.to(`user-${data.userId}`).emit("new-notification", data);
    });

    // --------------
    // MESSAGE DELETION
    // --------------
    socket.on("message:delete", async (payload: { messageId: string }) => {
      try {
        const { messageId } = payload;
        if (!messageId) return;

        console.log("🗑️ Broadcasting message deletion:", messageId);

        // Get the message details to notify relevant users
        const message = await db.message.findUnique({
          where: { id: messageId },
          select: {
            channelId: true,
            senderId: true,
            receiverId: true,
          },
        });

        if (!message) return;

        // Broadcast to channel members or direct message participants
        if (message.channelId) {
          io!
            .to(`channel-${message.channelId}`)
            .emit("message:deleted", { messageId });
        } else if (message.receiverId) {
          // Direct message - notify both sender and receiver
          io!
            .to(`user-${message.senderId}`)
            .emit("message:deleted", { messageId });
          io!
            .to(`user-${message.receiverId}`)
            .emit("message:deleted", { messageId });
        }
      } catch (err) {
        console.error("message:delete handler error", err);
      }
    });

    // --------------
    // TASK MANAGEMENT EVENTS
    // --------------
    socket.on("task:updated", (data) => {
      console.log("📝 Broadcasting task update:", data?.taskId);
      // Broadcast to all connected clients
      io!.emit("task:updated", data);
    });

    socket.on("task:move", (data) => {
      // Broadcast to all connected clients
      io!.emit("task:moved", data);
    });

    socket.on("task:create", (data) => {
      console.log("✨ Broadcasting task creation:", data?.id);
      // Broadcast to all connected clients
      io!.emit("task:created", data);
    });

    // --------------
    // BUZZ FEATURE
    // --------------
    type BuzzAck = (resp: { ok: boolean; reason?: string }) => void;
    socket.on(
      "buzz:send",
      async (
        payload: {
          channelId?: string;
          receiverId?: string;
          message?: string;
          clientId?: string;
        },
        ack?: BuzzAck,
      ) => {
        try {
          const senderId: string | undefined =
            socket.data.userId || (socket.handshake?.query?.userId as string);
          if (!senderId) return ack?.({ ok: false, reason: "unauthorized" });
          if (!payload?.channelId && !payload?.receiverId)
            return ack?.({ ok: false, reason: "bad_request" });

          // rate limit per sender
          if (!canBuzz(senderId))
            return ack?.({ ok: false, reason: "rate_limited" });

          let recipients: string[] = [];
          if (payload.channelId) {
            recipients = await getChannelMemberIds(payload.channelId);
          } else if (payload.receiverId) {
            recipients = [payload.receiverId];
          }

          // Do not buzz the sender themselves
          recipients = recipients.filter((u) => u && u !== senderId);

          if (recipients.length === 0) return ack?.({ ok: true });

          console.log(
            "🚨 buzz:send => recipients:",
            recipients,
            "payload:",
            payload,
          );

          const sender = await db.user.findUnique({
            where: { id: senderId },
            select: { name: true, email: true },
          });
          const buzzInfo = buildBuzzNotificationData(
            sender?.name || sender?.email,
            payload.message,
          );

          const buzzEvent = {
            channelId: payload.channelId,
            receiverId: payload.receiverId,
            fromUserId: senderId,
            senderName: buzzInfo.senderName,
            message: buzzInfo.message,
            title: buzzInfo.title,
          };

          const emitBuzzEvent = async (
            buzzMsg: any,
            eventType: "direct" | "channel",
          ) => {
            try {
              const { pushCacheList } = require("./redis");
              const { produceKafkaEvent } = require("./kafka");
              const cacheKey =
                eventType === "direct"
                  ? `buzz:dm:${[senderId, payload.receiverId].sort().join(":")}`
                  : `buzz:channel:${payload.channelId}`;

              const eventPayload = {
                ...buzzEvent,
                buzzMessage: buzzMsg,
                eventType,
                timestamp: new Date().toISOString(),
              };

              pushCacheList(cacheKey, eventPayload, 100).catch(() => {});
              produceKafkaEvent("buzz-events", eventPayload).catch(() => {});
            } catch (err) {
              // non-fatal fallback when Kafka/Redis are unavailable
            }
          };

          let buzzMessage: any = null;
          try {
            buzzMessage = await db.message.create({
              data: {
                id: crypto.randomUUID(),
                content: buzzInfo.systemContent,
                senderId,
                channelId: payload.channelId || null,
                receiverId: payload.receiverId || null,
                updatedAt: new Date(),
              } as any,
              include: {
                sender: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
            });
            if (buzzMessage) {
              buzzMessage.isBuzz = true;
              if (!buzzMessage.sender) {
                buzzMessage.sender = {
                  id: senderId,
                  name: buzzInfo.senderName,
                  email: sender?.email || "",
                  image: null,
                };
              }
            }
          } catch (dbError) {
            console.error("buzz db create error:", dbError);
            buzzMessage = {
              id: `buzz_${Date.now()}`,
              content: buzzInfo.systemContent,
              isBuzz: true,
              senderId,
              channelId: payload.channelId ?? null,
              receiverId: payload.receiverId ?? null,
              createdAt: new Date().toISOString(),
              sender: {
                id: senderId,
                name: buzzInfo.senderName,
                email: sender?.email || "",
                image: null,
              },
            };
          }

          buzzMessage = {
            ...buzzMessage,
            receiverId: payload.receiverId ?? buzzMessage.receiverId,
            channelId: payload.channelId ?? buzzMessage.channelId,
            clientId: payload.clientId ?? buzzMessage.clientId,
            status: "sent",
          };

          // Prefer per-user rooms so recipients always get the buzz overlay
          for (const uid of recipients) {
            io!.to(`user-${uid}`).emit("buzz", buzzEvent);
          }

          // Emit chat list update for the Buzz message
          if (payload.channelId) {
            io!
              .to(`channel-${payload.channelId}`)
              .emit("new-message", buzzMessage);
            io!.to(`channel-${payload.channelId}`).emit("buzz", buzzEvent);
            // Also send the message directly to recipients' user rooms as a fallback
            for (const uid of recipients) {
              io!.to(`user-${uid}`).emit("new-message", buzzMessage);
            }
            // Ensure sender also gets the chat update
            io!.to(`user-${senderId}`).emit("new-message", buzzMessage);
            void emitBuzzEvent(buzzMessage, "channel");
          } else if (payload.receiverId) {
            io!.to(`user-${payload.receiverId}`).emit("buzz", buzzEvent);
            io!
              .to(`user-${payload.receiverId}`)
              .emit("new-message", buzzMessage);
            if (senderId) {
              io!.to(`user-${senderId}`).emit("new-message", buzzMessage);
            }
            void emitBuzzEvent(buzzMessage, "direct");
          }

          ack?.({ ok: true });
        } catch (e) {
          // console.error("buzz:send error", e);
          ack?.({ ok: false, reason: "server_error" });
        }
      },
    );

    // --------------
    // REACTIONS (kept close to your version; fix small issues)
    // --------------
    type Ack<T> = (response: T) => void;

    socket.on(
      "add-reaction",
      async (
        {
          messageId,
          emoji,
          userId,
          userName,
        }: {
          messageId: string;
          emoji: string;
          userId: string;
          userName?: string;
        },
        ack: Ack<{ success: boolean; reactions?: any[] }>,
      ) => {
        try {
          const updated = await addReactionJSON(messageId, {
            emoji,
            userId,
            userName,
          });
          const channelId = await getMessageChannelId(messageId);

          if (channelId) {
            // Channel message - broadcast to all channel members
            io!
              .to(`channel-${channelId}`)
              .emit("reaction:update", { messageId, reactions: updated });
          } else {
            // DM message - broadcast to both sender and receiver
            const { senderId, receiverId } = await getMessagePeers(messageId);
            if (senderId)
              io!
                .to(`user-${senderId}`)
                .emit("reaction:update", { messageId, reactions: updated });
            if (receiverId)
              io!
                .to(`user-${receiverId}`)
                .emit("reaction:update", { messageId, reactions: updated });
          }
          ack({ success: true, reactions: updated });
        } catch (e) {
          console.error("add-reaction error", e);
          ack({ success: false });
        }
      },
    );

    socket.on(
      "remove-reaction",
      async (
        {
          messageId,
          emoji,
          userId,
        }: { messageId: string; emoji: string; userId: string },
        ack: Ack<{ success: boolean; reactions?: any[] }>,
      ) => {
        try {
          const updated = await removeReactionJSON(messageId, {
            emoji,
            userId,
          });
          const channelId = await getMessageChannelId(messageId);

          if (channelId) {
            // Channel message - broadcast to all channel members
            io!
              .to(`channel-${channelId}`)
              .emit("reaction:update", { messageId, reactions: updated });
          } else {
            // DM message - broadcast to both sender and receiver
            const { senderId, receiverId } = await getMessagePeers(messageId);
            if (senderId)
              io!
                .to(`user-${senderId}`)
                .emit("reaction:update", { messageId, reactions: updated });
            if (receiverId)
              io!
                .to(`user-${receiverId}`)
                .emit("reaction:update", { messageId, reactions: updated });
          }
          ack({ success: true, reactions: updated });
        } catch (e) {
          console.error("remove-reaction error", e);
          ack({ success: false });
        }
      },
    );

    socket.on(
      "get-reactions",
      async (
        { messageId }: { messageId: string },
        ack: Ack<{ success: boolean; reactions?: any[] }>,
      ) => {
        try {
          const rows = await getReactions(messageId);
          ack({ success: true, reactions: rows });
        } catch (e) {
          console.error("get-reactions error", e);
          ack({ success: false });
        }
      },
    );

    // --------------
    // DISCONNECT
    // --------------
    socket.on("disconnect", (reason) => {
      const userId = socket.data.userId as string | undefined;
      // console.log("❌ Socket disconnected:", socket.id, reason, userId ? `(user ${userId})` : "");
      if (userId) handleUserDisconnect(userId, socket.id);
    });

    function handleUserDisconnect(userId: string, socketId: string) {
      if (!onlineUsers.has(userId)) return;
      const userSockets = onlineUsers.get(userId)!;
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        if (offlineDisconnectTimers.has(userId)) {
          clearTimeout(offlineDisconnectTimers.get(userId)!);
        }
        // 5-second grace period before emitting offline status to prevent transport-switch flickering
        const timer = setTimeout(() => {
          try {
            if (
              onlineUsers.has(userId) &&
              onlineUsers.get(userId)!.size === 0
            ) {
              onlineUsers.delete(userId);
              const onlineUserIds = Array.from(onlineUsers.keys());
              if (io) {
                io.emit("users-online", onlineUserIds);
                io.emit("user:status", { onlineUsers: onlineUserIds });
                const iso = new Date().toISOString();
                io.emit("user-last-seen", { userId, timestamp: iso });
              }
            }
          } catch (e) {
            console.error("Failed to emit offline status:", e);
          }
          offlineDisconnectTimers.delete(userId);
        }, 5000);
        offlineDisconnectTimers.set(userId, timer);
      }
    }
  });

  // Store globally for API access across App Router and Pages Router
  (global as any).socketIO = io;
  (global as any).io = io;

  // console.log("✅ Socket.io server initialized successfully");
  return io;
}

export function getSocketIO(): ServerIO | null {
  return (global as any).io || (global as any).socketIO || io;
}

export function emitToUser(userId: string, event: string, data: any) {
  const socketIO = getSocketIO();
  if (socketIO) {
    // console.log(`🔌 Emitting ${event} to user-${userId}`);
    socketIO.to(`user-${userId}`).emit(event, data);
    return true;
  }
  console.log("❌ Socket.io not available for emission");
  return false;
}

export function emitToChannel(channelId: string, event: string, data: any) {
  const socketIO = getSocketIO();
  if (socketIO) {
    // console.log(`🔌 Emitting ${event} to channel-${channelId}`);
    socketIO.to(`channel-${channelId}`).emit(event, data);
    return true;
  }
  // console.log("❌ Socket.io not available for emission");
  return false;
}

export function emitToAll(event: string, data: any) {
  const socketIO = getSocketIO();
  if (socketIO) {
    console.log(`🔌 Emitting ${event} to all users`);
    socketIO.emit(event, data);
    return true;
  }
  // console.log("❌ Socket.io not available for emission");
  return false;
}

export const initSocketServer = (req: any, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    const initializedIO = initializeSocketIO(res.socket.server);
    res.socket.server.io = initializedIO;
  }
};
