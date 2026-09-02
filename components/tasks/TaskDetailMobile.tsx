"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  FileText,
  Edit3,
  UserCheck,
  History,
  Shield,
  Briefcase,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, formatDeadlineRange, getPriorityColor, getStatusColor, cn } from "@/lib/utils";
import TaskStatusUpdate from "@/components/task-status-update";
import TaskComments from "@/components/task-comments";

interface TaskDetailMobileProps {
  task: any;
  taskId: string;
  isCreator: boolean;
  isAssignee: boolean;
  canEdit: boolean;
  canComment: boolean;
  accessInfo: any;
  historyEvents: any[];
  uniqueAssignments: any[];
  isUrgent: boolean;
  isOverdue: boolean;
}

export function TaskDetailMobile({
  task,
  taskId,
  isCreator,
  isAssignee,
  canEdit,
  canComment,
  accessInfo,
  historyEvents,
  uniqueAssignments,
  isUrgent,
  isOverdue,
}: TaskDetailMobileProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "comments" | "assignees" | "history">("overview");

  // Calculate task progress percentage
  const calculateProgress = () => {
    if (task.progress !== undefined && task.progress !== null) return task.progress;
    if (task.subtasks && task.subtasks.length > 0) {
      const completed = task.subtasks.filter((st: any) => st.completed).length;
      return Math.round((completed / task.subtasks.length) * 100);
    }
    if (task.status === "DONE") return 100;
    if (task.status === "IN_PROGRESS") return 60;
    return 0;
  };

  const progress = calculateProgress();

  const getPriorityIcon = () => {
    switch (task.priority) {
      case "LOW":
      case "MEDIUM":
        return <Clock className="h-3 w-3" />;
      case "HIGH":
        return <AlertTriangle className="h-3 w-3" />;
      case "URGENT":
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 w-full">
      {/* 1. Sticky Mobile Top App Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-xs">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => router.push("/dashboard/tasks")}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-transform shrink-0"
              aria-label="Back to tasks"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {task.title}
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                Created by {task.creator?.name || "Workspace"}
              </p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={task.channel?.id ? `/dashboard/channels/${task.channel.id}` : `/dashboard/tasks/${task.id}/channel`}
              className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs active:scale-90 transition-transform"
              title="Open Project Channel"
            >
              <MessageSquare className="w-4 h-4" />
            </Link>

            <Link
              href={`/dashboard/tasks/${task.id}/record`}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-xs active:scale-90 transition-transform"
              title="Task Records & Flows"
            >
              <FileText className="w-4 h-4 text-indigo-500" />
            </Link>

            {canEdit && (
              <Link
                href={`/dashboard/tasks/${task.id}/edit`}
                className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-xs active:scale-90 transition-transform"
                title="Edit Task"
              >
                <Edit3 className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Content Body */}
      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Task Hero Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {task.title}
            </h2>
          </div>

          {/* Status & Priority Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={cn(
                "rounded-lg px-2.5 py-0.5 font-bold text-[11px] shadow-xs flex items-center gap-1",
                getStatusColor(task.status)
              )}
            >
              {task.status === "DONE" && <CheckCircle className="h-3 w-3" />}
              <span>{task.status === "DONE" ? "Completed" : task.status}</span>
            </Badge>

            <Badge
              className={cn(
                "rounded-lg px-2.5 py-0.5 font-bold text-[11px] shadow-xs flex items-center gap-1",
                getPriorityColor(task.priority)
              )}
            >
              {getPriorityIcon()}
              <span>{task.priority} Priority</span>
            </Badge>

            {(task.deadline || task.deadlineStart) && (
              <Badge
                variant="outline"
                className={cn(
                  "rounded-lg px-2.5 py-0.5 font-bold text-[11px] flex items-center gap-1 border",
                  isOverdue
                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60"
                    : isUrgent
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60"
                    : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                )}
              >
                <CalendarClock className="h-3 w-3" />
                <span>
                  {isOverdue ? "Overdue: " : "Due: "}
                  {formatDeadlineRange(task.deadline, task.deadlineStart, task.deadlineEnd)}
                </span>
              </Badge>
            )}

            {accessInfo && (
              <Badge className={cn("rounded-lg px-2.5 py-0.5 font-bold text-[11px]", accessInfo.color)}>
                {accessInfo.label}
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500 dark:text-slate-400">Progress</span>
              <span className="text-slate-900 dark:text-white">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  progress === 100 ? "bg-emerald-500" : progress > 50 ? "bg-indigo-600" : "bg-amber-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3. Segmented Control Tabs */}
        <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all text-center shrink-0 cursor-pointer",
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("comments")}
            className={cn(
              "flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 shrink-0 cursor-pointer",
              activeTab === "comments"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <span>Comments</span>
            {task.comments?.length > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[9px] font-extrabold",
                  activeTab === "comments"
                    ? "bg-white text-indigo-600"
                    : "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                )}
              >
                {task.comments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assignees")}
            className={cn(
              "flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1 shrink-0 cursor-pointer",
              activeTab === "assignees"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <span>Team</span>
            {uniqueAssignments?.length > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[9px] font-extrabold",
                  activeTab === "assignees"
                    ? "bg-white text-indigo-600"
                    : "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                )}
              >
                {uniqueAssignments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all text-center shrink-0 cursor-pointer",
              activeTab === "history"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            History
          </button>
        </div>

        {/* 4. Tab Views */}
        {/* Tab A: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Description Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Description
              </p>
              <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {task.description || "No description provided."}
              </div>
            </div>

            {/* Dates Bento Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  Created Date
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span>{formatDate(task.createdAt)}</span>
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  Target Deadline
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5 truncate">
                  <CalendarClock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">
                    {task.deadline || task.deadlineStart
                      ? formatDeadlineRange(task.deadline, task.deadlineStart, task.deadlineEnd)
                      : "No deadline"}
                  </span>
                </p>
              </div>
            </div>

            {/* Real-Time Status Updater */}
            {(isAssignee || canEdit) && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Update Task Status
                </p>
                <TaskStatusUpdate taskId={taskId} currentStatus={task.status} />
              </div>
            )}

            {/* Quick Channel Link Banner */}
            <Link
              href={task.channel?.id ? `/dashboard/channels/${task.channel.id}` : `/dashboard/tasks/${task.id}/channel`}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-xs active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">#{task.channel?.name || `${task.title.slice(0, 20)} Channel`}</h4>
                  <p className="text-[10px] opacity-80 mt-0.5">Open project discussion channel</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-indigo-500" />
            </Link>
          </div>
        )}

        {/* Tab B: Comments & Discussion */}
        {activeTab === "comments" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                <span>Discussion Feed</span>
              </h3>
              {!canComment && (
                <span className="text-[10px] text-amber-600 font-bold">View-only</span>
              )}
            </div>
            <TaskComments taskId={task.id} comments={task.comments || []} />
          </div>
        )}

        {/* Tab C: Assignees */}
        {activeTab === "assignees" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-500" />
                <span>Assigned Team Members ({uniqueAssignments.length})</span>
              </h3>
              {canEdit && (
                <Link
                  href={`/dashboard/tasks/${task.id}/assignees`}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Manage
                </Link>
              )}
            </div>

            {uniqueAssignments.length === 0 ? (
              <p className="text-slate-400 text-xs italic text-center py-6">No assignees added yet</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {uniqueAssignments.map((assignment: any) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between py-3 first:pt-1 last:pb-1"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-9 w-9 ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                        <AvatarImage src={assignment.user?.image || ""} alt={assignment.user?.name} />
                        <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">
                          {assignment.user?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {assignment.user?.name || "Team Member"}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {assignment.user?.email}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/messages/${assignment.userId}`}
                      className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold shrink-0 ml-2"
                    >
                      Message
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab D: History Log */}
        {activeTab === "history" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-500" />
                <span>Project Timeline & History</span>
              </h3>
            </div>

            <div className="space-y-3">
              {historyEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  {event.iconType === "assignment" && event.user ? (
                    <Avatar className="h-7 w-7 ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 mt-0.5">
                      <AvatarImage src={event.user.image || ""} alt={event.user.name} />
                      <AvatarFallback className="bg-emerald-600 text-white font-bold text-[10px]">
                        {event.user.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  ) : event.iconType === "status" ? (
                    <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/60 font-bold mt-0.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/60 font-bold mt-0.5">
                      <Briefcase className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{event.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskDetailMobile;
