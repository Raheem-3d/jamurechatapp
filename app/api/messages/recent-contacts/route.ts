import { getServerSession } from "next-auth/next";

import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch recent direct messages
    const recentDirectMessages = await db.message.findMany({
      where: {
        OR: [
          {
            senderId: userId,
            receiverId: { not: null },
          },
          {
            receiverId: userId,
          },
        ],
        channelId: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      include: {
        sender: true,
        receiver: true,
      },
    });

    // Get unique users from direct messages
    const uniqueUsers = new Map();
    recentDirectMessages.forEach((message) => {
      const otherUserId =
        message.senderId === userId ? message.receiverId : message.senderId;
      const otherUser =
        message.senderId === userId ? message.receiver : message.sender;

      if (otherUserId && otherUser && !uniqueUsers.has(otherUserId)) {
        const contactData = {
          id: otherUser.id,
          name: otherUser.name || otherUser.email || "Unknown User",
          email: otherUser.email,
          image: otherUser.image,
          lastMessage: message,
        };
      
        uniqueUsers.set(otherUserId, contactData);
      }
    });

    const recentContacts = Array.from(uniqueUsers.values()).slice(0, 10);
  

    return Response.json({ recentContacts }, { status: 200 });
  } catch (error) {
    console.error("Error fetching recent contacts:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
