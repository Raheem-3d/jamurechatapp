"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  Flame,
  Lightbulb,
  Target,
  RefreshCw,
  ExternalLink,
  Zap,
  Bot,
  TrendingUp,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BriefingData {
  greeting: string;
  summary: string;
  focusItem: string;
  tip: string;
  urgencyLevel: "low" | "medium" | "high" | "critical";
}

interface BriefingStats {
  overdueCount: number;
  dueTodayCount: number;
  highPriorityCount: number;
  inProgressCount: number;
  totalActive: number;
}

interface RecordRef {
  id: string;
  title: string;
  stageName: string;
  priority: string;
}

interface TaskRef {
  id: string;
  title: string;
  deadline: string | null;
  priority: string;
  status?: string;
  records?: RecordRef[];
}

interface BriefingResponse {
  briefing: BriefingData;
  stats: BriefingStats;
  overdueTasks: TaskRef[];
  dueTodayTasks: TaskRef[];
  allTasksWithRecords?: TaskRef[];
}

const urgencyConfig = {
  low: {
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "All Clear",
  },
  medium: {
    gradient: "from-indigo-500/10 via-violet-500/5 to-transparent",
    border: "border-indigo-200/60 dark:border-indigo-800/40",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    dot: "bg-indigo-500",
    label: "On Track",
  },
  high: {
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
    border: "border-amber-200/60 dark:border-amber-800/40",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    dot: "bg-amber-500",
    label: "Needs Attention",
  },
  critical: {
    gradient: "from-rose-500/10 via-red-500/5 to-transparent",
    border: "border-rose-200/60 dark:border-rose-800/40",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    dot: "bg-rose-500 animate-pulse",
    label: "Critical",
  },
};

