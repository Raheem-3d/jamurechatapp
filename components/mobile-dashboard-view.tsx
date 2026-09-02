"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderKanban,
  CheckSquare,
  CheckCircle2,
  Clock,
  PauseCircle,
  Calendar,
  Filter,
  Sun,
  Moon,
  ChevronDown,
  Globe,
  Smartphone,
  Megaphone,
  User,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Hash,
  MessageSquare,
  MessageSquarePlus,
  FolderPlus,
  Users,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MobileDashboardProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  stats: {
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    notStartedTasks: number;
    overdueTasks: number;
  };
  recentProjects?: Array<{
    id: string;
    name: string;
    dueDate?: string | null;
    progress: number;
    color?: string;
    icon?: string;
  }>;
  recentActivities?: Array<{
    id: string;
    title: string;
    project: string;
    time: string;
    completed?: boolean;
  }>;
}

export function MobileDashboardView({
  user,
  stats,
  recentProjects = [],
  recentActivities = [],
}: MobileDashboardProps) {
  const { theme, setTheme } = useTheme();
  const [selectedTimeframe, setSelectedTimeframe] = useState("This Week");
  const [channels, setChannels] = useState<any[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  const userName = user?.name ? user.name.split(" ")[0] : "Team";
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "R";

  // Dynamic greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Fetch identical channels as the Sidebar
  const fetchChannels = async () => {
    try {
      setIsLoadingChannels(true);
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        const rawChannels = Array.isArray(data) ? data : [];
        // Filter exactly like sidebar.tsx
        const filtered = rawChannels.filter((channel: any) => {
          if (!channel?.name) return false;
          const name = channel.name.toLowerCase();
          if (name.startsWith("task") || name.startsWith("internal")) return false;
          return true;
        });
        setChannels(filtered);
      }
    } catch (error) {
      console.error("Error fetching channels in mobile dashboard:", error);
    } finally {
      setIsLoadingChannels(false);
    }
  };

  useEffect(() => {
    fetchChannels();

    const handleChannelUpdate = () => {
      fetchChannels();
    };

    window.addEventListener("channel:created", handleChannelUpdate);
    window.addEventListener("channel:assigned", handleChannelUpdate);

    return () => {
      window.removeEventListener("channel:created", handleChannelUpdate);
      window.removeEventListener("channel:assigned", handleChannelUpdate);
    };
  }, []);

  // Completion calculation
  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const inProgressRate = stats.totalTasks > 0
    ? Math.round((stats.inProgressTasks / stats.totalTasks) * 100)
    : 0;

  const notStartedRate = stats.totalTasks > 0
    ? Math.round((stats.notStartedTasks / stats.totalTasks) * 100)
    : 0;

  const overdueRate = stats.totalTasks > 0
    ? Math.round((stats.overdueTasks / stats.totalTasks) * 100)
    : 0;

  // Format date range (e.g. current week)
  const now = new Date();
  const dateRangeStr = `${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(now.getTime() + 6 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // Default fallback activities if none
  const displayActivities = recentActivities.length > 0 ? recentActivities : [
    {
      id: "a1",
      title: "Design System Update completed",
      project: "Website Redesign",
      time: "2h ago",
      completed: true,
    },
    {
      id: "a2",
      title: "Socket.IO real-time notification tested",
      project: "Mobile App Development",
      time: "4h ago",
      completed: true,
    },
    {
      id: "a3",
      title: "Cloudinary media upload configured",
      project: "Chat Attachments",
      time: "5h ago",
      completed: true,
    },
  ];

  return (
    <div className="md:hidden flex flex-col gap-4 pb-20 w-full">
      {/* 1. Welcome Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs flex-shrink-0">
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || "Avatar"}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              userInitial
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {getGreeting()}, {userName}!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
              Here&apos;s what&apos;s happened so far today.
            </p>
          </div>
        </div>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>

      {/* 2. Date Filter & Action Bar */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex-1 flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs min-w-0">
          <div className="flex items-center gap-2 truncate">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span className="truncate">{dateRangeStr}</span>
          </div>
        </div>

        <button
          onClick={() => setQuickActionOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New</span>
        </button>

        <Link
          href="/dashboard/tasks"
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-xs font-bold shadow-xs active:scale-95 transition-all flex-shrink-0"
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Projects</span>
        </Link>
      </div>

      {/* 3. Metric Stats Cards Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Projects */}
        <Link
          href="/dashboard/tasks"
          className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between active:scale-[0.98] transition-transform min-w-0"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
            <FolderKanban className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium truncate">Projects</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5 block">
              {stats.totalProjects || channels.length || 0}
            </span>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-0.5 truncate">
              <TrendingUp className="w-2.5 h-2.5 inline shrink-0" /> Active
            </span>
          </div>
        </Link>

        {/* Total Tasks */}
        <Link
          href="/dashboard/tasks"
          className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between active:scale-[0.98] transition-transform min-w-0"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium truncate">Tasks</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5 block">
              {stats.totalTasks}
            </span>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-0.5 truncate">
              <TrendingUp className="w-2.5 h-2.5 inline shrink-0" /> In Track
            </span>
          </div>
        </Link>

        {/* Completed */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium truncate">Completed</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5 block">
              {stats.completedTasks}
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-1 block truncate">
              {completionRate}% done
            </span>
          </div>
        </div>
      </div>

      {/* 4. Active Channels Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Your Channels
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Team discussion rooms & workspaces
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/channels/all"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* List of Channels identical to Sidebar */}
        <div className="space-y-2">
          {isLoadingChannels ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Loading channels...
            </div>
          ) : channels.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No channels found.
            </div>
          ) : (
            channels.slice(0, 5).map((channel) => (
              <Link
                key={channel.id}
                href={`/dashboard/channels/${channel.id}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-indigo-50/50 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold group-hover:scale-105 transition-transform">
                    {channel.image ? (
                      <img
                        src={channel.image}
                        alt={channel.name}
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <Hash className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {channel.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                      {channel.department?.name ? `${channel.department.name} Department` : channel.isPublic ? "Public Channel" : "Private Workspace"}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 5. Task Overview Donut & Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Task Overview</h3>
          <button className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
            {selectedTimeframe} <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Visual Donut representation */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-slate-100 dark:text-slate-800"
              />
              {/* Completed Ring Segment (Green) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#10b981"
                strokeWidth="10"
                strokeDasharray={`${(completionRate * 238) / 100} 238`}
                strokeDashoffset="0"
                className="transition-all duration-700"
              />
              {/* In Progress Segment (Indigo) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="10"
                strokeDasharray={`${(inProgressRate * 238) / 100} 238`}
                strokeDashoffset={`-${(completionRate * 238) / 100}`}
                className="transition-all duration-700"
              />
              {/* Not Started Segment (Amber) */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="10"
                strokeDasharray={`${(notStartedRate * 238) / 100} 238`}
                strokeDashoffset={`-${((completionRate + inProgressRate) * 238) / 100}`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black text-slate-900 dark:text-white leading-none">
                {stats.totalTasks}
              </span>
              <span className="text-[9px] text-slate-400 font-medium mt-0.5">Total Tasks</span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="flex-1 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400 truncate">Completed</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white ml-2">
                {stats.completedTasks} ({completionRate}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400 truncate">In Progress</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white ml-2">
                {stats.inProgressTasks} ({inProgressRate}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400 truncate">Not Started</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white ml-2">
                {stats.notStartedTasks} ({notStartedRate}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 flex-shrink-0" />
                <span className="text-slate-600 dark:text-slate-400 truncate">Overdue</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white ml-2">
                {stats.overdueTasks} ({overdueRate}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Recent Activity Stream */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800/80">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Recent Activity</h3>
        <div className="space-y-2.5">
          {displayActivities.slice(0, 3).map((act) => (
            <div key={act.id} className="flex items-start justify-between gap-3 text-xs p-2 rounded-xl hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h5 className="font-semibold text-slate-900 dark:text-white truncate">
                    {act.title}
                  </h5>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{act.project}</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">{act.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Modal Dialog */}
      <Dialog open={quickActionOpen} onOpenChange={setQuickActionOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <DialogHeader className="text-left mb-3">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </span>
              Quick Action
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2.5 py-2">
            <Link
              href="/dashboard/tasks/new"
              onClick={() => setQuickActionOpen(false)}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/70 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/50 transition-all text-center group"
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-2.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">New Task</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Assign to team</span>
            </Link>

            <Link
              href="/dashboard/new-channel"
              onClick={() => setQuickActionOpen(false)}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-violet-50/70 hover:bg-violet-100/70 dark:bg-violet-950/40 dark:hover:bg-violet-950/70 border border-violet-100 dark:border-violet-900/50 transition-all text-center group"
            >
              <div className="w-11 h-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center mb-2.5 shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <FolderPlus className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">New Channel</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Create project room</span>
            </Link>

            <Link
              href="/dashboard/channels/all"
              onClick={() => setQuickActionOpen(false)}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-900/50 transition-all text-center group"
            >
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-2.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <MessageSquarePlus className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">New Chat</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Start discussion</span>
            </Link>

            <Link
              href="/dashboard/ai-assistant"
              onClick={() => setQuickActionOpen(false)}
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 border border-amber-100 dark:border-amber-900/50 transition-all text-center group"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center mb-2.5 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">AI Assistant</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Summarize & help</span>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MobileDashboardView;
