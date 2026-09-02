"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  X,
  MessageSquare,
  CheckSquare,
  Hash,
  Menu,
  CalendarCheck,
  Users,
  ClockAlert,
  ChevronDown,
  Building,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/lib/socket-client";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import { TaskCalendarWidget } from "./task-calendar-widget";
import { NotificationsButton } from "./notifications-button";
import { ThemeCustomizer } from "./theme-customizer";
import { ThemeToggle } from "./theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { MobileSidebarDrawer } from "@/components/mobile/MobileSidebarDrawer";
import { useNotifications } from "@/contexts/notifications-context";

type Notification = {
  id: string;
  type: string;
  content: string;
  read: boolean;
  createdAt: string;
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [title, setTitle] = useState("Dashboard");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const isAdmin =
    session?.user?.role === "ORG_ADMIN" ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "ADMIN" ||
    (user as any)?.role === "ORG_ADMIN" ||
    (user as any)?.role === "SUPER_ADMIN" ||
    (user as any)?.role === "ADMIN";
  const [isRefreshing, setIsRefreshing] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut (Cmd+K / Ctrl+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setShowSearchResults(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close search results on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const titleMap: { [key: string]: string } = {
      "/dashboard": "Dashboard",
      "/dashboard/chats": "Chats",
      "/dashboard/messages": "Messages",
      "/dashboard/tasks": "Projects",
      "/dashboard/people": "Team",
      "/dashboard/settings": "Settings",
      "/dashboard/channels": "Channels",
      "/dashboard/calendar": "Calendar",
      "/dashboard/notification": "Notifications",
      "/dashboard/reminders": "Reminders",
    };

    const sortedPaths = Object.keys(titleMap).sort((a, b) => b.length - a.length);
    const matchedPath = sortedPaths.find((path) =>
      pathname === path || pathname?.startsWith(path + "/") || pathname?.startsWith(path)
    );

    setTitle(matchedPath ? titleMap[matchedPath] : "Workspace");

    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications");
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [pathname]);

  useEffect(() => {
    if (!isConnected || !socket) return;

    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
    };

    socket.on("notification", handleNewNotification);

    return () => {
      socket.off("notification", handleNewNotification);
    };
  }, [isConnected, socket]);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
    } catch (error) {
      console.error("Logout error:", error);
    }
    window.location.href = "/login";
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing:", error);
      toast({
        title: "Error",
        description: "Failed to refresh page",
        variant: "destructive",
      });
      setIsRefreshing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast({
        title: "Error",
        description: "Failed to search",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xs pt-[env(safe-area-inset-top,0px)]">
      <div className="flex h-14 items-center justify-between px-3 md:px-6 gap-3">
        {/* Left Section - Mobile Drawer, Logo & Page Title */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile menu sheet */}
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0 rounded-2xl border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800/90 shadow-2xs hover:bg-slate-200 active:scale-90 transition-all cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4.5 w-4.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 border-r border-slate-200/80 dark:border-slate-800 shadow-2xl">
              <MobileSidebarDrawer onClose={() => setIsDrawerOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Logo Brand & Title Badge */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex flex-col group focus:outline-none"
            >
              <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {title || "Dashboard"}
              </span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider leading-none mt-0.5">
                Workspace
              </span>
            </Link>
          </div>
        </div>

        {/* Center Section - Modern Floating Search Bar (Admin Only) */}
        {isAdmin && (
          <div
            ref={searchContainerRef}
            className="hidden md:flex flex-1 max-w-lg mx-auto justify-center relative px-2"
          >
            <form onSubmit={handleSearch} className="relative w-full group">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search projects, channels, messages..."
                  className="pl-10 pr-24 h-9.5 text-xs font-medium bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 rounded-full focus-visible:bg-white dark:focus-visible:bg-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all shadow-2xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() =>
                    searchResults.length > 0 && setShowSearchResults(true)
                  }
                />

                <div className="absolute right-2.5 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setShowSearchResults(false);
                        setSearchResults([]);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                      title="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}

                  {isSearching ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mr-1" />
                  ) : (
                    <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 px-1.5 font-mono text-[10px] font-semibold text-slate-400 dark:text-slate-500 shadow-2xs">
                      ⌘K
                    </kbd>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {showSearchResults && searchResults.length > 0 && (
                  <motion.div
                    className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col"
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="p-3 px-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Search className="h-3.5 w-3.5 text-indigo-500" />
                        Search Results
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                          {searchResults.length}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        onClick={() => setShowSearchResults(false)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="p-2 space-y-1 overflow-y-auto max-h-80 divide-y divide-slate-100/50 dark:divide-slate-800/50">
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          className="p-2.5 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 rounded-xl cursor-pointer transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50 group/item flex items-center justify-between"
                          onClick={() => {
                            if (result.type === "message") {
                              if (result.channelId) {
                                router.push(`/dashboard/channels/${result.channelId}`);
                              } else if (result.senderId !== currentUserId) {
                                router.push(`/dashboard/messages/${result.senderId}`);
                              } else if (result.receiverId) {
                                router.push(`/dashboard/messages/${result.receiverId}`);
                              }
                            } else if (result.type === "task") {
                              router.push(`/dashboard/tasks/${result.id}`);
                            } else if (result.type === "channel") {
                              router.push(`/dashboard/channels/${result.id}`);
                            } else if (result.type === "user") {
                              router.push(`/dashboard/messages/${result.id}`);
                            }
                            setShowSearchResults(false);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover/item:scale-105 shadow-2xs",
                                result.type === "message" &&
                                "bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40",
                                result.type === "task" &&
                                "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40",
                                result.type === "channel" &&
                                "bg-purple-50 text-purple-600 dark:bg-purple-950/70 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40",
                                result.type === "user" &&
                                "bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40",
                              )}
                            >
                              {result.type === "message" && (
                                <MessageSquare className="h-4 w-4" />
                              )}
                              {result.type === "task" && (
                                <CheckSquare className="h-4 w-4" />
                              )}
                              {result.type === "channel" && (
                                <Hash className="h-4 w-4" />
                              )}
                              {result.type === "user" && (
                                <User className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">
                                {result.title || result.name || result.content}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize font-medium flex items-center gap-1">
                                <span>{result.type.replace("_", " ")}</span>
                                {result.channelName && (
                                  <>
                                    <span>•</span>
                                    <span>#{result.channelName}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] font-semibold text-slate-400 group-hover/item:text-indigo-500 group-hover/item:translate-x-0.5 transition-all opacity-0 group-hover/item:opacity-100 shrink-0 ml-2">
                            Open →
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        )}

        {/* Right Section - Sleek Action Widgets & User Profile */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mobile search dropdown button */}
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild className="lg:hidden">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <Search className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-3 rounded-2xl">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  placeholder="Search projects, DMs..."
                  className="pl-9 pr-4 h-8 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
                  </div>
                )}
              </form>
            </DropdownMenuContent>
          </DropdownMenu> */}

          {/* Task Calendar Widget */}
          <div className="hidden sm:block">
            <TaskCalendarWidget />
          </div>

          {/* Reminders Button */}
          <div className="hidden sm:block">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 px-3 rounded-xl border-slate-200/80 dark:border-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs"
            >
              <Link
                href="/dashboard/reminders"
                className="flex items-center gap-1.5"
              >
                <CalendarCheck className="h-3.5 w-3.5 text-indigo-500" />
                <span>Reminders</span>
              </Link>
            </Button>
          </div>

          {/* Quick Reminder Icon */}
          <div className="hidden sm:block">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 w-8 p-0 rounded-xl border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs"
              title="Create Reminder"
            >
              <Link href="/dashboard/reminders/create">
                <ClockAlert className="h-3.5 w-3.5 text-amber-500" />
              </Link>
            </Button>
          </div>

          {/* Refresh Page Icon */}
          <div className="hidden sm:block">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0 rounded-xl border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs disabled:opacity-50"
              title="Refresh Page"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 text-slate-600 dark:text-slate-300 ${isRefreshing ? "animate-spin" : ""
                  }`}
              />
            </Button>
          </div>

          {/* Mobile Notifications Direct Link (Opens Dedicated Screen without cramped popover) */}
          <div className="block sm:hidden">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="relative h-9 w-9 rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Link href="/dashboard/notification" aria-label="Notifications">
                <Bell className="h-4.5 w-4.5 text-slate-600 dark:text-slate-300" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 shadow-xs" />
                )}
              </Link>
            </Button>
          </div>

          {/* Desktop Notifications Popover Dropdown */}
          <div className="hidden sm:block">
            <NotificationsButton />
          </div>

          {/* Team Icon for Admin */}
          {isAdmin && (
            <div className="hidden sm:block">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 w-8 p-0 rounded-xl border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs"
                title="Team Members"
              >
                <Link href="/dashboard/people">
                  <Users className="h-3.5 w-3.5 text-indigo-500" />
                </Link>
              </Button>
            </div>
          )}

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 px-1.5 sm:px-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <div className="relative shrink-0">
                  <Avatar className="h-8 w-8 rounded-full ring-2 ring-indigo-500/20 shadow-xs">
                    <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                    <AvatarFallback className="bg-indigo-600 text-white text-xs font-bold flex items-center justify-center rounded-full">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-2xs" />
                </div>
                <span className="hidden sm:block text-xs font-bold text-slate-800 dark:text-slate-200 max-w-24 truncate">
                  {user?.name?.split(" ")[0]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-64 p-2 rounded-2xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xl space-y-1"
            >
              {/* User Header Profile Summary */}
              <div className="flex items-center gap-3 p-2.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <Avatar className="h-9.5 w-9.5 shrink-0 rounded-full border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs">
                  <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                  <AvatarFallback className="text-white text-xs font-bold rounded-full">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

              {/* Profile & Settings */}
              <DropdownMenuItem
                asChild
                className="rounded-xl cursor-pointer text-xs font-medium focus:bg-slate-100 dark:focus:bg-slate-800"
              >
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2 px-2.5 py-1.5"
                >
                  <User className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Profile & Account</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

              {/* Theme Toggle row */}
              <div className="px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  App Theme
                </span>
                <ThemeToggle />
              </div>

              <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

              {/* Sign Out */}
              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-xl cursor-pointer text-xs font-bold text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/40 px-2.5 py-1.5"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
