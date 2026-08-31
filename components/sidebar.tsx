"use client";

//
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useResizableSidebar } from "@/hooks/useResizableSidebar";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  CheckSquare,
  Users,
  Settings,
  PlusCircle,
  Hash,
  Search,
  Calendar,
  Bell,
  CalendarCheck,
  LucideLayoutDashboard,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building,
  Briefcase,
  Bot,
  Sparkles,
  BarChart3,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { QuickSubtaskModal } from "@/components/quick-subtask-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocket } from "@/lib/socket-client";
import { usePermissions } from "@/lib/rbac-utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useLoadingStore } from "@/app/stores/useLoadingStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "@/lib/utils";

type Channel = {
  id: string;
  name: string;
  isPublic: boolean;
  isDepartment: boolean;
  image?: string | null;
};

export default function Sidebar({
  isCollapsed,
  setIsCollapsed,
  sidebarWidth,
  setSidebarWidth,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  sidebarWidth?: number;
  setSidebarWidth?: (value: number) => void;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<{
    dms: Record<string, number>;
    channels: Record<string, number>;
  }>({ dms: {}, channels: {} });
  const [localSidebarWidth, setLocalSidebarWidth] = useState(256); // Fallback if no props
  const { onlineUsers } = useSocket();
  const [isTasksLoading, setIsTasksLoading] = useState([]);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [isQuickTaskModalOpen, setIsQuickTaskModalOpen] = useState(false);
  const [quickTasks, setQuickTasks] = useState<any[]>([]);
  const [channelPrefetched, setChannelPrefetched] = useState<Set<string>>(
    new Set(),
  );
  const [lastPathname, setLastPathname] = useState(pathname);

  // Use passed props or fallback to local state
  const width = sidebarWidth ?? localSidebarWidth;
  const setWidth = setSidebarWidth ?? setLocalSidebarWidth;

  // Initialize resizable sidebar hook
  const { sidebarRef, handleResizeStart } = useResizableSidebar({
    minWidth: 200,
    maxWidth: 400,
    storageKey: "sidebarWidth",
    onWidthChange: (newWidth) => {
      setWidth(newWidth);
    },
  });

  const isAdmin = session?.user?.role == "ORG_ADMIN";
  const isClient = session?.user.role == "CLIENT";
  const departments = session?.user?.departmentId;
  const [boardType, setBoardType] = useState("channels");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);

  // Permission-based check for creating projects/channels
  const perms = usePermissions() as any;
  const canCreateTask = perms.canCreateTasks;
  const canCreateChannel = perms.canManageChannels || perms.canCreateChannels;

  // Monitor route changes - auto-hide loading state when page actually loads
  useEffect(() => {
    if (pathname !== lastPathname) {
      setLastPathname(pathname);
      setNavigatingTo(null);
    }
  }, [pathname, lastPathname]);

  // Prefetch channel data when hovering over a channel link
  const prefetchChannel = (channelId: string) => {
    if (!channelPrefetched.has(channelId)) {
      // Prefetch the channel details
      fetch(`/api/channels/${channelId}`).catch(() => {
        // Silent fail for prefetch
      });
      setChannelPrefetched((prev) => new Set(prev).add(channelId));
    }
  };

  // Smart loader: Only show sidebar icon spinner without global overlay
  const handleChannelNavigation = (channelId: string) => {
    setNavigatingTo(channelId);

    // Auto-clear the navigating state after 3 seconds
    const cleanupTimer = setTimeout(() => {
      setNavigatingTo(null);
    }, 3000);

    return () => {
      clearTimeout(cleanupTimer);
    };
  };

  const fetchRecentTasks = async () => {
    try {
      const res = await fetch("/api/tasks/client");
      if (res.ok) {
        const data = await res.json();
        setRecentTasks(data?.tasks || data?.recentTasks || []);
        setQuickTasks(data?.quickTasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    }
  };

  const fetchRecentChats = async () => {
    try {
      const res = await fetch("/api/messages/recent-contacts");
      if (res.ok) {
        const data = await res.json();
        // console.log("Recent chats fetched:", data?.recentContacts);
        setRecentChats(data?.recentContacts || []);
      }
    } catch (error) {
      console.error("Failed to fetch recent chats", error);
    }
  };

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch("/api/channels");
        if (response.ok) {
          const data = await response.json();
          setChannels(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchUnreadCounts = async () => {
      try {
        const res = await fetch("/api/messages/unread-counts");
        if (res.ok) {
          const data = await res.json();
          setUnreadCounts({
            dms: data.dms || {},
            channels: data.channels || {},
          });
        }
      } catch (error) {
        console.error("Failed to fetch unread counts", error);
      }
    };

    fetchChannels();
    fetchRecentTasks();
    fetchRecentChats();
    fetchUnreadCounts();

    // Listen for creation events to refresh without full page reload
    const onChannelCreated = () => {
      fetchChannels();
      fetchUnreadCounts();
    };
    const onTaskCreated = () => {
      fetchRecentTasks();
    };

    const onChatCreated = () => {
      fetchRecentChats();
      fetchUnreadCounts();
    };

    const onChannelAssigned = () => {
      fetchChannels();
      fetchUnreadCounts();
    };
    const onTaskAssigned = () => {
      fetchRecentTasks();
    };

    const onMessageCreated = () => {
      fetchRecentChats();
      fetchUnreadCounts();
    };

    // Real-time handler when a new message arrives via Socket
    const onMessageReceived = (event: CustomEvent) => {
      const msg = event?.detail;
      const currentUserId = (session as any)?.user?.id;

      if (!msg) return;
      // Skip if message was sent by current user
      if (currentUserId && msg.senderId === currentUserId) return;

      const currentPath = window.location.pathname;

      // If user is currently in the active channel where message was sent, mark as read
      if (
        msg.channelId &&
        currentPath.includes(`/dashboard/channels/${msg.channelId}`)
      ) {
        fetch("/api/messages/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId: msg.channelId }),
        }).catch(() => { });
        return;
      }

      // If user is currently in the active DM chat with sender, mark as read
      if (
        msg.receiverId === currentUserId &&
        currentPath.includes(`/dashboard/messages/${msg.senderId}`)
      ) {
        fetch("/api/messages/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderId: msg.senderId }),
        }).catch(() => { });
        return;
      }

      // Otherwise, update unread count in real-time instantly without refresh
      setUnreadCounts((prev) => {
        const next = {
          dms: { ...prev.dms },
          channels: { ...prev.channels },
        };
        if (msg.channelId) {
          next.channels[msg.channelId] =
            (next.channels[msg.channelId] || 0) + 1;
        } else if (msg.senderId) {
          next.dms[msg.senderId] = (next.dms[msg.senderId] || 0) + 1;
        }
        return next;
      });

      fetchRecentChats();
      fetchUnreadCounts();
    };

    window.addEventListener(
      "channel:created",
      onChannelCreated as EventListener,
    );
    window.addEventListener("task:created", onTaskCreated as EventListener);
    window.addEventListener("subtask:created", onTaskCreated as EventListener);
    window.addEventListener("project:created", onTaskCreated as EventListener);
    window.addEventListener(
      "channel:assigned",
      onChannelAssigned as EventListener,
    );
    window.addEventListener("task:assigned", onTaskAssigned as EventListener);
    window.addEventListener(
      "message:created",
      onMessageCreated as EventListener,
    );
    window.addEventListener(
      "message:received",
      onMessageReceived as EventListener,
    );
    window.addEventListener(
      "messages:read",
      fetchUnreadCounts as EventListener,
    );

    return () => {
      window.removeEventListener(
        "channel:created",
        onChannelCreated as EventListener,
      );
      window.removeEventListener(
        "task:created",
        onTaskCreated as EventListener,
      );
      window.removeEventListener(
        "project:created",
        onTaskCreated as EventListener,
      );
      window.removeEventListener(
        "channel:assigned",
        onChannelAssigned as EventListener,
      );
      window.removeEventListener(
        "task:assigned",
        onTaskAssigned as EventListener,
      );
      window.removeEventListener(
        "message:created",
        onMessageCreated as EventListener,
      );
      window.removeEventListener(
        "message:received",
        onMessageReceived as EventListener,
      );
      window.removeEventListener(
        "messages:read",
        fetchUnreadCounts as EventListener,
      );
    };
  }, [(session as any)?.user?.id]);

  // Auto-remove unread count when a DM or Channel is opened
  useEffect(() => {
    if (!pathname) return;

    if (pathname.includes("/dashboard/messages/")) {
      const dmUserId = pathname
        .split("/dashboard/messages/")[1]
        ?.split("/")[0]
        ?.trim();
      if (dmUserId) {
        // Immediately remove unread badge from sidebar state
        setUnreadCounts((prev) => {
          if (!prev.dms[dmUserId]) return prev;
          const updatedDms = { ...prev.dms };
          delete updatedDms[dmUserId];
          return { ...prev, dms: updatedDms };
        });

        // Mark messages as read in DB
        fetch("/api/messages/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderId: dmUserId }),
        })
          .then(() => {
            window.dispatchEvent(new CustomEvent("messages:read"));
          })
          .catch((err) => console.error("Error marking DM read:", err));
      }
    } else if (pathname.includes("/dashboard/channels/")) {
      const channelId = pathname
        .split("/dashboard/channels/")[1]
        ?.split("/")[0]
        ?.trim();
      if (channelId) {
        // Immediately remove unread badge from sidebar state
        setUnreadCounts((prev) => {
          if (!prev.channels[channelId]) return prev;
          const updatedChannels = { ...prev.channels };
          delete updatedChannels[channelId];
          return { ...prev, channels: updatedChannels };
        });

        // Mark channel messages as read in DB
        fetch("/api/messages/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId }),
        })
          .then(() => {
            window.dispatchEvent(new CustomEvent("messages:read"));
          })
          .catch((err) => console.error("Error marking channel read:", err));
      }
    }
  }, [pathname]);

  // fetch organization details (name) for display in header
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch("/api/organization/me");
        if (!res.ok) return;
        const payload = await res.json();
        const name = payload?.organization?.name || null;
        setOrgName(name);
        if (payload?.organization?.aiEnabled !== undefined) {
          setAiEnabled(payload.organization.aiEnabled);
        }
      } catch (err) {
        console.error("Failed to fetch organization:", err);
      }
    };

    fetchOrg();
  }, []);
  let navItems = [];
  // Initialize sidebar width from localStorage on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebarWidth");
    if (savedWidth && sidebarRef.current) {
      const parsedWidth = parseInt(savedWidth, 10);
      sidebarRef.current.style.width = `${parsedWidth}px`;
      setWidth(parsedWidth);
    }
  }, [sidebarRef, setWidth]);

  if (isClient) {
    navItems = [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: <LucideLayoutDashboard className="h-5 w-5" />,
      },
      ...(aiEnabled
        ? [
          {
            title: " Jamure AI ",
            href: "/dashboard/ai-assistant",
            icon: <Bot className="h-5 w-5" />,
            badge: <Sparkles className="h-3 w-3 text-yellow-500" />,
          },
        ]
        : []),
      {
        title: "Calendar",
        href: "/dashboard/calendar",
        icon: <Calendar className="h-5 w-5" />,
      },
      {
        title: "Notifications",
        href: "/dashboard/notification",
        icon: <Bell className="h-5 w-5" />,
      },
      {
        title: "Reminders",
        href: "/dashboard/reminders",
        icon: <CalendarCheck className="h-5 w-5" />,
      },
    ];
  } else {
    navItems = [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: <LucideLayoutDashboard className="h-5 w-5" />,
      },
      ...(aiEnabled
        ? [
          {
            title: " Jamure AI ",
            href: "/dashboard/ai-assistant",
            icon: <Bot className="h-5 w-5" />,
            badge: <Sparkles className="h-3 w-3 text-yellow-500" />,
          },
        ]
        : []),
      {
        title: "Calendar",
        href: "/dashboard/calendar",
        icon: <Calendar className="h-5 w-5" />,
      },
      {
        title: "Notifications",
        href: "/dashboard/notification",
        icon: <Bell className="h-5 w-5" />,
      },
      {
        title: "Reports & Analytics",
        href: "/dashboard/reports",
        icon: <BarChart3 className="h-5 w-5" />,
      },
      {
        title: "Reminders",
        href: "/dashboard/reminders",
        icon: <CalendarCheck className="h-5 w-5" />,
      },
    ];
  }

  //

  const filteredChannels = (Array.isArray(channels) ? channels : []).filter(
    (channel) => {
      if (!channel?.name) return false;
      const name = channel.name.toLowerCase();
      if (name.startsWith("task") || name.startsWith("internal")) return false;
      const query = searchQuery.toLowerCase();

      return name.includes(query);
    },
  );

  // Filter for workspace view
  const filteredWorkspaceChats = (
    Array.isArray(recentChats) ? recentChats : []
  ).filter((contact) =>
    contact?.name?.toLowerCase().includes(workspaceSearchQuery.toLowerCase()),
  );

  const filteredWorkspaceProjects = (
    Array.isArray(recentTasks) ? recentTasks : []
  ).filter((task) =>
    task?.title?.toLowerCase().includes(workspaceSearchQuery.toLowerCase()),
  );

  const filteredWorkspaceQuickTasks = (
    Array.isArray(quickTasks) ? quickTasks : []
  ).filter((qt) =>
    qt?.title?.toLowerCase().includes(workspaceSearchQuery.toLowerCase()),
  );

  const filteredWorkspaceChannels = (
    Array.isArray(channels) ? channels : []
  ).filter((channel) => {
    if (!channel?.name) return false;
    const name = channel.name.toLowerCase();
    if (name.startsWith("task") || name.startsWith("internal")) return false;
    const query = workspaceSearchQuery.toLowerCase();
    return name.includes(query);
  });

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "fixed left-0 top-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col z-40 overflow-hidden transition-[width] duration-200 shadow-sm",
      )}
      style={{
        width: isCollapsed ? 80 : width,
      }}
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/40">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold text-sm">
              <Building className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                {orgName ||
                  (session as any)?.user?.organizationName ||
                  "Workspace"}
              </h2>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Enterprise
              </span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center w-full">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md text-white font-bold">
              <Building className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isCollapsed && "-rotate-90",
            )}
          />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3.5 space-y-5">
          {/* Main Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-xl text-xs sm:text-[13.5px] font-semibold transition-all duration-150 group",
                  pathname === item.href
                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs font-bold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100",
                )}
              >
                <div
                  className={cn(
                    "transition-colors shrink-0",
                    pathname === item.href
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300",
                  )}
                >
                  {item.icon}
                </div>
                {!isCollapsed && (
                  <span className="ml-3 truncate tracking-wide">
                    {item.title}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Projects/Board Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between px-1">
              {!isCollapsed && (
                <h3 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {isClient ? "Projects" : "Workspace Channels"}
                </h3>
              )}

              <div className="relative flex items-center space-x-1">
                {!isCollapsed &&
                  !isClient &&
                  (canCreateTask || canCreateChannel) && (
                    <>
                      <div className="relative">
                        {(canCreateTask || canCreateChannel) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-full bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all duration-300 shadow-sm hover:shadow-md border border-green-100 group"
                              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                              <PlusCircle className="h-4 w-4 text-green-600 group-hover:scale-110 transition-transform" />
                            </Button>

                            {isDropdownOpen && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 overflow-hidden animate-fadeIn">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsDropdownOpen(false);
                                    setIsQuickTaskModalOpen(true);
                                  }}
                                  className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200 border-b border-gray-100 dark:border-gray-700 text-left"
                                >
                                  <Zap className="w-4 h-4 mr-2 text-amber-500 shrink-0" />
                                  Quick Task
                                </button>

                                {canCreateTask && (
                                  <Link
                                    href="/dashboard/tasks/new"
                                    className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 border-b border-gray-100 dark:border-gray-700"
                                    onClick={() => setIsDropdownOpen(false)}
                                  >
                                    <svg
                                      className="w-4 h-4 mr-2 text-blue-500"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                    Create Project
                                  </Link>
                                )}

                                {canCreateChannel && (
                                  <Link
                                    href="/dashboard/new-channel"
                                    className="flex items-center px-4 py-3 text-sm font-medium text-gray-700
                                     dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20
                                      hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200 break-all"
                                    onClick={() => setIsDropdownOpen(false)}
                                  >
                                    <svg
                                      className="w-4 h-4 mr-2 text-purple-500"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                      />
                                    </svg>
                                    Create Channel
                                  </Link>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
              </div>
            </div>

            <div className="space-y-2.5">
              {!isCollapsed && (
                <Select value={boardType} onValueChange={setBoardType}>
                  <SelectTrigger className="h-8 text-xs font-semibold bg-slate-100/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:ring-0">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 shadow-lg">
                    <SelectItem
                      value="recent-chats"
                      className="text-xs font-semibold"
                    >
                      Recent Chats
                    </SelectItem>
                    <SelectItem
                      value="projects"
                      className="text-xs font-semibold"
                    >
                      Projects
                    </SelectItem>
                    <SelectItem
                      value="quick-tasks"
                      className="text-xs font-semibold"
                    >
                      ⚡ Quick Tasks
                    </SelectItem>
                    <SelectItem
                      value="channels"
                      className="text-xs font-semibold"
                    >
                      Channels
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}

              {!isCollapsed && (
                <Input
                  placeholder={
                    boardType === "recent-chats"
                      ? "Search contacts..."
                      : boardType === "projects"
                        ? "Search projects..."
                        : boardType === "quick-tasks"
                          ? "Search quick tasks..."
                          : "Search channels..."
                  }
                  value={workspaceSearchQuery}
                  onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
                  className="h-8 text-xs bg-slate-100/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 rounded-xl focus:bg-white dark:focus:bg-slate-900"
                />
              )}

              <div className="space-y-1">
                {isLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-8 w-full bg-slate-200/80 dark:bg-slate-800 rounded-xl"
                    />
                  ))
                  : boardType === "recent-chats"
                    ? filteredWorkspaceChats.length > 0
                      ? filteredWorkspaceChats.map((contact) => (
                        <Link
                          key={contact.id}
                          href={`/dashboard/messages/${contact.id}`}
                          prefetch={true}
                          onMouseEnter={() => prefetchChannel(contact.id)}
                          onClick={() => handleChannelNavigation(contact.id)}
                          className={cn(
                            "flex items-center px-3 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-150 group",
                            navigatingTo === contact.id
                              ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 opacity-70"
                              : pathname ===
                                `/dashboard/messages/${contact.id}`
                                ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 font-bold shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100",
                          )}
                        >
                          <div className="relative flex-shrink-0">
                            {navigatingTo === contact.id ? (
                              <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                <div className="w-2 h-2 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            ) : (
                              <>
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[11px] text-white font-extrabold shadow-2xs">
                                  {contact.name?.charAt(0)?.toUpperCase() ||
                                    "U"}
                                </div>
                                {onlineUsers?.includes(contact.id) && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900"></div>
                                )}
                              </>
                            )}
                          </div>
                          {!isCollapsed && (
                            <span className="ml-2.5 truncate flex-1 text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                              {contact.name || "Unknown User"}
                            </span>
                          )}
                          {(unreadCounts?.dms?.[contact.id] || 0) > 0 && (
                            <Badge className="ml-auto bg-indigo-600 dark:bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                              {(unreadCounts.dms[contact.id] || 0) > 99
                                ? "99+"
                                : unreadCounts.dms[contact.id]}
                            </Badge>
                          )}
                        </Link>
                      ))
                      : !isCollapsed && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2 font-medium">
                          No recent chats
                        </p>
                      )
                    : boardType === "projects"
                      ? filteredWorkspaceProjects.length > 0
                        ? (
                          <div className="max-h-72 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
                            {filteredWorkspaceProjects.map((task) => (
                              <Link
                                key={task.id}
                                href={`/dashboard/tasks/${task.id}/record`}
                                prefetch={true}
                                onMouseEnter={() => prefetchChannel(task.id)}
                                onClick={() => handleChannelNavigation(task.id)}
                                className={cn(
                                  "flex items-center px-3 py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-150 group",
                                  navigatingTo === task.id
                                    ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 opacity-70"
                                    : pathname === `/dashboard/tasks/${task.id}/record` || pathname?.startsWith(`/dashboard/tasks/${task.id}/record`)
                                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 font-bold shadow-xs"
                                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100",
                                )}
                              >
                                {navigatingTo === task.id ? (
                                  <div className="w-4 h-4 mr-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <Briefcase className="h-4 w-4 mr-2.5 text-indigo-500 group-hover:scale-110 transition-transform shrink-0" />
                                )}
                                {!isCollapsed && (
                                  <span className="truncate flex-1 text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                                    {task.title}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        )
                        : !isCollapsed && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2 font-medium">
                            No projects
                          </p>
                        )
                      : boardType === "quick-tasks"
                        ? filteredWorkspaceQuickTasks.length > 0
                          ? (
                            <div className="max-h-72 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
                              {filteredWorkspaceQuickTasks.map((qt) => (
                                <Link
                                  key={qt.id}
                                  href={`/dashboard/tasks/${qt.id}`}
                                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-slate-50/70 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700/60 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all group"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div
                                      className={cn(
                                        "h-2 w-2 rounded-full shrink-0",
                                        qt.isComplete || qt.status === "DONE"
                                          ? "bg-emerald-500"
                                          : qt.priority === "URGENT"
                                            ? "bg-rose-500 animate-pulse"
                                            : qt.priority === "HIGH"
                                              ? "bg-amber-500"
                                              : "bg-indigo-500"
                                      )}
                                    />
                                    <span className="truncate font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-xs">
                                      {qt.title}
                                    </span>
                                  </div>
                                  {qt.priority && (
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0 ml-1.5">
                                      {qt.priority}
                                    </span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          )
                          : !isCollapsed && (
                            <div className="text-center py-4 space-y-2">
                              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                No quick tasks yet
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setIsQuickTaskModalOpen(true)}
                                className="h-7 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-2.5 shadow-2xs"
                              >
                                <Zap className="h-3 w-3 mr-1 text-white" />
                                + Add Quick Task
                              </Button>
                            </div>
                          )
                        : filteredWorkspaceChannels.length > 0
                          ? filteredWorkspaceChannels.map((channel) => (
                            <Link
                              key={channel.id}
                              href={`/dashboard/channels/${channel.id}`}
                              prefetch={true}
                              onMouseEnter={() => prefetchChannel(channel.id)}
                              onClick={() =>
                                handleChannelNavigation(channel.id)
                              }
                              className={cn(
                                "flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group",
                                navigatingTo === channel.id
                                  ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 opacity-70"
                                  : pathname ===
                                    `/dashboard/channels/${channel.id}`
                                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 font-bold shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100",
                              )}
                            >
                              {navigatingTo === channel.id ? (
                                <div className="w-4 h-4 mr-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
                              ) : channel.image ? (
                                <img
                                  src={channel.image}
                                  alt={channel.name}
                                  className="w-10 h-10 rounded-md object-cover mr-2.5 shrink-0 border border-indigo-200 dark:border-indigo-800 shadow-2xs"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display =
                                      "none";
                                  }}
                                />
                              ) : (
                                <Hash className="h-4 w-4 mr-2.5 text-indigo-500 group-hover:scale-110 transition-transform shrink-0" />
                              )}

                              {!isCollapsed && (
                                <span className="truncate flex-1 text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                                  {channel?.name
                                    ? channel.name.charAt(0).toUpperCase() +
                                    channel.name.slice(1)
                                    : "Unnamed Channel"}
                                </span>
                              )}
                              {(unreadCounts?.channels?.[channel.id] || 0) >
                                0 && (
                                  <Badge className="ml-auto bg-indigo-600 dark:bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                    {(unreadCounts.channels[channel.id] || 0) > 99
                                      ? "99+"
                                      : unreadCounts.channels[channel.id]}
                                  </Badge>
                                )}
                            </Link>
                          ))
                          : !isCollapsed && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2 font-medium">
                              No channels
                            </p>
                          )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-3.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40">
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsed && "justify-center space-x-0",
          )}
        >
          <div className="relative shrink-0">
            {(user as any)?.image || (session?.user as any)?.image ? (
              <img
                src={(user as any)?.image || (session?.user as any)?.image}
                alt={user?.name || "User DP"}
                className="w-11 h-11 rounded-2xl object-cover border border-indigo-100 dark:border-indigo-900/60 shadow-xs"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-base font-extrabold text-white shadow-md shadow-indigo-500/20">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 shadow-2xs"></div>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate leading-tight">
                {user?.name || "User"}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {user?.email || ""}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-500 transition-colors"
        />
      )}
      {/* Quick Subtask Modal */}
      <QuickSubtaskModal
        isOpen={isQuickTaskModalOpen}
        onClose={() => setIsQuickTaskModalOpen(false)}
        onSuccess={() => fetchRecentTasks()}
      />
    </div>
  );
}
