"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckSquare,
  Square,
  Plus,
  Loader2,
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Zap,
  Users,
  CheckCircle2,
} from "lucide-react";
import { formatDeadlineRange, cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { QuickSubtaskModal } from "./quick-subtask-modal";

export interface SubtasksListWidgetProps {
  taskId: string;
  taskTitle: string;
  canEdit?: boolean;
}

export function SubtasksListWidget({
  taskId,
  taskTitle,
  canEdit = true,
}: SubtasksListWidgetProps) {
  const router = useRouter();
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const fetchSubtasks = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tasks/${taskId}/subtasks`);
      if (res.ok) {
        const data = await res.json();
        setSubtasks(data.subtasks || []);
      }
    } catch (err) {
      console.error("Failed to load subtasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubtasks();

    const handleSubtaskCreated = (e: any) => {
      fetchSubtasks();
    };

    window.addEventListener("subtask:created", handleSubtaskCreated);
    return () => {
      window.removeEventListener("subtask:created", handleSubtaskCreated);
    };
  }, [taskId]);

  const handleToggleComplete = async (subtask: any) => {
    if (!canEdit) return;

    const newComplete = !subtask.isComplete;
    const subtaskId = subtask.id;

    // Optimistic UI update
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === subtaskId
          ? {
            ...s,
            isComplete: newComplete,
            status: newComplete ? "DONE" : "TODO",
          }
          : s
      )
    );

    setUpdatingIds((prev) => [...prev, subtaskId]);
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isComplete: newComplete,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update subtask");
      }

      toast.success(newComplete ? "Subtask marked as completed!" : "Subtask reopened");
    } catch (err) {
      // Rollback on error
      toast.error("Failed to update subtask status");
      fetchSubtasks();
    } finally {
      setUpdatingIds((prev) => prev.filter((id) => id !== subtaskId));
    }
  };

  const handleDeleteSubtask = async (subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this subtask?")) return;

    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
        toast.success("Subtask deleted");
      } else {
        toast.error("Failed to delete subtask");
      }
    } catch (err) {
      toast.error("Failed to delete subtask");
    }
  };

  const completedCount = subtasks.filter((s) => s.isComplete || s.status === "DONE").length;
  const totalCount = subtasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return (
          <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900 text-[10px] font-bold px-1.5 py-0">
            Urgent
          </Badge>
        );
      case "HIGH":
        return (
          <Badge className="bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-900 text-[10px] font-bold px-1.5 py-0">
            High
          </Badge>
        );
      case "MEDIUM":
        return (
          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900 text-[10px] font-bold px-1.5 py-0">
            Medium
          </Badge>
        );
      default:
        return (
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900 text-[10px] font-bold px-1.5 py-0">
            Low
          </Badge>
        );
    }
  };

  return (
    <>
      <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                <CheckSquare className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Subtasks & Intermediate Tasks
                  {totalCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-extrabold px-1.5 py-0 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                      {completedCount}/{totalCount}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Track small, urgent, and intermediate work items under this project
                </CardDescription>
              </div>
            </div>

            {canEdit && (
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 shadow-xs gap-1.5 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Subtask
              </Button>
            )}
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mt-3 pt-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                <span>Progress</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              Loading subtasks...
            </div>
          ) : subtasks.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-850/40">
              <Zap className="h-7 w-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No subtasks added yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Got a quick intermediate or urgent task during this project? Add it here.
              </p>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  className="mt-3 h-8 rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Create First Subtask
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {subtasks.map((subtask) => {
                const isUpdating = updatingIds.includes(subtask.id);
                const isComplete = subtask.isComplete || subtask.status === "DONE";

                return (
                  <div
                    key={subtask.id}
                    onClick={() => router.push(`/dashboard/tasks/${taskId}/record?recordId=${subtask.id}`)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group select-none",
                      isComplete
                        ? "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800/80 opacity-75"
                        : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-xs"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                      {/* Checkbox button */}
                      <button
                        type="button"
                        disabled={!canEdit || isUpdating}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleComplete(subtask);
                        }}
                        className={cn(
                          "h-5 w-5 rounded-md flex items-center justify-center shrink-0 border transition-colors",
                          isComplete
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 dark:border-slate-600 hover:border-indigo-500 group-hover:border-indigo-500"
                        )}
                      >
                        {isUpdating ? (
                          <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                        ) : isComplete ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : null}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "text-xs font-bold tracking-tight text-slate-800 dark:text-slate-200 truncate",
                              isComplete && "line-through text-slate-400 dark:text-slate-500"
                            )}
                          >
                            {subtask.title}
                          </span>
                          {getPriorityBadge(subtask.priority)}
                        </div>

                        {subtask.description && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-medium">
                            {subtask.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {(subtask.dueDate || subtask.startDate || subtask.endDate) && (
                        <div className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          <Clock className="h-3 w-3 text-indigo-500" />
                          <span>{formatDeadlineRange(subtask.dueDate, subtask.startDate, subtask.endDate)}</span>
                        </div>
                      )}

                      {/* Assignees avatars */}
                      {subtask.assignees && subtask.assignees.length > 0 && (
                        <div className="flex -space-x-1.5">
                          {subtask.assignees.slice(0, 3).map((a: any) => (
                            <Avatar
                              key={a.user?.id || Math.random()}
                              className="h-5 w-5 ring-1 ring-white dark:ring-slate-900 shrink-0"
                              title={a.user?.name}
                            >
                              <AvatarImage src={a.user?.image || ""} />
                              <AvatarFallback className="bg-indigo-600 text-white font-bold text-[8px]">
                                {(a.user?.name || "U").charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSubtask(subtask.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete subtask"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <QuickSubtaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        parentTaskId={taskId}
        parentTaskTitle={taskTitle}
        onSuccess={() => fetchSubtasks()}
      />
    </>
  );
}
