"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Hash, ChevronRight, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RecentChannelsWidgetProps {
  channels: any[];
}

export function RecentChannelsWidget({ channels }: RecentChannelsWidgetProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const itemsPerPage = 4;
  const totalPages = Math.ceil(channels.length / itemsPerPage);

  const fetchUnread = async () => {
    try {
      const res = await fetch("/api/messages/unread-counts");
      if (res.ok) {
        const data = await res.json();
        setUnreadCounts(data.channels || {});
      }
    } catch (err) {
      console.error("Failed to fetch unread counts:", err);
    }
  };

  useEffect(() => {
    fetchUnread();

    const onMessageReceived = (event: CustomEvent) => {
      const msg = event?.detail;
      if (!msg || !msg.channelId) return;
      if (currentUserId && msg.senderId === currentUserId) return;

      // Update unread count synchronously
      setUnreadCounts((prev) => ({
        ...prev,
        [msg.channelId]: (prev[msg.channelId] || 0) + 1,
      }));

      fetchUnread();
    };

    window.addEventListener("messages:read", fetchUnread as EventListener);
    window.addEventListener("message:created", fetchUnread as EventListener);
    window.addEventListener("message:received", onMessageReceived as EventListener);

    return () => {
      window.removeEventListener("messages:read", fetchUnread as EventListener);
      window.removeEventListener("message:created", fetchUnread as EventListener);
      window.removeEventListener("message:received", onMessageReceived as EventListener);
    };
  }, [currentUserId]);

  // Auto-clear unread count if user is on this channel's page
  useEffect(() => {
    if (!pathname) return;
    if (pathname.includes("/dashboard/channels/")) {
      const activeChannelId = pathname.split("/dashboard/channels/")[1]?.split("/")[0]?.trim();
      if (activeChannelId) {
        setUnreadCounts((prev) => {
          if (!prev[activeChannelId]) return prev;
          const copy = { ...prev };
          delete copy[activeChannelId];
          return copy;
        });
      }
    }
  }, [pathname]);

  const handleChannelClick = (channelId: string) => {
    setUnreadCounts((prev) => {
      if (!prev[channelId]) return prev;
      const copy = { ...prev };
      delete copy[channelId];
      return copy;
    });
    fetch("/api/messages/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    })
      .then(() => {
        window.dispatchEvent(new CustomEvent("messages:read"));
      })
      .catch(() => {});
  };

  const paginatedChannels = channels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      <CardHeader className="pb-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-900 dark:text-white text-sm font-bold flex items-center gap-2">
            <div className="p-1 bg-blue-50 dark:bg-blue-950/50 rounded-md text-blue-600 dark:text-blue-400">
              <Hash className="h-3.5 w-3.5" />
            </div>
            Recent Channels
            <Badge
              variant="secondary"
              className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[9px] px-1.5 py-0 font-bold"
            >
              {channels.length}
            </Badge>
          </CardTitle>
          {totalPages > 1 && (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-2">
        {paginatedChannels.length > 0 ? (
          paginatedChannels.map((channel) => {
            const unread = unreadCounts[channel.id] || 0;
            return (
              <Link
                key={channel.id}
                href={`/dashboard/channels/${channel.id}`}
                onClick={() => handleChannelClick(channel.id)}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-150 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-blue-100/80 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0 overflow-hidden">
                    {channel.image ? (
                      <img
                        src={channel.image}
                        alt={channel.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Hash className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {channel.name || "Unnamed Channel"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {channel._count?.messages || 0} messages
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {unread > 0 && (
                    <Badge className="bg-indigo-600 dark:bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unread > 99 ? "99+ new" : `${unread} new`}
                    </Badge>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-6">
            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">
              No channels joined
            </p>
          </div>
        )}

        {/* Compact Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium">
            <span>
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, channels.length)} of {channels.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="h-6 w-6 p-0 rounded-lg"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="h-6 w-6 p-0 rounded-lg"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
