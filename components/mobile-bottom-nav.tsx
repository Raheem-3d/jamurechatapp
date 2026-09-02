"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  CalendarDays,
  CheckSquare,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Fetch unread count for the chats badge
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/messages/unread-counts");
        if (res.ok) {
          const data = await res.json();
          const dmSum = Object.values(data?.dms || {}).reduce((a: number, b: any) => a + Number(b || 0), 0);
          const chSum = Object.values(data?.channels || {}).reduce((a: number, b: any) => a + Number(b || 0), 0);
          setUnreadCount(Number(dmSum) + Number(chSum));
        }
      } catch (e) {
        // ignore
      }
    };

    fetchUnread();
    window.addEventListener("message:received", fetchUnread);
    window.addEventListener("message:sent", fetchUnread);
    return () => {
      window.removeEventListener("message:received", fetchUnread);
      window.removeEventListener("message:sent", fetchUnread);
    };
  }, []);

  // Hide bottom nav inside active chat conversation or video call pages
  const isChatRoom =
    pathname.startsWith("/dashboard/messages/") ||
    (pathname.startsWith("/dashboard/channels/") && pathname.split("/").length > 3 && !pathname.endsWith("/all"));

  if (isChatRoom) return null;

  const navItems = [
    {
      label: "Home",
      href: "/dashboard",
      icon: Home,
      isActive: pathname === "/dashboard",
    },
    {
      label: "Chats",
      href: "/dashboard/chats",
      icon: MessageSquare,
      isActive: pathname.startsWith("/dashboard/chats") || pathname.startsWith("/dashboard/messages"),
      badge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : null,
    },
    {
      label: "Calendar",
      href: "/dashboard/calendar",
      icon: CalendarDays,
      isActive: pathname.startsWith("/dashboard/calendar"),
    },
    {
      label: "Tasks",
      href: "/dashboard/tasks",
      icon: CheckSquare,
      isActive: pathname.startsWith("/dashboard/tasks"),
    },
    {
      label: "Profile",
      href: "/dashboard/settings",
      icon: User,
      isActive:
        pathname.startsWith("/dashboard/settings") ||
        pathname.startsWith("/u/settings") ||
        pathname.startsWith("/dashboard/people"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-1.5 px-3">
      <div className="grid grid-cols-5 items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center py-1 transition-transform active:scale-90 group relative"
            >
              {/* Icon Container with Pill Highlight */}
              <div
                className={cn(
                  "relative px-3.5 py-1 rounded-full flex items-center justify-center transition-all duration-200",
                  item.isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all",
                    item.isActive ? "stroke-[2.5] scale-105" : "stroke-[1.8]"
                  )}
                />

                {/* Unread / Notification Badge */}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] mt-0.5 tracking-tight transition-colors",
                  item.isActive
                    ? "text-indigo-600 dark:text-indigo-400 font-bold"
                    : "text-slate-500 dark:text-slate-400 font-medium"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomNav;


