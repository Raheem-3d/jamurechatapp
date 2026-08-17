"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RecentContactsWidgetProps {
  contacts: any[];
}

export function RecentContactsWidget({ contacts }: RecentContactsWidgetProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const itemsPerPage = 4;
  const totalPages = Math.ceil(contacts.length / itemsPerPage);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/messages/unread-counts");
        if (res.ok) {
          const data = await res.json();
          setUnreadCounts(data.dms || {});
        }
      } catch (err) {
        console.error("Failed to fetch DM unread counts:", err);
      }
    };
    fetchUnread();
    window.addEventListener("messages:read", fetchUnread as EventListener);
    window.addEventListener("message:created", fetchUnread as EventListener);
    return () => {
      window.removeEventListener("messages:read", fetchUnread as EventListener);
      window.removeEventListener("message:created", fetchUnread as EventListener);
    };
  }, []);

  const paginatedContacts = contacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      <CardHeader className="pb-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-900 dark:text-white text-sm font-bold flex items-center gap-2">
            <div className="p-1 bg-purple-50 dark:bg-purple-950/50 rounded-md text-purple-600 dark:text-purple-400">
              <Users className="h-3.5 w-3.5" />
            </div>
            Recent Contacts
            <Badge
              variant="secondary"
              className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[9px] px-1.5 py-0 font-bold"
            >
              {contacts.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-7 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 px-2"
          >
            <Link href="/dashboard/people">View All</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-2">
        {paginatedContacts.length > 0 ? (
          paginatedContacts.map((contact: any) => {
            const rawContent = contact.lastMessage?.content;
            const subtext =
              !rawContent || rawContent.includes(":\\") || rawContent.startsWith("/")
                ? "Direct Message"
                : rawContent;
            const unread = unreadCounts[contact.id] || 0;

            return (
              <Link
                key={contact.id}
                href={`/dashboard/messages/${contact.id}`}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-150 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-800 shrink-0">
                    <AvatarImage src={contact.image || ""} alt={contact.name} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold text-xs">
                      {contact.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-purple-600 dark:group-hover:text-purple-400">
                      {contact.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {subtext}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {unread > 0 && (
                    <Badge className="bg-indigo-600 dark:bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unread > 99 ? "99+ new" : `${unread} new`}
                    </Badge>
                  )}
                  <MessageSquare className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-6">
            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">
              No recent contacts
            </p>
          </div>
        )}

        {/* Compact Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 font-medium">
            <span>
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, contacts.length)} of {contacts.length}
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
