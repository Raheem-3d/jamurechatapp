import { NextResponse } from "next/server";

// Get the Socket.io server instance
function getSocketIO() {
  try {
    // Access the global Socket.io instance
    const globalThis = global as any;
    if (globalThis.io) {
      return globalThis.io;
    }
    return null;
  } catch (error) {
    console.error("Error getting Socket.io instance:", error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { event, data } = await req.json();

    if (!event || !data) {
      return NextResponse.json(
        { error: "Event and data are required" },
        { status: 400 }
      );
    }

  
    const io = getSocketIO();

    if (!io) {
      
      return NextResponse.json(
        { error: "Socket.io server not available" },
        { status: 503 }
      );
    }

    // Emit the event based on type
    if (event === "send-notification") {
    
      io.to(`user-${data.userId}`).emit("new-notification", data);
    } else if (event === "send-message") {
      if (data.channelId) {
        io.to(`channel-${data.channelId}`).emit("new-message", data);
        if (data.channelId)
          io.to(`channel-${data.channelId}`).emit(
            "reaction:update",
            data.payload
          );
      } else if (data.receiverId) {
        io.to(`user-${data.receiverId}`).emit("new-message", data);
        io.to(`message:${data.messageId}`).emit(
          "reaction:update",
          data.payload
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error emitting Socket.io event:", error);
    return NextResponse.json(
      { error: "Failed to emit event" },
      { status: 500 }
    );
  }
}
