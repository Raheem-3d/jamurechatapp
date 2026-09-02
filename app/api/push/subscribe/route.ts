import { NextResponse } from "next/server";
import { getSessionOrMobileUser } from "@/lib/mobile-auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const user: any = await getSessionOrMobileUser(req as any);
    if (!user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ message: "Invalid subscription payload" }, { status: 400 });
    }

    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys.p256dh;
    const auth = subscription.keys.auth;
    const userAgent = req.headers.get("user-agent") || "";

    // Delete any existing records with the same endpoint to keep subscriptions fresh
    await db.push_subscription.deleteMany({
      where: { endpoint },
    });

    // Save new push subscription linked to current user
    const newSub = await db.push_subscription.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        endpoint,
        p256dh,
        auth,
        userAgent: userAgent.substring(0, 255),
      },
    });

    console.log(`✅ [WebPush] Subscribed device for user ${user.id} (${user.email || user.name || "Mobile User"})`);

    return NextResponse.json({ success: true, id: newSub.id });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user: any = await getSessionOrMobileUser(req as any);
    if (!user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (endpoint) {
      await db.push_subscription.deleteMany({
        where: { endpoint, userId: user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
