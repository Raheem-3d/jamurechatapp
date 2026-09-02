"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  Search,
  CheckCheck,
  CheckCircle2,
  Clock,
  MessageSquare,
  Calendar,
  AlertCircle,
  ChevronRight,
  SlidersHorizontal,
  FolderKanban,
  Megaphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface NotificationsMobileProps {
  notifications: any[];
  unreadCount: number;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

export function NotificationsMobile({
  notifications = [],
  unreadCount,
  markAllAsRead,
  markAsRead,
  isMuted,
  toggleMute,
}: NotificationsMobileProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && !item.read) ||
        (filter === "read" && item.read);

      return matchesSearch && matchesFilter;
    });
  }, [notifications, searchQuery, filter]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage) || 1;
  const paginatedNotifications = filteredNotifications.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const getNotificationIcon = (type: string) => {
    const lower = (type || "").toLowerCase();
    if (lower.includes("announcement")) {
      return (
        <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Megaphone className="w-4 h-4" />
        </div>
      );
    }
    if (lower.includes("message")) {
      return (
        <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4" />
        </div>
      );
    }
    if (lower.includes("task") || lower.includes("project")) {
      return (
        <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
        <Bell className="w-4 h-4" />
      </div>
    );
  };

  const getNotificationLink = (notification: any) => {
    if (notification.type && notification.type.includes("ANNOUNCEMENT")) {
      if (notification.announcementId && notification.organizationId) {
        return `/org/${notification.organizationId}/announcements/${notification.announcementId}`;
      }
      if (notification.announcementId) {
        return `/org/${notification.announcementId}/announcements/${notification.announcementId}`;
      }
    }
    if (notification.type === "CHANNEL_MESSAGE" || notification.channelId) {
      return `/dashboard/channels/${notification.channelId}`;
    }
    if (notification.type === "DIRECT_MESSAGE" || notification.receiverId || notification.senderId) {
      const candidates = [
        notification.senderId,
        notification.receiverId,
        notification.messageId,
      ].filter(Boolean) as string[];
      return candidates[0] ? `/dashboard/messages/${candidates[0]}` : `/dashboard/messages`;
    }
    if (notification.type === "TASK_ASSIGNED" || notification.taskId) {
      return `/dashboard/tasks/${notification.taskId || notification.id}`;
    }
    if (notification.type === "CHANNEL" || notification.type === "CHANNEL_INVITE") {
      return `/dashboard/channels/${notification.channelId || notification.id}`;
    }
    if (notification.type === "USER") {
      return `/dashboard/messages/${notification.senderId || notification.id}`;
    }
    if (notification.type === "REMINDER") {
      return `/dashboard/reminders`;
    }
    return "/dashboard";
  };

  return (
    <div className="flex flex-col gap-3.5 pb-28 w-full">
      {/* 1. Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-extrabold shadow-sm animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-90 transition-transform cursor-pointer"
              title={isMuted ? "Unmute alerts" : "Mute alerts"}
            >
              {isMuted ? <BellOff className="w-4 h-4 text-rose-500" /> : <Bell className="w-4 h-4 text-emerald-500" />}
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 text-xs font-bold active:scale-95 transition-transform cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Read All</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Stay updated with your latest activities, task changes & direct mentions
        </p>

        {/* Search */}
        <div className="relative w-full mt-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search notifications..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 dark:bg-slate-800/80 border-0 rounded-2xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => {
              setFilter("all");
              setPage(1);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
              filter === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            All ({notifications.length})
          </button>

          <button
            onClick={() => {
              setFilter("unread");
              setPage(1);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
              filter === "unread"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setFilter("read");
              setPage(1);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
              filter === "read"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            Read
          </button>
        </div>
      </div>

      {/* 2. Notifications List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {paginatedNotifications.length === 0 ? (
          <div className="text-center py-14 px-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No notifications found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {searchQuery ? "Try searching for something else." : "You are completely caught up!"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {paginatedNotifications.map((notification) => {
              const link = getNotificationLink(notification);
              const timeStr = notification.createdAt
                ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                : "recently";

              return (
                <Link
                  key={notification.id}
                  href={link}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    "flex items-start gap-3 p-3.5 transition-colors cursor-pointer block active:bg-slate-100 dark:active:bg-slate-800",
                    !notification.read
                      ? "bg-indigo-50/40 dark:bg-indigo-950/25"
                      : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                  )}
                >
                  {getNotificationIcon(notification.type)}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white capitalize truncate">
                        {notification.type.toLowerCase().replace("_", " ")}
                      </p>
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                      {notification.content}
                    </p>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{timeStr}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsMobile;