export default function AIDailyBriefing() {
  const { data: session } = useSession();
  const [data, setData] = useState<BriefingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBriefing = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/daily-briefing");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load briefing");
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  const [activeProjectPage, setActiveProjectPage] = useState(1);
  const [overduePage, setOverduePage] = useState(1);
  const [dueTodayPage, setDueTodayPage] = useState(1);

  const rawUrgency = String(data?.briefing?.urgencyLevel || "medium").toLowerCase();
  const urgency = (rawUrgency in urgencyConfig ? rawUrgency : "medium") as keyof typeof urgencyConfig;
  const config = urgencyConfig[urgency] || urgencyConfig.medium;

  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border bg-gradient-to-br from-indigo-500/8 to-transparent",
          "border-indigo-200/50 dark:border-indigo-800/30 p-4"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/40">
            <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-white">
                AI Daily Briefing
              </span>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Analyzing your workspace...
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse"
              style={{ width: `${85 - i * 10}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <Bot className="h-4 w-4" />
          <span className="text-xs">AI Briefing unavailable</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const briefing = data.briefing || {
    greeting: "Good day!",
    summary: "Here is your daily overview.",
    focusItem: "Focus on your open tasks for today.",
    tip: "Prioritize tasks with upcoming deadlines.",
    urgencyLevel: "medium",
  };
  const stats = data.stats || {
    overdueCount: 0,
    dueTodayCount: 0,
    highPriorityCount: 0,
    inProgressCount: 0,
    totalActive: 0,
  };
  const overdueTasks = data.overdueTasks || [];
  const dueTodayTasks = data.dueTodayTasks || [];
  const allTasksWithRecords = data.allTasksWithRecords || [];

  // Pagination Math
  const totalOverduePages = Math.ceil(overdueTasks.length / 1);
  const currentOverdueTask = overdueTasks[overduePage - 1];

  const totalDueTodayPages = Math.ceil(dueTodayTasks.length / 1);
  const currentDueTodayTask = dueTodayTasks[dueTodayPage - 1];

  const totalProjectPages = Math.ceil(allTasksWithRecords.length / 1);
  const currentProjectTask = allTasksWithRecords[activeProjectPage - 1];

  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br transition-all duration-300",
        config.gradient,
        config.border,
        "bg-white dark:bg-slate-900 overflow-hidden"
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-8 w-8 rounded-xl flex items-center justify-center border shrink-0",
              urgency === "critical"
                ? "bg-rose-50 dark:bg-rose-950/60 border-rose-200/60 dark:border-rose-800/40"
                : urgency === "high"
                  ? "bg-amber-50 dark:bg-amber-950/60 border-amber-200/60 dark:border-amber-800/40"
                  : "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/40"
            )}
          >
            <Sparkles
              className={cn(
                "h-4 w-4",
                urgency === "critical"
                  ? "text-rose-600 dark:text-rose-400"
                  : urgency === "high"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-indigo-600 dark:text-indigo-400"
              )}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                AI Daily Briefing
              </span>
              <Badge className={cn("text-[9px] px-1.5 py-0.5 font-bold border-0", config.badge)}>
                <span className={cn("h-1.5 w-1.5 rounded-full mr-1 inline-block", config.dot)} />
                {config.label}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Personalized for you •{" "}
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchBriefing(true);
            }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh briefing"
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>
          <div className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </div>
        </div>
      </div>

      {/* Expandable content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Greeting */}
          <p className="text-sm font-semibold text-slate-800 dark:text-white leading-snug">
            {briefing.greeting}
          </p>

          {/* Summary */}
          <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {briefing.summary}
          </p>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                label: "Overdue",
                value: stats.overdueCount,
                icon: AlertTriangle,
                color:
                  stats.overdueCount > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-400",
                bg:
                  stats.overdueCount > 0
                    ? "bg-rose-50 dark:bg-rose-950/40"
                    : "bg-slate-50 dark:bg-slate-800/40",
              },
              {
                label: "Today",
                value: stats.dueTodayCount,
                icon: Clock,
                color:
                  stats.dueTodayCount > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-400",
                bg:
                  stats.dueTodayCount > 0
                    ? "bg-amber-50 dark:bg-amber-950/40"
                    : "bg-slate-50 dark:bg-slate-800/40",
              },
              {
                label: "High Pri",
                value: stats.highPriorityCount,
                icon: Flame,
                color:
                  stats.highPriorityCount > 0
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-slate-400",
                bg:
                  stats.highPriorityCount > 0
                    ? "bg-orange-50 dark:bg-orange-950/40"
                    : "bg-slate-50 dark:bg-slate-800/40",
              },
              {
                label: "Active",
                value: stats.inProgressCount,
                icon: TrendingUp,
                color: "text-indigo-600 dark:text-indigo-400",
                bg: "bg-indigo-50 dark:bg-indigo-950/40",
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className={cn("rounded-xl p-2.5 text-center border border-transparent", bg)}
              >
                <Icon className={cn("h-3.5 w-3.5 mx-auto mb-1", color)} />
                <p className={cn("text-base font-black leading-none", color)}>{value}</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Focus Item */}
          <div className="flex items-start gap-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-800/60">
            <Target className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                Focus First
              </p>
              <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
                {briefing.focusItem}
              </p>
            </div>
          </div>

          {/* Overdue Task Quick Links with Pagination */}
          {overdueTasks.length > 0 && currentOverdueTask && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue Tasks ({overdueTasks.length})
                </p>
                {totalOverduePages > 1 && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                    <span>{overduePage}/{totalOverduePages}</span>
                    <button
                      onClick={() => setOverduePage((prev) => Math.max(prev - 1, 1))}
                      disabled={overduePage === 1}
                      className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setOverduePage((prev) => Math.min(prev + 1, totalOverduePages))}
                      disabled={overduePage === totalOverduePages}
                      className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-800/20 space-y-1.5">
                <Link
                  href={`/dashboard/tasks/${currentOverdueTask.id}/record`}
                  className="flex items-center justify-between group"
                >
                  <span className="text-[11px] text-rose-700 dark:text-rose-300 font-bold truncate mr-2">
                    {currentOverdueTask.title}
                  </span>
                  <ExternalLink className="h-3 w-3 text-rose-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>

                {currentOverdueTask.records && currentOverdueTask.records.length > 0 && (
                  <div className="pl-2.5 space-y-1 border-l-2 border-rose-200/80 dark:border-rose-800/40">
                    {currentOverdueTask.records.slice(0, 3).map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-700 dark:text-slate-300 truncate font-medium">↳ {rec.title}</span>
                        <Badge className="text-[8px] px-1.5 py-0 border-0 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-bold shrink-0 ml-1">
                          {rec.stageName}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Due Today Quick Links with Pagination */}
          {dueTodayTasks.length > 0 && currentDueTodayTask && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Due Today Tasks ({dueTodayTasks.length})
                </p>
                {totalDueTodayPages > 1 && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                    <span>{dueTodayPage}/{totalDueTodayPages}</span>
                    <button
                      onClick={() => setDueTodayPage((prev) => Math.max(prev - 1, 1))}
                      disabled={dueTodayPage === 1}
                      className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setDueTodayPage((prev) => Math.min(prev + 1, totalDueTodayPages))}
                      disabled={dueTodayPage === totalDueTodayPages}
                      className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-800/20 space-y-1.5">
                <Link
                  href={`/dashboard/tasks/${currentDueTodayTask.id}/record`}
                  className="flex items-center justify-between group"
                >
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold truncate mr-2">
                    {currentDueTodayTask.title}
                  </span>
                  <ExternalLink className="h-3 w-3 text-amber-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>

                {currentDueTodayTask.records && currentDueTodayTask.records.length > 0 && (
                  <div className="pl-2.5 space-y-1 border-l-2 border-amber-200/80 dark:border-amber-800/40">
                    {currentDueTodayTask.records.slice(0, 3).map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-700 dark:text-slate-300 truncate font-medium">↳ {rec.title}</span>
                        <Badge className="text-[8px] px-1.5 py-0 border-0 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold shrink-0 ml-1">
                          {rec.stageName}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Projects & Record Cards with Compact Pagination */}
          {allTasksWithRecords.length > 0 && currentProjectTask && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  Active Projects & Task Cards ({allTasksWithRecords.length})
                </p>
                {totalProjectPages > 1 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{activeProjectPage} / {totalProjectPages}</span>
                    <button
                      onClick={() => setActiveProjectPage((prev) => Math.max(prev - 1, 1))}
                      disabled={activeProjectPage === 1}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-30 hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-colors"
                      title="Previous project"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setActiveProjectPage((prev) => Math.min(prev + 1, totalProjectPages))}
                      disabled={activeProjectPage === totalProjectPages}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-30 hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-colors"
                      title="Next project"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <Link
                  href={`/dashboard/tasks/${currentProjectTask.id}/record`}
                  className="flex items-center justify-between group"
                >
                  <span className="text-[11px] text-slate-900 dark:text-slate-100 font-bold truncate mr-2">
                    {currentProjectTask.title}
                  </span>
                  <ExternalLink className="h-3 w-3 text-indigo-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>

                {currentProjectTask.records && currentProjectTask.records.length > 0 ? (
                  <div className="pl-2.5 space-y-1 border-l-2 border-indigo-300 dark:border-indigo-800">
                    {currentProjectTask.records.slice(0, 3).map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-700 dark:text-slate-300 truncate font-medium">↳ {rec.title}</span>
                        <Badge className="text-[8px] px-1.5 py-0 border-0 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold shrink-0 ml-1">
                          {rec.stageName}
                        </Badge>
                      </div>
                    ))}
                    {currentProjectTask.records.length > 3 && (
                      <p className="text-[9px] text-indigo-500 font-semibold pt-0.5">
                        +{currentProjectTask.records.length - 3} more task cards
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 pl-2.5 italic">No records created yet</p>
                )}
              </div>
            </div>
          )}

          {/* AI Tip */}
          <div className="flex items-start gap-2.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/20 p-3 border border-violet-100/60 dark:border-violet-800/20">
            <Lightbulb className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-violet-500 dark:text-violet-400 uppercase tracking-wider mb-0.5">
                AI Tip
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {briefing.tip}
              </p>
            </div>
          </div>

          {/* Footer link */}
          <div className="flex items-center justify-end">
            <Link
              href="/dashboard/ai-assistant"
              className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition-colors"
            >
              <Zap className="h-3 w-3" />
              Open AI Assistant
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
