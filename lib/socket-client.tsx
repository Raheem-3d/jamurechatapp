"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { isBuzzMessage } from "@/lib/buzz-utils";
import { tabNotifier } from "./tabBlinker";

type Reminder = {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  task?: {
    id: string;
    title: string;
  };
};

type ReactionUpdatePayload = {
  messageId: string;
  reactions: { emoji: string; userId: string; userName?: string }[];
};

type BuzzParams = {
  channelId?: string;
  receiverId?: string;
  message?: string;
  clientId?: string;
};

type SocketContextType = {
  // Connection state
  socket: Socket | null;
  isConnected: boolean;
  connectionAttempted: boolean;
  onlineUsers: string[];
  lastSeenMap: Record<string, string>;
  buzzerEnabled: boolean;
  toggleBuzzer: () => void;

  // Message functions
  sendMessage: (message: any) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  editMessage: (messageId: string, content: string) => Promise<boolean>;
  updateMessageStatus: (messageId: string, status: MessageStatus) => void;
  markMessageAsRead: (messageIds: string[]) => void;
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  removeReaction: (messageId: string, emoji: string) => Promise<boolean>;

  // Channel functions
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  sendTyping: (channelId: string, isTyping: boolean) => void;

  // Notification functions
  sendNotification: (notification: any) => Promise<boolean>;

  // Reminder functions
  createReminder: (reminderData: Omit<Reminder, "id">) => Promise<boolean>;
  dismissReminder: (reminderId: string) => Promise<boolean>;
  snoozeReminder: (reminderId: string, minutes: number) => Promise<boolean>;

  sendBuzz: (params: BuzzParams) => Promise<boolean>;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionAttempted: false,
  onlineUsers: [],
  lastSeenMap: {},
  buzzerEnabled: true,
  toggleBuzzer: () => { },

  // Message defaults
  sendMessage: async () => false,
  deleteMessage: async () => false,
  editMessage: async () => false,
  updateMessageStatus: () => { },
  markMessageAsRead: () => { },
  addReaction: async () => false,
  removeReaction: async () => false,

  // Channel defaults
  joinChannel: () => { },
  leaveChannel: () => { },
  sendTyping: () => { },

  // Notification defaults
  sendNotification: async () => false,

  // Reminder defaults
  createReminder: async () => false,
  dismissReminder: async () => false,
  snoozeReminder: async () => false,
  sendBuzz: async (params: BuzzParams) => false,
});

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const { data: session } = useSession();
  const userId = (session as any)?.user?.id;
  const userName = (session as any)?.user?.name;
  const seenNotificationsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!socket) return;
    const handler = (payload: ReactionUpdatePayload) => {
      console.log("🎭 Reaction update received:", payload);
      window.dispatchEvent(
        new CustomEvent("message:reaction-update", { detail: payload }),
      );
    };

    socket.on("reaction:update", handler);
    return () => {
      socket.off("reaction:update", handler);
    };
  }, [socket]);

  const shouldShowOnce = (notif: any) => {
    const contentKey = (notif.content || notif.title || "").trim();
    const key = notif.id
      ? `id:${notif.id}`
      : `${notif.type}:${notif.userId}:${contentKey}`;
    const now = Date.now();
    const prev = seenNotificationsRef.current.get(key) ?? 0;
    if (now - prev < 15000) return false;

    // Secondary content-based deduplication window per user
    const contentUserKey = `user:${notif.userId || ""}:${contentKey}`;
    const prevContent = seenNotificationsRef.current.get(contentUserKey) ?? 0;
    if (now - prevContent < 15000) return false;

    seenNotificationsRef.current.set(key, now);
    seenNotificationsRef.current.set(contentUserKey, now);

    // cleanup old entries
    if (seenNotificationsRef.current.size > 200) {
      for (const [k, ts] of seenNotificationsRef.current) {
        if (now - ts > 60000) seenNotificationsRef.current.delete(k);
      }
    }
    return true;
  };

  useEffect(() => {
    if (!socket) return;

    const onNewNotification = (notification: any) => {
      const currentUserId = session?.user?.id;
      if (!currentUserId) return;

      // 1. Show only if targeted at this user
      if (String(notification.userId) !== String(currentUserId)) return;

      // 2. NEVER notify the sender of their own message/action
      if (notification.senderId && String(notification.senderId) === String(currentUserId)) return;

      if (!shouldShowOnce(notification)) return;

      // 3. Suppress notifications if channel is muted by user
      if (notification.channelId && typeof window !== "undefined") {
        const isChannelMuted =
          localStorage.getItem(`muted_channel_${notification.channelId}`) ===
          "true";
        if (isChannelMuted) return;
      }

      const priorityEmoji =
        ({ LOW: "🟢", MEDIUM: "🟡", HIGH: "🟠", URGENT: "🔴" } as any)[
        notification.priority
        ] || "🔔";

      const notifTitle =
        notification.type === "REMINDER"
          ? "🔔 Reminder Notification"
          : (notification.title ?? "New Notification");
      const notifContent =
        notification.content ||
        notification.title ||
        "You have a new notification";

      // 1. Audio sound
      try {
        new Audio("/sounds/notification.mp3").play().catch(() => { });
      } catch { }

      // 2. Toast UI alert
      toast(`${priorityEmoji} ${notifTitle}`, {
        description: notifContent,
        duration: 8000,
      });

      // 3. Dispatch for active UI components
      try {
        window.dispatchEvent(
          new CustomEvent("socket-notification", { detail: notification }),
        );
      } catch { }

      // 4. Native OS / Desktop / Mobile Service Worker Notification (Only when tab is hidden)
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.notify) {
        electronAPI.notify(notifTitle, notifContent, undefined, {
          senderName: notification.senderName || "System Reminder",
          messagePreview: notifContent,
          channelId: notification.channelId,
          userId: notification.userId,
        });
      } else if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        typeof document !== "undefined" &&
        document.hidden
      ) {
        try {
          const notifTag = notification.id || `notif-${notification.channelId || notification.userId || Date.now()}`;
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(notifTitle, {
                body: notifContent,
                icon: "/icons/icon-192x192.png",
                badge: "/icons/icon-192x192.png",
                vibrate: [200, 100, 200],
                tag: notifTag,
                renotify: false,
                data: {
                  url: notification.channelId
                    ? `/dashboard/channels/${notification.channelId}`
                    : notification.taskId
                      ? `/dashboard/tasks/${notification.taskId}`
                      : "/dashboard",
                },
              } as any);
            }).catch(() => {
              new Notification(notifTitle, {
                body: notifContent,
                icon: "/icons/icon-192x192.png",
                tag: notifTag,
              });
            });
          } else {
            new Notification(notifTitle, {
              body: notifContent,
              icon: "/icons/icon-192x192.png",
              tag: notifTag,
            });
          }
        } catch { }
      }
    };

    socket.on("new-notification", onNewNotification);
    return () => {
      socket.off("new-notification", onNewNotification);
    };
  }, [socket, session?.user?.id]);

  const socketRef = useRef<Socket | null>(null);
  const disconnectDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const activeUserId = (session as any)?.user?.id;
    if (!activeUserId) return;

    if (socketRef.current) {
      if (socketRef.current.connected) {
        if (disconnectDebounceRef.current) {
          clearTimeout(disconnectDebounceRef.current);
          disconnectDebounceRef.current = null;
        }
        setIsConnected(true);
        setConnectionAttempted(true);
        if (activeUserId) {
          socketRef.current.emit("user:online", { userId: activeUserId });
          socketRef.current.emit("user-join", activeUserId);
        }
        return;
      }
      socketRef.current.connect();
      return;
    }

    const initSocket = async () => {
      try {
        await fetch("/api/socket");
      } catch (error) {
        console.error("Failed to initialize socket server endpoint:", error);
      }

      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;

      const socketInstance = io(socketUrl, {
        path: "/api/socket",
        addTrailingSlash: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 20000,
        transports: ["polling", "websocket"],
      });

      socketRef.current = socketInstance;
      setSocket(socketInstance);

      socketInstance.on("connect", () => {
        console.log("🟢 Socket connected successfully:", socketInstance.id);
        if (disconnectDebounceRef.current) {
          clearTimeout(disconnectDebounceRef.current);
          disconnectDebounceRef.current = null;
        }
        setIsConnected(true);
        setConnectionAttempted(true);

        const uid = (session as any)?.user?.id || activeUserId;
        if (uid) {
          socketInstance.emit("user:online", { userId: uid });
          socketInstance.emit("user-join", uid);
        }
      });

      socketInstance.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
        setConnectionAttempted(true);
      });

      socketInstance.on("disconnect", (reason) => {
        console.log("🔌 Socket disconnected:", reason);
        if (disconnectDebounceRef.current) {
          clearTimeout(disconnectDebounceRef.current);
        }
        // Debounce status toggle by 3s to prevent UI flickering on transport upgrade
        disconnectDebounceRef.current = setTimeout(() => {
          if (socketRef.current && !socketRef.current.connected) {
            setIsConnected(false);
          }
          disconnectDebounceRef.current = null;
        }, 3000);

        if (reason === "io server disconnect") {
          socketInstance.connect();
        }
      });

      // Listen for user status updates
      socketInstance.on("user:status", (data) => {
        setOnlineUsers(data.onlineUsers || []);
      });

      // Listen for new messages (using 'new-message' to match server)
      socketInstance.on("new-message", (message) => {
        // Skip messages sent by current user - they're already handled via optimistic update
        // This prevents duplicate messages when socket broadcasts back our own sent message
        const currentUserId = (session as any)?.user?.id;
        const buzzMessage = isBuzzMessage(message as any);
        if (
          currentUserId &&
          message.senderId === currentUserId &&
          !buzzMessage
        ) {
          return;
        }
        window.dispatchEvent(
          new CustomEvent("message:received", { detail: message }),
        );
      });

      // Listen for message edits
      socketInstance.on("message:edited", (data) => {
        window.dispatchEvent(
          new CustomEvent("message:edited", { detail: data }),
        );
      });

      // Listen for message deletions
      socketInstance.on("message:deleted", (data) => {
        window.dispatchEvent(
          new CustomEvent("message:deleted", { detail: data }),
        );
      });

      // Listen for reminder notifications
      socketInstance.on("reminder:notification", (reminder: Reminder) => {
        // Show toast notification
        const priorityEmoji =
          {
            LOW: "🟢",
            MEDIUM: "🟡",
            HIGH: "🟠",
            URGENT: "🔴",
          }[reminder.priority] || "🔔";

        toast(`${priorityEmoji} ${reminder.title}`, {
          description: reminder.description || "",
          duration: 10000,
          action: reminder.task
            ? {
              label: "View Task",
              onClick: () => {
                window.location.href = `/tasks/${reminder.task.id}`;
              },
            }
            : undefined,
        });

        // ...existing reminder handling continues (no change)

        // socketInstance.on("message:reaction-update", (data) => {
        //   window.dispatchEvent(
        //     new CustomEvent("message:reaction-update", { detail: data })
        //   );
        // });

        // socketInstance.on("reaction:update", (data) => {
        //   window.dispatchEvent(
        //     new CustomEvent("reaction:update", { detail: data })
        //   );
        // });

        // Dispatch custom event
        window.dispatchEvent(
          new CustomEvent("reminder:notification", { detail: reminder }),
        );
      });

      // === CHANNEL ASSIGNMENT ===
      socketInstance.on("channel:assigned", (data) => {
        console.log("📡 Received channel assignment:", data);
        // Dispatch window event for sidebar and other components to listen
        window.dispatchEvent(
          new CustomEvent("channel:assigned", { detail: data }),
        );
        // Show toast notification
        toast.success(`Added to channel: ${data.channelName}`);
      });

      // === TASK ASSIGNMENT ===
      socketInstance.on("task:assigned", (data) => {
        console.log("📡 Received task assignment:", data);
        // Dispatch window event for sidebar and other components to listen
        window.dispatchEvent(
          new CustomEvent("task:assigned", { detail: data }),
        );
        // Show toast notification
        toast.success(`Assigned to task: ${data.taskTitle}`);
      });

      // === BUZZ RECEIVE ===
      const onBuzz = (payload: {
        channelId?: string;
        fromUserId?: string;
        senderName?: string;
        message?: string;
        title?: string;
      }) => {
        document.documentElement.classList.add("shake");
        setTimeout(
          () => document.documentElement.classList.remove("shake"),
          600,
        );
        try {
          new Audio("/sounds/buzz.mp3").play().catch(() => { });
        } catch { }
        const senderName = payload.senderName || "Someone";
        const message = payload.message || "Buzz!";
        if (document.visibilityState === "hidden")
          tabNotifier.startNotification(`Buzz from ${senderName}!`);
        // dispatch for overlay consumer — include senderName so it shows in the popup
        window.dispatchEvent(
          new CustomEvent("buzz:received", {
            detail: {
              ...payload,
              senderName,
              message,
              title: payload.title || `Buzz from ${senderName}`,
            },
          }),
        );
      };

      socketInstance.on("buzz", onBuzz);

      // Register message status and read events at socket initialization level
      socketInstance.on("message:status-updated", (data) => {
        window.dispatchEvent(
          new CustomEvent("message:status-update", { detail: data }),
        );
      });

      socketInstance.on("messages:read", (data) => {
        window.dispatchEvent(
          new CustomEvent("messages:read", { detail: data }),
        );
      });

      socketInstance.on("messages:delivered", (data) => {
        // Handle bulk delivery confirmations when recipient comes online
        const { messageIds, recipientId } = data;
        if (Array.isArray(messageIds) && messageIds.length > 0) {
          for (const messageId of messageIds) {
            window.dispatchEvent(
              new CustomEvent("message:status-update", {
                detail: { messageId, status: "delivered" },
              }),
            );
          }
        }
      });

      setSocket(socketInstance);
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        if (userId) socketRef.current.emit("user:offline", { userId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [session?.user?.id]);

  // Send heartbeat to maintain online status
  useEffect(() => {
    if (!socket || !isConnected || !userId) return;

    const interval = setInterval(() => {
      socket.emit("user:heartbeat", { userId });
    }, 30000);

    return () => clearInterval(interval);
  }, [socket, isConnected, userId]);

  // Note: single socket instance is created above in the primary useEffect.
  // The duplicate initialization that previously created `s = io(...)` was removed to ensure
  // status/read handlers are registered only once and delivered promptly to the client.

  const sendMessage = useCallback(
    async (messageData: any): Promise<boolean> => {
      if (!socket || !isConnected) {
        // Fallback to API
        try {
          const response = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(messageData),
          });

          if (response.ok) {
            const newMessage = await response.json();
            window.dispatchEvent(
              new CustomEvent("message:received", { detail: newMessage }),
            );
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error sending message via API:", error);
          return false;
        }
      }

      return new Promise((resolve) => {
        socket.emit("send-message", messageData, (success: boolean) => {
          resolve(success);
        });
      });
    },
    [socket, isConnected],
  );

  const createReminder = useCallback(
    async (reminderData: Omit<Reminder, "id">): Promise<boolean> => {
      if (!socket || !isConnected) {
        // Fallback to API
        try {
          const response = await fetch("/api/reminders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reminderData),
          });
          return response.ok;
        } catch (error) {
          console.error("Error creating reminder via API:", error);
          return false;
        }
      }

      return new Promise((resolve) => {
        socket.emit("reminder:create", reminderData, (success: boolean) => {
          resolve(success);
        });
      });
    },
    [socket, isConnected],
  );

  const dismissReminder = useCallback(
    async (reminderId: string): Promise<boolean> => {
      if (!socket || !isConnected) {
        // Fallback to API
        try {
          const response = await fetch(`/api/reminders/${reminderId}/dismiss`, {
            method: "POST",
          });
          return response.ok;
        } catch (error) {
          console.error("Error dismissing reminder via API:", error);
          return false;
        }
      }

      return new Promise((resolve) => {
        socket.emit("reminder:dismiss", { reminderId }, (success: boolean) => {
          resolve(success);
        });
      });
    },
    [socket, isConnected],
  );

  const snoozeReminder = useCallback(
    async (reminderId: string, minutes: number): Promise<boolean> => {
      if (!socket || !isConnected) {
        // Fallback to API
        try {
          const response = await fetch(`/api/reminders/${reminderId}/snooze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ minutes }),
          });
          return response.ok;
        } catch (error) {
          console.error("Error snoozing reminder via API:", error);
          return false;
        }
      }

      return new Promise((resolve) => {
        socket.emit(
          "reminder:snooze",
          { reminderId, minutes },
          (success: boolean) => {
            resolve(success);
          },
        );
      });
    },
    [socket, isConnected],
  );

  const joinChannel = useCallback(
    (channelId: string) => {
      if (socket && isConnected) {
        socket.emit("join-channel", channelId);
      }
    },
    [socket, isConnected],
  );

  // const leaveChannel = useCallback(
  //   (channelId: string) => {
  //     if (socket && isConnected) {
  //       socket.emit("leave:channel", { channelId });
  //     }
  //   },
  //   [socket, isConnected]
  // );

  const leaveChannel = useCallback(
    (channelId: string) => {
      if (socket && isConnected) {
        socket.emit("leave-channel", channelId);
      }
    },
    [socket, isConnected],
  );

  const sendTyping = useCallback(
    (channelId: string, isTyping: boolean) => {
      if (socket && isConnected && session?.user?.id) {
        socket.emit("typing", {
          userId: session.user.id,
          channelId,
          isTyping,
        });
      }
    },
    [socket, isConnected, session?.user?.id],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/messages/${messageId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to edit message");
        }

        return true;
      } catch (error) {
        console.error("Error editing message:", error);
        return false;
      }
    },
    [],
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/messages/${messageId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete message");
        }

        // Emit socket event to notify all clients about the deletion
        if (socket && isConnected) {
          socket.emit("message:delete", { messageId });
        }

        // Also dispatch local event for immediate UI update
        window.dispatchEvent(
          new CustomEvent("message:deleted", {
            detail: { messageId },
          }),
        );

        return true;
      } catch (error) {
        console.error("Error deleting message:", error);
        return false;
      }
    },
    [socket, isConnected],
  );

  const updateMessageStatus = useCallback(
    (messageId: string, status: MessageStatus) => {
      if (socket && isConnected) {
        socket.emit("message:status-update", { messageId, status });
      }
    },
    [socket, isConnected],
  );

  const markMessageAsRead = (messageIds: string[]) => {
    if (socket && isConnected) {
      // Tell server which messages were seen. Server will persist and notify senders.
      socket.emit("mark-as-read", { messageIds });
    }
  };

  const addReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!socket || !isConnected || !session?.user?.id) return false;
      return new Promise((resolve) => {
        socket.emit(
          "add-reaction",
          {
            messageId,
            emoji,
            userId: session.user.id,
            userName: session.user.name || "Unknown",
          },
          (response: {
            success: boolean;
            reactions?: ReactionUpdatePayload["reactions"];
          }) => {
            if (response.success && response.reactions) {
              window.dispatchEvent(
                new CustomEvent("message:reaction-update", {
                  detail: { messageId, reactions: response.reactions },
                }),
              );
            }
            resolve(response.success);
          },
        );
      });
    },
    [socket, isConnected, session?.user?.id, session?.user?.name],
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string): Promise<boolean> => {
      if (!socket || !isConnected || !session?.user?.id) return false;
      return new Promise((resolve) => {
        socket.emit(
          "remove-reaction",
          { messageId, emoji, userId: session.user.id },
          (response: {
            success: boolean;
            reactions?: ReactionUpdatePayload["reactions"];
          }) => {
            if (response.success && response.reactions) {
              window.dispatchEvent(
                new CustomEvent("message:reaction-update", {
                  detail: { messageId, reactions: response.reactions },
                }),
              );
            }
            resolve(response.success);
          },
        );
      });
    },
    [socket, isConnected, session?.user?.id],
  );

  const sendBuzz = useCallback(
    async ({ channelId, receiverId, message, clientId }: BuzzParams) => {
      if (!socket || !isConnected || !session?.user?.id) return false;
      return new Promise<boolean>((resolve) => {
        socket.emit(
          "buzz:send",
          {
            channelId,
            receiverId,
            message: message || "Buzz!",
            clientId,
          },
          (resp: { ok: boolean; reason?: string }) => {
            if (!resp?.ok && resp?.reason === "rate_limited")
              toast.error("Too many buzzes. Try later.");
            resolve(!!resp?.ok);
          },
        );
      });
    },
    [socket, isConnected, session?.user?.id],
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connectionAttempted,
        onlineUsers,
        sendMessage,
        deleteMessage,
        editMessage,
        joinChannel,
        leaveChannel,
        sendTyping,
        // Reminder functions
        createReminder,
        dismissReminder,
        snoozeReminder,
        updateMessageStatus,
        markMessageAsRead,
        addReaction,
        removeReaction,
        sendBuzz,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
