"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Plus,
  Flame,
  ListChecks,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ActionItem {
  task: string;
  assignee?: string | null;
  deadline?: string | null;
  priority?: "high" | "medium" | "low";
}

interface AIActionExtractorProps {
  channelId: string;
  channelName: string;
  open: boolean;
  onClose: () => void;
}

const priorityConfig = {
  high: {
    label: "High",
    icon: Flame,
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-0",
  },
  medium: {
    label: "Medium",
    icon: AlertTriangle,
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-0",
  },
  low: {
    label: "Low",
    icon: CheckCircle,
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0",
  },
};

export default function AIActionExtractor({
  channelId,
  channelName,
  open,
  onClose,
}: AIActionExtractorProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesAnalyzed, setMessagesAnalyzed] = useState(0);
  const [creatingTask, setCreatingTask] = useState<Record<number, boolean>>({});
  const [createdTasks, setCreatedTasks] = useState<Record<number, boolean>>({});
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractItems = async () => {
    setLoading(true);
    setError(null);
    setFetched(false);
    setCreatedTasks({});

    try {
      const res = await fetch("/api/ai/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to extract action items");
      }

      const data = await res.json();
      setActionItems(data.actionItems || []);
      setMessagesAnalyzed(data.messagesAnalyzed || 0);
      setFetched(true);
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (item: ActionItem, index: number) => {
    setCreatingTask((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.task,
          description: `Auto-extracted from #${channelName} conversation via AI Action Extractor.\n${item.assignee ? `Suggested assignee: ${item.assignee}` : ""}\n${item.deadline ? `Suggested deadline: ${item.deadline}` : ""}`,
          priority: (item.priority || "medium").toUpperCase(),
          deadline: null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create task");
      }

      setCreatedTasks((prev) => ({ ...prev, [index]: true }));
      toast.success(`Task created: "${item.task}"`);
    } catch (e: any) {
      toast.error(e.message || "Could not create task");
    } finally {
      setCreatingTask((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      onClose();
      // Reset state on close
      setFetched(false);
      setActionItems([]);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <div className="h-7 w-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center">
                <ListChecks className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              AI Action Item Extractor
            </DialogTitle>
            <DialogDescription className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
              Analyzing{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                #{channelName}
              </span>{" "}
              — AI will identify tasks, assignees, and deadlines from recent conversation.
            </DialogDescription>
          </DialogHeader>

          {/* Info note */}
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 p-3 border border-indigo-100/60 dark:border-indigo-800/20">
            <Info className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              AI will scan the last 50 messages. Extracted items can be turned into real tasks with one click.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-4">
          {!fetched && !loading && (
            <Button
              onClick={extractItems}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl gap-2 shadow-md shadow-indigo-500/20"
            >
              <Sparkles className="h-4 w-4" />
              Extract Action Items
            </Button>
          )}

          {loading && (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Analyzing conversation...
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  AI is reading recent messages to identify tasks
                </p>
              </div>
            </div>
          )}

          {fetched && !loading && (
            <div className="space-y-4">
              {/* Stats bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{messagesAnalyzed} messages analyzed</span>
                  <span>·</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {actionItems.length} action items found
                  </span>
                </div>
                <button
                  onClick={extractItems}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-500 transition-colors font-semibold"
                >
                  <RefreshCw className="h-3 w-3" />
                  Re-scan
                </button>
              </div>

              {actionItems.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No action items found
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    The conversation doesn't seem to contain clear tasks or assignments.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {actionItems.map((item, index) => {
                    const priority = item.priority || "medium";
                    const pConfig = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
                    const isCreated = createdTasks[index];
                    const isCreating = creatingTask[index];

                    return (
                      <div
                        key={index}
                        className={cn(
                          "rounded-xl border p-3.5 transition-all duration-200",
                          isCreated
                            ? "border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/10"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800/60"
                        )}
                      >
                        {/* Task title row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              {isCreated ? (
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0 mt-0.5" />
                              )}
                              <p
                                className={cn(
                                  "text-[13px] font-semibold leading-snug",
                                  isCreated
                                    ? "text-emerald-700 dark:text-emerald-300 line-through"
                                    : "text-slate-800 dark:text-white"
                                )}
                              >
                                {item.task}
                              </p>
                            </div>

                            {/* Meta row */}
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 ml-6">
                              <Badge className={cn("text-[9px] px-1.5 py-0.5 font-bold", pConfig.badge)}>
                                {priority.charAt(0).toUpperCase() + priority.slice(1)}
                              </Badge>
                              {item.assignee && (
                                <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  <User className="h-3 w-3" />
                                  {item.assignee}
                                </span>
                              )}
                              {item.deadline && (
                                <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  <Clock className="h-3 w-3" />
                                  {item.deadline}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Create Task Button */}
                          {!isCreated ? (
                            <Button
                              size="sm"
                              onClick={() => createTask(item, index)}
                              disabled={isCreating}
                              className="h-7 text-[11px] px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shrink-0 gap-1"
                            >
                              {isCreating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Plus className="h-3 w-3" />
                              )}
                              Create
                            </Button>
                          ) : (
                            <Badge className="h-6 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0 font-bold shrink-0">
                              ✓ Created
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Create All button */}
              {actionItems.length > 1 && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    for (let i = 0; i < actionItems.length; i++) {
                      if (!createdTasks[i]) await createTask(actionItems[i], i);
                    }
                  }}
                  className="w-full h-9 rounded-xl text-xs font-semibold border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create All as Tasks
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
