"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const isAdmin = session?.user?.role === "ORG_ADMIN";
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const titleMap: { [key: string]: string } = {
      "/dashboard": "Dashboard",
      "/dashboard/tasks": "Projects",
      "/dashboard/people": "Team",
      "/dashboard/settings": "Settings",
      "/dashboard/channels": "Channels",
      "/dashboard/calendar": "Calendar",
      "/dashboard/notification": "Notifications",
      "/dashboard/reminders": "Reminders",
    };

    const matchedPath = Object.keys(titleMap).find((path) =>
      pathname?.startsWith(path)
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
    await signOut({ callbackUrl: "/login" });
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
        `/api/search?q=${encodeURIComponent(searchQuery)}`
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xs">
      <div className="flex h-14 items-center justify-between px-4 md:px-6 gap-4">
        {/* Left Section - Mobile Drawer, Logo & Page Title */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile menu sheet */}
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <div className="flex h-full flex-col">
                <div className="mb-6 flex items-center space-x-3 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage
                      src={user?.image || ""}
                      alt={user?.name || ""}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <nav className="flex-1 space-y-1">
                  {[
                    { href: "/dashboard", label: "Dashboard" },
                    { href: "/dashboard/tasks", label: "Projects" },
                    { href: "/dashboard/people", label: "Team" },
                    { href: "/dashboard/calendar", label: "Calendar" },
                    { href: "/dashboard/notification", label: "Notifications" },
                    { href: "/dashboard/reminders", label: "Reminders" },
                    { href: "/dashboard/settings", label: "Settings" },
                  ].map((item) => (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 h-9",
                        pathname === item.href &&
                        "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/80 font-bold"
                      )}
                      asChild
                    >
                      <Link href={item.href}>{item.label}</Link>
                    </Button>
                  ))}
                </nav>

                <div className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl h-9"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo Brand & Title Badge */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              <div className="h-8 w-8 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-xs shadow-indigo-500/20 text-white shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Building className="h-4 w-4" />
              </div>
              <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight hidden sm:inline-block">
                Jamure
              </span>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-800/80 shadow-2xs">
              <Sparkles className="h-3 w-3" />
              {title}
            </span>
          </div>
        </div>

        {/* Center Section - Modern Floating Search Bar */}
        {/* <div className="hidden lg:flex flex-1 max-w-md mx-4">
          <form onSubmit={handleSearch} className="relative w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search projects, messages, team..."
                className="pl-9 pr-14 h-8 text-xs bg-slate-100/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-2xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() =>
                  searchResults.length > 0 && setShowSearchResults(true)
                }
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden md:inline-flex h-4.5 select-none items-center gap-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 font-mono text-[9px] font-medium text-slate-400">
                ⌘K
              </kbd>

              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
                </div>
              )}
            </div>

          
            <AnimatePresence>
              {showSearchResults && searchResults.length > 0 && (
                <motion.div
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="p-3 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Search Results
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-lg"
                      onClick={() => setShowSearchResults(false)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="p-2 space-y-1">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700"
                        onClick={() => {
                          if (result.type === "message") {
                            if (result.channelId) {
                              router.push(
                                `/dashboard/channels/${result.channelId}`
                              );
                            } else if (result.senderId !== currentUserId) {
                              router.push(
                                `/dashboard/messages/${result.senderId}`
                              );
                            } else if (result.receiverId) {
                              router.push(
                                `/dashboard/messages/${result.receiverId}`
                              );
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
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                              result.type === "message" &&
                              "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
                              result.type === "task" &&
                              "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400",
                              result.type === "channel" &&
                              "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400",
                              result.type === "user" &&
                              "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                            )}
                          >
                            {result.type === "message" && (
                              <MessageSquare className="h-3.5 w-3.5" />
                            )}
                            {result.type === "task" && (
                              <CheckSquare className="h-3.5 w-3.5" />
                            )}
                            {result.type === "channel" && (
                              <Hash className="h-3.5 w-3.5" />
                            )}
                            {result.type === "user" && (
                              <User className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {result.title || result.name || result.content}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                              {result.type.replace("_", " ")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div> */}

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
              <Link href="/dashboard/reminders" className="flex items-center gap-1.5">
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

          {/* Notifications Button */}
          <div className="hidden sm:block">
            <NotificationsButton />
          </div>

          {/* Theme Customizer */}
          <div className="hidden sm:block">
            <ThemeCustomizer />
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
                className="h-8 px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <Avatar className="h-7 w-7 shrink-0 aspect-square rounded-full ring-2 ring-indigo-500/20">
                  <AvatarImage
                    src={user?.image || ""}
                    alt={user?.name || ""}
                  />
                  <AvatarFallback className="btext-white text-[11px] font-extrabold flex items-center justify-center rounded-full">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
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
                  <AvatarImage
                    src={user?.image || ""}
                    alt={user?.name || ""}
                  />
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
              <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-medium focus:bg-slate-100 dark:focus:bg-slate-800">
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
