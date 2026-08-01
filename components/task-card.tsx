"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Play,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

export type TaskCardProps = {
  task: any;
  showActions?: boolean;
  client?: boolean;
  admin?: boolean;
  viewMode?: "grid" | "list";
  compact?: boolean;
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "HIGH":
      return (
        <Badge className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          High
        </Badge>
      );
    case "MEDIUM":
      return (
        <Badge className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Medium
        </Badge>
      );
    case "LOW":
      return (
        <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Low
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0">
          Normal
        </Badge>
      );
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "TODO":
      return (
        <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
          <Clock className="h-3 w-3 text-slate-500" />
          To Do
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
          <Play className="h-3 w-3 text-indigo-500 fill-indigo-500" />
          In Progress
        </Badge>
      );
    case "BLOCKED":
      return (
        <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
          <AlertCircle className="h-3 w-3 text-rose-500" />
          Blocked
        </Badge>
      );
    case "DONE":
      return (
        <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Done
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0">
          {status}
        </Badge>
      );
  }
};

export default function TaskCard({
  task,
  showActions = true,
  client = false,
  admin = false,
  viewMode = "grid",
  compact = false,
}: TaskCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const prefetchTask = () => {
    if (task?.id) {
      router.prefetch(`/dashboard/tasks/${task.id}`);
    }
  };

  const daysUntilDeadline = task.deadline
    ? differenceInDays(new Date(task.deadline), new Date())
    : null;

  const isUrgent =
    daysUntilDeadline !== null &&
    daysUntilDeadline <= 1 &&
    daysUntilDeadline >= 0 &&
    task.status !== "DONE";
  const isOverdue =
    daysUntilDeadline !== null &&
    daysUntilDeadline < 0 &&
    task.status !== "DONE";

  // LIST VIEW RENDERING (Compact Row)
  if (viewMode === "list" && !compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.002 }}
        transition={{ duration: 0.15 }}
        onMouseEnter={prefetchTask}
        className="w-full"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 px-3.5 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-2.5 group">
          {/* Left Portion: Priority, Status, Title, Description */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {getPriorityBadge(task.priority)}
            {getStatusBadge(task.status)}

            <div className="flex-1 min-w-0">
              <Link
                href={`/dashboard/tasks/${task.id}`}
                prefetch={true}
                onMouseEnter={prefetchTask}
                className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate block"
              >
                {task.title}
              </Link>
              {task.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 hidden sm:block">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          {/* Right Portion: Deadline, Assignees, Actions */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-between md:justify-end">
            {task.deadline && (
              <div
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1",
                  isOverdue
                    ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                    : isUrgent
                      ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                      : "text-slate-500 dark:text-slate-400"
                )}
              >
                <Clock className="h-3 w-3" />
                <span>{formatDate(task.deadline)}</span>
              </div>
            )}

            {/* Assignees */}
            {task.assignments && task.assignments.length > 0 && (
              <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                {task.assignments.slice(0, 3).map((assignment: any) => (
                  <Avatar
                    key={assignment.id}
                    className="h-5.5 w-5.5 border-2 border-white dark:border-slate-900 ring-1 ring-slate-200/50 dark:ring-slate-800"
                  >
                    <AvatarImage src={assignment.user?.image || ""} />
                    <AvatarFallback className="text-[8px] bg-indigo-600 text-white font-bold">
                      {assignment.user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}

            {/* Actions */}
            {!client && showActions && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-6.5 text-[11px] font-bold rounded-lg border-slate-200 dark:border-slate-700 px-2"
                >
                  <Link href={`/dashboard/tasks/${task.id}`}>
                    Details
                  </Link>
                </Button>

                {task.channel && (
                  <>
                    {admin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-6.5 w-6.5 p-0 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Records"
                      >
                        <Link href={`/dashboard/tasks/${task.id}/record`}>
                          <FileText className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-6.5 w-6.5 p-0 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      title="Discussion Channel"
                    >
                      <Link href={`/dashboard/channels/${task.channel.id}`}>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // KANBAN COMPACT CARD
  if (compact) {
    return (
      <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-2xs space-y-1.5 group hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
        <div className="flex items-center justify-between gap-2">
          {getPriorityBadge(task.priority)}
          {task.deadline && (
            <span
              className={cn(
                "text-[10px] font-semibold flex items-center gap-1",
                isOverdue ? "text-rose-600" : isUrgent ? "text-amber-600" : "text-slate-400"
              )}
            >
              <Clock className="h-3 w-3" />
              {formatDate(task.deadline)}
            </span>
          )}
        </div>

        <Link
          href={`/dashboard/tasks/${task.id}`}
          className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 block leading-tight"
        >
          {task.title}
        </Link>

        {task.assignments && task.assignments.length > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex -space-x-1 overflow-hidden">
              {task.assignments.slice(0, 3).map((assignment: any) => (
                <Avatar key={assignment.id} className="h-5 w-5 border border-white dark:border-slate-900">
                  <AvatarImage src={assignment.user?.image || ""} />
                  <AvatarFallback className="text-[8px] bg-indigo-600 text-white font-bold">
                    {assignment.user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {task.channel && (
              <Link
                href={`/dashboard/channels/${task.channel.id}`}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center"
              >
                Chat
                <ArrowUpRight className="h-3 w-3 ml-0.5" />
              </Link>
            )}
          </div>
        )}
      </div>
    );
  }

  // STANDARD MEDIUM GRID CARD
  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full flex"
    >
      <div
        className={cn(
          "w-full bg-white dark:bg-slate-900 border rounded-xl p-3.5 shadow-2xs transition-all duration-200 flex flex-col justify-between group relative",
          isHovered
            ? "border-indigo-300 dark:border-indigo-700/80 shadow-xs"
            : "border-slate-200/80 dark:border-slate-800"
        )}
      >
        {/* Top Header Row: Priority & Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {getPriorityBadge(task.priority)}
            {getStatusBadge(task.status)}
          </div>

          {/* Title & Description */}
          <div>
            <Link
              href={`/dashboard/tasks/${task.id}`}
              className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 block"
            >
              {task.title}
            </Link>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 leading-snug">
              {task.description || "No project description provided."}
            </p>
          </div>
        </div>

        {/* Bottom Section: Single Compact Meta Row */}
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          {/* Left: Deadline / Assignees */}
          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 min-w-0">
            {task.deadline ? (
              <div
                className={cn(
                  "flex items-center gap-1 font-semibold truncate",
                  isOverdue ? "text-rose-600" : isUrgent ? "text-amber-600" : ""
                )}
              >
                <Clock className="h-3 w-3 shrink-0" />
                <span className="truncate">{formatDate(task.deadline)}</span>
              </div>
            ) : (
              <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                {task.assignments && task.assignments.length > 0 ? (
                  task.assignments.slice(0, 3).map((assignment: any) => (
                    <Avatar
                      key={assignment.id}
                      className="h-5 w-5 border border-white dark:border-slate-900"
                    >
                      <AvatarImage src={assignment.user?.image || ""} />
                      <AvatarFallback className="text-[8px] bg-indigo-600 text-white font-bold">
                        {assignment.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  ))
                ) : (
                  <span className="text-slate-400 italic">No deadline</span>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          {!client && showActions && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-6.5 text-[10px] font-bold rounded-lg border-slate-200 dark:border-slate-700 px-2 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Link href={`/dashboard/tasks/${task.id}`}>
                  Details
                </Link>
              </Button>

              {task.channel && (
                <>
                  {admin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-6.5 w-6.5 p-0 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Records"
                    >
                      <Link href={`/dashboard/tasks/${task.id}/record`}>
                        <FileText className="h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-6.5 w-6.5 p-0 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                    title="Discussion Channel"
                  >
                    <Link href={`/dashboard/channels/${task.channel.id}`}>
                      <MessageSquare className="h-3 w-3" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}