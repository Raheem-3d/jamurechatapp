"use client";

import { useState, useEffect, useRef } from "react";
import type { Task, Comment, Stage, User, Tag } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  X,
  Calendar,
  UserIcon,
  MessageSquare,
  Paperclip,
  Send,
  Edit,
  ChevronDown,
  Users,
  CalendarIcon,
  TagIcon,
  CheckCircle,
  Clock,
  ArrowRight,
  Zap,
  LayoutGrid,
  Loader2,
  Sparkles,
  ListChecks,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { DescriptionGenerator } from "@/components/description-generator";
import { useSocket } from "@/hooks/use-socket";
import RealTimeMessages from "./real-time-messages";
import MessageInput from "./message-input";
import { ActivityLog } from "./ActivityLog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format, set } from "date-fns";
import { RangeCalendarPicker } from "./ui/RangeCalendar";
import { cn } from "@/lib/utils";

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<boolean>;
  isComplete?: boolean;
  stages: Stage[];
  user: User;
  tags: Tag[];
  taskId: string;
}

export function TaskDetail({
  task,
  onClose,
  onUpdateTask,
  stages = [],
  isComplete = false,
  user,
  taskId,
  tags,
}: TaskDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<any>({
    ...task,
    // Initialize date range from start/end if present, else fall back to dueDate
    dueDate:
      (task as any)?.startDate ||
        (task as any)?.endDate ||
        (task as any)?.dueDate
        ? {
          startDate: (task as any)?.startDate
            ? new Date((task as any).startDate as any)
            : (task as any)?.dueDate
              ? new Date((task as any).dueDate as any)
              : null,
          endDate: (task as any)?.endDate
            ? new Date((task as any).endDate as any)
            : (task as any)?.dueDate
              ? new Date((task as any).dueDate as any)
              : null,
        }
        : null,
  });

  const [movingToNextTab, setMovingToNextTab] = useState(false);
  const [clientChannelId, setClientChannelId] = useState<string | null>(null);
  const [adminChannelId, setAdminChannelId] = useState<string | null>(null);
  const [clientMessages, setClientMessages] = useState<Comment[]>([]);
  const [adminMessages, setAdminMessages] = useState<Comment[]>([]);
  const [clientLoading, setClientLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const { onlineUsers } = useSocket();
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [isEditingField, setIsEditingField] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [checkedSubtasks, setCheckedSubtasks] = useState<Record<number, boolean>>({});
  const [creatingSubtask, setCreatingSubtask] = useState<Record<number, boolean>>({});
  const [createdSubtasks, setCreatedSubtasks] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch("/api/organization/me");
        if (!res.ok) return;
        const payload = await res.json();
        if (payload?.organization?.aiEnabled !== undefined) {
          setAiEnabled(payload.organization.aiEnabled);
        }
      } catch (err) {
        console.error("Failed to fetch organization setting for AI in TaskDetail:", err);
      }
    };
    fetchOrg();
  }, []);
  const [activePanel, setActivePanel] = useState<"admin" | "client">("admin");
  const [hasUnreadClientMessages, setHasUnreadClientMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const handleAddCustomTag = () => {
    const name = newTagName.trim();
    if (!name) return;
    const current = Array.isArray(editedTask.tags) ? [...editedTask.tags] : [];
    const exists = current.some(
      (t: any) => (t.name || "").toLowerCase() === name.toLowerCase(),
    );
    if (!exists) {
      const tempTag = { id: undefined as any, name } as any;
      setEditedTask({
        ...editedTask,
        tags: [...current, tempTag],
      });
      setNewTagName("");
      toast.success(`Tag "${name}" added`);
    }
  };

  // Refs for auto-scrolling
  const clientMessagesRef = useRef<HTMLDivElement>(null);
  const adminMessagesRef = useRef<HTMLDivElement>(null);

  // console.log(user, 'userssssss');

  // Auto-scroll to bottom function
  const scrollToBottom = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const addActivity = (type: string, description: string, taskId?: string) => {
    const activity = {
      id: Date.now().toString(),
      type,
      description,
      user: session?.user || { name: "Unknown User", id: "unknown" },
      taskId,
      timestamp: new Date(),
    };
    setActivityLog((prev) => [activity, ...prev]);
    router.refresh();
  };

  const handleSave = async (overrides?: Partial<any>) => {
    // Merge overrides with editedTask to avoid stale state issues (e.g., date picker)
    const effective: any = { ...(editedTask as any), ...(overrides || {}) };
    // Normalize assignees to array of { userId }
    const assigneesPayload: Array<{ userId: string }> = Array.isArray(
      (effective as any)?.assignees,
    )
      ? (effective as any).assignees
        .map((a: any) => a?.userId || a?.id || a?.value || a)
        .filter(Boolean)
        .map((userId: string) => ({ userId }))
      : [];

    // Normalize tags to objects with id or name (server will upsert by name if id missing)
    const tagObjects: Array<{ id?: string; name?: string }> = Array.isArray(
      (effective as any)?.tags,
    )
      ? ((effective as any).tags
        .map((t: any) =>
          t?.id ? { id: t.id } : t?.name ? { name: String(t.name) } : null,
        )
        .filter(Boolean) as Array<{ id?: string; name?: string }>)
      : [];

    // Normalize dates to ISO strings; use both start and end
    const startDateIso = (effective as any)?.dueDate?.startDate
      ? new Date((effective as any).dueDate.startDate).toISOString()
      : null;
    const endDateIso = (effective as any)?.dueDate?.endDate
      ? new Date((effective as any).dueDate.endDate).toISOString()
      : null;

    const updates: any = {
      id: effective.id,
      title: effective.title,
      description: effective.description,
      priority: effective.priority,
      status: effective.status,
      stageId: effective.stageId,
      dueDate: endDateIso,
      startDate: startDateIso,
      endDate: endDateIso,
      tags: tagObjects,
      assignees: assigneesPayload,
    };

    console.log("Normalized update payload:", updates);

    try {
      setIsSaving(true);
      const response = await fetch(`/api/tasks/${taskId}/taskrecord`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error || "Failed to update task");
      }

      const updatedTaskData = await response.json();
      console.log("API Response:", updatedTaskData);
      const updatedTask = updatedTaskData.task;

      // Update local editing state to reflect persisted values
      setEditedTask(
        (prev: any) =>
          ({
            ...prev,
            ...updatedTask,
            // Rebuild local date range from server response for accuracy
            dueDate:
              (updatedTask as any)?.startDate ||
                (updatedTask as any)?.endDate ||
                (updatedTask as any)?.dueDate
                ? {
                  startDate: (updatedTask as any)?.startDate
                    ? new Date((updatedTask as any).startDate)
                    : (updatedTask as any)?.dueDate
                      ? new Date((updatedTask as any).dueDate)
                      : null,
                  endDate: (updatedTask as any)?.endDate
                    ? new Date((updatedTask as any).endDate)
                    : (updatedTask as any)?.dueDate
                      ? new Date((updatedTask as any).dueDate)
                      : null,
                }
                : null,
            // Use server tags when available, else keep what we attempted
            tags: Array.isArray((updatedTask as any)?.tags)
              ? (updatedTask as any).tags
              : tagObjects,
          }) as any,
      );

      // Notify parent so list views refresh; pass server's updatedTask containing post-automation changes (e.g. stage change)
      if (onUpdateTask) {
        await onUpdateTask(task.id, updatedTask, { skipServerCall: true } as any);
      }

      addActivity(
        "task_updated",
        `Task "${updatedTask.title}" was updated`,
        taskId,
      );

      setIsEditing(false);
      setIsEditingField(null);
      toast.success("Task updated successfully!");

      return true;
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveToNextStage = async () => {
    try {
      setMovingToNextTab(true);
      const currentStage = stages.find((s) => s.id === task.stageId);

      if (!currentStage) {
        toast.error("Current stage not found");
        return;
      }

      if (currentStage.id) {
        const success = await onUpdateTask(editedTask.id, {
          stageId: currentStage.id,
          status: "completed",
        });

        if (success) {
          toast.success("Task moved to next stage");
          setEditedTask((prev: any) => ({
            ...prev,
            stageId: currentStage.id,
          }));

          router.refresh();
          onClose();
        } else {
          toast.error("Failed to move task");
        }
      } else if (currentStage.isCompleted) {
        toast.success("Task is already completed");
      } else {
        toast.error("No next stage available");
      }
    } catch (error) {
      console.error("Error moving task:", error);
      toast.error("Failed to move task");
    } finally {
      setMovingToNextTab(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-50 text-red-700 border-red-200 shadow-red-100";
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-200 shadow-orange-100";
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 shadow-yellow-100";
      case "low":
        return "bg-green-50 text-green-700 border-green-200 shadow-green-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 shadow-gray-100";
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "Bug":
        return "bg-red-50 text-red-700 border-red-200";
      case "Feature":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Urgent":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "Enhancement":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const fetchClientChannel = async () => {
    try {
      setClientLoading(true);
      const res = await fetch(`/api/tasks/${task.id}/taskChannel`);
      if (!res.ok) throw new Error("Failed to fetch channels");
      const data = await res.json();

      const clientChannel = data?.recentChannelsForClient?.find(
        (channel: any) => channel.name.toLowerCase().includes("client"),
      );
      // console.log(clientChannel, "clientChannel");
      if (clientChannel) {
        setClientChannelId(clientChannel.id);
        await fetchClientMessages(clientChannel.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching client channel:", error);
      toast.error("Failed to load client channel");
      return false;
    } finally {
      setClientLoading(false);
    }
  };

  const fetchAdminChannel = async () => {
    try {
      setAdminLoading(true);
      const res = await fetch(`/api/tasks/${task.id}/taskChannel`);
      if (!res.ok) throw new Error("Failed to fetch channels");
      const data = await res.json();
      // console.log(data, "dataaaaaaa");

      const adminChannel = data?.recentChannelsForClient?.find(
        (channel: any) => channel.taskReferenceId === taskId,
      );

      // console.log(adminChannel, "adminChannellllllllllllllllllll");
      if (adminChannel) {
        setAdminChannelId(adminChannel.id);
        await fetchAdminMessages(adminChannel.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching admin channel:", error);
      toast.error("Failed to load admin channel");
      return false;
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchClientMessages = async (channelId: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setClientMessages(data);
      setTimeout(() => scrollToBottom(clientMessagesRef), 100);
    } catch (error) {
      console.error("Error fetching client messages:", error);
      toast.error("Failed to load client messages");
    }
  };

  const fetchAdminMessages = async (channelId: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setAdminMessages(data);
      setTimeout(() => scrollToBottom(adminMessagesRef), 100);
    } catch (error) {
      console.error("Error fetching admin messages:", error);
      toast.error("Failed to load admin messages");
    }
  };

  const handleNewClientMessage = (newMessage: Comment) => {
    setClientMessages((prev) => [...prev, newMessage]);
    setTimeout(() => scrollToBottom(clientMessagesRef), 100);
    // Auto-switch to client panel if a message arrives and we're on admin panel
    if (activePanel === "admin") {
      setHasUnreadClientMessages(true);
      setActivePanel("client");
    }
  };

  const handleNewAdminMessage = (newMessage: Comment) => {
    setAdminMessages((prev) => [...prev, newMessage]);
    setTimeout(() => scrollToBottom(adminMessagesRef), 100);
  };

  function formatDate(date: Date, formatStr: string) {
    return format(date, formatStr);
  }

  const fetchStages = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/record`);
      const data = await response.json();
      setActivityLog(data.activities || []);
    } catch (error) {
      console.error("Error fetching stages:", error);
    }
  };

  // Auto-load both channels on component mount
  useEffect(() => {
    const loadChannels = async () => {
      // Load both channels simultaneously
      const promises = [];

      if ((task as any).clientChannelId) {
        setClientChannelId((task as any).clientChannelId);
        promises.push(fetchClientMessages((task as any).clientChannelId));
      } else {
        promises.push(fetchClientChannel());
      }

      if ((task as any).adminChannelId) {
        setAdminChannelId((task as any).adminChannelId);
        promises.push(fetchAdminMessages((task as any).adminChannelId));
      } else {
        promises.push(fetchAdminChannel());
      }

      await Promise.allSettled(promises);
    };

    loadChannels();
    fetchStages();
  }, [(task as any).clientChannelId, (task as any).adminChannelId]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (clientMessages.length > 0) {
      setTimeout(() => scrollToBottom(clientMessagesRef), 100);
    }
  }, [clientMessages]);

  useEffect(() => {
    if (adminMessages.length > 0) {
      setTimeout(() => scrollToBottom(adminMessagesRef), 100);
    }
  }, [adminMessages]);

  const EditableField = ({
    label,
    fieldName,
    children,
    className = "",
  }: {
    label: string;
    fieldName: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={`group ${className}`}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      <div
        className="cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:border-blue-200 rounded-lg p-3 border border-transparent group-hover:shadow-sm"
        onClick={() => setIsEditingField(fieldName)}
      >
        {children}
      </div>
    </div>
  );

  const usersList: User[] = Array.isArray(user) ? user : [user];

  const selectedIds = (editedTask.assignees || []).map(
    (a: { userId: string }) => a.userId,
  );

  const handleSearchUser = async (query: string) => {
    setSearchQuery(query);

    const SearchUser = usersList.filter((u) =>
      u.name.toLowerCase().includes(query.toLowerCase()),
    );

    setFilteredUsers(SearchUser);
    // return SearchUser;
  };

  const handleAssigneeChange = (userId: string) => {
    const current = editedTask.assignees || [];

    const exists = current.some((a: { userId: string }) => a.userId === userId);

    const next = exists
      ? current.filter((a: { userId: string }) => a.userId !== userId)
      : [...current, { userId, taskId, recordId: editedTask.id }];

    setEditedTask({ ...editedTask, assignees: next });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-2xl h-[90vh] max-h-[850px] w-[95vw] max-w-6xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Task Details
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage and track task progress
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowActivityLog(true)}
              className="h-8 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 flex items-center gap-1.5"
            >
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              <span>Activity Log</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Task Info Sidebar */}
          <div className="w-full lg:w-[400px] shrink-0 p-5 overflow-y-auto border-r border-slate-200/80 dark:border-slate-800 space-y-5 bg-slate-50/40 dark:bg-slate-950/20">
            <div className="space-y-6">
              {/** Normalize user prop to array for TS safety */}
              {(() => {
                return null;
              })()}
              {/** Helper list for user operations */}
              {/** Using immediate constant below in scope */}
              {/* eslint-disable-next-line */}
              {false && <div />}
              {/* Title Card */}
              <div className="space-y-1 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Record Title
                </label>
                <Input
                  value={editedTask.title}
                  onChange={(e) =>
                    setEditedTask({ ...editedTask, title: e.target.value })
                  }
                  placeholder="Task Title..."
                  className="text-lg font-extrabold border-none shadow-none focus-visible:ring-1 focus-visible:ring-indigo-500 p-0 h-auto text-slate-900 dark:text-white"
                />
              </div>

              {/* Description Card */}
              <div className="space-y-1 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Description
                  </label>
                  {aiEnabled && (
                    <DescriptionGenerator
                      title={editedTask.title || ""}
                      onGenerate={(desc) =>
                        setEditedTask({
                          ...editedTask,
                          description: desc,
                        })
                      }
                      type="task"
                    />
                  )}
                </div>
                <Textarea
                  value={editedTask.description || ""}
                  onChange={(e) =>
                    setEditedTask({
                      ...editedTask,
                      description: e.target.value,
                    })
                  }
                  placeholder="Click to add description details..."
                  rows={3}
                  className="text-xs text-slate-700 dark:text-slate-300 border-none shadow-none focus-visible:ring-1 focus-visible:ring-indigo-500 p-0 resize-none bg-transparent"
                />
              </div>

              {/* AI Smart Task Breakdown */}
              {aiEnabled && (
                <div className="space-y-2 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-indigo-100/60 dark:border-indigo-800/30 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ListChecks className="h-3.5 w-3.5 text-indigo-500" />
                      <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        AI Task Breakdown
                      </label>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={breakdownLoading}
                      onClick={async () => {
                        setBreakdownLoading(true);
                        setSubtasks([]);
                        setCheckedSubtasks({});
                        setCreatedSubtasks({});
                        try {
                          const res = await fetch("/api/ai/task-breakdown", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              taskId: task.id,
                              title: editedTask.title,
                              description: editedTask.description || "",
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "Failed");
                          const arr = data.subtasks || data.breakdown || [];
                          setSubtasks(Array.isArray(arr) ? arr : []);
                        } catch (e: any) {
                          toast.error(e.message || "AI breakdown failed");
                        } finally {
                          setBreakdownLoading(false);
                        }
                      }}
                      className="h-6 text-[10px] px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg gap-1"
                    >
                      {breakdownLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {subtasks.length > 0 ? "Re-analyze" : "Breakdown"}
                    </Button>
                  </div>

                  {breakdownLoading && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 py-2">
                      <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                      <span>AI is breaking down the task...</span>
                    </div>
                  )}

                  {subtasks.length > 0 && !breakdownLoading && (
                    <div className="space-y-1.5">
                      {subtasks.map((st, idx) => (
                        <div key={idx} className="flex items-center gap-2 group">
                          <input
                            type="checkbox"
                            checked={checkedSubtasks[idx] || false}
                            onChange={(e) => setCheckedSubtasks(prev => ({ ...prev, [idx]: e.target.checked }))}
                            className="h-3.5 w-3.5 rounded accent-indigo-600 shrink-0"
                          />
                          <span className={cn(
                            "text-xs flex-1 leading-snug",
                            checkedSubtasks[idx] ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"
                          )}>{st}</span>
                          {!createdSubtasks[idx] ? (
                            <button
                              type="button"
                              disabled={creatingSubtask[idx]}
                              onClick={async () => {
                                setCreatingSubtask(prev => ({ ...prev, [idx]: true }));
                                try {
                                  const res = await fetch("/api/tasks", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      title: st,
                                      description: `Subtask of: ${editedTask.title}`,
                                      priority: (editedTask.priority || "medium").toUpperCase(),
                                    }),
                                  });
                                  if (!res.ok) throw new Error("Failed to create task");
                                  setCreatedSubtasks(prev => ({ ...prev, [idx]: true }));
                                  toast.success(`Subtask created: "${st}"`);
                                } catch (e: any) {
                                  toast.error(e.message);
                                } finally {
                                  setCreatingSubtask(prev => ({ ...prev, [idx]: false }));
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0"
                              title="Create as task"
                            >
                              {creatingSubtask[idx] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                            </button>
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {subtasks.length === 0 && !breakdownLoading && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                      Click <strong>Breakdown</strong> to let AI split this task into actionable subtasks.
                    </p>
                  )}
                </div>
              )}

              {/* Properties Grid Card */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                  <span>Task Properties</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Record Status */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                      Status
                    </label>
                    <Select
                      value={editedTask.status || "in_progress"}
                      onValueChange={(val) => {
                        setEditedTask({ ...editedTask, status: val });
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="not_started">⚪ Not Started</SelectItem>
                        <SelectItem value="in_progress">🔵 In Progress</SelectItem>
                        <SelectItem value="rework">🟠 Re Work</SelectItem>
                        <SelectItem value="review">🟣 Under Review</SelectItem>
                        <SelectItem value="completed">🟢 Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stage Column */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <LayoutGrid className="h-3 w-3 text-indigo-500" />
                      Stage
                    </label>
                    <Select
                      value={editedTask.stageId}
                      onValueChange={(val) => {
                        setEditedTask({ ...editedTask, stageId: val });
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold">
                        <SelectValue placeholder="Stage" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Priority Pills */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    Priority Level
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: "low", label: "Low", style: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300" },
                      { id: "medium", label: "Med", style: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300" },
                      { id: "high", label: "High", style: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300" },
                      { id: "urgent", label: "Urgent", style: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300" },
                    ].map((p) => {
                      const isSelected = (editedTask.priority || "medium") === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setEditedTask({ ...editedTask, priority: p.id });
                          }}
                          className={cn(
                            "h-7 rounded-lg border text-[11px] font-extrabold transition-all cursor-pointer",
                            isSelected
                              ? `${p.style} ring-2 ring-indigo-500/30 shadow-2xs`
                              : "bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          )}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Due Date Range */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-indigo-500" />
                    Due Date
                  </label>
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
                    <RangeCalendarPicker
                      value={
                        (editedTask.dueDate || {}) as {
                          startDate?: Date | string;
                          endDate?: Date | string;
                        }
                      }
                      onChange={(value) => {
                        setEditedTask({ ...editedTask, dueDate: value });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Assignees Card */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-indigo-500" />
                    Assignees ({(editedTask.assignees || []).length})
                  </label>
                </div>

                {/* Selected Member Chips */}
                {(editedTask.assignees || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(editedTask.assignees || []).map((a: any) => {
                      const list = Array.isArray(user) ? (user as User[]) : [user as User];
                      const u = list.find((usr: User) => usr.id === a.userId);
                      return (
                        <span
                          key={a.userId}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl border border-indigo-200/80 dark:border-indigo-800"
                        >
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-extrabold">
                            {u?.name?.[0]?.toUpperCase() || "U"}
                          </span>
                          {u?.name || "Member"}
                          <button
                            type="button"
                            onClick={() => handleAssigneeChange(a.userId)}
                            className="ml-1 text-indigo-400 hover:text-rose-600 transition-colors"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Member Selector Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs font-bold border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                    >
                      + Add / Remove Members
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-2">
                    <Input
                      placeholder="Search member..."
                      value={searchQuery}
                      onChange={(e) => handleSearchUser(e.target.value)}
                      className="h-8 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {(searchQuery ? filteredUsers : usersList).map((u) => {
                        const isSelected = selectedIds.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => handleAssigneeChange(u.id)}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer font-medium transition-colors",
                              isSelected
                                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            )}
                          >
                            <span>{u.name}</span>
                            {isSelected && <CheckCircle className="h-3.5 w-3.5 text-indigo-600" />}
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Tags Card */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                <label className="text-[11px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TagIcon className="h-3.5 w-3.5 text-indigo-500" />
                  Tags
                </label>

                {/* Existing Tag Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {tags
                    .filter((tag) => {
                      const tagKey = tag.id || tag.tagId || tag.name;
                      const tagName = tag.name || tagKey;
                      return (editedTask.tags || []).some((t: any) => {
                        if (!t) return false;
                        const tKey = typeof t === "string" ? t : t.id || t.tagId || t.name;
                        const tName = typeof t === "string" ? t : t.name || tKey;
                        return (
                          (tag.id && t.id && t.id === tag.id) ||
                          (tagKey && tKey && tKey === tagKey) ||
                          (tagName && tName && tName.toLowerCase() === tagName.toLowerCase())
                        );
                      });
                    })
                    .map((tag) => {
                      const tagKey = tag.id || tag.tagId || tag.name;
                      const tagName = tag.name || tagKey;

                      return (
                        <Badge
                          key={tagKey}
                          onClick={() => {
                            const current = Array.isArray(editedTask.tags)
                              ? [...editedTask.tags]
                              : [];
                            const next = current.filter((t: any) => {
                              if (!t) return false;
                              const tKey = typeof t === "string" ? t : t.id || t.tagId || t.name;
                              const tName = typeof t === "string" ? t : t.name || tKey;
                              return (
                                tKey !== tagKey &&
                                tName.toLowerCase() !== tagName.toLowerCase() &&
                                (!tag.id || t.id !== tag.id)
                              );
                            });
                            setEditedTask({ ...editedTask, tags: next });
                          }}
                          className="cursor-pointer select-none border text-xs px-2.5 py-1 rounded-xl font-bold bg-indigo-600 text-white border-indigo-600 shadow-2xs hover:bg-rose-600 hover:border-rose-600 transition-all flex items-center gap-1"
                        >
                          <span>{tagName}</span>
                          <span className="text-[10px] font-bold">✕</span>
                        </Badge>
                      );
                    })}
                </div>

                {/* Select Existing Tag Selector */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs font-bold border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center justify-between"
                      >
                        <span>Select Existing Tag</span>
                        <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-2">
                      <Input
                        placeholder="Search existing tags..."
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        className="h-8 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      />
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {tags.length === 0 ? (
                          <p className="text-xs text-slate-400 italic p-2 text-center">No existing tags</p>
                        ) : (
                          tags
                            .filter((t) => (t.name || "").toLowerCase().includes(newTagName.toLowerCase()))
                            .map((tag) => {
                              const tagKey = tag.id || tag.tagId || tag.name;
                              const tagName = tag.name || tagKey;
                              const isSelected = (editedTask.tags || []).some((t: any) => {
                                if (!t) return false;
                                const tKey = typeof t === "string" ? t : t.id || t.tagId || t.name;
                                const tName = typeof t === "string" ? t : t.name || tKey;
                                return (
                                  (tag.id && t.id && t.id === tag.id) ||
                                  (tagKey && tKey && tKey === tagKey) ||
                                  (tagName && tName && tName.toLowerCase() === tagName.toLowerCase())
                                );
                              });

                              return (
                                <div
                                  key={tagKey}
                                  onClick={() => {
                                    const current = Array.isArray(editedTask.tags) ? [...editedTask.tags] : [];
                                    let next;
                                    if (isSelected) {
                                      next = current.filter((t: any) => {
                                        if (!t) return false;
                                        const tKey = typeof t === "string" ? t : t.id || t.tagId || t.name;
                                        const tName = typeof t === "string" ? t : t.name || tKey;
                                        return (
                                          tKey !== tagKey &&
                                          tName.toLowerCase() !== tagName.toLowerCase() &&
                                          (!tag.id || t.id !== tag.id)
                                        );
                                      });
                                    } else {
                                      next = [...current, tag];
                                    }
                                    setEditedTask({ ...editedTask, tags: next });
                                  }}
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer font-medium transition-colors",
                                    isSelected
                                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold"
                                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  )}
                                >
                                  <span>{tagName}</span>
                                  {isSelected && <CheckCircle className="h-3.5 w-3.5 text-indigo-600" />}
                                </div>
                              );
                            })
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Explicit Save Changes Action Button */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={isSaving}
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Attachments */}
            {editedTask?.attachments?.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
                  <Paperclip className="h-4 w-4" />
                  Attachments ({editedTask.attachments.length})
                </h4>
                <div className="space-y-2">
                  {editedTask.attachments.map((attachment: any) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-medium">
                        {attachment.name}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat Panel - Toggleable */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800">
            {/* Toggle Button Bar */}
            <div className="flex items-center gap-2 p-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
              <Button
                variant={activePanel === "admin" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActivePanel("admin");
                  setHasUnreadClientMessages(false);
                }}
                className={`flex-1 h-8 rounded-xl text-xs font-bold transition-all ${activePanel === "admin"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
              >
                Internal Discussion
              </Button>
              <Button
                variant={activePanel === "client" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActivePanel("client");
                  setHasUnreadClientMessages(false);
                }}
                className={`flex-1 relative h-8 rounded-xl text-xs font-bold transition-all ${activePanel === "client"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
              >
                Discuss about Project
                {hasUnreadClientMessages && activePanel === "admin" && (
                  <span className="absolute top-1 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                )}
              </Button>
            </div>

            {/* Admin Chat Panel */}
            {activePanel === "admin" && (
              <>
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Internal discussion
                      </h3>
                      <p className="text-xs text-gray-600">
                        Internal discussion
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {adminLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">
                          Loading admin chat...
                        </p>
                      </div>
                    </div>
                  ) : adminChannelId ? (
                    <>
                      <div
                        ref={adminMessagesRef}
                        className="flex-1 overflow-y-auto p-4 scroll-smooth"
                        style={{ scrollBehavior: "smooth" }}
                      >
                        <RealTimeMessages
                          initialMessages={adminMessages as any}
                          channelId={adminChannelId}
                        />
                      </div>
                      <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <MessageInput
                          channelId={adminChannelId}
                          onMessageSent={() => {
                            if (adminChannelId)
                              fetchAdminMessages(adminChannelId);
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center p-6">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 mb-3">
                          No admin channel available
                        </p>
                        <Button
                          variant="outline"
                          onClick={fetchAdminChannel}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          Try to Load Channel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Client Chat Panel */}
            {activePanel === "client" && (
              <>
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Discuss about the project
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {clientLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">
                          Loading client chat...
                        </p>
                      </div>
                    </div>
                  ) : clientChannelId ? (
                    <>
                      <div
                        ref={clientMessagesRef}
                        className="flex-1 overflow-y-auto p-4 scroll-smooth"
                        style={{ scrollBehavior: "smooth" }}
                      >
                        <RealTimeMessages
                          initialMessages={clientMessages as any}
                          channelId={clientChannelId}
                        />
                      </div>
                      <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <MessageInput
                          channelId={clientChannelId}
                          onMessageSent={() => {
                            if (clientChannelId)
                              fetchClientMessages(clientChannelId);
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center p-6">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 mb-3">
                          No client channel available
                        </p>
                        <Button
                          variant="outline"
                          onClick={fetchClientChannel}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          Try to Load Channel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Activity Log Panel */}
          {/* Toggle Button */}



          {/* Side Panel */}
          <div
            className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${showActivityLog ? "translate-x-0" : "translate-x-full"
              }`}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Activity Log
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Recent task updates
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowActivityLog(false)}
                className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50/30 dark:bg-slate-950/20">
              <ActivityLog activities={activityLog} showHeader={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced utility components for better organization and reusability

// Priority Badge Component with enhanced styling
const PriorityBadge = ({
  priority,
  onClick,
  isEditing = false,
}: {
  priority: string;
  onClick: () => void;
  isEditing?: boolean;
}) => {
  const priorityConfig = {
    urgent: {
      emoji: "🔴",
      color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
      label: "Urgent",
      pulse: "animate-pulse",
    },
    high: {
      emoji: "🟠",
      color:
        "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
      label: "High",
      pulse: "",
    },
    medium: {
      emoji: "🟡",
      color:
        "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
      label: "Medium",
      pulse: "",
    },
    low: {
      emoji: "🟢",
      color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
      label: "Low",
      pulse: "",
    },
  };

  const config = priorityConfig[priority as keyof typeof priorityConfig] || {
    emoji: "⚪",
    color: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
    label: priority,
    pulse: "",
  };

  return (
    <Badge
      className={`${config.color} ${config.pulse} cursor-pointer border hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm px-4 py-2 font-medium`}
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        {config.emoji}
        {config.label}
      </span>
    </Badge>
  );
};

// Enhanced Tag Component
const TagBadge = ({ tag, onClick }: { tag: Tag; onClick: () => void }) => {
  const tagConfig = {
    Bug: {
      color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
      emoji: "🐛",
    },
    Feature: {
      color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
      emoji: "✨",
    },
    Urgent: {
      color:
        "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
      emoji: "⚡",
    },
    Enhancement: {
      color:
        "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
      emoji: "🚀",
    },
  };

  const config = tagConfig[tag.name as keyof typeof tagConfig] || {
    color: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100",
    emoji: "🏷️",
  };

  return (
    <Badge
      className={`${config.color} border hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer`}
      onClick={onClick}
    >
      <span className="flex items-center gap-1">
        {config.emoji}
        {tag.name}
      </span>
    </Badge>
  );
};

// Status Indicator Component
const StatusIndicator = ({ status }: { status: string }) => {
  const statusConfig = {
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: <Clock className="h-3 w-3" />,
      label: "Pending",
    },
    "in-progress": {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: <ArrowRight className="h-3 w-3" />,
      label: "In Progress",
    },
    completed: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Completed",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: <Clock className="h-3 w-3" />,
    label: status,
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${config.color} shadow-sm`}
    >
      {config.icon}
      {config.label}
    </div>
  );
};

// Loading Spinner Component
const LoadingSpinner = ({
  size = "md",
  color = "blue",
}: {
  size?: "sm" | "md" | "lg";
  color?: "blue" | "green" | "purple" | "red";
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const colorClasses = {
    blue: "border-blue-200 border-t-blue-600",
    green: "border-green-200 border-t-green-600",
    purple: "border-purple-200 border-t-purple-600",
    red: "border-red-200 border-t-red-600",
  };

  return (
    <div
      className={`${sizeClasses[size]} border-4 ${colorClasses[color]} rounded-full animate-spin`}
    />
  );
};

// Empty State Component
const EmptyState = ({
  icon,
  title,
  description,
  actionButton,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
}) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center p-8 max-w-sm">
      <div className="mb-4 flex justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4 text-sm leading-relaxed">
        {description}
      </p>
      {actionButton}
    </div>
  </div>
);

// Date Formatter Helper
const formatDateRange = (startDate: Date, endDate: Date) => {
  const start = format(startDate, "MMM dd");
  const end = format(endDate, "MMM dd, yyyy");

  if (start === end) {
    return format(startDate, "MMM dd, yyyy");
  }

  return `${start} - ${end}`;
};

// Enhanced Input Component with better focus states
const EnhancedInput = ({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  className = "",
  autoFocus = false,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) => (
  <Input
    autoFocus={autoFocus}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    className={`border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 ${className}`}
  />
);

// Enhanced Textarea Component
const EnhancedTextarea = ({
  value,
  onChange,
  onBlur,
  rows = 4,
  placeholder,
  autoFocus = false,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  rows?: number;
  placeholder?: string;
  autoFocus?: boolean;
}) => (
  <Textarea
    autoFocus={autoFocus}
    value={value}
    onChange={onChange}
    onBlur={onBlur}
    rows={rows}
    placeholder={placeholder}
    className="border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none"
  />
);

// Animation keyframes for CSS (can be added to global styles)
const animationStyles = `
@keyframes slideInFromRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slideInFromRight 0.3s ease-out;
}

.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out;
}

.animate-scale-in {
  animation: scaleIn 0.3s ease-out;
}
`;

// Hook for auto-scroll functionality
const useAutoScroll = (
  messages: Comment[],
  containerRef: React.RefObject<HTMLDivElement>,
) => {
  useEffect(() => {
    if (messages.length > 0 && containerRef.current) {
      const container = containerRef.current;
      const isScrolledToBottom =
        container.scrollHeight - container.clientHeight <=
        container.scrollTop + 1;

      if (isScrolledToBottom || messages.length === 1) {
        setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }, 100);
      }
    }
  }, [messages, containerRef]);
};

// Chat notification system
const useChatNotifications = () => {
  const [unreadCounts, setUnreadCounts] = useState({
    client: 0,
    admin: 0,
  });

  const incrementUnread = (channel: "client" | "admin") => {
    setUnreadCounts((prev) => ({
      ...prev,
      [channel]: prev[channel] + 1,
    }));
  };

  const clearUnread = (channel: "client" | "admin") => {
    setUnreadCounts((prev) => ({
      ...prev,
      [channel]: 0,
    }));
  };

  return { unreadCounts, incrementUnread, clearUnread };
};

// Performance optimized message renderer
const OptimizedMessageList = ({
  messages,
  channelId,
}: {
  messages: Comment[];
  channelId: string;
}) => {
  const [visibleMessages, setVisibleMessages] = useState(messages.slice(-50)); // Show last 50 messages

  useEffect(() => {
    setVisibleMessages(messages.slice(-50));
  }, [messages]);

  return (
    <div className="space-y-3">
      {visibleMessages.map((message, index) => (
        <div key={message.id} className="animate-fade-in-up">
          <RealTimeMessages
            initialMessages={[message] as any}
            channelId={channelId}
          />
        </div>
      ))}
    </div>
  );
};

export default TaskDetail;
