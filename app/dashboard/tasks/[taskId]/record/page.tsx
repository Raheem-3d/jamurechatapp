"use client";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { TaskBoard } from "@/components/TaskBoard";
import { TaskRecords } from "@/components/TaskRecords";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  TagIcon,
  Trash2,
  Settings,
  Loader2,
  Zap,
  Eye,
  Edit,
  Edit3,
  SignalHigh,
  ArrowLeft,
  Clock,
  X,
  CheckCircle,
} from "lucide-react";
import { useSocket } from "@/lib/socket-client";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ActivityLog } from "@/components/ActivityLog";
import { useRouter } from "next/navigation";
import { Switch } from "@radix-ui/react-switch";
import { TaskDetail } from "@/components/TaskDetail";
import { formatDate } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useTeamUsers } from "@/hooks/use-team-users";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Separator } from "@radix-ui/react-select";
import { RangeCalendarPicker } from "@/components/ui/RangeCalendar";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: "low" | "medium" | "high" | "urgent";
  assignees?: any;
  dueDate?: Date;
  tags: any[];
  stageId: string;
  createdAt: Date;
  updatedAt: Date;
  comments: any[];
  attachments: any[];
  createdBy: string;
  isComplete?: boolean; // Add this
  isCompleting?: boolean;
  completedAt?: Date; // Add this
}

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger:
    | "status_change"
    | "stage_change"
    | "priority_change"
    | "due_date_approaching"
    | "due_date_passed"
    | "task_created"
    | "task_assigned"
    | "tag_added"
    | "comment_added"
    | "file_uploaded"
    | "specific_task"
    | "time_based"
    | "completion_percentage"
    | "manual";
  conditions: Array<{
    field:
      | "from_status" // For status changes
      | "to_status" // For status changes
      | "from_stage" // For stage changes
      | "to_stage" // For stage changes
      | "to_priority" // For priority changes
      | "days_before" // For due date approaching
      | "status" // For task status
      | "stage" // For task stage
      | "assigned_to" // For assigned user
      | "has_tag" // For tags
      | "task_id" // For specific task
      | "frequency" // For time-based
      | "time" // For time-based
      | "day_of_week" // For time-based
      | "progress_threshold" // For completion percentage
      | "progress_condition"; // For completion percentage
    operator:
      | "equals"
      | "not_equals"
      | "contains"
      | "does_not_contain"
      | "greater_than"
      | "less_than"
      | "is_set"
      | "is_not_set";
    value: string;
  }>;
  actions: Array<{
    type:
      | "move_stage"
      | "status_change"
      | "assign_user"
      | "set_due_date"
      | "extend_due_date"
      | "set_priority"
      | "add_tag"
      | "remove_tag"
      | "send_notification"
      | "create_subtask"
      | "add_comment"
      | "archive_task";
    value: string;
    // Optional metadata for specific actions
    metadata?: {
      // For notifications
      channel?: "email" | "slack" | "teams" | "in_app" | "sms";
      // For comments
      comment?: string;
      // For subtasks
      subtask_title?: string;
      // For date extensions
      days?: number;
    };
  }>;
  enabled: boolean;
  applyToAll?: boolean;
  stopOnFirst?: boolean;
  projectId?: string; // For project-specific rules
  taskId?: string; // For task-specific rules
  stageId?: string; // For stage-specific rules
  createdAt?: Date;
  updatedAt?: Date;
  lastTriggered?: Date;
  createdBy?: string; // User ID who created the rule
}

interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  isCompleted: boolean;
  nextStageId?: string;
  assignedTeam?: string;
  tasks: Task[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

// Define all possible trigger types
const TRIGGER_TYPES = [
  "status_change",
  "stage_change",
  "priority_change",
  "due_date_approaching",
  "due_date_passed",
  "task_created",
  "task_assigned",
  "tag_added",
  "comment_added",
  "file_uploaded",
  "specific_task",
  "time_based",
  "completion_percentage",
] as const;

type TriggerType = (typeof TRIGGER_TYPES)[number];

// Define all possible action types
const ACTION_TYPES = [
  "move_stage",
  "assign_user",
  "set_due_date",
  "add_tag",
  "remove_tag",
  "send_notification",
  "change_status",
  "set_priority",
  "create_subtask",
  "archive_task",
] as const;

type ActionType = (typeof ACTION_TYPES)[number];

// Define the initial state with proper typing
const initialRuleState: Omit<AutomationRule, "id"> = {
  name: "",
  trigger: "status_change" as TriggerType,
  conditions: [
    {
      field: "status",
      operator: "equals" as const,
      value: "",
    },
  ],
  actions: [
    {
      type: "move_stage" as ActionType,
      value: "",
    },
  ],
  enabled: true,
  applyToAll: false,
  stopOnFirst: false,
};

export default function TaskManagement() {
  const { data: session } = useSession();
  const { socket, isConnected } = useSocket();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [view, setView] = useState<"board" | "records">("board");
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const taskId = params.taskId as string;
  const router = useRouter();
  const { users: teamUsers, loading: teamUsersLoading } = useTeamUsers();

  // State for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [dueDateFilter, setDueDateFilter] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // State for modals and forms
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateStageOpen, setIsCreateStageOpen] = useState(false);
  const [newTaskStageId, setNewTaskStageId] = useState("");
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [isEditStageOpen, setIsEditStageOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);

  const [dateRangeFilter, setDateRangeFilter] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);

  // Form states
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    stageId: "",
    assigneeId: [] as string[],
    dueDate: {
      startDate: "",
      endDate: "",
    },
    tags: [] as string[],
  });

  // State for assignee search
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");

  const [newStage, setNewStage] = useState({
    name: "",
    color: "bg-blue-100",
    assignedTeam: "",
  });

  const [newRule, setNewRule] =
    useState<Omit<AutomationRule, "id">>(initialRuleState);

  // Sync team users from hook
  useEffect(() => {
    if (teamUsers.length > 0) {
      setUsers(teamUsers);
    }
  }, [teamUsers]);

  // fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchTasks(),
          fetchStages(),
          // fetchTags(),
          fetchActivity(),
          fetchAutomationRules(taskId),
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Socket listeners for real-time updates design or
  useEffect(() => {
    if (!socket) return;

    const handleTaskCreated = (task: Task) => {
      // Avoid duplicates if we already optimistically added it or received it before
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === task.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = task; // update with server version
          return next;
        }
        return [...prev, task];
      });
      addActivity("task_created", `Task "${task.title}" was created`, task.id);
    };

    const handleTaskUpdated = (task: Task) => {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      addActivity("task_updated", `Task "${task.title}" was updated`, task.id);
    };

    const handleTaskMoved = (data: {
      taskId: string;
      newStageId: string;
      stageName: string;
    }) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === data.taskId ? { ...t, stageId: data.newStageId } : t,
        ),
      );
      addActivity(
        "stage_moved",
        `Task moved to ${data.stageName}`,
        data.taskId,
      );
    };

    const handleTaskDeleted = (taskId: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      addActivity("task_deleted", "Task was deleted", taskId);
    };

    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:moved", handleTaskMoved);
    socket.on("task:deleted", handleTaskDeleted);

    return () => {
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:moved", handleTaskMoved);
      socket.off("task:deleted", handleTaskDeleted);
    };
  }, [socket]);

  // API functions
  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/taskrecord`);

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setTasks(data.records || []);

      const allTags = data.records
        .flatMap((record: any) => record.tags || [])
        .filter(
          (tag: any, index: number, self: any[]) =>
            self.findIndex((t) => t.id === tag.id) === index,
        )
        .map((tag: any) => ({
          tagId: tag.id,
          name: tag.name,
          color: "bg-blue-100 text-blue-800",
        }));

      setTags(allTags);
      // console.log("All tags:", allTags);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to fetch tasks");
    }
  };

  const fetchStages = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/record`);
      const data = await response.json();
      setStages(data.stages);
      setActivityLog(data.activities || []);
      // console.log(data.activities, 'data.activities ')
    } catch (error) {
      console.error("Error fetching stages:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      // Use team users from the hook instead of fetching from /api/users
      setUsers(teamUsers);
    } catch (error) {
      console.error("Error setting users:", error);
      toast.error("Failed to set users");
    }
  };

  // const fetchTags = async () => {
  //   try {
  //     const response = await fetch(`/api/tasks/${taskId}/task-tags`);

  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }

  //     const data = await response.json();
  //     console.log("Raw tags data:", data);

  //     setTags(data.tags || []);

  //   } catch (error) {
  //     console.error("Error fetching tags:", error);
  //     setTags(getDefaultTags());
  //   }
  // };

  const fetchActivity = async () => {
    try {
      const response = await fetch("/api/task-activity");
      if (response.ok) {
        const data = await response.json();
        setActivityLog(data.activities || []);
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
  };

  const getDefaultTags = () => [
    { id: "Bug", name: "Bug", color: "bg-red-100 text-red-800" },
    { id: "Feature", name: "Feature", color: "bg-blue-100 text-blue-800" },
    { id: "Urgent", name: "Urgent", color: "bg-orange-100 text-orange-800" },
    {
      id: "Enhancement",
      name: "Enhancement",
      color: "bg-purple-100 text-purple-800",
    },
  ];

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
  };

  const createTask = async (taskData: any) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      id: tempId,
      title: taskData.title,
      description: taskData.description || "",
      stageId: taskData.stageId || stages[0]?.id,
      priority: taskData.priority || "medium",
      status: "in_progress",
      tags: taskData.tags || [],
      assigneeId: taskData.assigneeId || [],
      dueDate: taskData.dueDate?.endDate ? new Date(taskData.dueDate.endDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    // ⚡ Optimistic UI Update: Render task immediately on UI (0ms delay)
    setTasks((prev) => [...prev, optimisticTask]);

    try {
      const response = await fetch(`/api/tasks/${taskId}/taskrecord`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskData,
          createdBy: session?.user?.id,
          assigneeId: taskData.assigneeId || null,
          stageId: taskData.stageId || stages[0]?.id,
          priority: taskData.priority,
          status: "in_progress",
          isComplete: false,
          dueDate: taskData.dueDate?.endDate
            ? new Date(taskData.dueDate.endDate)
            : null,
          startDate: taskData.dueDate?.startDate
            ? new Date(taskData.dueDate.startDate)
            : null,
          endDate: taskData.dueDate?.endDate
            ? new Date(taskData.dueDate.endDate)
            : null,
          tags: taskData.tags,
        }),
      });

      if (response.ok) {
        const newTaskData = await response.json();
        // Replace temp task with confirmed server task
        setTasks((prev) =>
          prev.map((t) => (t.id === tempId ? newTaskData.task : t))
        );

        if (socket && isConnected) {
          socket.emit("task:create", newTaskData.task);
        }

        addActivity(
          "task_created",
          `Task "${taskData.title}" was created`,
          newTaskData.task.id,
        );
        toast.success("Task created successfully!");
        return true;
      } else {
        // Rollback on failure
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        throw new Error("Failed to create task");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      toast.error("Failed to create task");
      return false;
    }
  };

  const updateTask = async (
    taskid: string,
    updates: Partial<Task>,
    options?: { silent?: boolean }
  ) => {
    try {
      if (!taskid) {
        throw new Error("Task ID is required");
      }

      // ⚡ Optimistic UI Update: Instant local state update (0ms delay)
      setTasks((prev) =>
        prev.map((t) => (t.id === taskid ? { ...t, ...updates } : t))
      );

      // Send update to server
      const response = await fetch(`/api/tasks/${taskId}/taskrecord`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskid,
          ...updates,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      const updatedTask = await response.json();
      const newTaskState = updatedTask.task || updatedTask;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskid ? newTaskState : t))
      );

      if (!options?.silent) {
        toast.success("Task updated successfully");
      }

      addActivity(
        "task_updated",
        `Task "${newTaskState.title || "Record"}" was updated`,
        taskid
      );

      return true;
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error(error.message || "Failed to update task");
      return false;
    }
  };

  const moveTask = async (taskId: string, newStageId: string) => {
    try {
      const currentTask = tasks.find((t) => t.id === taskId);
      const newStage = stages.find((s) => s.id === newStageId);

      if (!currentTask || !newStage) {
        toast.error("Task or stage not found");
        return;
      }

      // 🛑 If already in the same stage, do not move or trigger notification
      if (currentTask.stageId === newStageId) {
        return;
      }

      const previousStageId = currentTask.stageId;

      // Optimistically update the UI
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === taskId ? { ...t, stageId: newStageId } : t,
        ),
      );

      // Send update to the server SILENTLY (prevents duplicate updateTask toast)
      const success = await updateTask(
        taskId,
        {
          stageId: newStageId,
          isComplete: false,
        },
        { silent: true }
      );

      if (success) {
        if (socket && isConnected) {
          socket.emit("task:move", {
            taskId,
            newStageId,
            stageName: newStage.name,
            task: tasks.find((t) => t.id === taskId),
          });
        }

        addActivity(
          "stage_moved",
          `Task "${currentTask.title}" moved to ${newStage.name}`,
          taskId,
        );

        toast.success(`Task moved to ${newStage.name}`);
      } else {
        // Rollback if update fails
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === taskId ? { ...t, stageId: previousStageId } : t,
          ),
        );
        toast.error("Failed to move task");
      }
    } catch (error) {
      console.error("Error moving task:", error);

      const originalTask = tasks.find((t) => t.id === taskId);
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === taskId && originalTask
            ? { ...t, stageId: originalTask.stageId }
            : t,
        ),
      );

      toast.error("Failed to move task");
    }
  };

  const reorderTask = (stageId: string, sourceIndex: number, destinationIndex: number) => {
    if (sourceIndex === destinationIndex) return;

    setTasks((prevTasks) => {
      const stageTasks = prevTasks.filter((t) => t.stageId === stageId);
      const otherTasks = prevTasks.filter((t) => t.stageId !== stageId);

      const [movedItem] = stageTasks.splice(sourceIndex, 1);
      if (!movedItem) return prevTasks;
      stageTasks.splice(destinationIndex, 0, movedItem);

      return [...otherTasks, ...stageTasks];
    });
  };

  const deleteTask = async (recordId: string) => {
    try {
      // Delete a record under the parent task using the correct endpoint
      const response = await fetch(
        `/api/tasks/${taskId}/taskrecord/${encodeURIComponent(recordId)}`,
        { method: "DELETE" },
      );

      if (response.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== recordId));

        if (socket && isConnected) {
          socket.emit("task:delete", recordId);
        }

        addActivity("task_deleted", "Task was deleted", recordId);
        toast.success("Task deleted successfully!");
        return true;
      } else {
        throw new Error("Failed to delete task");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
      return false;
    }
  };

  // Stage functions
  const createStage = async (
    name: string,
    color: string,
    assignedTeam?: string,
  ) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          color,
          assignedTeam,
          type: "Stage",
          order: stages.length + 1,
        }),
      });

      if (response.ok) {
        const newStageData = await response.json();
        setStages((prev) => [...prev, newStageData.stage]);
        toast.success("Stage created successfully!");
        router.refresh();
        return true;
      } else {
        throw new Error("Failed to create stage");
      }
    } catch (error) {
      console.error("Error creating stage:", error);
      toast.error("Failed to create stage");
      return false;
    }
  };

  const updateStage = async (stageId: string, updates: Partial<Stage>) => {
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/record?id=${stageId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );

      if (response.ok) {
        const updatedStage = await response.json();
        setStages((prev) =>
          prev.map((stage) =>
            stage.id === stageId ? updatedStage.stage : stage,
          ),
        );
        toast.success("Stage updated successfully!");
        router.refresh();
        return true;
      } else {
        throw new Error("Failed to update stage");
      }
    } catch (error) {
      console.error("Error updating stage:", error);
      toast.error("Failed to update stage");
      return false;
    }
  };

  const deleteStage = async (stageId: string) => {
    try {
      const response = await fetch(
        `/api/tasks/${taskId}/record?id=${stageId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setStages((prev) => prev.filter((stage) => stage.id !== stageId));
        toast.success("Stage deleted successfully!");
        router.refresh();
        return true;
      } else {
        throw new Error("Failed to delete stage");
      }
    } catch (error) {
      console.error("Error deleting stage:", error);
      toast.error("Failed to delete stage");
      return false;
    }
  };

  //  -------------------------------- // Automation functions------------------------

  const getTriggerDescription = (trigger: string, conditions: any[]) => {
    const triggerDescriptions: Record<string, string> = {
      status_change: "Status changes",
      stage_change: "Stage changes",
      priority_change: "Priority changes",
      due_date_approaching: "Due date approaching",
      due_date_passed: "Due date passed",
      task_created: "New task created",
      task_assigned: "Task assigned",
      tag_added: "Tag added",
      comment_added: "Comment added",
      file_uploaded: "File uploaded",
      specific_task: "Specific task selected",
      time_based: "Time-based schedule",
      completion_percentage: "Progress milestone",
    };

    let description = triggerDescriptions[trigger] || trigger;

    conditions.forEach((condition) => {
      if (!condition.value) return;

      switch (condition.field) {
        case "from_status":
          description += ` from ${condition.value.replace("_", " ")}`;
          break;
        case "to_status":
          description += ` to ${condition.value.replace("_", " ")}`;
          break;
        case "from_stage":
          description += ` from ${
            stages.find((s) => s.id === condition.value)?.name ||
            condition.value
          }`;
          break;
        case "to_stage":
          description += ` to ${
            stages.find((s) => s.id === condition.value)?.name ||
            condition.value
          }`;
          break;
        case "days_before":
          description += ` (${condition.value} days before)`;
          break;
        case "progress_threshold":
          description += ` at ${condition.value}%`;
          break;
        case "frequency":
          description += ` (${condition.value})`;
          break;
        case "time":
          description += ` at ${condition.value}`;
          break;
        case "assigned_to":
          description += ` assigned to ${
            users.find((u) => u.id === condition.value)?.name || condition.value
          }`;
          break;
        case "has_tag":
          description += ` with tag ${
            tags.find((t) => t.id === condition.value)?.name || condition.value
          }`;
          break;
        case "to_priority":
          description += ` with priority ${condition.value}`;
          break;
      }
    });

    return description;
  };

  const getActionsDescription = (
    actions: any[],
    // Add stages parameter
    // Add tags parameter
  ) => {
    return actions
      .filter((a) => a.type && a.value)
      .map((action) => {
        const actionDescriptions: Record<string, string> = {
          move_stage: "Move to stage",
          change_status: "Change status to",
          assign_user: "Assign to",
          set_due_date: "Set due date to",
          extend_due_date: "Extend due date by",
          set_priority: "Set priority to",
          add_tag: "Add tag",
          remove_tag: "Remove tag",
          send_notification: "Send notification via",
          create_subtask: "Create subtask:",
          add_comment: "Add comment:",
          archive_task: "Archive task",
        };

        let actionDesc = actionDescriptions[action.type] || action.type;
        let valueDesc = action.value;

        // Format value based on action type
        switch (action.type) {
          case "move_stage":
            valueDesc =
              stages.find((s) => s.id === action.value)?.name || action.value;
            break;
          case "assign_user":
            valueDesc =
              users.find((u) => u.id === action.value)?.name || action.value;
            break;
          case "add_tag":
          case "remove_tag":
            valueDesc =
              tags.find((t) => t.id === action.value)?.name || action.value;
            break;
          case "change_status":
            valueDesc = action.value.replace("_", " ");
            break;
          case "extend_due_date":
            valueDesc = `${action.value} days`;
            break;
        }

        return `${actionDesc} ${valueDesc}`;
      })
      .join(", ");
  };

  const fetchAutomationRules = async (
    projectId: string,
  ): Promise<AutomationRule[]> => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/automation`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAutomationRules(data.rules || []);
      return data.rules || [];
    } catch (error) {
      console.error("Error fetching automation rules:", error);
      toast.error("Failed to load automation rules");
      return [];
    }
  };

  const createAutomationRule = async (
    rule: AutomationRule,
    projectId: string,
  ): Promise<AutomationRule> => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/automation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rule),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create rule");
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating automation rule:", error);
      throw error;
    }
  };
  const today = new Date();

  const matchesRuleConditions = async ({
    previousTask,
    currentTask,
    updates,
    rule,
  }: {
    previousTask?: Task;
    currentTask: Task;
    updates: Partial<Task>;
    rule: AutomationRule;
  }) => {
  

    // Normalize "Any" style values to undefined so condition is skipped
    const normalizeValue = (val: any) => {
      if (!val) return undefined;
      if (typeof val === "string" && val.toLowerCase().includes("any"))
        return undefined;
      return val;
    };

    // Helper to get condition value and normalize it
    const getCond = (field: string) =>
      normalizeValue(rule.conditions.find((c) => c.field === field)?.value);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Unified log helper
    const logCheck = (label: string, condition: boolean, details: any = {}) => {
      console.log(
        `[${label}] → ${condition ? "✅ MATCH" : "❌ NO MATCH"}`,
        details,
      );
      return condition;
    };

    switch (rule.trigger) {
      case "status_change": {
        const fromStatus = getCond("from_status");
        const toStatus = getCond("to_status");

        return logCheck(
          "status_change",
          previousTask?.status !== currentTask.status &&
            (!toStatus || currentTask.status === toStatus) &&
            (!fromStatus || previousTask?.status === fromStatus),
          {
            fromStatus,
            toStatus,
            prev: previousTask?.status,
            curr: currentTask.status,
          },
        );
      }

      case "stage_change": {
        const fromStage = getCond("from_stage");
        const toStage = getCond("to_stage");

        const prevStageId = previousTask?.stageId || previousTask?.stage?.id;

        return logCheck(
          "stage_change",
          prevStageId !== currentTask.stageId &&
            (!toStage || currentTask.stageId === toStage) &&
            (!fromStage || prevStageId === fromStage),
          { fromStage, toStage, prev: prevStageId, curr: currentTask.stageId },
        );
      }

      case "priority_change": {
        const toPriority = getCond("to_priority");

        return logCheck(
          "priority_change",
          previousTask?.priority !== currentTask.priority &&
            (!toPriority || currentTask.priority === toPriority),
          {
            toPriority,
            prev: previousTask?.priority,
            curr: currentTask.priority,
          },
        );
      }

      case "due_date_approaching": {
        if (!currentTask.dueDate)
          return logCheck("due_date_approaching", false, {
            reason: "No due date",
          });

        const daysBefore = parseInt(getCond("days_before") || "0");

        const targetDate = new Date(currentTask.dueDate);
        targetDate.setDate(targetDate.getDate() - daysBefore);
        targetDate.setHours(0, 0, 0, 0);

        const statusCond = getCond("status");

        return logCheck(
          "due_date_approaching",
          today.getTime() === targetDate.getTime() &&
            (!statusCond || currentTask.status === statusCond),
          { targetDate, today, statusCond },
        );
      }

      case "due_date_passed": {
        if (!currentTask.dueDate)
          return logCheck("due_date_passed", false, { reason: "No due date" });

        const dueDate = new Date(currentTask.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const priorityCond = getCond("priority");

        return logCheck(
          "due_date_passed",
          today > dueDate &&
            currentTask.status !== "completed" &&
            (!priorityCond || currentTask.priority === priorityCond),
          { dueDate, today, priorityCond, status: currentTask.status },
        );
      }

      case "task_created": {
        const stageCond = getCond("stage");

        return logCheck(
          "task_created",
          !previousTask && (!stageCond || currentTask.stageId === stageCond),
          { stageCond, curr: currentTask.stageId },
        );
      }

      case "task_assigned": {
        const assignedTo = getCond("assigned_to");

        return logCheck(
          "task_assigned",
          previousTask?.assignee !== currentTask.assignee &&
            currentTask.assignee &&
            (!assignedTo || currentTask.assignee === assignedTo),
          {
            assignedTo,
            prev: previousTask?.assignee,
            curr: currentTask.assignee,
          },
        );
      }

      case "tag_added": {
        const hasTag = getCond("has_tag");
        const addedTags =
          currentTask.tags?.filter(
            (tag) => !previousTask?.tags?.some((pt) => pt.id === tag.id),
          ) || [];

        return logCheck(
          "tag_added",
          addedTags.length > 0 &&
            (!hasTag || addedTags.some((tag) => tag.id === hasTag)),
          { hasTag, addedTags },
        );
      }

      case "specific_task": {
        const taskId = getCond("task_id");
        return logCheck("specific_task", currentTask.id === taskId, {
          taskId,
          curr: currentTask.id,
        });
      }

      case "time_based": {
        const now = new Date();
        const timeCondition = getCond("time");
        const frequency = getCond("frequency");

        if (timeCondition) {
          const [hours, minutes] = timeCondition.split(":");
          if (
            now.getHours() !== parseInt(hours) ||
            now.getMinutes() !== parseInt(minutes)
          ) {
            return logCheck("time_based", false, {
              reason: "Time not matched",
              expected: timeCondition,
              now,
            });
          }
        }

        let match = false;
        switch (frequency) {
          case "daily":
            match = true;
            break;
          case "weekly":
            match = now.getDay() === parseInt(getCond("day_of_week") || "0");
            break;
          case "monthly":
            match = now.getDate() === 1;
            break;
        }
        return logCheck("time_based", match, { frequency, now });
      }

      // case "completion_percentage": {
      //   const threshold = parseInt(getCond("progress_threshold") || "0");
      //   const condition = getCond("progress_condition");

      //   if (currentTask.progress == null) {
      //     return logCheck("completion_percentage", false, { reason: "No progress value" });
      //   }

      //   let match = false;
      //   switch (condition) {
      //     case "reaches":
      //       match =
      //         currentTask.progress >= threshold &&
      //         (previousTask?.progress || 0) < threshold;
      //       break;
      //     case "exceeds":
      //       match =
      //         currentTask.progress > threshold &&
      //         (previousTask?.progress || 0) <= threshold;
      //       break;
      //     case "falls_below":
      //       match =
      //         currentTask.progress < threshold &&
      //         (previousTask?.progress || 0) >= threshold;
      //       break;
      //   }
      //   return logCheck("completion_percentage", match, { threshold, condition, prev: previousTask?.progress, curr: currentTask.progress });
      // }

      default:
        return logCheck(
          "default_match",
          rule.conditions.every((condition) => {
            const fieldValue = currentTask[condition.field as keyof Task];
            const previousValue = previousTask?.[condition.field as keyof Task];
            const res = compareValues(
              fieldValue,
              condition.operator,
              normalizeValue(condition.value),
              previousValue,
            );
            console.log(`Condition check:`, {
              field: condition.field,
              operator: condition.operator,
              expected: condition.value,
              current: fieldValue,
              previous: previousValue,
              match: res,
            });
            return res;
          }),
        );
    }
  };

  const compareValues = (
    currentValue: any,
    operator: string,
    targetValue: any,
    previousValue?: any,
  ): boolean => {
    switch (operator) {
      case "equals":
        return currentValue == targetValue;
      case "not_equals":
        return currentValue != targetValue;
      case "greater_than":
        return currentValue > targetValue;
      case "less_than":
        return currentValue < targetValue;
      case "contains":
        return String(currentValue).includes(String(targetValue));
      case "changed_from":
        return previousValue == targetValue && currentValue != previousValue;
      case "changed_to":
        return currentValue == targetValue && previousValue != currentValue;
      case "increased":
        return currentValue > previousValue;
      case "decreased":
        return currentValue < previousValue;
      default:
        return false;
    }
  };

  const executeRuleActions = async (
    task: Task,
    rule: AutomationRule,
    // Needed for tag operations
  ): Promise<void> => {
    try {
      const updates: Partial<Task> = {};
      const notifications = [];
      const activityLogs = [];

      // Process each action in sequence
      for (const action of rule.actions) {
        if (!action.type || !action.value) continue;

        switch (action.type) {
          case "move_stage":
            // Validate stage exists
            if (stages.some((stage) => stage.id === action.value)) {
              updates.stageId = action.value;
              activityLogs.push({
                type: "stage_changed",
                message: `Moved to stage: ${
                  stages.find((s) => s.id === action.value)?.name ||
                  action.value
                }`,
              });
            }
            break;

          case "status_change":
            updates.status = action.value;
            activityLogs.push({
              type: "status_changed",
              message: `Status changed to: ${action.value.replace("_", " ")}`,
            });
            break;

          case "assign_user":
            // Validate user exists
            if (users.some((user) => user.id === action.value)) {
              updates.assigneeId = action.value;
              const user = users.find((u) => u.id === action.value);
              activityLogs.push({
                type: "assignment_changed",
                message: `Assigned to: ${user?.name || action.value}`,
              });

              // Queue notification if this is an assign action
              notifications.push({
                userId: action.value,
                type: "task_assigned",
                content: `You've been assigned to task: ${task.title}`,
                metadata: { taskId: task.id },
              });
            }
            break;

          case "set_due_date":
            updates.dueDate = action.value;
            activityLogs.push({
              type: "due_date_changed",
              message: `Due date set to: ${new Date(
                action.value,
              ).toLocaleDateString()}`,
            });
            break;

          case "extend_due_date":
            if (task.dueDate) {
              const extendDays = parseInt(action.value) || 0;
              const newDueDate = new Date(task.dueDate);
              newDueDate.setDate(newDueDate.getDate() + extendDays);
              updates.dueDate = newDueDate.toISOString();
              activityLogs.push({
                type: "due_date_changed",
                message: `Due date extended by ${extendDays} days`,
              });
            }
            break;

          case "set_priority":
            updates.priority = action.value;
            activityLogs.push({
              type: "priority_changed",
              message: `Priority set to: ${action.value}`,
            });
            break;

          case "add_tag":
            if (tags.some((tag) => tag.id === action.value)) {
              const newTags = [...(task.tags || []), { id: action.value }];
              updates.tags = newTags;
              activityLogs.push({
                type: "tag_added",
                message: `Added tag: ${
                  tags.find((t) => t.id === action.value)?.name || action.value
                }`,
              });
            }
            break;

          case "remove_tag":
            if (task.tags?.some((tag) => tag.id === action.value)) {
              updates.tags = task.tags.filter((tag) => tag.id !== action.value);
              activityLogs.push({
                type: "tag_removed",
                message: `Removed tag: ${
                  tags.find((t) => t.id === action.value)?.name || action.value
                }`,
              });
            }
            break;

          case "send_notification":
            notifications.push({
              type: action.value, // email, slack, etc.
              userId: task.assignee || "", // Default to assignee
              content: `Automation rule "${rule.name}" was applied to task "${task.title}"`,
              metadata: {
                taskId: task.id,
                ruleId: rule.id || "",
                actions: rule.actions.map((a) => a.type),
              },
            });
            break;

          case "create_subtask":
            // This would typically be a separate API call
            activityLogs.push({
              type: "subtask_created",
              message: `Created subtask: ${action.value}`,
            });
            break;

          case "add_comment":
            activityLogs.push({
              type: "comment_added",
              message: `Added comment: ${action.value.substring(0, 30)}...`,
            });
            break;

          case "archive_task":
            updates.archived = true;
            activityLogs.push({
              type: "task_archived",
              message: `Task archived by automation rule`,
            });
            break;

          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
      }

      // Apply all task updates in a single API call if there are changes

      if (Object.keys(updates).length > 0) {
        await updateTask(task.id, updates);

        // --- ADD THIS: fetch the updated task and update local state ---

        // Log all activities
      }

      // Log the automation execution
      console.log(
        `Executed actions for rule "${rule.name}" on task ${task.id}`,
        {
          updates,
          notifications,
          activityLogs,
        },
      );
    } catch (error) {
      console.error("Error executing rule actions:", error);
      // Consider adding retry logic for failed actions
      throw error;
    }
  };

  const checkAutomationRules = async ({
    previousTask,
    currentTask,
    updates,
    rules,
  }: {
    previousTask: Task;
    currentTask: Task;
    updates: Partial<Task>;
    rules: AutomationRule[];
  }) => {
    const applicableRules = rules.filter((rule) => rule.enabled);

    const prevTask = previousTask.records.find((t) => t.id === currentTask.id);

    for (const rule of applicableRules) {
      try {
        const shouldExecute = await matchesRuleConditions({
          previousTask: prevTask,
          currentTask,
          updates,
          rule,
        });

        if (shouldExecute) {
          await executeRuleActions(currentTask, rule);
          router.refresh();
          if (rule.stopOnFirst) break;
        }
      } catch (error) {
        console.error(`Error executing rule ${rule.name}:`, error);
        // Continue with other rules even if one fails
      }
    }
  };

  const handleSaveAutomationRule = async (): Promise<void> => {
    console.log(newRule, "newRuleeeee");

    try {
      // Validate rule name
      if (!newRule.name.trim()) {
        toast.error("Please enter a rule name");
        return;
      }

      // Enhanced condition validation based on trigger type
      const requiredConditions: Record<string, string[]> = {
        status_change: ["to_status"],
        stage_change: ["to_stage"],
        priority_change: ["to_priority"],
        due_date_approaching: ["days_before"],
        due_date_passed: ["extend_due_date"],
        task_created: ["create_subtask"],
        task_assigned: ["assigned_to"],
        tag_added: ["has_tag"],
        // comment_added: [],
        // file_uploaded: [],
        specific_task: ["task_id"],
        time_based: ["frequency", "time"],
        // completion_percentage: ['progress_threshold', 'progress_condition'],
      };

      // Check for required conditions
      const missingConditions =
        requiredConditions[newRule.trigger]?.filter(
          (field) =>
            !newRule.conditions.some((c) => c.field === field && c.value),
        ) || [];

      if (missingConditions.length > 0) {
        toast.error(
          `Missing required conditions for ${
            newRule.trigger
          }: ${missingConditions.join(", ")}`,
        );
        return;
      }

      // Validate action types and values
      const validActionTypes = [
        "move_stage",
        "status_change",
        "assign_user",
        "set_due_date",
        "extend_due_date",
        "set_priority",
        "add_tag",
        "remove_tag",
        "send_notification",
        "create_subtask",
      ];

      const invalidActions = newRule.actions.filter(
        (action) =>
          !action.type ||
          !validActionTypes.includes(action.type) ||
          !action.value,
      );

      if (invalidActions.length > 0) {
        toast.error(
          `Invalid actions detected. Please check your action configurations.`,
        );
        return;
      }

      // Prepare the rule data with proper typing
      const ruleToSave: AutomationRule = {
        ...newRule,
        name: newRule.name.trim(),
        conditions: newRule.conditions
          .filter((c) => c.value)
          .map((c) => ({
            field: c.field,
            operator: c.operator || "equals",
            value: c.value,
          })),
        actions: newRule.actions
          .filter((a) => a.type && a.value)
          .map((a) => ({
            type: a.type,
            value: a.value,
          })),

        enabled: newRule.enabled ?? true,
        applyToAll: newRule.applyAll ?? false,
        stopOnFirst: newRule.stopOnFirst ?? false,
      };

      // Save the rule
      const savedRule = await createAutomationRule(ruleToSave, taskId);

      // Show success message
      toast.success(`Rule "${newRule.name}" created successfully!`, {
        position: "top-right",
      });

      // Reset form to sensible defaults
      setNewRule({
        id: undefined,
        name: "",
        trigger: "status_change",
        conditions: [],
        actions: [{ type: "", value: "" }],
        enabled: true,
        applyToAll: false,
        stopOnFirst: false,
      });

      // Close the modal
      setIsAutomationModalOpen(false);

      // Refresh the rules list with error handling
      try {
        const updatedRules = await fetchAutomationRules(taskId);
        setAutomationRules(updatedRules);
      } catch (fetchError) {
        console.error("Error refreshing rules list:", fetchError);
        toast.warning("Rule created but failed to refresh list", {
          position: "top-right",
        });
      }
    } catch (error) {
      console.error("Error saving automation rule:", error);

      let errorMessage = "Failed to save automation rule";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      toast.error(errorMessage, {
        position: "top-right",
      });
    }
  };

  // Helper functions
  const isTaskComplete = (task: Task) => {
    const stage = stages.find((s) => s.id === task.stageId);
    return Boolean(stage?.isCompleted || task.isComplete);
  };

  // Filter functions
  const getActiveFilterCount = () => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedTags.length > 0) count++;
    if (selectedAssignees.length > 0) count++;
    if (selectedPriority && selectedPriority !== "all") count++;
    if (dueDateFilter && dueDateFilter !== "all") count++;
    if (selectedStage && selectedStage !== "all") count++;
    if (selectedStatusFilter && selectedStatusFilter !== "all") count++;
    return count;
  };

  const getFilteredTasks = () => {
    return tasks.filter((task) => {
      // 1. Search Query: title, description, stage name, assignee names, tag names
      const q = searchQuery.trim().toLowerCase();
      let matchesSearch = true;
      if (q) {
        const titleMatch = (task.title?.toLowerCase() || "").includes(q);
        const descMatch = (task.description?.toLowerCase() || "").includes(q);
        const stageMatch = (
          stages.find((s) => s.id === task.stageId)?.name?.toLowerCase() || ""
        ).includes(q);
        const tagMatch =
          Array.isArray(task.tags) &&
          task.tags.some((t: any) =>
            (typeof t === "string" ? t : t.name || "").toLowerCase().includes(q)
          );
        matchesSearch = titleMatch || descMatch || stageMatch || tagMatch;
      }

      // 2. Tags Filter (robust ID/Name matching)
      const matchesTags =
        selectedTags.length === 0 ||
        (Array.isArray(task.tags) &&
          task.tags.some((tag: any) => {
            const tagId = typeof tag === "string" ? tag : (tag.id || tag.tagId || tag.name);
            const tagName = typeof tag === "string" ? tag : (tag.name || tag.id);
            return (
              selectedTags.includes(tagId) ||
              selectedTags.includes(tagName) ||
              selectedTags.includes(String(tag))
            );
          }));

      // 3. Assignees Filter
      const matchesAssignees =
        selectedAssignees.length === 0 ||
        (Array.isArray(task.assignees) &&
          task.assignees.some((user: any) =>
            selectedAssignees.includes(user.userId || user.id || user)
          ));

      // 4. Priority Filter
      const matchesPriority =
        !selectedPriority ||
        selectedPriority === "all" ||
        (task.priority || "").toLowerCase() === selectedPriority.toLowerCase();

      // 5. Due Date Filter
      const matchesDueDate =
        !dueDateFilter ||
        dueDateFilter === "all" ||
        checkDueDateFilter(task.dueDate, dueDateFilter);

      // 6. Stage Filter
      const matchesStage =
        !selectedStage ||
        selectedStage === "all" ||
        task.stageId === selectedStage;

      // 7. Status Filter
      const completed = isTaskComplete(task);
      const matchesStatus =
        !selectedStatusFilter ||
        selectedStatusFilter === "all" ||
        (selectedStatusFilter === "completed" && completed) ||
        (selectedStatusFilter === "in_progress" && !completed);

      return (
        matchesSearch &&
        matchesTags &&
        matchesAssignees &&
        matchesPriority &&
        matchesDueDate &&
        matchesStage &&
        matchesStatus
      );
    });
  };

  const checkDueDateFilter = (dueDate: Date | undefined, filter: string) => {
    if (!dueDate) return filter === "no-date";

    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    switch (filter) {
      case "overdue":
        return diffDays < 0;
      case "today":
        return diffDays === 0;
      case "tomorrow":
        return diffDays === 1;
      case "this-week":
        return diffDays >= 0 && diffDays <= 7;
      case "next-week":
        return diffDays > 7 && diffDays <= 14;
      default:
        return true;
    }
  };

  const getAvailableAssignees = () => {
    const assigneeIds = new Set(
      tasks.flatMap((task) => task?.assignees?.map((a) => a.userId) || []),
    );

    return users.filter((user) => assigneeIds.has(user.id));
  };

  const getAvailablePriorities = () => {
    const priorities = new Set(tasks.map((task) => task?.priority));
    return Array.from(priorities);
  };

  // Group tasks by stage
  const tasksByStage = useMemo(() => {
    return stages.reduce(
      (acc, stage) => {
        acc[stage.id] = getFilteredTasks().filter(
          (task) => task.stageId === stage.id,
        );
        return acc;
      },
      {} as Record<string, Task[]>,
    );
  }, [stages, getFilteredTasks]);

  // Form handlers
  const handleCreateTask = (stageId?: string) => {
    if (stageId) {
      setNewTaskStageId(stageId);
      setNewTask((prev) => ({ ...prev, stageId }));
    }
    setIsCreateTaskOpen(true);
  };

  const handleSubmitTask = async () => {
    if (!newTask.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    const success = await createTask({
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      stageId: newTask.stageId || stages[0]?.id,
      assigneeId: newTask.assigneeId,
      // dueDate: newTask.dueDate,
      dueDate: {
        startDate: newTask.dueDate.startDate,
        endDate: newTask.dueDate.endDate,
      },
      tags: newTask.tags,
    });

    if (success) {
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        stageId: "",
        assigneeId: [],
        dueDate: {
          startDate: "",
          endDate: "",
        },
        tags: [],
      });
      setIsCreateTaskOpen(false);
    }
  };

  const handleCreateStageSubmit = async () => {
    if (!newStage.name.trim()) {
      toast.error("Please enter a stage name");
      return;
    }

    const success = await createStage(
      newStage.name,
      newStage.color,
      newStage.assignedTeam,
    );

    if (success) {
      setNewStage({
        name: "",
        color: "bg-blue-100",
        assignedTeam: "",
      });
      setIsCreateStageOpen(false);
    }
  };

  const handleUpdateStage = async () => {
    if (!editingStage) return;

    const success = await updateStage(editingStage.id, newStage);
    if (success) {
      setIsEditStageOpen(false);
      setEditingStage(null);
    }
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setNewStage({
      name: stage.name,
      color: stage.color,
      assignedTeam: stage.assignedTeam || "",
    });
    setIsEditStageOpen(true);
  };

  const handleDeleteStage = async (stageId: string) => {
    const success = await deleteStage(stageId);
    if (success) {
      setIsEditStageOpen(false);
      setEditingStage(null);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) throw new Error("Task not found");

      const nextStageId = getNextStageId(task.stageId);
      if (!nextStageId) {
        // No next stage: mark complete on the same stage
        const now = new Date();
        // Optimistic update
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  isComplete: true,
                  completedAt: now,
                  status: "completed",
                }
              : t,
          ),
        );

        try {
          await updateTask(taskId, {
            isComplete: true,
            completedAt: now,
            status: "completed",
          });
          toast.success("Task marked complete");
        } catch (error) {
          // Revert optimistic update on failure
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    isComplete: false,
                    completedAt: undefined,
                    status: task.status,
                  }
                : t,
            ),
          );
          toast.error("Failed to complete task");
        } finally {
          setCompletingTaskId(null);
        }
        return;
      }

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, stageId: nextStageId } : t)),
      );

      // API call
      await updateTask(taskId, { stageId: nextStageId });

      toast.success(
        `Task moved to ${stages.find((s) => s.id === nextStageId)?.name}`,
      );
    } catch (error) {
      toast.error("Failed to complete task");
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, stageId: task.stageId } : t,
        ),
      );
    } finally {
      setCompletingTaskId(null);
    }
  };

  const getNextStageId = (currentStageId: string) => {
    const currentIndex = stages.findIndex((s) => s.id === currentStageId);
    return currentIndex >= 0 && currentIndex < stages.length - 1
      ? stages[currentIndex + 1].id
      : null;
  };

  const hasNextStage = (stageId: string) => {
    return getNextStageId(stageId) !== null;
  };

  const createTag = async (tagName: string) => {
    try {
      const response = await fetch("/api/task-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tagName,
          color: `bg-${
            ["blue", "green", "red", "yellow", "purple", "pink", "indigo"][
              Math.floor(Math.random() * 7)
            ]
          }-100`,
        }),
      });

      if (response.ok) {
        const newTag = await response.json();
        setTags((prev) => [...prev, newTag]);
        return newTag;
      }
      throw new Error("Failed to create tag");
    } catch (error) {
      console.error("Error creating tag:", error);
      toast.error("Failed to create tag");
      return null;
    }
  };

  // Bulk Operations
  const handleBulkDelete = async () => {
    try {
      const promises = selectedTasks.map((taskId) => deleteTask(taskId));
      await Promise.all(promises);
      setSelectedTasks([]);
      toast.success(`${selectedTasks.length} tasks deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete tasks");
    }
  };

  const handleBulkMoveStage = async (stageId: string) => {
    try {
      const promises = selectedTasks.map((taskId) =>
        updateTask(taskId, { stageId }),
      );
      await Promise.all(promises);
      setSelectedTasks([]);
      toast.success(`${selectedTasks.length} tasks moved successfully`);
    } catch (error) {
      toast.error("Failed to move tasks");
    }
  };

  const handleBulkAssign = async (userId: string) => {
    try {
      const promises = selectedTasks.map((taskId) =>
        updateTask(taskId, {
          assignees: [{ userId, taskId, recordId: taskId }],
        }),
      );
      await Promise.all(promises);
      setSelectedTasks([]);
      toast.success(`${selectedTasks.length} tasks assigned successfully`);
    } catch (error) {
      toast.error("Failed to assign tasks");
    }
  };

  // Save current filter as template
  const saveCurrentFilter = () => {
    const filter = {
      id: Date.now().toString(),
      name: `Filter ${savedFilters.length + 1}`,
      searchQuery,
      selectedTags,
      selectedAssignees,
      selectedPriority,
      dueDateFilter,
      dateRange: dateRangeFilter,
    };
    setSavedFilters((prev) => [...prev, filter]);
    toast.success("Filter saved successfully");
  };

  const applyFilter = (filter: any) => {
    setSearchQuery(filter.searchQuery);
    setSelectedTags(filter.selectedTags);
    setSelectedAssignees(filter.selectedAssignees);
    setSelectedPriority(filter.selectedPriority);
    setDueDateFilter(filter.dueDateFilter);
    setDateRangeFilter(filter.dateRange);
    toast.success(`Applied filter: ${filter.name}`);
  };

  // Task Templates
  const saveAsTemplate = (task: Task) => {
    const template = {
      id: Date.now().toString(),
      name: `${task.title} Template`,
      title: task.title,
      description: task.description,
      priority: task.priority,
      tags: task.tags,
    };
    setTaskTemplates((prev) => [...prev, template]);
    toast.success("Task template created");
  };

  const createFromTemplate = async (template: any) => {
    const success = await createTask({
      ...template,
      title: `${template.title} (Copy)`,
      stageId: stages[0]?.id,
      assigneeId: [],
      dueDate: { startDate: "", endDate: "" },
    });
    if (success) {
      toast.success("Task created from template");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${showActivityLog ? "overflow-hidden" : ""}`}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="px-4 py-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
              {/* Back Button & Title */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center font-bold"
                  onClick={() => router.back()}
                  title="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                    <div className="p-1 bg-indigo-50 dark:bg-indigo-950/60 rounded-md text-indigo-600 dark:text-indigo-400">
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </div>
                    TaskFlow
                  </h1>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("board")}
                  className={`text-xs h-7 rounded-lg px-2.5 font-bold transition-all ${
                    view === "board"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1">Board</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("records")}
                  className={`text-xs h-7 rounded-lg px-2.5 font-bold transition-all ${
                    view === "records"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1">Records</span>
                </Button>
              </div>

              {/* Stats Badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-pulse"></div>
                  <span>{getFilteredTasks().length}</span>
                  <span className="hidden sm:inline font-medium text-slate-500 dark:text-slate-400">Tasks</span>
                </div>

                <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <LayoutGrid className="w-3 h-3 text-slate-500" />
                  <span>{stages.length}</span>
                  <span className="hidden sm:inline font-medium text-slate-500 dark:text-slate-400">Stages</span>
                </div>
              </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-8 w-36 sm:w-48 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Compact Filters Dropdown */}
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 rounded-xl text-xs font-semibold px-3 flex items-center gap-1.5 transition-all",
                      getActiveFilterCount() > 0
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold"
                        : "border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <Filter className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="hidden sm:inline">Filters</span>
                    {getActiveFilterCount() > 0 && (
                      <span className="bg-indigo-600 text-white text-[10px] rounded-full min-w-[18px] h-4 px-1 flex items-center justify-center font-extrabold ml-0.5">
                        {getActiveFilterCount()}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  onPointerDownOutside={(e) => {
                    const target = e.target as HTMLElement;
                    if (
                      target?.closest?.("[role='listbox']") ||
                      target?.closest?.("[data-radix-select-viewport]") ||
                      target?.closest?.("[data-radix-popper-content-wrapper]")
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="w-80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-indigo-500" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Advanced Filters
                      </h4>
                    </div>
                    {getActiveFilterCount() > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedTags([]);
                          setSelectedAssignees([]);
                          setSelectedPriority("");
                          setDueDateFilter("");
                          setSelectedStage("");
                          setSelectedStatusFilter("");
                          toast.success("All filters cleared!");
                        }}
                        className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        Reset All
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {/* Stage Column Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <LayoutGrid className="h-3.5 w-3.5 text-indigo-500" />
                        Stage Column
                      </label>
                      <Select
                        value={selectedStage || "all"}
                        onValueChange={(val) => setSelectedStage(val === "all" ? "" : val)}
                      >
                        <SelectTrigger className="h-8 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                          <SelectValue placeholder="All Stages" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                          <SelectItem value="all">All Stages</SelectItem>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-indigo-500" />
                        Status
                      </label>
                      <Select
                        value={selectedStatusFilter || "all"}
                        onValueChange={(val) => setSelectedStatusFilter(val === "all" ? "" : val)}
                      >
                        <SelectTrigger className="h-8 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" /> Due Date
                      </label>
                      <Select
                        value={dueDateFilter || "all"}
                        onValueChange={(val) => setDueDateFilter(val === "all" ? "" : val)}
                      >
                        <SelectTrigger className="h-8 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                          <SelectValue placeholder="All Dates" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                          <SelectItem value="all">All Dates</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="tomorrow">Tomorrow</SelectItem>
                          <SelectItem value="this-week">This Week</SelectItem>
                          <SelectItem value="next-week">Next Week</SelectItem>
                          <SelectItem value="no-date">No Due Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-indigo-500" /> Priority
                      </label>
                      <Select
                        value={selectedPriority || "all"}
                        onValueChange={(val) => setSelectedPriority(val === "all" ? "" : val)}
                      >
                        <SelectTrigger className="h-8 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                          <SelectValue placeholder="All Priorities" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                          <SelectItem value="all">All Priorities</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assignees Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-500" /> Assignees
                      </label>
                      <Select
                        value={selectedAssignees.length === 0 ? "all" : selectedAssignees[0]}
                        onValueChange={(val) => setSelectedAssignees(val === "all" ? [] : [val])}
                      >
                        <SelectTrigger className="h-8 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                          <SelectValue placeholder="All Assignees" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                          <SelectItem value="all">All Assignees</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tags Filter */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <TagIcon className="h-3.5 w-3.5 text-indigo-500" /> Tags
                      </label>
                      <Select
                        value={selectedTags.length === 0 ? "all" : selectedTags[0]}
                        onValueChange={(val) => setSelectedTags(val === "all" ? [] : [val])}
                      >
                        <SelectTrigger className="h-8 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                          <SelectValue placeholder="All Tags" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                          <SelectItem value="all">All Tags</SelectItem>
                          {tags.map((tag: any) => {
                            const tagValue = tag.id || tag.tagId || tag.name;
                            return (
                              <SelectItem key={tagValue} value={tagValue}>
                                {tag.name || tagValue}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Dialog
                open={isCreateTaskOpen}
                onOpenChange={setIsCreateTaskOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => handleCreateTask()}
                    className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs px-3 shadow-xs transition-all flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Record</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-0 overflow-hidden max-w-2xl max-h-[90vh]">
                  <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Plus className="h-4 w-4" />
                      </div>
                      Create New Record / Task
                    </DialogTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Add a new record to your workspace stage workflow
                    </p>
                  </DialogHeader>

                  <div className="space-y-4 p-5 overflow-y-auto max-h-[calc(90vh-100px)]">
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Edit3 className="h-3.5 w-3.5 text-indigo-500" />
                        Record Title
                      </label>
                      <Input
                        value={newTask.title}
                        onChange={(e) =>
                          setNewTask({ ...newTask, title: e.target.value })
                        }
                        placeholder="e.g. Design homepage layout, Update API endpoint"
                        className="h-9 rounded-xl text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <List className="h-3.5 w-3.5 text-indigo-500" />
                        Description
                      </label>
                      <Textarea
                        value={newTask.description}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            description: e.target.value,
                          })
                        }
                        placeholder="Enter record details, requirements, or acceptance criteria..."
                        rows={3}
                        className="rounded-xl text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 resize-none p-3"
                      />
                    </div>

                    {/* Stage Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <LayoutGrid className="h-3.5 w-3.5 text-indigo-500" />
                        Stage Column
                      </label>
                      <Select
                        value={newTask.stageId}
                        onValueChange={(value) =>
                          setNewTask({ ...newTask, stageId: value })
                        }
                      >
                        <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                          <SelectValue placeholder="Select target stage column" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                          {stages.map((stage) => (
                            <SelectItem
                              key={stage.id}
                              value={stage.id}
                              className="text-xs font-semibold"
                            >
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assignees */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-500" />
                        Assignees
                      </label>

                      {/* Selected Assignees Chips */}
                      {newTask?.assigneeId?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {newTask.assigneeId.map((id) => {
                            const user = users.find((u) => u.id === id);
                            return user ? (
                              <span
                                key={user.id}
                                className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 gap-1.5"
                              >
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                {user.name}
                                <button
                                  type="button"
                                  className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 ml-0.5"
                                  onClick={() =>
                                    setNewTask((prev) => ({
                                      ...prev,
                                      assigneeId: prev.assigneeId.filter(
                                        (aid) => aid !== user.id
                                      ),
                                    }))
                                  }
                                >
                                  ✕
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}

                      {/* Add Assignee with Search */}
                      <div className="space-y-1.5">
                        <Input
                          placeholder="Search team members..."
                          value={assigneeSearchQuery}
                          onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                          className="h-8 rounded-xl text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700"
                        />

                        {/* Filtered Users List */}
                        <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                          {users
                            .filter((user) => !newTask.assigneeId.includes(user.id))
                            .filter((user) =>
                              user.name
                                ?.toLowerCase()
                                .includes(assigneeSearchQuery.toLowerCase()) ||
                              user.email
                                ?.toLowerCase()
                                .includes(assigneeSearchQuery.toLowerCase())
                            )
                            .map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  setNewTask((prev) => ({
                                    ...prev,
                                    assigneeId: [...prev.assigneeId, user.id],
                                  }));
                                  setAssigneeSearchQuery("");
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200">
                                    {user.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {user.email}
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                  + Add
                                </span>
                              </button>
                            ))}
                          {users.filter(
                            (user) =>
                              !newTask.assigneeId.includes(user.id) &&
                              (user.name
                                ?.toLowerCase()
                                .includes(assigneeSearchQuery.toLowerCase()) ||
                                user.email
                                  ?.toLowerCase()
                                  .includes(assigneeSearchQuery.toLowerCase()))
                          ).length === 0 && assigneeSearchQuery && (
                            <div className="px-3 py-3 text-center text-xs text-slate-400 font-medium">
                              No team members found
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                        Due Date
                      </label>
                      <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 bg-slate-50/40 dark:bg-slate-800/40">
                        <RangeCalendarPicker
                          value={newTask.dueDate}
                          onChange={(value) => {
                            setNewTask({ ...newTask, dueDate: value });
                          }}
                        />
                      </div>
                    </div>

                    {/* Priority Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        Priority Level
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: "low", label: "Low", style: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" },
                          { id: "medium", label: "Medium", style: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" },
                          { id: "high", label: "High", style: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800" },
                          { id: "urgent", label: "Urgent", style: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800" },
                        ].map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setNewTask({ ...newTask, priority: p.id })}
                            className={`h-8 rounded-xl border text-xs font-bold transition-all ${
                              newTask.priority === p.id
                                ? p.style + " shadow-xs ring-1 ring-slate-400/30"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmitTask}
                      className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 mt-3"
                      disabled={!newTask.title || !newTask.stageId}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Record / Task</span>
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAutomationModalOpen(true)}
                className="h-8 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 flex items-center gap-1.5"
              >
                <Settings className="h-3.5 w-3.5 text-purple-500" />
                <span>Automation</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActivityLog(true)}
                className="h-8 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 flex items-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                <span>Activity Log</span>
              </Button>
            </div>
          </div>
          {/* Active Filter Chips Bar */}
          {getActiveFilterCount() > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                Active Filters ({getActiveFilterCount()}):
              </span>
              {selectedStage && (
                <Badge variant="secondary" className="h-6 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60 text-[10px] font-bold flex items-center gap-1">
                  Stage: {stages.find((s) => s.id === selectedStage)?.name || selectedStage}
                  <X className="h-3 w-3 cursor-pointer hover:text-indigo-900 dark:hover:text-white" onClick={() => setSelectedStage("")} />
                </Badge>
              )}
              {selectedStatusFilter && (
                <Badge variant="secondary" className="h-6 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60 text-[10px] font-bold flex items-center gap-1">
                  Status: {selectedStatusFilter === "completed" ? "Completed" : "In Progress"}
                  <X className="h-3 w-3 cursor-pointer hover:text-indigo-900 dark:hover:text-white" onClick={() => setSelectedStatusFilter("")} />
                </Badge>
              )}
              {selectedPriority && selectedPriority !== "all" && (
                <Badge variant="secondary" className="h-6 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 text-[10px] font-bold flex items-center gap-1">
                  Priority: {selectedPriority}
                  <X className="h-3 w-3 cursor-pointer hover:text-amber-900 dark:hover:text-white" onClick={() => setSelectedPriority("")} />
                </Badge>
              )}
              {dueDateFilter && dueDateFilter !== "all" && (
                <Badge variant="secondary" className="h-6 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 text-[10px] font-bold flex items-center gap-1">
                  Due: {dueDateFilter}
                  <X className="h-3 w-3 cursor-pointer hover:text-blue-900 dark:hover:text-white" onClick={() => setDueDateFilter("")} />
                </Badge>
              )}
              {selectedAssignees.length > 0 && (
                <Badge variant="secondary" className="h-6 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60 text-[10px] font-bold flex items-center gap-1">
                  Assignee: {users.find((u) => u.id === selectedAssignees[0])?.name || selectedAssignees[0]}
                  <X className="h-3 w-3 cursor-pointer hover:text-purple-900 dark:hover:text-white" onClick={() => setSelectedAssignees([])} />
                </Badge>
              )}
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="h-6 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 text-[10px] font-bold flex items-center gap-1">
                  Tag: {selectedTags[0]}
                  <X className="h-3 w-3 cursor-pointer hover:text-emerald-900 dark:hover:text-white" onClick={() => setSelectedTags([])} />
                </Badge>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTags([]);
                  setSelectedAssignees([]);
                  setSelectedPriority("");
                  setDueDateFilter("");
                  setSelectedStage("");
                  setSelectedStatusFilter("");
                }}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline ml-1"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        <div className="flex-1">
          {view === "board" ? (
            <TaskBoard
              stages={stages}
              tasksByStage={tasksByStage}
              onTaskMove={moveTask}
              onTaskReorder={reorderTask}
              onTaskClick={setSelectedTask}
              onCreateTask={handleCreateTask}
              onCreateStage={() => setIsCreateStageOpen(true)}
              onEditStage={handleEditStage}
              onDeleteStage={handleDeleteStage}
              onCompleteTask={handleCompleteTask}
            />
          ) : (
            <TaskRecords
              tasks={getFilteredTasks()}
              users={users}
              stages={stages}
              tags={tags}
              onTaskClick={setSelectedTask}
              onDeleteTask={deleteTask}
            />
          )}
        </div>

        {/* Activity Sidebar */}
        {showActivityLog && (
          <div
            className="fixed inset-0 bg-black/10 z-40 backdrop-blur-sm"
            onClick={() => setShowActivityLog(false)}
          />
        )}
      {/* Activity Log Slide-over Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          showActivityLog ? "translate-x-0" : "translate-x-full"
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

          {/* Close button */}
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

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          user={users}
          tags={tags}
          taskId={taskId}
          stages={stages}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={updateTask}
        />
      )}

      {/* Create Stage Dialog */}
      <Dialog open={isCreateStageOpen} onOpenChange={setIsCreateStageOpen}>
        <DialogContent className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-0 overflow-hidden max-w-md">
          <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                <LayoutGrid className="h-4 w-4" />
              </div>
              Create New Stage
            </DialogTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add a new column stage to organize your records
            </p>
          </DialogHeader>

          <div className="space-y-4 p-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Stage Name
              </label>
              <Input
                value={newStage.name}
                onChange={(e) =>
                  setNewStage({ ...newStage, name: e.target.value })
                }
                placeholder="e.g. In Review, QA, Completed"
                className="h-9 rounded-xl text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Team (Optional)
              </label>
              <Input
                value={newStage.assignedTeam}
                onChange={(e) =>
                  setNewStage({ ...newStage, assignedTeam: e.target.value })
                }
                placeholder="e.g. Frontend, Operations"
                className="h-9 rounded-xl text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Stage Accent Color
              </label>
              <Select
                value={newStage.color}
                onValueChange={(value) =>
                  setNewStage({ ...newStage, color: value })
                }
              >
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                  <SelectValue placeholder="Select color accent" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                  <SelectItem value="bg-blue-100">🔷 Blue</SelectItem>
                  <SelectItem value="bg-green-100">🟢 Green</SelectItem>
                  <SelectItem value="bg-yellow-100">🟡 Yellow</SelectItem>
                  <SelectItem value="bg-purple-100">🟣 Purple</SelectItem>
                  <SelectItem value="bg-pink-100">🌸 Pink</SelectItem>
                  <SelectItem value="bg-gray-100">⚪ Gray</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCreateStageSubmit}
              disabled={!newStage.name}
              className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all mt-2"
            >
              Create Stage
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={isEditStageOpen} onOpenChange={setIsEditStageOpen}>
        <DialogContent className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-0 overflow-hidden max-w-md">
          <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Edit3 className="h-4 w-4" />
              </div>
              Edit Stage
            </DialogTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Modify stage details or remove column
            </p>
          </DialogHeader>

          <div className="space-y-4 p-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Stage Name
              </label>
              <Input
                value={newStage.name}
                onChange={(e) =>
                  setNewStage({ ...newStage, name: e.target.value })
                }
                placeholder="Enter stage name"
                className="h-9 rounded-xl text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Team
              </label>
              <Input
                value={newStage.assignedTeam}
                onChange={(e) =>
                  setNewStage({ ...newStage, assignedTeam: e.target.value })
                }
                placeholder="Enter team name"
                className="h-9 rounded-xl text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Stage Accent Color
              </label>
              <Select
                value={newStage.color}
                onValueChange={(value) =>
                  setNewStage({ ...newStage, color: value })
                }
              >
                <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                  <SelectItem value="bg-blue-100">🔷 Blue</SelectItem>
                  <SelectItem value="bg-green-100">🟢 Green</SelectItem>
                  <SelectItem value="bg-yellow-100">🟡 Yellow</SelectItem>
                  <SelectItem value="bg-purple-100">🟣 Purple</SelectItem>
                  <SelectItem value="bg-pink-100">🌸 Pink</SelectItem>
                  <SelectItem value="bg-gray-100">⚪ Gray</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  editingStage && handleDeleteStage(editingStage.id)
                }
                className="flex-1 h-9 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Delete Stage
              </Button>
              <Button
                onClick={handleUpdateStage}
                className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs"
                disabled={isUpdating}
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Automation Rules Dialog */}

      <Dialog
        open={isAutomationModalOpen}
        onOpenChange={setIsAutomationModalOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-700 shadow-2xl">
          <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              🤖 Automation Rules
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Create powerful automation rules to streamline your workflow and
              save time
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Rule Name */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Rule Name
              </label>
              <Input
                value={newRule.name}
                onChange={(e) =>
                  setNewRule({ ...newRule, name: e.target.value })
                }
                placeholder="Enter a descriptive name for your rule"
                className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600 focus:bg-white dark:focus:bg-gray-800 transition-colors"
              />
            </div>

            {/* Trigger Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Trigger Event
              </label>
              <Select
                value={newRule.trigger}
                onValueChange={(value) => {
                  const updatedRule = {
                    ...newRule,
                    trigger: value,
                    conditions: [],
                    actions: [{ type: "", value: "" }],
                  };
                  setNewRule(updatedRule);
                }}
              >
                <SelectTrigger className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800 transition-colors">
                  <SelectValue placeholder="Select when this rule should trigger" />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-gray-200 dark:border-gray-700">
                  <SelectItem
                    value="status_change"
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    📊 Task Status Changes
                  </SelectItem>
                  <SelectItem
                    value="stage_change"
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    🔄 Stage Changes
                  </SelectItem>
                  <SelectItem
                    value="priority_change"
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>⚡
                    Priority Changes
                  </SelectItem>
                  <SelectItem
                    value="due_date_approaching"
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>⏰
                    Due Date Approaching
                  </SelectItem>
                  <SelectItem
                    value="due_date_passed"
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    🚨 Due Date Passed
                  </SelectItem>
                  <SelectItem
                    value="task_created"
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>✨
                    New Task Created
                  </SelectItem>
                  <SelectItem
                    value="task_assigned"
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    👤 Task Assigned
                  </SelectItem>
                  <SelectItem
                    value="tag_added"
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                    🏷️ Tag Added
                  </SelectItem>
                  <SelectItem
                    value="specific_task"
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    🎯 Specific Task Selected
                  </SelectItem>
                  <SelectItem
                    value="time_based"
                    className="flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    ⏱️ Time Based (Schedule)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Conditions */}
            {newRule.trigger && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Conditions
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Define when this rule should trigger
                    </p>
                  </div>
                </div>

                {/* Status Change Conditions */}
                {newRule.trigger === "status_change" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        From Status
                      </label>
                      <Select
                        value={
                          newRule.conditions.find(
                            (c) => c.field === "from_status",
                          )?.value || ""
                        }
                        onValueChange={(value) => {
                          const updatedConditions = newRule.conditions.filter(
                            (c) => c.field !== "from_status",
                          );
                          if (value)
                            updatedConditions.push({
                              field: "from_status",
                              operator: "equals",
                              value,
                            });
                          setNewRule({
                            ...newRule,
                            conditions: updatedConditions,
                          });
                        }}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <SelectValue placeholder="Any status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Any Status">Any Status</SelectItem>
                          <SelectItem
                            value="not_started"
                            className="flex items-center gap-2"
                          >
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            Not Started
                          </SelectItem>
                          <SelectItem
                            value="in_progress"
                            className="flex items-center gap-2"
                          >
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            In Progress
                          </SelectItem>
                          <SelectItem
                            value="review"
                            className="flex items-center gap-2"
                          >
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            Under Review
                          </SelectItem>
                          <SelectItem
                            value="completed"
                            className="flex items-center gap-2"
                          >
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Completed
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Similar styling for other condition types... */}
                  </div>
                )}

                {/* Add similar enhanced styling for all other condition types */}
              </div>
            )}

            {/* Apply To All Toggle */}
            {newRule.trigger && newRule.trigger !== "specific_task" && (
              <div className="flex items-center space-x-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <Switch
                  id="apply-to-all"
                  checked={newRule.applyToAll}
                  onCheckedChange={(checked) =>
                    setNewRule({ ...newRule, applyToAll: checked })
                  }
                  className="data-[state=checked]:bg-orange-600"
                />
                <label
                  htmlFor="apply-to-all"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Apply to all matching tasks (existing and future)
                </label>
              </div>
            )}

            {/* Actions Section */}
            {newRule.trigger && (
              <div className="border border-blue-200 dark:border-blue-800 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Actions
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      What should happen when this rule triggers
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {newRule.actions.map((action, index) => (
                    <div
                      key={index}
                      className="flex gap-4 items-start p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                      <div className="flex-1 space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Action Type
                        </label>
                        <Select
                          value={action.type}
                          onValueChange={(value) => {
                            const updatedActions = [...newRule.actions];
                            updatedActions[index] = {
                              ...updatedActions[index],
                              type: value,
                              value: "",
                            };
                            setNewRule({ ...newRule, actions: updatedActions });
                          }}
                        >
                          <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value="move_stage"
                              className="flex items-center gap-2"
                            >
                              🔄 Move to Stage
                            </SelectItem>
                            <SelectItem
                              value="change_status"
                              className="flex items-center gap-2"
                            >
                              📊 Change Status
                            </SelectItem>
                            <SelectItem
                              value="assign_user"
                              className="flex items-center gap-2"
                            >
                              👤 Assign to User
                            </SelectItem>
                            <SelectItem
                              value="set_due_date"
                              className="flex items-center gap-2"
                            >
                              📅 Set Due Date
                            </SelectItem>
                            <SelectItem
                              value="extend_due_date"
                              className="flex items-center gap-2"
                            >
                              ⏰ Extend Due Date
                            </SelectItem>
                            <SelectItem
                              value="set_priority"
                              className="flex items-center gap-2"
                            >
                              ⚡ Set Priority
                            </SelectItem>
                            <SelectItem
                              value="add_tag"
                              className="flex items-center gap-2"
                            >
                              🏷️ Add Tag
                            </SelectItem>
                            <SelectItem
                              value="remove_tag"
                              className="flex items-center gap-2"
                            >
                              🗑️ Remove Tag
                            </SelectItem>
                            <SelectItem
                              value="send_notification"
                              className="flex items-center gap-2"
                            >
                              📧 Send Notification
                            </SelectItem>
                            <SelectItem
                              value="create_subtask"
                              className="flex items-center gap-2"
                            >
                              ➕ Create Subtask
                            </SelectItem>
                            <SelectItem
                              value="add_comment"
                              className="flex items-center gap-2"
                            >
                              💬 Add Comment
                            </SelectItem>
                            <SelectItem
                              value="archive_task"
                              className="flex items-center gap-2"
                            >
                              📦 Archive Task
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex-1 space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Value
                        </label>
                        {/* Enhanced action value inputs with better styling */}
                        {action.type === "move_stage" && (
                          <Select
                            value={action.value}
                            onValueChange={(value) => {
                              const updatedActions = [...newRule.actions];
                              updatedActions[index].value = value;
                              setNewRule({
                                ...newRule,
                                actions: updatedActions,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                            <SelectContent>
                              {stages.map((stage) => (
                                <SelectItem
                                  key={stage.id}
                                  value={stage.id}
                                  className="flex items-center gap-2"
                                >
                                  <div
                                    className={`w-3 h-3 rounded-full ${stage.color}`}
                                  ></div>
                                  {stage.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Similar enhanced styling for other action types */}
                      </div>

                      {newRule.actions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updatedActions = [...newRule.actions];
                            updatedActions.splice(index, 1);
                            setNewRule({ ...newRule, actions: updatedActions });
                          }}
                          className="mt-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full border-dashed border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    onClick={() => {
                      setNewRule({
                        ...newRule,
                        actions: [...newRule.actions, { type: "", value: "" }],
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Action
                  </Button>
                </div>
              </div>
            )}

            {/* Rule Configuration */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-rule"
                    checked={newRule.enabled}
                    onCheckedChange={(checked) =>
                      setNewRule({ ...newRule, enabled: checked })
                    }
                    className="data-[state=checked]:bg-green-600"
                  />
                  <label
                    htmlFor="enable-rule"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Enable Rule
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="stop-on-first"
                    checked={newRule.stopOnFirst || false}
                    onCheckedChange={(checked) =>
                      setNewRule({ ...newRule, stopOnFirst: checked })
                    }
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <label
                    htmlFor="stop-on-first"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Stop after first match
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAutomationModalOpen(false)}
                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveAutomationRule}
                  disabled={
                    !newRule.name ||
                    !newRule.trigger ||
                    newRule.actions.some((a) => !a.type)
                  }
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                  Save Rule
                </Button>
              </div>
            </div>

            {/* Rule Preview */}
            {newRule.trigger && newRule.actions.some((a) => a.type) && (
              <div className="border border-green-200 dark:border-green-800 rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-green-800 dark:text-green-300">
                    Rule Preview
                  </h3>
                </div>
                <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <p>
                    <strong>When:</strong>{" "}
                    {getTriggerDescription(newRule.trigger, newRule.conditions)}
                  </p>
                  <p>
                    <strong>Then:</strong>{" "}
                    {getActionsDescription(newRule.actions)}
                  </p>
                  {newRule.applyToAll && (
                    <p>
                      <strong>Scope:</strong> Apply to all matching tasks
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Active Rules List */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Active Rules (
                    {automationRules.filter((r) => r.enabled).length})
                  </h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allEnabled = automationRules.every((r) => r.enabled);
                    setAutomationRules(
                      automationRules.map((r) => ({
                        ...r,
                        enabled: !allEnabled,
                      })),
                    );
                  }}
                  className="border-gray-300 dark:border-gray-600"
                >
                  {automationRules.every((r) => r.enabled)
                    ? "Disable All"
                    : "Enable All"}
                </Button>
              </div>

              {automationRules.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">
                    No automation rules configured yet
                  </p>
                  <p className="text-sm">
                    Create your first rule to automate your workflow
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {automationRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-4 border rounded-lg transition-all ${
                        rule.enabled
                          ? "bg-white dark:bg-gray-800 border-green-200 dark:border-green-800 shadow-sm"
                          : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {rule.name}
                            </p>
                            {rule.enabled ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                                Disabled
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            <strong>Trigger:</strong>{" "}
                            {getTriggerDescription(
                              rule.trigger,
                              rule.conditions,
                              stages,
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            <strong>Actions:</strong>{" "}
                            {getActionsDescription(rule.actions)}
                          </p>
                          {rule.lastTriggered && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                              Last triggered:{" "}
                              {new Date(rule.lastTriggered).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNewRule(rule)}
                            title="Edit rule"
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(checked) => {
                              setAutomationRules(
                                automationRules.map((r) =>
                                  r.id === rule.id
                                    ? { ...r, enabled: checked }
                                    : r,
                                ),
                              );
                            }}
                            className="data-[state=checked]:bg-green-600"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this rule?",
                                )
                              ) {
                                setAutomationRules(
                                  automationRules.filter(
                                    (r) => r.id !== rule.id,
                                  ),
                                );
                              }
                            }}
                            title="Delete rule"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
