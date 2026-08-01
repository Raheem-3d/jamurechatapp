"use client";

import type { Stage, Task } from "@/types/task";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MessageSquare, Paperclip, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isComplete?: boolean;
  showCompleteButton?: boolean;
  onComplete?: (taskId: string) => Promise<void>;
  isCompleting?: boolean;
  stages: Stage[];
}

export function TaskCard({
  task,
  onClick,
  isComplete = false,
  showCompleteButton = false,
  onComplete,
  isCompleting = false,
  stages = [],
}: TaskCardProps) {
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60";
      case "high":
        return "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/60";
      case "medium":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60";
      case "low":
        return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
    }
  };

  const handleCompleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (onComplete) {
        await onComplete(task.id);
      }
    } catch (error) {
      toast.error("Failed to complete task");
      console.error("Error completing task:", error);
    }
  };

  const getNextStageName = () => {
    const currentStageIndex = stages.findIndex((s) => s.id === task.stageId);
    if (currentStageIndex === -1 || currentStageIndex === stages.length - 1) {
      return null;
    }
    const nextStage = stages[currentStageIndex + 1];
    return nextStage?.name || null;
  };

  return (
    <div
      className={cn(
        "group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 cursor-pointer shadow-xs hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 space-y-2.5",
        isComplete &&
          "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60"
      )}
      onClick={onClick}
    >
      {/* Top Header: Completion Badge / Title / Priority */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
          {task.title}
        </h4>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 capitalize",
            getPriorityBadgeClass(task.priority)
          )}
        >
          {task.priority}
        </Badge>
      </div>

      {/* Description Snippet */}
      {task.description && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
          {task.description}
        </p>
      )}

      {/* Tag Badges */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className={cn(
                "text-[9px] font-extrabold px-1.5 py-0 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40",
                tag.color
              )}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Card Metadata Footer: Due Date, Comments, Assignee */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Calendar className="h-3 w-3 text-indigo-500" />
              <span>{formatDistanceToNow(task.dueDate, { addSuffix: true })}</span>
            </div>
          )}

          {task.comments?.length > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <MessageSquare className="h-3 w-3 text-purple-500" />
              <span>{task.comments.length}</span>
            </div>
          )}

          {task.attachments?.length > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Paperclip className="h-3 w-3 text-pink-500" />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>

        {task.assignees && (
          <Avatar className="h-6 w-6 ring-2 ring-white dark:ring-slate-800 shrink-0">
            <AvatarImage
              src={task.assignees.avatar || "/placeholder.svg"}
              alt={task.assignees.name}
            />
            <AvatarFallback className="text-[10px] bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-extrabold">
              {task.assignees.name
                ? task.assignees.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                : "?"}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Complete Button Action */}
      {showCompleteButton && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-[11px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80 transition-all flex items-center justify-center gap-1"
          onClick={handleCompleteClick}
          disabled={isCompleting}
        >
          <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>
            {isCompleting
              ? "Updating..."
              : `Mark Complete (→ ${getNextStageName()})`}
          </span>
        </Button>
      )}
    </div>
  );
}
