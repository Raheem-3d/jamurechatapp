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

  const clearFilters = () => {
    setTaskFilter("");
    setDurationFilter("ANY");
    setStageFilter("ALL");
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

    return titleMatch && durationMatch && stageMatch;
  });

  const activeFiltersCount =
    (taskFilter ? 1 : 0) +
    (durationFilter !== "ALL" && durationFilter !== "ANY" ? 1 : 0) +
    (stageFilter !== "ALL" ? 1 : 0);

  const formatAvgTime = (hours: number) => {
    if (hours === 0) return "N/A";
    return formatDurationFromHours(hours);
  };

  return (
    <Card className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-colors">
      {/* Header */}
      <CardHeader className="p-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Task Time Log & Analytics
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Stage analysis, completion metrics, and work duration logs
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="w-fit bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700"
          >
            Live Analytics
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Completion Rate Card */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Completion Rate
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary.completionRatePercentage}%
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {summary.completedTasks} Done
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {summary.completedTasks} of {summary.totalTasks} total tasks completed
            </p>
          </div>

          {/* Avg Completion Time Card */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Avg Time to Complete
              </span>
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                <Timer className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900 dark:text-white truncate block">
                {formatAvgTime(summary.avgCompletionTimeHours)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Average duration per completed task
            </p>
          </div>

          {/* Active Tasks Card */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Workload
              </span>
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                <ListTodo className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {summary.inProgressTasks + summary.todoTasks}
              </span>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {summary.inProgressTasks} In Progress
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {summary.todoTasks} pending in To-Do stage
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Status Breakdown Pie Chart */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Task Status Distribution
              </h4>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Status Split
              </span>
            </div>
            <div className="h-52 w-full">
              {statusChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={statusChart}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusChart.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => (
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {value}
                        </span>
                      )}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No task status data available
                </div>
              )}
            </div>
          </div>

          {/* Time Taken Distribution Donut Chart */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Completion Duration Breakdown
              </h4>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Time Brackets
              </span>
            </div>
            <div className="h-52 w-full">
              {durationChart.some((d: any) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={durationChart}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {durationChart.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-dur-${index}`}
                          fill={entry.color}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => (
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
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

        {/* Filter Controls & Report Section */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Task Duration Log
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({filteredTasks.length} of {tasksReport.length} tasks)
              </span>
            </div>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-2.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Filters
              </Button>
            )}
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {/* Task Title Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                placeholder="Filter by title..."
                className="pl-8 h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 rounded-lg focus-visible:ring-indigo-500"
              />
            </div>

            {/* Project Stage / Status Filter */}
            <Select
              value={stageFilter}
              onValueChange={(val) => setStageFilter(val)}
            >
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 rounded-lg focus:ring-indigo-500">
                <div className="flex items-center gap-2 truncate">
                  <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Stage / Status" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-64 rounded-lg">
                <SelectItem value="ALL" className="text-xs font-medium">
                  All Stages & Statuses
                </SelectItem>
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Status
                  </SelectLabel>
                  <SelectItem value="TODO" className="text-xs">
                    To Do
                  </SelectItem>
                  <SelectItem value="IN_PROGRESS" className="text-xs">
                    In Progress
                  </SelectItem>
                  <SelectItem value="DONE" className="text-xs">
                    Done
                  </SelectItem>
                  <SelectItem value="BLOCKED" className="text-xs">
                    Blocked
                  </SelectItem>
                </SelectGroup>
                {availableStages.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Stage
                    </SelectLabel>
                    {availableStages.map((stg) => (
                      <SelectItem key={stg} value={stg} className="text-xs">
                        {stg}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>

            {/* Duration Filter */}
            <Select
              value={durationFilter}
              onValueChange={(val) => setDurationFilter(val)}
            >
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 rounded-lg focus:ring-indigo-500">
                <div className="flex items-center gap-2 truncate">
                  <Timer className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Duration" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="ANY" className="text-xs">
                  Any duration
                </SelectItem>
                <SelectItem value="<1" className="text-xs">
                  &lt; 1 Day (&lt; 24h)
                </SelectItem>
                <SelectItem value="1-3" className="text-xs">
                  1 - 3 Days
                </SelectItem>
                <SelectItem value="3-7" className="text-xs">
                  3 - 7 Days
                </SelectItem>
                <SelectItem value=">7" className="text-xs">
                  &gt; 7 Days
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table Container */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                    <th className="py-2.5 px-4">Task</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Stage</th>
                    <th className="py-2.5 px-4">Assigned</th>
                    <th className="py-2.5 px-4">Completed</th>
                    <th className="py-2.5 px-4 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task: any) => (
                      <tr
                        key={task.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Task Title */}
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 max-w-[220px] truncate">
                          {task.title}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border",
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

                        {/* Project Stage */}
                        <td className="py-3 px-4">
                          {task.stage ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                              <Layers className="h-3 w-3 text-purple-400" />
                              {task.stage}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 text-[11px]">
                              —
                            </span>
                          )}
                        </td>

                        {/* Assigned Date */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {task.assignedAt
                            ? format(new Date(task.assignedAt), "MMM d, yyyy")
                            : "-"}
                        </td>

                        {/* Completed Date */}
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {task.completedAt
                            ? format(new Date(task.completedAt), "MMM d, yyyy")
                            : "-"}
                        </td>

                        {/* Duration */}
                        <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-200 font-mono text-[11px]">
                          {task.durationFormatted}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
                            <AlertCircle className="h-5 w-5" />
                          </div>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            No tasks match the selected filters
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                            className="mt-1 h-7 text-xs rounded-lg"
                          >
                            Reset Filters
                          </Button>
                        </div>
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
