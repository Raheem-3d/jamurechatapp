"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  Users,
  Calendar,
  Bell,
  ClockAlert,
  Settings,
  LogOut,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  Building,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export function MobileSidebarDrawer({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const currentUser = user || session?.user;
  const isAdmin =
    currentUser?.role === "ORG_ADMIN" ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.role === "ADMIN";

  const handleNavigation = (href: string) => {
    if (onClose) onClose();
    router.push(href);
  };

  const handleLogout = async () => {
    if (onClose) onClose();
    await signOut({ callbackUrl: "/login" });
  };

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/60",
    },
    {
      href: "/dashboard/tasks",
      label: "Projects & Tasks",
      icon: Briefcase,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/60",
    },
    {
      href: "/dashboard/chats",
      label: "Chats & Channels",
      icon: MessageSquare,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/60",
      badge: "Live",
    },
    {
      href: "/dashboard/people",
      label: "Team Directory",
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/60",
    },
    {
      href: "/dashboard/ai-assistant",
      label: "Jamure AI Hub",
      icon: Sparkles,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/60",
      badge: "AI 2.0",
      highlight: true,
    },
    {
      href: "/dashboard/calendar",
      label: "Calendar",
      icon: Calendar,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/60",
    },
    {
      href: "/dashboard/notification",
      label: "Notifications",
      icon: Bell,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/60",
    },
    {
      href: "/dashboard/reminders",
      label: "Reminders",
      icon: ClockAlert,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/60",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white select-none">
      {/* 1. Header with Brand & User Profile */}
      <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900">
        {/* Workspace Brand */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
                Jamure Workspace
              </h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                Enterprise Hub
              </p>
            </div>
          </div>
          {isAdmin && (
            <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[8px] px-1.5 py-0 border-0">
              Admin
            </Badge>
          )}
        </div>

        {/* User Card */}
        <button
          type="button"
          onClick={() => handleNavigation("/dashboard/settings")}
          className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs hover:bg-slate-50 active:scale-[0.99] transition-all text-left group"
        >
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 ring-2 ring-indigo-500/20">
              <AvatarImage src={currentUser?.image || ""} alt={currentUser?.name || "User"} />
              <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {currentUser?.name || "User Profile"}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-medium">
              {currentUser?.email}
            </p>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 no-scrollbar">
        {/* Main Navigation */}
        <div className="space-y-0.5">
          <p className="px-2 pb-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Menu Navigation
          </p>

          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer active:scale-[0.98]",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shadow-xs border border-indigo-100 dark:border-indigo-900/60"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      isActive ? "bg-indigo-600 text-white shadow-xs" : cn(item.bg, item.color)
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <Badge
                    className={cn(
                      "text-[9px] px-1.5 py-0 border-0 font-extrabold",
                      item.highlight
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Bottom Dock & Preferences */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
        {/* Appearance Switcher */}
        <div className="flex items-center justify-between p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              theme === "light"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
            )}
          >
            <Sun className="w-3.5 h-3.5" />
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              theme === "dark"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
            )}
          >
            <Moon className="w-3.5 h-3.5" />
            Dark
          </button>
          <button
            type="button"
            onClick={() => setTheme("system")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              theme === "system"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50"
            )}
          >
            <Laptop className="w-3.5 h-3.5" />
            Auto
          </button>
        </div>

        {/* Settings & Sign Out */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleNavigation("/dashboard/settings")}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            Settings
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileSidebarDrawer;
