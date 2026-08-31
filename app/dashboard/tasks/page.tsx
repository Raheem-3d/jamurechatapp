"use client";

import { useState, useEffect } from "react";
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
import TaskCard from "@/components/task-card";
import TaskFilter from "@/components/task-filter";
import { PlusCircle, Loader2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { usePermissions } from "@/lib/rbac-utils";
import { cn } from "@/lib/utils";
import { TaskFlowAIAssistantModal } from "@/components/TaskFlowAIAssistantModal";
import { QuickSubtaskModal } from "@/components/quick-subtask-modal";
import { Zap } from "lucide-react";

import { useRouter } from "next/navigation";

export default function TasksPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [createdTasks, setCreatedTasks] = useState<any[]>([]);
  const [filteredAssignedTasks, setFilteredAssignedTasks] = useState<any[]>([]);
  const [filteredCreatedTasks, setFilteredCreatedTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [assignedPage, setAssignedPage] = useState(1);
  const [createdPage, setCreatedPage] = useState(1);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isQuickSubtaskModalOpen, setIsQuickSubtaskModalOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  const itemsPerPage = 4;
  const { toast } = useToast();
  const perms = usePermissions();

  const fetchTasks = async () => {
    if (!session?.user?.id) return;

    try {
      setIsLoading(true);

      // fetch assigned tasks
      const assignedResponse = await fetch(
        `/api/tasks?assignedTo=${session.user.id}`
      );

      // fetch created tasks
      const createdResponse = await fetch(
        `/api/tasks?createdBy=${session.user.id}`
      );

      if (assignedResponse.ok && createdResponse.ok) {
        const assignedData = await assignedResponse.json();
        const createdData = await createdResponse.json();

        setAssignedTasks(assignedData);
        setFilteredAssignedTasks(assignedData);

        setCreatedTasks(createdData);
        setFilteredCreatedTasks(createdData);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
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

    // Listen for task creation and assignment events to refresh automatically
    const handleRefresh = () => {
      console.log("🔔 Task/Project created or assigned - refreshing task list instantly");
      fetchTasks();
      try {
        router.refresh();
      } catch { }
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

  useEffect(() => {
    // Apply filters to tasks
    if (Object.keys(activeFilters).length === 0) {
      // No filters, show all tasks
      setFilteredAssignedTasks(assignedTasks);
      setFilteredCreatedTasks(createdTasks);
      return;
    }

    const filterTasks = (tasks: any[]) => {
      return tasks.filter((task) => {
        // Filter by status
        if (activeFilters.status && task.status !== activeFilters.status) {
          return false;
        }

        // Filter by priority
        if (
          activeFilters.priority &&
          task.priority !== activeFilters.priority
        ) {
          return false;
        }

        return true;
      });
    };

    setFilteredAssignedTasks(filterTasks(assignedTasks));
    setFilteredCreatedTasks(filterTasks(createdTasks));
  }, [activeFilters, assignedTasks, createdTasks]);

  // Group tasks by status
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
  const groupedCreatedTasks = groupTasksByStatus(filteredCreatedTasks);

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

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
        <div className="flex items-center space-x-2">
          <TaskFilter onFilterChange={handleFilterChange} />
          {perms.canCreateTasks && (
            <>
              {aiEnabled && (
                <Button
                  onClick={() => setIsAiModalOpen(true)}
                  className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium shadow-md shadow-purple-500/20 gap-1.5"
                >
                  <Sparkles className="h-4 w-4 text-purple-200 animate-pulse" />
                  Jamure AI
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setIsQuickSubtaskModalOpen(true)}
                className="rounded-xl border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-bold gap-1.5"
              >
                <Zap className="h-4 w-4" />
                Quick Subtask
              </Button>

              <Button asChild>
                <Link href="/dashboard/tasks/new">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Project
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <TaskFlowAIAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        target="NEW_PROJECT"
        onSuccess={() => {
          fetchTasks();
          try {
            router.refresh();
          } catch { }
        }}
      />

      <QuickSubtaskModal
        isOpen={isQuickSubtaskModalOpen}
        onClose={() => setIsQuickSubtaskModalOpen(false)}
        onSuccess={() => {
          fetchTasks();
          try {
            router.refresh();
          } catch { }
        }}
      />

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <Tabs defaultValue="assigned" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assigned">Assigned to Me</TabsTrigger>
            {perms.canCreateTasks && (
              <TabsTrigger value="created">Created by Me</TabsTrigger>
            )}

            <TabsTrigger value="kanban">Kanban View</TabsTrigger>
          </TabsList>

          <TabsContent value="assigned">
            <Card>
              <CardHeader>
                <CardTitle>Projects Assigned to Me</CardTitle>
                <CardDescription>
                  Projects that have been assigned to you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredAssignedTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      No tasks assigned to you
                    </p>

                    {perms.canCreateTasks && (
                      <>
                        <Button variant="outline" asChild>
                          <Link href="/dashboard/tasks/new">
                            Create a New Project
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                      {paginatedAssignedTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>

                    {totalAssignedPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t text-xs text-slate-500 font-medium">
                        <div>
                          Showing {Math.min((assignedPage - 1) * itemsPerPage + 1, filteredAssignedTasks.length)} - {Math.min(assignedPage * itemsPerPage, filteredAssignedTasks.length)} of {filteredAssignedTasks.length} projects
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={assignedPage === 1}
                            onClick={() => setAssignedPage((prev) => Math.max(prev - 1, 1))}
                            className="h-7 text-xs font-semibold rounded-xl px-2.5"
                          >
                            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalAssignedPages }, (_, i) => i + 1).map((pageNum) => (
                              <Button
                                key={pageNum}
                                variant={pageNum === assignedPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => setAssignedPage(pageNum)}
                                className={cn(
                                  "h-7 w-7 p-0 text-xs font-bold rounded-lg",
                                  pageNum === assignedPage
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                    : ""
                                )}
                              >
                                {pageNum}
                              </Button>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={assignedPage === totalAssignedPages}
                            onClick={() => setAssignedPage((prev) => Math.min(prev + 1, totalAssignedPages))}
                            className="h-7 text-xs font-semibold rounded-xl px-2.5"
                          >
                            Next
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="created">
            <Card>
              <CardHeader>
                <CardTitle>Projects Created by Me</CardTitle>
                <CardDescription>Projects that you have created</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredCreatedTasks.length === 0 ? (
                  <div className="text-center py-8">
                    {perms.canCreateTasks && (
                      <>
                        <p className="text-gray-500 mb-4">
                          No projects created by you
                        </p>
                        <Button variant="outline" asChild>
                          <Link href="/dashboard/tasks/new">
                            Create a New Projects
                          </Link>
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                      {paginatedCreatedTasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>

                    {totalCreatedPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t text-xs text-slate-500 font-medium">
                        <div>
                          Showing {Math.min((createdPage - 1) * itemsPerPage + 1, filteredCreatedTasks.length)} - {Math.min(createdPage * itemsPerPage, filteredCreatedTasks.length)} of {filteredCreatedTasks.length} projects
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={createdPage === 1}
                            onClick={() => setCreatedPage((prev) => Math.max(prev - 1, 1))}
                            className="h-7 text-xs font-semibold rounded-xl px-2.5"
                          >
                            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalCreatedPages }, (_, i) => i + 1).map((pageNum) => (
                              <Button
                                key={pageNum}
                                variant={pageNum === createdPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCreatedPage(pageNum)}
                                className={cn(
                                  "h-7 w-7 p-0 text-xs font-bold rounded-lg",
                                  pageNum === createdPage
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                    : ""
                                )}
                              >
                                {pageNum}
                              </Button>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={createdPage === totalCreatedPages}
                            onClick={() => setCreatedPage((prev) => Math.min(prev + 1, totalCreatedPages))}
                            className="h-7 text-xs font-semibold rounded-xl px-2.5"
                          >
                            Next
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kanban">
            <Card>
              <CardHeader>
                <CardTitle>Kanban Board</CardTitle>
                <CardDescription>
                  Visualize your projects by status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Todo Column */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                      <span className="h-2 w-2 rounded-full bg-gray-400 mr-2"></span>
                      To Do ({groupedAssignedTasks.TODO.length})
                    </h3>
                    <div className="space-y-3">
                      {groupedAssignedTasks.TODO.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          showActions={false}
                        />
                      ))}
                    </div>
                  </div>

                  {/* In Progress Column */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-blue-700 mb-3 flex items-center">
                      <span className="h-2 w-2 rounded-full bg-blue-400 mr-2"></span>
                      In Progress ({groupedAssignedTasks.IN_PROGRESS.length})
                    </h3>
                    <div className="space-y-3">
                      {groupedAssignedTasks.IN_PROGRESS.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          showActions={false}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Blocked Column */}
                  <div className="bg-red-50 rounded-lg p-4">
                    <h3 className="font-medium text-red-700 mb-3 flex items-center">
                      <span className="h-2 w-2 rounded-full bg-red-400 mr-2"></span>
                      Blocked ({groupedAssignedTasks.BLOCKED.length})
                    </h3>
                    <div className="space-y-3">
                      {groupedAssignedTasks.BLOCKED.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          showActions={false}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Done Column */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-medium text-green-700 mb-3 flex items-center">
                      <span className="h-2 w-2 rounded-full bg-green-400 mr-2"></span>
                      Done ({groupedAssignedTasks.DONE.length})
                    </h3>
                    <div className="space-y-3">
                      {groupedAssignedTasks.DONE.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          showActions={false}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
