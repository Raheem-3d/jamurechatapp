import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function categorizeMessage(msg: any): ("photos" | "videos" | "docs" | "audio" | "links" | "text")[] {
  const categories: ("photos" | "videos" | "docs" | "audio" | "links" | "text")[] = [];

  const fileType = (msg.fileType || "").toLowerCase();
  const fileName = (msg.fileName || msg.fileUrl || "").toLowerCase();

  // 1. Text & Links
  if (msg.content && msg.content.trim().length > 0) {
    categories.push("text");
    if (/(https?:\/\/[^\s<>"']+)/gi.test(msg.content)) {
      categories.push("links");
    }
  }

  // 2. Photos
  if (
    fileType.startsWith("image/") ||
    /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(fileName)
  ) {
    categories.push("photos");
  }

  // 3. Videos
  if (
    fileType.startsWith("video/") ||
    /\.(mp4|webm|mov|mkv|avi)$/i.test(fileName)
  ) {
    categories.push("videos");
  }

  // 4. Audio
  if (
    fileType.startsWith("audio/") ||
    /\.(mp3|wav|ogg|m4a|aac|opus|flac)$/i.test(fileName)
  ) {
    categories.push("audio");
  }

  // 5. Docs
  if (
    msg.fileUrl &&
    !categories.includes("photos") &&
    !categories.includes("videos") &&
    !categories.includes("audio")
  ) {
    categories.push("docs");
  }

  // Check attachments array
  if (msg.attachments && Array.isArray(msg.attachments)) {
    msg.attachments.forEach((att: any) => {
      const attType = (att.fileType || att.mimeType || "").toLowerCase();
      const attName = (att.fileName || att.name || att.fileUrl || "").toLowerCase();

      if (attType.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(attName)) {
        if (!categories.includes("photos")) categories.push("photos");
      } else if (attType.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(attName)) {
        if (!categories.includes("videos")) categories.push("videos");
      } else if (attType.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(attName)) {
        if (!categories.includes("audio")) categories.push("audio");
      } else if (att.fileUrl) {
        if (!categories.includes("docs")) categories.push("docs");
      }
    });
  }

  return categories;
}

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
    const q = (searchParams.get("q") || "").toLowerCase().trim();
    const filter = (searchParams.get("filter") || "all").toLowerCase().trim();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!channelId && !receiverId) {
      return NextResponse.json(
        { message: "Either channelId or receiverId must be provided" },
        { status: 400 }
      );
    }

    let whereCondition: any = {};

    if (channelId) {
      whereCondition.channelId = channelId;
    } else if (receiverId) {
      whereCondition.OR = [
        { senderId: currentUser.id, receiverId },
        { senderId: receiverId, receiverId: currentUser.id },
      ];
    }

    // Datewise filtering
    if (startDate || endDate) {
      whereCondition.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          whereCondition.createdAt.gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          whereCondition.createdAt.lte = end;
        }
      }
    }

    // Fetch messages for conversation
    const messages = await db.message.findMany({
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
      take: 1000, // Search through up to 1000 recent messages
    });

    const results: any[] = [];

    for (const msg of messages) {
      const cats = categorizeMessage(msg);

      // Check category filter
      if (filter !== "all") {
        if (!cats.includes(filter as any)) {
          continue;
        }
      }

      // If search query is empty, return items matching filter
      if (!q) {
        results.push({
          ...msg,
          matchType: cats[0] || "text",
        });
        continue;
      }

      // Match query in content, sender name, fileName, or attachments
      const contentMatch = (msg.content || "").toLowerCase().includes(q);
      const senderMatch = (msg.sender?.name || "").toLowerCase().includes(q);
      const fileMatch = (msg.fileName || "").toLowerCase().includes(q);

      let attachmentMatch = false;
      if (msg.attachments && Array.isArray(msg.attachments)) {
        attachmentMatch = msg.attachments.some(
          (att: any) =>
            (att.fileName || att.name || "").toLowerCase().includes(q) ||
            (att.fileUrl || "").toLowerCase().includes(q)
        );
      }

      if (contentMatch || senderMatch || fileMatch || attachmentMatch) {
        results.push({
          ...msg,
          matchType: cats[0] || "text",
        });
      }
    }

    return NextResponse.json(
      {
        query: q,
        filter,
        totalMatches: results.length,
        results,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error searching messages:", error);
    return NextResponse.json(
      { message: "Failed to search messages", error: error.message },
      { status: 500 }
    );
  }
}
