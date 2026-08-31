"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
  CalendarIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  AlertTriangle,
  Zap,
  Users,
  Search,
  CheckSquare,
  Briefcase,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTeamUsers } from "@/hooks/use-team-users";

export interface QuickSubtaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentTaskId?: string;
  parentTaskTitle?: string;
  onSuccess?: (newSubtask?: any) => void;
}

export function QuickSubtaskModal({
  isOpen,
  onClose,
  parentTaskId: initialParentTaskId,
  parentTaskTitle: initialParentTaskTitle,
  onSuccess,
}: QuickSubtaskModalProps) {
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<string>(
    initialParentTaskId || "none"
  );
  const [parentTasksList, setParentTasksList] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [singleDate, setSingleDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [useRange, setUseRange] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { users, loading: isLoadingUsers } = useTeamUsers();

  useEffect(() => {
    if (initialParentTaskId) {
      setSelectedParentTaskId(initialParentTaskId);
    } else {
      setSelectedParentTaskId("none");
    }
  }, [initialParentTaskId, isOpen]);

  // Load existing ongoing projects if no parentTaskId is preset
  useEffect(() => {
    if (isOpen && !initialParentTaskId) {
      const fetchProjects = async () => {
        setIsLoadingProjects(true);
        try {
          const res = await fetch("/api/tasks");
          if (res.ok) {
            const data = await res.json();
            const activeProjects = (Array.isArray(data) ? data : []).filter(
              (p: any) => p.status !== "DONE"
            );
            setParentTasksList(activeProjects);
          }
        } catch (err) {
          console.error("Failed to load projects for subtask:", err);
        } finally {
          setIsLoadingProjects(false);
        }
      };
      fetchProjects();
    }
  }, [isOpen, initialParentTaskId]);

  const setQuickDatePreset = (daysFromToday: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    const dateStr = format(d, "yyyy-MM-dd");
    if (useRange) {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      setStartDate(todayStr);
      setEndDate(dateStr);
    } else {
      setSingleDate(dateStr);
    }
  };

  const resetForm = () => {
    setSelectedParentTaskId(initialParentTaskId || "none");
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
    setUseRange(false);
    setSelectedAssignees([]);
    setAssigneeSearch("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }

    const targetTaskId =
      initialParentTaskId ||
      (selectedParentTaskId && selectedParentTaskId !== "none"
        ? selectedParentTaskId
        : "");

    setIsSubmitting(true);
    try {
      let finalDeadline: string | null = null;
      let finalStartDate: string | null = null;
      let finalEndDate: string | null = null;

      if (useRange) {
        if (startDate) finalStartDate = startDate;
        if (endDate) {
          finalEndDate = endDate;
          finalDeadline = endDate;
        } else if (startDate) {
          finalDeadline = startDate;
        }
      } else if (singleDate) {
        finalDeadline = singleDate;
        finalStartDate = singleDate;
        finalEndDate = singleDate;
      }

      let res: Response;
      if (targetTaskId) {
        // Linked under parent project
        res = await fetch(`/api/tasks/${targetTaskId}/subtasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            priority,
            deadline: finalDeadline,
            startDate: finalStartDate,
            endDate: finalEndDate,
            assigneeIds: selectedAssignees,
          }),
        });
      } else {
        // Standalone quick task (no parent project required)
        res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            priority,
            deadline: finalDeadline,
            deadlineRange:
              useRange && finalStartDate
                ? {
                  from: finalStartDate,
                  to: finalEndDate || finalStartDate,
                }
                : null,
            assignees: selectedAssignees,
            isQuickTask: true,
          }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || errData.message || "Failed to create quick subtask"
        );
      }

      const result = await res.json();
      const createdItem = result.subtask || result;
      toast.success("Quick Subtask created successfully!", {
        description: targetTaskId
          ? `Added "${title}" under the existing project.`
          : `Created standalone quick subtask "${title}".`,
      });

      // Dispatch global events for instant UI sync
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("subtask:created", { detail: createdItem })
        );
        window.dispatchEvent(
          new CustomEvent("task:created", { detail: createdItem })
        );
      }

      onSuccess?.(createdItem);
      handleClose();
    } catch (err: any) {
      toast.error("Error", {
        description: err.message || "Failed to create quick task",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u: any) =>
    (u.name || "").toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {initialParentTaskId ? "Add Record to Project" : "Create Quick Task"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {initialParentTaskId
                  ? "Create an intermediate record linked to this project"
                  : "Create a simple standalone task without any project setup"}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Parent Project Selection (Optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
              Parent Project <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
            </Label>
            {initialParentTaskId ? (
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {initialParentTaskTitle || "Current Running Project"}
              </div>
            ) : (
              <Select
                value={selectedParentTaskId}
                onValueChange={setSelectedParentTaskId}
                disabled={isLoadingProjects}
              >
                <SelectTrigger className="h-9.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                  <SelectValue
                    placeholder={
                      isLoadingProjects
                        ? "Loading ongoing projects..."
                        : "None (Standalone Quick Task)"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-56">
                  <SelectItem value="none" className="text-xs font-semibold text-slate-500">
                    🚫 None (Standalone Quick Task)
                  </SelectItem>
                  {parentTasksList.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-xs font-medium">
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Subtask Title */}
          <div className="space-y-1.5">
            <Label htmlFor="subtask-title" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Task Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="subtask-title"
              placeholder="e.g., Fix urgent mobile checkout bug, review contract draft..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900"
              required
              autoFocus
            />
          </div>

          {/* Priority & Deadline Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Priority
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="LOW" className="text-xs font-medium text-emerald-600">
                    🟢 Low Priority
                  </SelectItem>
                  <SelectItem value="MEDIUM" className="text-xs font-medium text-amber-600">
                    🟡 Medium Priority
                  </SelectItem>
                  <SelectItem value="HIGH" className="text-xs font-medium text-orange-600">
                    🟠 High Priority
                  </SelectItem>
                  <SelectItem value="URGENT" className="text-xs font-medium text-rose-600">
                    🔴 Urgent Priority
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Deadline Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" />
                  {useRange ? "Date Range (Start & End)" : "Due Date / Deadline"}
                  <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setUseRange(!useRange)}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {useRange ? "Switch to Single Date" : "Switch to Date Range"}
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setQuickDatePreset(0)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDatePreset(1)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDatePreset(3)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDatePreset(7)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  +1 Week
                </button>
                {(singleDate || startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSingleDate("");
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="ml-auto text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-0.5"
                  >
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              {!useRange ? (
                <div>
                  <Input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="h-9.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Start Date</span>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">End / Due Date</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description (Optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="subtask-desc" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Description / Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="subtask-desc"
              placeholder="Brief details, requirements, or instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs font-medium rounded-xl min-h-[65px] bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* Assignees Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-500" />
                Assign Team Members
              </Label>
              <span className="text-[11px] font-semibold text-slate-400">
                {selectedAssignees.length} selected
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Filter members..."
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                className="h-8 pl-8 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2 max-h-36 overflow-y-auto space-y-1 bg-slate-50/50 dark:bg-slate-800/40">
              {isLoadingUsers ? (
                <div className="py-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading team...
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400">No members found</p>
              ) : (
                filteredUsers.map((user: any) => {
                  const isChecked = selectedAssignees.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedAssignees(selectedAssignees.filter((id) => id !== user.id));
                        } else {
                          setSelectedAssignees([...selectedAssignees, user.id]);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs select-none",
                        isChecked
                          ? "bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-6 w-6 shrink-0 ring-1 ring-slate-200 dark:ring-slate-700">
                          <AvatarImage src={user.image || ""} />
                          <AvatarFallback className="bg-indigo-600 text-white font-bold text-[9px]">
                            {(user.name || "U").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <span className="font-semibold">{user.name}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">({user.email})</span>
                        </div>
                      </div>

                      <div className={cn(
                        "h-4 w-4 rounded flex items-center justify-center border transition-colors",
                        isChecked
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-300 dark:border-slate-600"
                      )}>
                        {isChecked && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 px-5 gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {initialParentTaskId ? "Adding Record..." : "Creating Quick Task..."}
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  {initialParentTaskId ? "Add Record" : "Create Quick Task"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default QuickSubtaskModal;
