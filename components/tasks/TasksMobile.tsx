"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Plus,
  Zap,
  Sparkles,
  MoreVertical,
  Calendar as CalendarIcon,
  TrendingUp,
  Filter,
  Eye,
  Check,
  ChevronRight,
  User,
  SlidersHorizontal,
  Flame,
  LayoutGrid,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";

interface TasksMobileProps {
  stats: {
    total: number;
    inProgress: number;
    completed: number;
    highPriority: number;
    completionRate: number;
  };
  activeTab: "assigned" | "created" | "kanban";
  setActiveTab: (tab: "assigned" | "created" | "kanban") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  assignedTasks: any[];
  createdTasks: any[];
  filteredAssignedTasks: any[];
  filteredCreatedTasks: any[];
  aiEnabled: boolean;
  onOpenAiModal: () => void;
  onOpenQuickSubtask: () => void;
  onMarkAsDone: (taskId: string) => void;
  canCreateTasks: boolean;
  assignedPage: number;
  setAssignedPage: React.Dispatch<React.SetStateAction<number>>;
  createdPage: number;
  setCreatedPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
}

export function TasksMobile({
  stats,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  assignedTasks,
  createdTasks,
  filteredAssignedTasks,
  filteredCreatedTasks,
  aiEnabled,
  onOpenAiModal,
  onOpenQuickSubtask,
  onMarkAsDone,
  canCreateTasks,
  assignedPage,
  setAssignedPage,
  createdPage,
  setCreatedPage,
  itemsPerPage,
}: TasksMobileProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const currentTasks = activeTab === "assigned" ? filteredAssignedTasks : filteredCreatedTasks;

  const displayedTasks = currentTasks.filter((task) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "IN_PROGRESS") return task.status === "IN_PROGRESS";
    if (statusFilter === "DONE") return task.status === "DONE";
    if (statusFilter === "TODO") return task.status === "TODO" || !task.status;
    if (statusFilter === "HIGH") return task.priority === "HIGH" || task.priority === "URGENT";
    return true;
  });

  const currentPage = activeTab === "assigned" ? assignedPage : createdPage;
  const setPage = activeTab === "assigned" ? setAssignedPage : setCreatedPage;
  const totalPages = Math.ceil(displayedTasks.length / itemsPerPage) || 1;
  const paginatedTasks = displayedTasks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const calculateProgress = (task: any) => {
    if (task.progress !== undefined && task.progress !== null) return task.progress;
    if (task.subtasks && task.subtasks.length > 0) {
      const completed = task.subtasks.filter((st: any) => st.completed).length;
      return Math.round((completed / task.subtasks.length) * 100);
    }
    if (task.status === "DONE") return 100;
    if (task.status === "IN_PROGRESS") return 60;
    return 0;
  };

  const getStatusBadge = (status: string) => {
    if (status === "DONE") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-3 h-3" /> Done
        </span>
      );
    }
    if (status === "IN_PROGRESS") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
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

  const getPriorityBadge = (priority: string) => {
    if (priority === "HIGH" || priority === "URGENT") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
          <Flame className="w-3 h-3" /> High
        </span>
      );
    }
    if (priority === "MEDIUM") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300">
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

  return (
    <div className="flex flex-col gap-4 pb-20 w-full">
      {/* 1. Mobile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Projects & Tasks</span>
          </div>
          {canCreateTasks && (
            <Link
              href="/dashboard/tasks/new"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-transform"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New</span>
            </Link>
          )}
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Project Management
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
          Track milestones, deliverables, and assignments in real-time
        </p>

        {/* Action Shortcut Row */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {aiEnabled && (
            <button
              onClick={onOpenAiModal}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
              <span>Jamure AI</span>
            </button>
          )}

          <button
            onClick={onOpenQuickSubtask}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Quick Subtask</span>
          </button>
        </div>
      </div>

      {/* 2. Metric Bento Cards */}
      <div className="grid grid-cols-2 gap-2.5 w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FolderKanban className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">Total</span>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 dark:text-white block leading-none">
              {stats.total}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-0.5 truncate">
              <TrendingUp className="w-3 h-3 inline" /> {stats.completionRate}% Done
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">In Progress</span>
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900 dark:text-white block leading-none">
              {stats.inProgress}
            </span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 block truncate">
              Active projects
            </span>
          </div>
        </div>
      </div>

      {/* 3. Segment Switcher (Assigned vs Created) */}
      <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-1">
        <button
          onClick={() => setActiveTab("assigned")}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === "assigned"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <span>Assigned to Me</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
            activeTab === "assigned" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          )}>
            {assignedTasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("created")}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer",
            activeTab === "created"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
        >
          <span>Created by Me</span>
          <span className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
            activeTab === "created" ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          )}>
            {createdTasks.length}
          </span>
        </button>
      </div>

      {/* 4. Search & Filter Bar */}
      <div className="space-y-2">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title or team..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { id: "ALL", label: "All" },
            { id: "IN_PROGRESS", label: "In Progress" },
            { id: "DONE", label: "Completed" },
            { id: "TODO", label: "To Do" },
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

      {/* 5. Mobile Project Cards List */}
      <div className="space-y-3">
        {paginatedTasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <FolderKanban className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No projects found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {searchQuery ? "No projects match your search query." : "You have no projects in this category."}
            </p>
          </div>
        ) : (
          paginatedTasks.map((task) => {
            const progress = calculateProgress(task);
            const userInitial = task.creator?.name?.charAt(0) || "U";
            const userName = task.creator?.name || "Workspace";
            const dateStr = task.deadline
              ? formatDate(task.deadline)
              : task.createdAt
              ? formatDate(task.createdAt)
              : "No deadline";

            return (
              <div
                key={task.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs active:scale-[0.99] transition-transform space-y-3"
              >
                {/* Header: Title & Dropdown */}
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/dashboard/tasks/${task.id}`} className="flex-1 min-w-0 group">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors leading-tight line-clamp-2">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        aria-label="Project actions"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg text-xs">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/tasks/${task.id}`} className="flex items-center gap-2 cursor-pointer">
                          <Eye className="w-3.5 h-3.5 text-indigo-500" /> View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href={task.channel?.id ? `/dashboard/channels/${task.channel.id}` : `/dashboard/tasks/${task.id}/channel`}
                          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
                        >
                          <FolderKanban className="w-3.5 h-3.5" /> Open Project Channel
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/tasks/${task.id}/record`} className="flex items-center gap-2 cursor-pointer">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Task Records
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onOpenQuickSubtask} className="flex items-center gap-2 cursor-pointer">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> Quick Subtask
                      </DropdownMenuItem>
                      {task.status !== "DONE" && (
                        <DropdownMenuItem
                          onClick={() => onMarkAsDone(task.id)}
                          className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Mark as Done
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Status & Priority Badges & Channel Link */}
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(task.status)}
                  {getPriorityBadge(task.priority)}
                  <Link
                    href={task.channel?.id ? `/dashboard/channels/${task.channel.id}` : `/dashboard/tasks/${task.id}/channel`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800 transition-colors shadow-2xs"
                    title="Open project discussion channel"
                  >
                    <FolderKanban className="w-3 h-3 text-indigo-500" />
                    <span>#{task.channel?.name || `${task.title.slice(0, 15)}`}</span>
                  </Link>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">Progress</span>
                    <span className="text-slate-900 dark:text-white">{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        progress === 100 ? "bg-emerald-500" : progress > 50 ? "bg-indigo-600" : "bg-amber-500"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer: User & Date */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                      {userInitial}
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                      {userName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dateStr}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 px-2 text-xs font-medium text-slate-500">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TasksMobile;
