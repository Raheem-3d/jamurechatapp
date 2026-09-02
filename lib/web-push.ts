import webpush from "web-push";
import { db } from "@/lib/db";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@rumzz.com";

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.error("❌ Failed to set VAPID details:", err);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  renotify?: boolean;
  senderId?: string;
}

/**
 * Send a Web Push notification to all active devices of a given user.
 * Automatically cleans up expired/uninstalled subscriptions (404 / 410 Gone).
 */
export async function sendWebPushToUser(userId: string | string[], payload: PushPayload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("⚠️ VAPID keys not configured. Skipping Web Push.");
    return;
  }

  const userIds = Array.isArray(userId) ? userId : [userId];
  if (userIds.length === 0) return;

  try {
    const subscriptions = await db.push_subscription.findMany({
      where: {
        userId: { in: userIds },
      },
    });

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const pushPayloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/icon-192x192.png",
      tag: payload.tag || "jamurechat-notification",
      renotify: payload.renotify ?? false,
      senderId: payload.senderId,
      data: {
        url: payload.url || "/dashboard",
        senderId: payload.senderId,
      },
    });

    const sendPromises = subscriptions.map(async (sub: any) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, pushPayloadString, {
          TTL: 60 * 60 * 24, // 24 hours
          urgency: "high",
        });
      } catch (err: any) {
        // If device uninstalled or permission revoked (404/410), delete subscription
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[WebPush] Pruning expired push subscription: ${sub.id}`);
          await db.push_subscription.delete({
            where: { id: sub.id },
          }).catch(() => {});
        } else {
          console.error(`[WebPush] Error sending to subscription ${sub.id}:`, err?.message || err);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error("[WebPush] Error dispatching push notifications:", error);
  }
}
