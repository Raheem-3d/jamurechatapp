"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Clock,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  BarChart3,
  Timer,
  Search,
  RotateCcw,
  Layers,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDurationFromHours } from "@/lib/utils";

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl text-xs">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.payload?.color || item.color || "#6366f1" }}
          />
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {item.name}
          </span>
        </div>
        <p className="mt-1 font-semibold text-slate-600 dark:text-slate-400 pl-4">
          {item.value} {item.value === 1 ? "task" : "tasks"}
        </p>
      </div>
    );
  }
  return null;
};

export default function TaskAnalyticsSection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState("");
  const [durationFilter, setDurationFilter] = useState("ANY");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [timingFilter, setTimingFilter] = useState("ALL");

  const clearFilters = () => {
    setTaskFilter("");
    setDurationFilter("ANY");
    setStageFilter("ALL");
    setTimingFilter("ALL");
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/analytics/tasks");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Error loading task analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-56 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <Skeleton className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <Skeleton className="h-24 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <Skeleton className="h-24 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-60 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <Skeleton className="h-60 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </Card>
    );
  }

  const summary = data?.summary || {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    todoTasks: 0,
    avgCompletionTimeHours: 0,
    completionRatePercentage: 0,
  };

  const statusChart = data?.statusChart || [];
  const durationChart = data?.durationChart || [];
  const tasksReport = data?.tasksReport || [];
  const availableStages: string[] = data?.availableStages || [];

  const filteredTasks = tasksReport.filter((task: any) => {
    // 1. Title Filter
    const titleMatch = task.title
      .toLowerCase()
      .includes(taskFilter.toLowerCase());

    // 2. Duration Filter
    const durationHours = task.durationHours ?? 0;
    let durationMatch = true;

    if (durationFilter === "<1") {
      durationMatch = durationHours < 24;
    } else if (durationFilter === "1-3") {
      durationMatch = durationHours >= 24 && durationHours <= 24 * 3;
    } else if (durationFilter === "3-7") {
      durationMatch = durationHours > 24 * 3 && durationHours <= 24 * 7;
    } else if (durationFilter === ">7") {
      durationMatch = durationHours > 24 * 7;
    }

    // 3. Stage / Status Filter
    let stageMatch = true;
    if (stageFilter !== "ALL") {
      if (
        stageFilter === "TODO" ||
        stageFilter === "IN_PROGRESS" ||
        stageFilter === "DONE" ||
        stageFilter === "BLOCKED"
      ) {
        stageMatch = task.status === stageFilter;
      } else {
        stageMatch =
          task.stage === stageFilter ||
          (Array.isArray(task.stages) && task.stages.includes(stageFilter));
      }
    }

    // 4. Completion Timing Filter (e.g. Completed Before Time)
    let timingMatch = true;
    if (timingFilter === "EARLY") {
      timingMatch = task.completedEarly === true || (task.status === "DONE" && !task.completedLate);
    } else if (timingFilter === "LATE") {
      timingMatch = task.completedLate === true;
    } else if (timingFilter === "OVERDUE") {
      timingMatch = task.isOverdue === true;
    } else if (timingFilter === "DONE") {
      timingMatch = task.status === "DONE";
    }

    return titleMatch && durationMatch && stageMatch && timingMatch;
  });

  const activeFiltersCount =
    (taskFilter ? 1 : 0) +
    (durationFilter !== "ALL" && durationFilter !== "ANY" ? 1 : 0) +
    (stageFilter !== "ALL" ? 1 : 0) +
    (timingFilter !== "ALL" ? 1 : 0);

  const formatAvgTime = (hours: number) => {
    if (hours === 0) return "N/A";
    return formatDurationFromHours(hours);
  };

  return (
    <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-colors">
      {/* Sleek Compact Header & Mini KPI Bar */}
      <CardHeader className="p-4 px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800/80 shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Task Time Log & Analytics
                </CardTitle>
                <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] px-1.5 py-0">
                  Live Analytics
                </Badge>
              </div>
              <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Stage analysis, completion metrics & work duration logs
              </CardDescription>
            </div>
          </div>

          {/* Compact Mini KPI Bar */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/30 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase leading-none">Completion</p>
                <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{summary.completionRatePercentage}% <span className="text-[10px] font-medium text-emerald-600">({summary.completedTasks}/{summary.totalTasks})</span></p>
              </div>
            </div>

            {/* <div className="px-3 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/30 flex items-center gap-2">
              <Timer className="h-4 w-4 text-blue-600 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase leading-none">Avg Time</p>
                <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5 truncate max-w-[110px]">{formatAvgTime(summary.avgCompletionTimeHours)}</p>
              </div>
            </div> */}

            <div className="px-3 py-1.5 rounded-xl border border-indigo-200/60 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/30 flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-indigo-600 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase leading-none">Active Workload</p>
                <p className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{summary.inProgressTasks + summary.todoTasks} <span className="text-[10px] font-medium text-indigo-600">({summary.inProgressTasks} In Prog)</span></p>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Charts Row - Super Compact with side-by-side legends */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Status Breakdown Donut Chart */}
          <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                Status Distribution
              </h4>
              <span className="text-[10px] font-semibold text-slate-400">Status Split</span>
            </div>
            <div className="h-36 w-full">
              {statusChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={statusChart}
                      cx="35%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={52}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusChart.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value) => (
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                          {value}
                        </span>
                      )}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No status data available
                </div>
              )}
            </div>
          </div>

          {/* Time Taken Distribution Donut Chart */}
          <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                Completion Duration
              </h4>
              <span className="text-[10px] font-semibold text-slate-400">Time Brackets</span>
            </div>
            <div className="h-36 w-full">
              {durationChart.some((d: any) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={durationChart}
                      cx="35%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={52}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {durationChart.map((entry: any, index: number) => (
                        <Cell key={`cell-dur-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value) => (
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                          {value}
                        </span>
                      )}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No completed task durations recorded yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Controls & Sticky Compact Table Section */}
        <div className="space-y-2">
          {/* Integrated Filter Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Task Duration Log
              </h4>
              <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 border-slate-200">
                {filteredTasks.length} of {tasksReport.length} tasks
              </Badge>
            </div>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg px-2 flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                placeholder="Filter by title..."
                className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 rounded-xl"
              />
            </div>

            <Select value={stageFilter} onValueChange={(val) => setStageFilter(val)}>
              <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 rounded-xl">
                <div className="flex items-center gap-1.5 truncate">
                  <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Stage / Status" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-64 rounded-xl">
                <SelectItem value="ALL" className="text-xs font-medium">All Stages & Statuses</SelectItem>
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</SelectLabel>
                  <SelectItem value="TODO" className="text-xs">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS" className="text-xs">In Progress</SelectItem>
                  <SelectItem value="DONE" className="text-xs">Done</SelectItem>
                  <SelectItem value="BLOCKED" className="text-xs">Blocked</SelectItem>
                </SelectGroup>
                {availableStages.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Stage</SelectLabel>
                    {availableStages.map((stg) => (
                      <SelectItem key={stg} value={stg} className="text-xs">{stg}</SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>

            <Select value={durationFilter} onValueChange={(val) => setDurationFilter(val)}>
              <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 rounded-xl">
                <div className="flex items-center gap-1.5 truncate">
                  <Timer className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Duration" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ANY" className="text-xs">Any duration</SelectItem>
                <SelectItem value="<1" className="text-xs">&lt; 1 Day (&lt; 24h)</SelectItem>
                <SelectItem value="1-3" className="text-xs">1 - 3 Days</SelectItem>
                <SelectItem value="3-7" className="text-xs">3 - 7 Days</SelectItem>
                <SelectItem value=">7" className="text-xs">&gt; 7 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Completion Timing Filter (e.g. Completed Before Time) */}
            <Select value={timingFilter} onValueChange={(val) => setTimingFilter(val)}>
              <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 rounded-xl">
                <div className="flex items-center gap-1.5 truncate">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <SelectValue placeholder="Completion Timing" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL" className="text-xs font-medium">All Timing Statuses</SelectItem>
                <SelectItem value="EARLY" className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Completed Before Time (Early)
                </SelectItem>
                <SelectItem value="LATE" className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Completed After Deadline (Late)
                </SelectItem>
                <SelectItem value="OVERDUE" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Pending & Overdue
                </SelectItem>
                <SelectItem value="DONE" className="text-xs">
                  All Completed Tasks
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sticky Table with Max Height */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-xs">
                  <tr className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                    <th className="py-2 px-3">Task</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Timing Performance</th>
                    <th className="py-2 px-3">Stage</th>
                    <th className="py-2 px-3">Assigned</th>
                    <th className="py-2 px-3">Completed</th>
                    <th className="py-2 px-3 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task: any) => (
                      <tr
                        key={task.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-1.5 px-3 font-semibold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                          {task.title}
                        </td>
                        <td className="py-1.5 px-3">
                          <span
                            className={cn(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border",
                              task.status === "DONE"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                                : task.status === "IN_PROGRESS"
                                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                                  : task.status === "BLOCKED"
                                    ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                            )}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td className="py-1.5 px-3">
                          {task.completedEarly ? (
                            <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[9px] px-1.5 py-0 font-extrabold w-fit">
                              Before Time
                            </Badge>
                          ) : task.completedLate ? (
                            <Badge className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[9px] px-1.5 py-0 font-bold w-fit">
                              After Deadline
                            </Badge>
                          ) : task.isOverdue ? (
                            <Badge className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[9px] px-1.5 py-0 font-bold w-fit">
                              Overdue
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[10px]">On Schedule</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3">
                          {task.stage ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                              <Layers className="h-2.5 w-2.5 text-purple-400" />
                              {task.stage}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-slate-600 dark:text-slate-400">
                          {task.assignedAt ? format(new Date(task.assignedAt), "MMM d, yyyy") : "-"}
                        </td>
                        <td className="py-1.5 px-3 text-slate-600 dark:text-slate-400">
                          {task.completedAt ? format(new Date(task.completedAt), "MMM d, yyyy") : "-"}
                        </td>
                        <td className="py-1.5 px-3 text-right font-semibold text-slate-900 dark:text-slate-200 font-mono text-[10px]">
                          {task.durationFormatted}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-xs text-slate-400">
                        No tasks match the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
