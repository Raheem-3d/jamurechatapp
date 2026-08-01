"use client";

import { useState, useEffect } from "react";
import { useNotifications } from "@/contexts/notifications-context";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Check,
  Trash2,
  MessageSquare,
  CheckSquare,
  Users,
  Hash,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSession } from "next-auth/react";

interface NotificationsPanelProps {
  notifications?: any[];
  showEmptyState?: boolean;
}

export function NotificationsPanel({
  notifications: propNotifications,
  showEmptyState = false,
}: NotificationsPanelProps) {
  const {
    notifications: contextNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  const { data: session } = useSession();
  const currentUserId = (session as any)?.user?.id as string | undefined;

  const notifications = propNotifications || contextNotifications;
  const [activeTab, setActiveTab] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === "all") return true;
    if (activeTab === "messages") return notification.type.includes("MESSAGE");
    if (activeTab === "tasks") return notification.type.includes("TASK");
    if (activeTab === "reminder") return notification.type.includes("REMINDER");
    return true;
  });

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getNotificationIcon = (type: string) => {
    if (type.includes("ANNOUNCEMENT")) {
      return <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    }
    if (type.includes("MESSAGE")) {
      return type.includes("CHANNEL") ? (
        <Hash className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      ) : (
        <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      );
    }
    if (type.includes("TASK")) {
      if (type.includes("DUE"))
        return <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      if (type.includes("COMPLETED"))
        return <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      if (type.includes("ASSIGNED"))
        return <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      if (type.includes("REMINDER"))
        return <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      return <CheckSquare className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
    }
    if (type.includes("USER"))
      return <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />;
    return <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
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
    if (notification.type === "CHANNEL_MESSAGE") {
      return `/dashboard/channels/${notification.channelId}`;
    }
    if (notification.type === "DIRECT_MESSAGE") {
      const candidates = [
        notification.senderId,
        notification.receiverId,
        notification.messageId,
      ].filter(Boolean) as string[];

      const targetId =
        candidates.find((id) => !currentUserId || id !== currentUserId) ||
        candidates[0];
      return targetId ? `/dashboard/messages/${targetId}` : `/dashboard/messages`;
    }

    if (notification.type === "TASK_ASSIGNED") {
      return `/dashboard/tasks/${notification.taskId || notification.id}`;
    }
    if (notification.type === "CHANNEL") {
      return `/dashboard/channels/${notification.channelId || notification.id}`;
    }
    if (notification.type === "CHANNEL_INVITE") {
      return `/dashboard/channels/${notification.channelId || notification.id}`;
    }
    if (notification.type === "USER") {
      return `/dashboard/messages/${notification.senderId || notification.id}`;
    }
    if (notification.type === "REMINDER") {
      return `/dashboard/reminders`;
    }
    return "#";
  };

  const getTaskStatus = (type: string) => {
    if (type.includes("DUE")) {
      return {
        text: "Due Soon",
        class:
          "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60",
      };
    }
    if (type.includes("COMPLETED")) {
      return {
        text: "Completed",
        class:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60",
      };
    }
    if (type.includes("ASSIGNED")) {
      return {
        text: "Assigned",
        class:
          "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900/60",
      };
    }
    if (type.includes("REMINDER")) {
      return {
        text: "Reminder",
        class:
          "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/60",
      };
    }
    return {
      text: "Task",
      class:
        "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    };
  };

  const getNotificationTypeColor = (type: string) => {
    if (type.includes("ANNOUNCEMENT"))
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60";
    if (type.includes("MESSAGE"))
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900/60";
    if (type.includes("TASK"))
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60";
    if (type.includes("REMINDER"))
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900/60";
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  };

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 shadow-md dark:bg-slate-900 w-full rounded-2xl overflow-hidden">
      {/* Header */}
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center justify-between gap-4 flex-wrap w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <Badge className="bg-indigo-600 text-white font-extrabold text-xs px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="h-8 rounded-xl border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
              Mark all read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearNotifications}
              disabled={notifications.length === 0}
              className="h-8 rounded-xl border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear all
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          {/* Navigation Tabs Bar */}
          <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 px-2 pt-1">
            <TabsList className="w-full justify-start rounded-none border-0 bg-transparent p-0 gap-1 overflow-x-auto scrollbar-none">
              <TabsTrigger
                value="all"
                className="rounded-xl border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-indigo-50/60 dark:data-[state=active]:bg-indigo-950/40 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 font-bold text-xs px-3.5 py-2.5 transition-all"
              >
                All
                <Badge
                  variant="secondary"
                  className="ml-1.5 text-[10px] font-extrabold px-1.5 py-0 bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md"
                >
                  {notifications.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="messages"
                className="rounded-xl border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-indigo-50/60 dark:data-[state=active]:bg-indigo-950/40 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 font-bold text-xs px-3.5 py-2.5 transition-all"
              >
                Messages
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="rounded-xl border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-indigo-50/60 dark:data-[state=active]:bg-indigo-950/40 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 font-bold text-xs px-3.5 py-2.5 transition-all"
              >
                Tasks
              </TabsTrigger>
              <TabsTrigger
                value="reminder"
                className="rounded-xl border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-indigo-50/60 dark:data-[state=active]:bg-indigo-950/40 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-300 font-bold text-xs px-3.5 py-2.5 transition-all"
              >
                Reminders
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            <ScrollArea className="h-[420px]">
              {showEmptyState || filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[340px] text-center p-6">
                  <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700">
                    <Bell className="h-7 w-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    No notifications
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                    {activeTab === "all"
                      ? "You're all caught up! New alerts will appear here."
                      : `No ${activeTab} notifications found at the moment.`}
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedNotifications.map((notification) => {
                      const taskStatus = notification.type.includes("TASK")
                        ? getTaskStatus(notification.type)
                        : null;
                      const isAnnouncement = notification.type.includes("ANNOUNCEMENT");

                      return (
                        <Link
                          key={notification.id}
                          href={getNotificationLink(notification)}
                          onClick={() => markAsRead(notification.id)}
                          className={cn(
                            "flex items-start gap-3.5 p-4 transition-all duration-200 group border-l-4",
                            !notification.read
                              ? "bg-indigo-50/40 dark:bg-indigo-950/30 border-l-indigo-600 dark:border-l-indigo-500 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/50"
                              : "border-l-transparent hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          )}
                        >
                          {/* Type Icon */}
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-xs transition-transform group-hover:scale-105",
                              !notification.read
                                ? "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/60"
                                : "border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-800"
                            )}
                          >
                            {getNotificationIcon(notification.type)}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  "text-xs leading-relaxed",
                                  !notification.read
                                    ? "text-slate-900 dark:text-white font-bold"
                                    : "text-slate-700 dark:text-slate-300 font-medium"
                                )}
                              >
                                {notification.content}
                              </p>
                              {!notification.read && (
                                <Badge
                                  variant="default"
                                  className="bg-indigo-600 text-white text-[10px] font-extrabold px-1.5 py-0 rounded-md shrink-0"
                                >
                                  New
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-lg border",
                                  getNotificationTypeColor(notification.type),
                                  isAnnouncement && "ring-1 ring-amber-300 dark:ring-amber-700"
                                )}
                              >
                                {notification.type.replace(/_/g, " ").toLowerCase()}
                              </Badge>

                              {taskStatus && (
                                <Badge
                                  variant="outline"
                                  className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg border", taskStatus.class)}
                                >
                                  {taskStatus.text}
                                </Badge>
                              )}

                              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 ml-auto">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {formatDistanceToNow(
                                  new Date(notification.createdAt),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span>
                        Page {currentPage} of {totalPages}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          className="h-7 px-2.5 text-xs rounded-lg border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                          Prev
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                          className="h-7 px-2.5 text-xs rounded-lg border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
