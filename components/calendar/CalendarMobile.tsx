"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  Flame,
  Search,
  ArrowRight,
  TrendingUp,
  User as UserIcon,
  Briefcase,
  Layers,
  Filter,
  CheckSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CalendarMobileProps {
  date: Date | undefined;
  setDate: (date: Date) => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  tasks: any[];
  filteredTasks: any[];
  canCreateTasks: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTaskName: string;
  setSelectedTaskName: (name: string) => void;
  uniqueTaskNames: string[];
  dayInRange: (day: Date, task: any) => boolean;
  upcomingCount: number;
  completedCount: number;
  inProgressCount: number;
}

export function CalendarMobile({
  date,
  setDate,
  currentMonth,
  setCurrentMonth,
  tasks,
  filteredTasks,
  canCreateTasks,
  searchQuery,
  setSearchQuery,
  selectedTaskName,
  setSelectedTaskName,
  uniqueTaskNames,
  dayInRange,
  upcomingCount,
  completedCount,
  inProgressCount,
}: CalendarMobileProps) {
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const today = new Date();
  const selectedDate = date || today;

  // Generate calendar days for month view
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const monthDays: Date[] = [];
  const curr = new Date(startDate);
  for (let i = 0; i < 35; i++) {
    monthDays.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

  // Generate week days for week view
  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const displayedCalendarDays = viewMode === "month" ? monthDays : weekDays;

  // Selected date tasks
  const rawDateTasks = filteredTasks.filter((task) => dayInRange(selectedDate, task));

  const displayedDateTasks = rawDateTasks.filter((task) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "IN_PROGRESS") return task.status === "IN_PROGRESS";
    if (statusFilter === "DONE") return task.status === "DONE";
    if (statusFilter === "HIGH") return task.priority === "HIGH" || task.priority === "URGENT";
    return true;
  });

  const getPriorityPill = (priority: string) => {
    if (priority === "URGENT" || priority === "HIGH") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
          <Flame className="w-3 h-3" /> High
        </span>
      );
    }
    if (priority === "MEDIUM") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
        Low
      </span>
    );
  };

  const getStatusPill = (status: string) => {
    if (status === "DONE") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-3 h-3" /> Done
        </span>
      );
    }
    if (status === "IN_PROGRESS") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
          <Clock className="w-3 h-3" /> In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
        To Do
      </span>
    );
  };

  return (
    <div className="md:hidden flex flex-col gap-4 pb-20 w-full">
      {/* 1. Header Hero Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Task Calendar</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setCurrentMonth(new Date());
                setDate(new Date());
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
            >
              Today
            </button>

            {canCreateTasks && (
              <Link
                href="/dashboard/tasks/new"
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-transform"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New</span>
              </Link>
            )}
          </div>
        </div>

        {/* Month Navigation & Switcher */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 active:scale-90 transition-all cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white px-2 min-w-[120px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 active:scale-90 transition-all cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode Toggle (Month / Week) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setViewMode("month")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                viewMode === "month"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                viewMode === "week"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Calendar Matrix Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span
              key={i}
              className="text-[11px] font-bold text-slate-400 dark:text-slate-500 py-1"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {displayedCalendarDays.map((day, idx) => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isDayToday = isSameDay(day, today);
            const isDaySelected = isSameDay(day, selectedDate);
            const dayTasks = filteredTasks.filter((task) => dayInRange(day, task));
            const hasTasks = dayTasks.length > 0;
            const hasCompletedOnly = hasTasks && dayTasks.every((t) => t.status === "DONE");

            return (
              <button
                key={idx}
                onClick={() => setDate(day)}
                type="button"
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all relative cursor-pointer active:scale-95",
                  isDaySelected
                    ? "bg-indigo-600 text-white shadow-xs font-bold"
                    : isDayToday
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800"
                    : isCurrentMonth
                    ? "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                    : "text-slate-300 dark:text-slate-600 font-normal"
                )}
              >
                <span className="text-xs leading-none">{day.getDate()}</span>

                {/* Dot task indicator */}
                <div className="h-1.5 flex items-center justify-center mt-1">
                  {hasTasks && (
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isDaySelected
                          ? "bg-white"
                          : hasCompletedOnly
                          ? "bg-emerald-500"
                          : "bg-indigo-600 dark:bg-indigo-400"
                      )}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Metric Bento Row */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5">
            <CalendarIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Total Deadlines
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-white leading-tight block">
            {filteredTasks.length}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Upcoming
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-white leading-tight block">
            {upcomingCount}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block truncate">
            Completed
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-white leading-tight block">
            {completedCount}
          </span>
        </div>
      </div>

      {/* 4. Filter & Search Controls */}
      <div className="space-y-2">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scheduled tasks..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { id: "ALL", label: "All Tasks" },
            { id: "IN_PROGRESS", label: "In Progress" },
            { id: "DONE", label: "Completed" },
            { id: "HIGH", label: "High Priority" },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer",
                statusFilter === chip.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Active Selected Date Tasks List */}
      <div className="space-y-3">
        {/* Date Section Header */}
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{format(selectedDate, "EEEE, MMMM d")}</span>
              {isSameDay(selectedDate, today) && (
                <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md">
                  Today
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {displayedDateTasks.length} {displayedDateTasks.length === 1 ? "task" : "tasks"} scheduled
            </p>
          </div>
        </div>

        {displayedDateTasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-7 border border-slate-200/80 dark:border-slate-800/80 text-center shadow-xs">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              No tasks for this day
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs mx-auto">
              Select another date on the calendar or create a new task.
            </p>
            {canCreateTasks && (
              <Button asChild size="sm" className="mt-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs">
                <Link href="/dashboard/tasks/new" className="flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Create Task for {format(selectedDate, "MMM d")}</span>
                </Link>
              </Button>
            )}
          </div>
        ) : (
          displayedDateTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs active:scale-[0.99] transition-transform space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/dashboard/tasks/${task.id}/record`}
                  className="flex-1 min-w-0 group"
                >
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight line-clamp-2">
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed font-medium">
                      {task.description}
                    </p>
                  )}
                </Link>
              </div>

              {/* Status & Priority Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusPill(task.status)}
                {getPriorityPill(task.priority)}
                <Link
                  href={task.channel?.id ? `/dashboard/channels/${task.channel.id}` : `/dashboard/tasks/${task.id}/channel`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800 transition-colors"
                >
                  #{task.channel?.name || `${task.title.slice(0, 15)}`}
                </Link>
              </div>

              {/* Footer row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                    {task.creator?.name ? task.creator.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                    {task.creator?.name || "Workspace"}
                  </span>
                </div>

                <Link
                  href={`/dashboard/tasks/${task.id}/record`}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>View</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CalendarMobile;
