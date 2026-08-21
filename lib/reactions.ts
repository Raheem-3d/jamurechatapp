import { db } from "./db";
import { cacheGet, cacheSet } from "./redis";
import { produceKafkaEvent } from "./kafka";

export type ReactionEntry = { emoji: string; userId: string; userName?: string };

const REACTION_CACHE_TTL = 600; // 10 minutes cache TTL

export async function getReactions(messageId: string): Promise<ReactionEntry[]> {
  const cacheKey = `reactions:${messageId}`;

  // 1. Try fetching from Redis cache first
  try {
    const cached = await cacheGet<ReactionEntry[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }
  } catch (err) {
    // Non-fatal cache error fallback
  }

  // 2. Fetch from Database if cache miss
  const msg = await db.message.findUnique({
    where: { id: messageId },
    select: { reactions: true },
  });
  let arr: ReactionEntry[] = [];
  if (Array.isArray(msg?.reactions)) {
    arr = msg!.reactions as any;
  } else if (typeof msg?.reactions === "string") {
    try {
      arr = JSON.parse(msg.reactions);
    } catch {
      arr = [];
    }
  }

  // 3. Cache the result in Redis
  try {
    await cacheSet(cacheKey, arr, REACTION_CACHE_TTL);
  } catch (err) {
    // Non-fatal cache write error
  }

  return arr;
}

export async function addReactionJSON(messageId: string, r: ReactionEntry) {
  const current = await getReactions(messageId);
  if (current.some((x) => x.emoji === r.emoji && x.userId === r.userId)) {
    return current;
  }

  const updated = [...current, r];

  // 1. Update Database
  await db.message.update({
    where: { id: messageId },
    data: { reactions: JSON.stringify(updated) },
  });

  // 2. Update Redis Cache
  const cacheKey = `reactions:${messageId}`;
  try {
    await cacheSet(cacheKey, updated, REACTION_CACHE_TTL);
  } catch (err) {
    // Non-fatal
  }

  // 3. Produce event to Kafka stream (async/non-blocking)
  void produceKafkaEvent("message-reactions", {
    action: "add-reaction",
    messageId,
    reaction: r,
    reactions: updated,
    timestamp: Date.now(),
  });

  return updated;
}

export async function removeReactionJSON(
  messageId: string,
  r: { emoji: string; userId: string }
) {
  const current = await getReactions(messageId);
  const updated = current.filter(
    (x) => !(x.emoji === r.emoji && x.userId === r.userId)
  );

  // 1. Update Database
  await db.message.update({
    where: { id: messageId },
    data: { reactions: JSON.stringify(updated) },
  });

  // 2. Update Redis Cache
  const cacheKey = `reactions:${messageId}`;
  try {
    await cacheSet(cacheKey, updated, REACTION_CACHE_TTL);
  } catch (err) {
    // Non-fatal
  }

  // 3. Produce event to Kafka stream (async/non-blocking)
  void produceKafkaEvent("message-reactions", {
    action: "remove-reaction",
    messageId,
    reaction: r,
    reactions: updated,
    timestamp: Date.now(),
  });

  return updated;
}

export async function getMessageChannelId(
  messageId: string
): Promise<string | null> {
  const m = await db.message.findUnique({
    where: { id: messageId },
    select: { channelId: true },
  });
  return m?.channelId ?? null;
}

export async function getMessagePeers(
  messageId: string
): Promise<{ senderId: string; receiverId: string | null }> {
  const msg = await db.message.findUnique({
    where: { id: messageId },
    select: { senderId: true, receiverId: true },
  });
  if (!msg) throw new Error("Message not found");
  return { senderId: msg.senderId, receiverId: msg.receiverId };
}