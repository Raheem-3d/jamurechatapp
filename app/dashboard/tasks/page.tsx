"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TaskFilter from "@/components/task-filter";
import TaskCard from "@/components/task-card";
import {
  Plus,
  PlusCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  CheckSquare,
  TrendingUp,
  Tag,
  Megaphone,
  Code2,
  Smartphone,
  Globe,
  Calendar as CalendarIcon,
  MoreVertical,
  LayoutGrid,
  Eye,
  Check,
  Filter,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { usePermissions } from "@/lib/rbac-utils";
import { cn, formatDate } from "@/lib/utils";
import { TaskFlowAIAssistantModal } from "@/components/TaskFlowAIAssistantModal";
import { QuickSubtaskModal } from "@/components/quick-subtask-modal";
import { TasksMobile } from "@/components/tasks/TasksMobile";
import { useRouter } from "next/navigation";

export default function TasksPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [createdTasks, setCreatedTasks] = useState<any[]>([]);
  const [filteredAssignedTasks, setFilteredAssignedTasks] = useState<any[]>([]);
  const [filteredCreatedTasks, setFilteredCreatedTasks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"assigned" | "created" | "kanban">("assigned");
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [assignedPage, setAssignedPage] = useState(1);
  const [createdPage, setCreatedPage] = useState(1);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isQuickSubtaskModalOpen, setIsQuickSubtaskModalOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  const itemsPerPage = 8;
  const { toast } = useToast();
  const perms = usePermissions();

  const fetchTasks = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);

      const [assignedRes, createdRes] = await Promise.all([
        fetch(`/api/tasks?assignedTo=${session.user.id}`),
        fetch(`/api/tasks?createdBy=${session.user.id}`),
      ]);

      if (assignedRes.ok && createdRes.ok) {
        const assignedData = await assignedRes.json();
        const createdData = await createdRes.json();

        setAssignedTasks(Array.isArray(assignedData) ? assignedData : []);
        setCreatedTasks(Array.isArray(createdData) ? createdData : []);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load projects & tasks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkAI = async () => {
      try {
        const res = await fetch("/api/organization/me");
        if (res.ok) {
          const payload = await res.json();
          if (payload?.organization?.aiEnabled !== undefined) {
            setAiEnabled(payload.organization.aiEnabled);
          }
        }
      } catch (err) {
        console.error("AI Check Error:", err);
      }
    };
    checkAI();
    fetchTasks();

    const handleRefresh = () => {
      fetchTasks();
      try {
        router.refresh();
      } catch {}
    };

    window.addEventListener("task:assigned", handleRefresh);
    window.addEventListener("task:created", handleRefresh);
    window.addEventListener("project:created", handleRefresh);
    window.addEventListener("project:updated", handleRefresh);

    return () => {
      window.removeEventListener("task:assigned", handleRefresh);
      window.removeEventListener("task:created", handleRefresh);
      window.removeEventListener("project:created", handleRefresh);
      window.removeEventListener("project:updated", handleRefresh);
    };
  }, [session, toast, router]);

  // Search & filter logic
  useEffect(() => {
    const applySearchAndFilter = (tasks: any[]) => {
      return tasks.filter((task) => {
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const titleMatch = task.title?.toLowerCase().includes(query);
          const descMatch = task.description?.toLowerCase().includes(query);
          if (!titleMatch && !descMatch) return false;
        }

        if (activeFilters.status && task.status !== activeFilters.status) {
          return false;
        }

        if (activeFilters.priority && task.priority !== activeFilters.priority) {
          return false;
        }

        return true;
      });
    };

    setFilteredAssignedTasks(applySearchAndFilter(assignedTasks));
    setFilteredCreatedTasks(applySearchAndFilter(createdTasks));
  }, [searchQuery, activeFilters, assignedTasks, createdTasks]);

  // Metric stats
  const stats = useMemo(() => {
    const all = Array.from(new Set([...assignedTasks, ...createdTasks]));
    const total = all.length;
    const completed = all.filter((t) => t.status === "DONE").length;
    const inProgress = all.filter((t) => t.status === "IN_PROGRESS").length;
    const blocked = all.filter((t) => t.status === "BLOCKED" || t.priority === "HIGH").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, blocked, completionRate };
  }, [assignedTasks, createdTasks]);

  // Group tasks for Kanban
  const groupTasksByStatus = (tasks: any[]) => {
    const grouped: Record<string, any[]> = {
      TODO: [],
      IN_PROGRESS: [],
      BLOCKED: [],
      DONE: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      } else {
        grouped["TODO"].push(task);
      }
    });

    return grouped;
  };

  const groupedAssignedTasks = groupTasksByStatus(filteredAssignedTasks);

  const totalAssignedPages = Math.ceil(filteredAssignedTasks.length / itemsPerPage);
  const paginatedAssignedTasks = filteredAssignedTasks.slice(
    (assignedPage - 1) * itemsPerPage,
    assignedPage * itemsPerPage
  );

  const totalCreatedPages = Math.ceil(filteredCreatedTasks.length / itemsPerPage);
  const paginatedCreatedTasks = filteredCreatedTasks.slice(
    (createdPage - 1) * itemsPerPage,
    createdPage * itemsPerPage
  );

  const handleFilterChange = (filters: any) => {
    setActiveFilters(filters);
    setAssignedPage(1);
    setCreatedPage(1);
  };

  const handleMarkAsDone = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE" }),
      });
      if (res.ok) {
        toast({ title: "Project marked as Completed!" });
        fetchTasks();
      }
    } catch {
      toast({ title: "Failed to update project", variant: "destructive" });
    }
  };

  const getProjectIconData = (task: any, index: number) => {
    const title = (task.title || "").toLowerCase();
    if (title.includes("app") || title.includes("mobile") || title.includes("redesign") || title.includes("ui")) {
      return {
        icon: <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
        bg: "bg-indigo-50 dark:bg-indigo-950/60",
      };
    }
    if (title.includes("market") || title.includes("campaign") || title.includes("growth") || title.includes("sales")) {
      return {
        icon: <Megaphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
        bg: "bg-emerald-50 dark:bg-emerald-950/60",
      };
    }
    if (title.includes("api") || title.includes("backend") || title.includes("integrat") || title.includes("code")) {
      return {
        icon: <Code2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
        bg: "bg-rose-50 dark:bg-rose-950/60",
      };
    }
    if (title.includes("web") || title.includes("site") || title.includes("portal")) {
      return {
        icon: <Globe className="w-5 h-5 text-sky-600 dark:text-sky-400" />,
        bg: "bg-sky-50 dark:bg-sky-950/60",
      };
    }

    const fallbacks = [
      { icon: <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />, bg: "bg-indigo-50 dark:bg-indigo-950/60" },
      { icon: <Megaphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />, bg: "bg-emerald-50 dark:bg-emerald-950/60" },
      { icon: <Code2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />, bg: "bg-rose-50 dark:bg-rose-950/60" },
      { icon: <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />, bg: "bg-purple-50 dark:bg-purple-950/60" },
    ];
    return fallbacks[index % fallbacks.length];
  };

  const renderStatusBadge = (task: any) => {
    if (task.status === "DONE") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
          Completed
        </span>
      );
    }
    if (task.status === "IN_PROGRESS") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
          In Progress
        </span>
      );
    }
    if (task.status === "BLOCKED" || task.priority === "HIGH") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
          High Priority
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
        To Do
      </span>
    );
  };

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

  if (!session) {
    return null;
  }

  return (
    <div className="w-full">
      {/* AI Assistant & Quick Subtask Modals */}
      <TaskFlowAIAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        target="NEW_PROJECT"
        onSuccess={() => {
          fetchTasks();
          try {
            router.refresh();
          } catch {}
        }}
      />

      <QuickSubtaskModal
        isOpen={isQuickSubtaskModalOpen}
        onClose={() => setIsQuickSubtaskModalOpen(false)}
        onSuccess={() => {
          fetchTasks();
          try {
            router.refresh();
          } catch {}
        }}
      />

      {/* ========================================================================= */}
      {/* 📱 MOBILE VIEW: Pure Native Mobile App Layout (block md:hidden)          */}
      {/* ========================================================================= */}
      <div className="block md:hidden w-full">
        <TasksMobile
          stats={stats}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          assignedTasks={assignedTasks}
          createdTasks={createdTasks}
          filteredAssignedTasks={filteredAssignedTasks}
          filteredCreatedTasks={filteredCreatedTasks}
          aiEnabled={aiEnabled}
          onOpenAiModal={() => setIsAiModalOpen(true)}
          onOpenQuickSubtask={() => setIsQuickSubtaskModalOpen(true)}
          onMarkAsDone={handleMarkAsDone}
          canCreateTasks={perms.canCreateTasks}
          assignedPage={assignedPage}
          setAssignedPage={setAssignedPage}
          createdPage={createdPage}
          setCreatedPage={setCreatedPage}
          itemsPerPage={itemsPerPage}
        />
      </div>



      {/* ========================================================================= */}
      {/* 💻 DESKTOP VIEW: Enterprise Desktop Layout (hidden md:block)             */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-6 pb-8 w-full max-w-7xl mx-auto">
        {/* Desktop Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-2">
              <FolderKanban className="w-4 h-4" />
              <span>Project Management</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Projects & Tasks
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Track milestones, deliverables, and assignments across your organization
            </p>
          </div>

          <div className="flex items-center gap-3">
            {perms.canCreateTasks && (
              <>
                {aiEnabled && (
                  <Button
                    onClick={() => setIsAiModalOpen(true)}
                    className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-md gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-purple-200 animate-pulse" />
                    <span>Jamure AI</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => setIsQuickSubtaskModalOpen(true)}
                  className="rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-bold gap-2"
                >
                  <Zap className="h-4 w-4" />
                  <span>Quick Subtask</span>
                </Button>

                <Button
                  asChild
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md gap-2"
                >
                  <Link href="/dashboard/tasks/new">
                    <PlusCircle className="h-4 w-4" />
                    <span>New Project</span>
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Desktop 4 Metric Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Projects</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FolderKanban className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white leading-none block">
                {stats.total}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> 14% this month
              </span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">In Progress</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white leading-none block">
                {stats.inProgress}
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-2 block">
                Currently Active
              </span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white leading-none block">
                {stats.completed}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2 block">
                {stats.completionRate}% completion rate
              </span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">High Priority</span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white leading-none block">
                {stats.blocked}
              </span>
              <span className="text-xs text-rose-500 font-bold mt-2 block">
                Needs Attention
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Search & Filters */}
        <div className="flex items-center justify-between gap-4 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setAssignedPage(1);
                setCreatedPage(1);
              }}
              placeholder="Search projects by title or description..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <TaskFilter onFilterChange={handleFilterChange} />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>

        {/* Desktop Tabs */}
        <Tabs defaultValue="assigned" value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
          <TabsList className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <TabsTrigger
              value="assigned"
              className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 shadow-xs"
            >
              <span>Assigned to Me</span>
              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-full text-xs font-bold">
                {filteredAssignedTasks.length}
              </span>
            </TabsTrigger>

            {perms.canCreateTasks && (
              <TabsTrigger
                value="created"
                className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 shadow-xs"
              >
                <span>Created by Me</span>
                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 rounded-full text-xs font-bold">
                  {filteredCreatedTasks.length}
                </span>
              </TabsTrigger>
            )}

            <TabsTrigger
              value="kanban"
              className="rounded-xl text-xs font-bold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 shadow-xs"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Kanban View</span>
            </TabsTrigger>
          </TabsList>

          {/* Desktop Tab Contents */}
          <TabsContent value="assigned" className="focus-visible:outline-none">
            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-white/90 dark:bg-slate-900/90">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 py-4 px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      Projects Assigned to Me
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                      Deliverables and milestones allocated to you
                    </CardDescription>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-xl">
                    {filteredAssignedTasks.length} items
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {isLoading ? (
                  <div className="flex flex-col justify-center items-center h-64 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-xs text-slate-400 font-medium">Loading your projects...</p>
                  </div>
                ) : filteredAssignedTasks.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <CheckSquare className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No assigned projects found</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">You have no pending projects assigned to you.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      {paginatedAssignedTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>

                    {totalAssignedPages > 1 && (
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                        <div>
                          Showing {(assignedPage - 1) * itemsPerPage + 1} - {Math.min(assignedPage * itemsPerPage, filteredAssignedTasks.length)} of {filteredAssignedTasks.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={assignedPage === 1}
                            onClick={() => setAssignedPage((p) => Math.max(p - 1, 1))}
                            className="rounded-xl"
                          >
                            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={assignedPage === totalAssignedPages}
                            onClick={() => setAssignedPage((p) => Math.min(p + 1, totalAssignedPages))}
                            className="rounded-xl"
                          >
                            Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="created" className="focus-visible:outline-none">
            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-white/90 dark:bg-slate-900/90">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 py-4 px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      Projects Created by Me
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                      Projects that you originated
                    </CardDescription>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-xl">
                    {filteredCreatedTasks.length} items
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {isLoading ? (
                  <div className="flex flex-col justify-center items-center h-64 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-xs text-slate-400 font-medium">Loading your projects...</p>
                  </div>
                ) : filteredCreatedTasks.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <FolderKanban className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No projects created yet</h3>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {paginatedCreatedTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kanban" className="focus-visible:outline-none">
            <div className="grid grid-cols-4 gap-4">
              {["TODO", "IN_PROGRESS", "BLOCKED", "DONE"].map((statusKey) => {
                const tasksInStatus = groupedAssignedTasks[statusKey] || [];
                const titleMap: Record<string, string> = {
                  TODO: "To Do",
                  IN_PROGRESS: "In Progress",
                  BLOCKED: "Blocked",
                  DONE: "Done",
                };
                return (
                  <div key={statusKey} className="bg-slate-50/80 dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {titleMap[statusKey]}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {tasksInStatus.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {tasksInStatus.map((t) => (
                        <TaskCard key={t.id} task={t} compact showActions={false} />
                      ))}
                      {tasksInStatus.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-6">No tasks</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
