"use client";

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { Stage, Task } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Edit, Trash, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TaskBoardProps {
  stages: Stage[];
  tasksByStage: Record<string, Task[]>;
  onTaskMove: (taskId: string, newStageId: string) => Promise<void>;
  onTaskClick: (task: Task) => void;
  onCreateTask: (stageId: string) => void;
  onCreateStage: () => void;
  onEditStage: (stage: Stage) => void;
  onDeleteStage: (stageId: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
}

const getStageColorStyles = (color?: string) => {
  const c = (color || "").toLowerCase();
  if (c.includes("blue")) {
    return {
      columnBg: "bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60",
      dot: "bg-blue-500",
      badge: "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200",
      button: "text-blue-700 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800/60 hover:bg-blue-200/70 dark:hover:bg-blue-900/70",
    };
  }
  if (c.includes("green") || c.includes("emerald")) {
    return {
      columnBg: "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60",
      dot: "bg-emerald-500",
      badge: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200",
      button: "text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-200/70 dark:hover:bg-emerald-900/70",
    };
  }
  if (c.includes("yellow") || c.includes("amber")) {
    return {
      columnBg: "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
      dot: "bg-amber-500",
      badge: "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200",
      button: "text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800/60 hover:bg-amber-200/70 dark:hover:bg-amber-900/70",
    };
  }
  if (c.includes("purple") || c.includes("violet")) {
    return {
      columnBg: "bg-purple-50/80 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60",
      dot: "bg-purple-500",
      badge: "bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200",
      button: "text-purple-700 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800/60 hover:bg-purple-200/70 dark:hover:bg-purple-900/70",
    };
  }
  if (c.includes("pink") || c.includes("rose")) {
    return {
      columnBg: "bg-pink-50/80 dark:bg-pink-950/40 border-pink-200 dark:border-pink-900/60",
      dot: "bg-pink-500",
      badge: "bg-pink-100 dark:bg-pink-900/60 text-pink-800 dark:text-pink-200",
      button: "text-pink-700 dark:text-pink-300 bg-pink-100/60 dark:bg-pink-900/40 border-pink-200 dark:border-pink-800/60 hover:bg-pink-200/70 dark:hover:bg-pink-900/70",
    };
  }
  if (c.includes("red")) {
    return {
      columnBg: "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60",
      dot: "bg-rose-500",
      badge: "bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200",
      button: "text-rose-700 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-900/40 border-rose-200 dark:border-rose-800/60 hover:bg-rose-200/70 dark:hover:bg-rose-900/70",
    };
  }
  return {
    columnBg: "bg-slate-100/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800",
    dot: "bg-indigo-500",
    badge: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    button: "text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50",
  };
};

export function TaskBoard({
  stages,
  tasksByStage,
  onTaskMove,
  onTaskReorder,
  onTaskClick,
  onCreateTask,
  onCreateStage,
  onEditStage,
  onDeleteStage,
  onCompleteTask,
}: TaskBoardProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleStageExpand = (stageId: string) => {
    setExpandedStages((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, source, destination } = result;

    // 🛑 1. Dropped in exact same position: no-op
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // 🔄 2. Reordering within the SAME stage:
    if (source.droppableId === destination.droppableId) {
      onTaskReorder?.(source.droppableId, source.index, destination.index);
      return;
    }

    // 🚚 3. Moving to a DIFFERENT stage:
    try {
      await onTaskMove(draggableId, destination.droppableId);
    } catch (error) {
      console.error("Failed to move task:", error);
      toast.error("Failed to move task");
    }
  };

  const handleEditStage = (stage: Stage) => {
    onEditStage(stage);
  };

  const handleDeleteStage = async (stageId: string) => {
    setIsDeleting(stageId);
    try {
      await onDeleteStage(stageId);
      toast.success("Stage deleted successfully");
    } catch (error) {
      console.error("Failed to delete stage:", error);
      toast.error("Failed to delete stage");
    } finally {
      setIsDeleting(null);
    }
  };

  const isTaskComplete = (task: Task) => {
    const taskStage = stages.find((s) => s.id === task.stageId);
    return taskStage?.isCompleted || (task as any).isComplete;
  };

  const handleCompleteTask = async (taskId: string) => {
    setIsCompleting(taskId);
    try {
      await onCompleteTask(taskId);
      toast.success("Task marked as complete");
    } catch (error) {
      console.error("Failed to complete task:", error);
      toast.error("Failed to complete task");
    } finally {
      setIsCompleting(null);
    }
  };

  const getNextStageId = (currentStageId: string) => {
    const currentStageIndex = stages.findIndex((s) => s.id === currentStageId);
    if (currentStageIndex === -1 || currentStageIndex === stages.length - 1) {
      return null;
    }
    return stages[currentStageIndex + 1].id;
  };

  return (
    <div className="h-full overflow-x-auto custom-scrollbar-x p-4 sm:p-5">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 min-w-max items-start">
          {stages.map((stage) => {
            if (!stage || !stage.id) return null;
            const stageTasks = tasksByStage[stage.id] || [];
            const isExpanded = !!expandedStages[stage.id];
            const displayedTasks =
              stageTasks.length > 10 && !isExpanded
                ? stageTasks.slice(0, 10)
                : stageTasks;
            const colorStyles = getStageColorStyles(stage.color);

            return (
              <div
                key={stage.id}
                className={cn(
                  "w-80 flex-shrink-0 rounded-2xl p-3.5 border shadow-2xs transition-all flex flex-col max-h-[calc(100vh-210px)]",
                  colorStyles.columnBg
                )}
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800 flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("h-3 w-3 rounded-full shrink-0 shadow-2xs", colorStyles.dot)} />
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {stage.name}
                    </h3>
                    <Badge
                      variant="secondary"
                      onClick={() => stageTasks.length > 10 && toggleStageExpand(stage.id)}
                      title={stageTasks.length > 10 ? (isExpanded ? "Click to collapse" : "Click to view all records") : undefined}
                      className={cn(
                        "text-[10px] font-extrabold px-2 py-0.5 shadow-2xs shrink-0 transition-all select-none",
                        colorStyles.badge,
                        stageTasks.length > 10 && "cursor-pointer hover:scale-105 hover:ring-2 hover:ring-indigo-400"
                      )}
                    >
                      {stageTasks.length} {stageTasks.length > 10 && (!isExpanded ? "(10 shown)" : "(All)")}
                    </Badge>
                    {stage.isCompleted && (
                      <Badge
                        variant="default"
                        className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 text-[10px] font-bold shrink-0"
                      >
                        Completed
                      </Badge>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-all text-slate-500"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl"
                    >
                      <DropdownMenuItem
                        onClick={() => setTimeout(() => handleEditStage(stage), 10)}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                        Edit Stage
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteStage(stage.id)}
                        className="text-xs font-semibold text-rose-600 dark:text-rose-400 cursor-pointer"
                        disabled={isDeleting === stage.id}
                      >
                        <Trash className="h-3.5 w-3.5 mr-2 text-rose-500" />
                        {isDeleting === stage.id ? "Deleting..." : "Delete Stage"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {stage.assignedTeam && (
                  <div className="flex-shrink-0 mb-2">
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 inline-block">
                      <span className="text-indigo-600 dark:text-indigo-400">Team:</span> {stage.assignedTeam}
                    </p>
                  </div>
                )}

                {/* Droppable Task List Container with Independent Vertical Scroll */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex-1 min-h-[160px] overflow-y-auto custom-scrollbar space-y-2.5 transition-colors rounded-xl p-1 pr-1.5",
                        snapshot.isDraggingOver &&
                          "bg-indigo-50/50 dark:bg-indigo-950/20 border border-dashed border-indigo-300 dark:border-indigo-800"
                      )}
                    >
                      {displayedTasks.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                snapshot.isDragging && "rotate-1 scale-102"
                              )}
                            >
                              <TaskCard
                                task={task}
                                onClick={() => onTaskClick(task)}
                                isComplete={isTaskComplete(task)}
                                onComplete={() => handleCompleteTask(task.id)}
                                showCompleteButton={
                                  !isTaskComplete(task) &&
                                  !!getNextStageId(task.stageId)
                                }
                                isCompleting={isCompleting === task.id}
                                stages={stages}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Column Footer */}
                <div className="flex-shrink-0 pt-2 space-y-2">
                  {stageTasks.length > 10 && (
                    <button
                      type="button"
                      onClick={() => toggleStageExpand(stage.id)}
                      className="w-full py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1"
                    >
                      {isExpanded
                        ? `Collapse to 10 records`
                        : `+${stageTasks.length - 10} more records (Click count to view)`}
                    </button>
                  )}

                  {/* Add Record Button */}
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-8 text-xs font-bold rounded-xl border w-full transition-all flex items-center justify-center gap-1",
                      colorStyles.button
                    )}
                    onClick={() => onCreateTask(stage.id)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Record
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Add New Stage Column */}
          <div className="w-80 flex-shrink-0">
            <Button
              variant="outline"
              className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/40 dark:bg-slate-900/40 text-xs font-bold transition-all flex items-center justify-center gap-2"
              onClick={onCreateStage}
            >
              <Plus className="h-5 w-5" />
              Add Stage Column
            </Button>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}