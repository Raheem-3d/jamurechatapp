"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Search,
  MessageSquare,
  Hash,
  Users,
  Check,
  CheckCheck,
  Plus,
  Loader2,
  Lock,
  Sparkles,
  Phone,
  Video,
  MoreVertical,
  Camera,
  Filter,
  Circle,
  Building,
  UserCheck,
  Image as ImageIcon,
  FileText,
  MessageSquarePlus,
  Compass,
} from "lucide-react";
import { useSocket } from "@/lib/socket-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type ChatItem = {
  id: string;
  type: "direct" | "channel";
  name: string;
  image?: string | null;
  department?: string | null;
  isPublic?: boolean;
  lastMessage?: string | null;
  lastMessageSenderId?: string | null;
  lastMessageTime?: string | Date | null;
  unreadCount?: number;
  isOnline?: boolean;
  rawTimestamp: number;
};

export default function WhatsAppChatsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { onlineUsers } = useSocket();
  const [contacts, setContacts] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<{ dms: Record<string, number>; channels: Record<string, number> }>({
    dms: {},
    channels: {},
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "dms" | "channels">("all");
  const [isLoading, setIsLoading] = useState(true);

  const currentUserId = session?.user?.id;

  // Format WhatsApp timestamp (e.g. "10:45 AM", "Yesterday", "Monday", "Aug 25")
  const formatWhatsAppTime = (timestamp?: string | Date | number | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return "Yesterday";

    // Within last 6 days: show weekday name
    const diffDays = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const fetchChatsData = async () => {
    try {
      setIsLoading(true);
      const [contactsRes, channelsRes, unreadRes] = await Promise.all([
        fetch("/api/messages/recent-contacts"),
        fetch("/api/channels"),
        fetch("/api/messages/unread-counts"),
      ]);

      if (contactsRes.ok) {
        const cData = await contactsRes.json();
        setContacts(Array.isArray(cData?.recentContacts) ? cData.recentContacts : Array.isArray(cData) ? cData : []);
      }

      if (channelsRes.ok) {
        const chData = await channelsRes.json();
        const rawChannels = Array.isArray(chData) ? chData : [];
        const filtered = rawChannels.filter((ch: any) => {
          if (!ch?.name) return false;
          const name = String(ch.name).toLowerCase();
          if (name.startsWith("task") || name.startsWith("internal")) return false;
          return true;
        });
        setChannels(filtered);
      }

      if (unreadRes.ok) {
        const uData = await unreadRes.json();
        setUnreadCounts({
          dms: uData.dms || {},
          channels: uData.channels || {},
        });
      }
    } catch (err) {
      console.error("Error fetching chats data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChatsData();

    const handleRefresh = () => {
      fetchChatsData();
    };

    window.addEventListener("message:received", handleRefresh);
    window.addEventListener("message:sent", handleRefresh);
    window.addEventListener("channel:created", handleRefresh);
    window.addEventListener("channel:assigned", handleRefresh);

    return () => {
      window.removeEventListener("message:received", handleRefresh);
      window.removeEventListener("message:sent", handleRefresh);
      window.removeEventListener("channel:created", handleRefresh);
      window.removeEventListener("channel:assigned", handleRefresh);
    };
  }, []);

  // Combine DMs and Channels into unified WhatsApp Chat List
  const unifiedChats: ChatItem[] = useMemo(() => {
    const list: ChatItem[] = [];

    // 1. Direct Messages
    contacts.forEach((contact: any) => {
      const isOnline = Boolean(
        contact?.id &&
        onlineUsers &&
        (Array.isArray(onlineUsers)
          ? onlineUsers.includes(contact.id)
          : onlineUsers instanceof Set
          ? onlineUsers.has(contact.id)
          : typeof onlineUsers === "object"
          ? (onlineUsers as any)[contact.id]
          : false)
      );

      const unread = unreadCounts.dms[contact.id] || 0;
      const lastMsg = contact.lastMessage;
      const lastTime = lastMsg?.createdAt || contact.updatedAt || 0;
      const rawTime = lastTime ? new Date(lastTime).getTime() : 0;

      let msgPreview = lastMsg?.content || "Tap to start conversation";
      if (lastMsg?.attachments && lastMsg.attachments.length > 0) {
        msgPreview = "📷 Photo / Attachment";
      }

      list.push({
        id: contact.id,
        type: "direct",
        name: contact.name || contact.email || "Teammate",
        image: contact.image,
        department: contact.department?.name || null,
        lastMessage: msgPreview,
        lastMessageSenderId: lastMsg?.senderId,
        lastMessageTime: lastTime,
        unreadCount: unread,
        isOnline: isOnline,
        rawTimestamp: rawTime,
      });
    });

    // 2. Channels
    channels.forEach((channel: any) => {
      const unread = unreadCounts.channels[channel.id] || 0;
      const lastTime = channel.updatedAt || channel.createdAt || 0;
      const rawTime = lastTime ? new Date(lastTime).getTime() : 0;

      list.push({
        id: channel.id,
        type: "channel",
        name: channel.name,
        image: channel.image,
        department: channel.department?.name || null,
        isPublic: channel.isPublic,
        lastMessage: channel.description || "Workspace discussion room",
        lastMessageSenderId: null,
        lastMessageTime: lastTime,
        unreadCount: unread,
        isOnline: false,
        rawTimestamp: rawTime,
      });
    });

    // Sort by latest message/activity timestamp descending (WhatsApp ordering)
    return list.sort((a, b) => b.rawTimestamp - a.rawTimestamp);
  }, [contacts, channels, unreadCounts, onlineUsers]);

  // Filtered chats based on active filter tab and search
  const filteredChats = useMemo(() => {
    let result = unifiedChats;

    if (activeFilter === "unread") {
      result = result.filter((chat) => (chat.unreadCount || 0) > 0);
    } else if (activeFilter === "dms") {
      result = result.filter((chat) => chat.type === "direct");
    } else if (activeFilter === "channels") {
      result = result.filter((chat) => chat.type === "channel");
    }

    if (!searchQuery.trim()) return result;

    const query = searchQuery.toLowerCase();
    return result.filter(
      (chat) =>
        chat.name.toLowerCase().includes(query) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(query)) ||
        (chat.department && chat.department.toLowerCase().includes(query))
    );
  }, [unifiedChats, activeFilter, searchQuery]);

  const totalUnreadAll = useMemo(() => {
    return unifiedChats.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
  }, [unifiedChats]);

  return (
    <div className="w-full max-w-2xl mx-auto pb-24 space-y-3 relative">
      {/* 1. Top Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        {/* App Title Bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Chats
            </h1>
            {totalUnreadAll > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-xs">
                {totalUnreadAll}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/dashboard/people"
              aria-label="Start new conversation"
              className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center active:scale-95 transition-transform"
            >
              <MessageSquarePlus className="w-4.5 h-4.5" />
            </Link>
          </div>
        </div>

        {/* 2. Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats, people, channels..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* 3. Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setActiveFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer",
              activeFilter === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            All
          </button>

          <button
            onClick={() => setActiveFilter("unread")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
              activeFilter === "unread"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            <span>Unread</span>
            {totalUnreadAll > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                {totalUnreadAll}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter("dms")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer",
              activeFilter === "dms"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            Direct ({contacts.length})
          </button>

          <button
            onClick={() => setActiveFilter("channels")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer",
              activeFilter === "channels"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            Channels ({channels.length})
          </button>
        </div>
      </div>

      {/* 4. Chat List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-400 font-medium">Loading conversations...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No chats found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {searchQuery ? "Try searching for another person or channel." : "Start a direct message or join a team channel."}
            </p>
            <Button asChild size="sm" className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
              <Link href="/dashboard/people">Find Teammates</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredChats.map((chat) => {
              const targetUrl =
                chat.type === "direct"
                  ? `/dashboard/messages/${chat.id}`
                  : `/dashboard/channels/${chat.id}`;

              const isSentByMe = chat.lastMessageSenderId === currentUserId;
              const timeStr = formatWhatsAppTime(chat.lastMessageTime);
              const unread = chat.unreadCount || 0;

              return (
                <Link
                  key={`${chat.type}-${chat.id}`}
                  href={targetUrl}
                  className="flex items-center gap-3.5 px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer group"
                >
                  {/* Circular Avatar with Online Indicator */}
                  <div className="relative shrink-0 w-11 h-11">
                    {chat.type === "channel" ? (
                      <div className="w-11 h-11 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs overflow-hidden">
                        {chat.image ? (
                          <img
                            src={chat.image}
                            alt={chat.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : chat.isPublic ? (
                          <Hash className="w-4.5 h-4.5" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs border border-slate-200/80 dark:border-slate-700">
                        {chat.image ? (
                          <img
                            src={chat.image}
                            alt={chat.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span>{chat.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    )}

                    {/* Online Green Indicator Dot */}
                    {chat.type === "direct" && chat.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs" />
                    )}
                  </div>

                  {/* Middle & Right Info */}
                  <div className="min-w-0 flex-1">
                    {/* Line 1: Name & Timestamp */}
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {chat.type === "channel" ? `# ${chat.name}` : chat.name}
                      </h3>
                      <span
                        className={cn(
                          "text-[10px] font-medium shrink-0 ml-1.5",
                          unread > 0
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : "text-slate-400"
                        )}
                      >
                        {timeStr}
                      </span>
                    </div>

                    {/* Line 2: Message Preview & Unread Pill */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 text-xs text-slate-500 dark:text-slate-400">
                        {/* Checkmarks */}
                        {chat.type === "direct" && isSentByMe && (
                          <CheckCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        )}
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400 font-normal">
                          {chat.lastMessage}
                        </p>
                      </div>

                      {/* Green Unread Badge Circle */}
                      {unread > 0 && (
                        <span className="h-4.5 min-w-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
