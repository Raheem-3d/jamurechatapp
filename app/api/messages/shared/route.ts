import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper to format file size
function formatBytes(bytes?: number, decimals = 1) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Helper to determine media/doc/audio category
function categorizeFile(fileType?: string, fileName?: string, fileUrl?: string): "media" | "docs" | "audio" {
  const type = (fileType || "").toLowerCase();
  const name = (fileName || fileUrl || "").toLowerCase();

  // Audio check
  if (
    type.startsWith("audio/") ||
    /\.(mp3|wav|ogg|m4a|aac|opus|flac|webm)$/i.test(name) ||
    type.includes("voice")
  ) {
    return "audio";
  }

  // Image / Video check
  if (
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico|mp4|webm|mov|mkv|avi)$/i.test(name)
  ) {
    return "media";
  }

  // Document check
  return "docs";
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

    if (!channelId && !receiverId) {
      return NextResponse.json(
        { message: "Either channelId or receiverId must be provided" },
        { status: 400 }
      );
    }

    // Build Prisma query condition
    let whereCondition: any = {};

    if (channelId) {
      whereCondition.channelId = channelId;
    } else if (receiverId) {
      whereCondition.OR = [
        { senderId: currentUser.id, receiverId },
        { senderId: receiverId, receiverId: currentUser.id },
      ];
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
      take: 500, // Fetch up to 500 recent messages for deep shared media scanning
    });

    const mediaList: any[] = [];
    const docsList: any[] = [];
    const linksList: any[] = [];
    const audioList: any[] = [];

    const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;

    for (const msg of messages) {
      const sender = msg.sender || {
        id: msg.senderId,
        name: "Unknown User",
        image: null,
      };

      // 1. Process legacy single fileUrl/fileName/fileType
      if (msg.fileUrl) {
        const cat = categorizeFile(msg.fileType || "", msg.fileName || "", msg.fileUrl);
        const item = {
          id: `${msg.id}-single`,
          messageId: msg.id,
          fileUrl: msg.fileUrl,
          fileName: msg.fileName || "Shared File",
          fileType: msg.fileType || "application/octet-stream",
          category: cat,
          createdAt: msg.createdAt,
          sender,
        };

        if (cat === "media") mediaList.push(item);
        else if (cat === "audio") audioList.push(item);
        else docsList.push(item);
      }

      // 2. Process attachments JSON array
      if (msg.attachments && Array.isArray(msg.attachments)) {
        msg.attachments.forEach((att: any, idx: number) => {
          if (!att || !att.fileUrl) return;
          const cat = categorizeFile(att.fileType || att.mimeType || "", att.fileName || att.name || "", att.fileUrl);
          const item = {
            id: `${msg.id}-att-${idx}`,
            messageId: msg.id,
            fileUrl: att.fileUrl,
            fileName: att.fileName || att.name || "Shared File",
            fileType: att.fileType || att.mimeType || "application/octet-stream",
            fileSize: att.fileSize || att.size ? formatBytes(att.fileSize || att.size) : undefined,
            category: cat,
            createdAt: msg.createdAt,
            sender,
          };

          if (cat === "media") mediaList.push(item);
          else if (cat === "audio") audioList.push(item);
          else docsList.push(item);
        });
      }

      // 3. Process text content for URLs / links
      if (msg.content) {
        const matches = msg.content.match(urlRegex);
        if (matches && matches.length > 0) {
          const uniqueUrls = Array.from(new Set(matches));
          uniqueUrls.forEach((urlStr, idx) => {
            try {
              const parsed = new URL(urlStr);
              linksList.push({
                id: `${msg.id}-link-${idx}`,
                messageId: msg.id,
                url: urlStr,
                domain: parsed.hostname.replace(/^www\./, ""),
                context: msg.content.length > 150 ? msg.content.slice(0, 150) + "..." : msg.content,
                createdAt: msg.createdAt,
                sender,
              });
            } catch (e) {
              // Ignore invalid URLs
            }
          });
        }
      }
    }

    // Apply search filter if `q` parameter is present
    const filterFn = (item: any) => {
      if (!q) return true;
      const nameMatch = (item.fileName || "").toLowerCase().includes(q);
      const senderMatch = (item.sender?.name || "").toLowerCase().includes(q);
      const urlMatch = (item.url || item.fileUrl || "").toLowerCase().includes(q);
      const contextMatch = (item.context || "").toLowerCase().includes(q);
      const domainMatch = (item.domain || "").toLowerCase().includes(q);
      return nameMatch || senderMatch || urlMatch || contextMatch || domainMatch;
    };

    const filteredMedia = mediaList.filter(filterFn);
    const filteredDocs = docsList.filter(filterFn);
    const filteredLinks = linksList.filter(filterFn);
    const filteredAudio = audioList.filter(filterFn);

    return NextResponse.json(
      {
        counts: {
          media: filteredMedia.length,
          docs: filteredDocs.length,
          links: filteredLinks.length,
          audio: filteredAudio.length,
          total:
            filteredMedia.length +
            filteredDocs.length +
            filteredLinks.length +
            filteredAudio.length,
        },
        media: filteredMedia,
        docs: filteredDocs,
        links: filteredLinks,
        audio: filteredAudio,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching shared media content:", error);
    return NextResponse.json(
      { message: "Failed to fetch shared content", error: error.message },
      { status: 500 }
    );
  }
}
