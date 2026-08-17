"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useToast } from "./ui/use-toast";
import {
  PlusCircle,
  Loader2,
  Filter,
  Grid3X3,
  List,
  Search,
  Briefcase,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import TaskCard from "@/components/task-card";
import { Button } from "./ui/button";
import { usePermissions } from "@/lib/rbac-utils";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

const TaskFilter = ({
  onFilterChange,
}: {
  onFilterChange: (filters: any) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleFilterUpdate = (key: string, value: string) => {
    const newFilters = { ...filters };
    if (value === "all" || !value) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-200"
      >
        <Filter className="h-3.5 w-3.5 text-slate-500" />
        <span>Filters</span>
        {Object.keys(filters).length > 0 && (
          <span className="bg-indigo-600 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
            {Object.keys(filters).length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 p-4 min-w-56 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">
              Status
            </label>
            <select
              onChange={(e) => handleFilterUpdate("status", e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">
              Priority
            </label>
            <select
              onChange={(e) => handleFilterUpdate("priority", e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default function TasksPage() {
  const { data: session } = useSession();
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [createdTasks, setCreatedTasks] = useState<any[]>([]);
  const [filteredAssignedTasks, setFilteredAssignedTasks] = useState<any[]>([]);
  const [filteredCreatedTasks, setFilteredCreatedTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    {},
  );
  const [activeTab, setActiveTab] = useState("assigned");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);

  const perms = usePermissions() as any;
  const canCreateProjects = perms?.canCreateTasks;
  const isAdmin = session?.user?.role === "ORG_ADMIN";

  const itemsPerPage = viewMode === "grid" ? 6 : 8;

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/tasks/client");
        if (res.ok) {
          const data = await res.json();
          const assigned = data?.assignedTasks || [];
          const created = data?.createdTasks || [];
          setAssignedTasks(assigned);
          setCreatedTasks(created);
          setFilteredAssignedTasks(assigned);
          setFilteredCreatedTasks(created);

          if (assigned.length === 0 && created.length > 0) {
            setActiveTab("created");
          }
        }
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

  useEffect(() => {
    const filterTasks = (tasks: any[]) => {
      return tasks.filter((task) => {
        if (
          searchQuery &&
          !task.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !task.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        if (activeFilters.status && task.status !== activeFilters.status) {
          return false;
        }

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
  }, [activeFilters, assignedTasks, createdTasks, searchQuery]);

  // Reset pagination on state changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, activeFilters, viewMode]);

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

  const currentList =
    activeTab === "assigned" ? filteredAssignedTasks : filteredCreatedTasks;
  const totalPages = Math.ceil(currentList.length / itemsPerPage);
  const paginatedProjects = currentList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const ViewToggle = () => (
    <div className="flex bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200/80 dark:border-slate-700">
      <button
        onClick={() => setViewMode("grid")}
        className={cn(
          "p-1.5 rounded-lg text-xs transition-all",
          viewMode === "grid"
            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
        )}
        title="Grid View"
      >
        <Grid3X3 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setViewMode("list")}
        className={cn(
          "p-1.5 rounded-lg text-xs transition-all",
          viewMode === "list"
            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
        )}
        title="List View"
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {/* Control Strip & Tab Switchers */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("assigned")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5",
              activeTab === "assigned"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
            )}
          >
            <Briefcase className="h-3.5 w-3.5" />
            Assigned to Me
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-slate-200/60 dark:bg-slate-700"
            >
              {filteredAssignedTasks.length}
            </Badge>
          </button>

          {canCreateProjects && (
            <button
              onClick={() => setActiveTab("created")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5",
                activeTab === "created"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              Created by Me
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-slate-200/60 dark:bg-slate-700"
              >
                {filteredCreatedTasks.length}
              </Badge>
            </button>
          )}

          <button
            onClick={() => setActiveTab("kanban")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5",
              activeTab === "kanban"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
            )}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            Kanban View
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 lg:w-52 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <TaskFilter onFilterChange={setActiveFilters} />
          <ViewToggle />

          {canCreateProjects && (
            <Button
              asChild
              size="sm"
              className="h-8.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl px-3 py-2 shadow-xs"
            >
              <Link
                href="/dashboard/tasks/new"
                className="flex items-center gap-1"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                New Project
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-500">
            Loading workspace projects...
          </p>
        </div>
      ) : activeTab === "assigned" ? (
        filteredAssignedTasks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-2.5">
            <div className="w-11 h-11 mx-auto bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
              <Briefcase className="h-5 w-5" />
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">
              No assigned projects found
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs mx-auto">
              Projects assigned to you will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3"
                  : "space-y-2",
              )}
            >
              {paginatedProjects.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  admin={isAdmin}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 font-medium">
                <div>
                  Showing{" "}
                  {Math.min(
                    (currentPage - 1) * itemsPerPage + 1,
                    currentList.length,
                  )}{" "}
                  - {Math.min(currentPage * itemsPerPage, currentList.length)}{" "}
                  of {currentList.length} projects
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    className="h-7 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 px-2.5"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <Button
                          key={pageNum}
                          variant={
                            pageNum === currentPage ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "h-7 w-7 p-0 text-xs font-bold rounded-lg",
                            pageNum === currentPage
                              ? "bg-indigo-600 text-white hover:bg-indigo-700"
                              : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200",
                          )}
                        >
                          {pageNum}
                        </Button>
                      ),
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    className="h-7 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 px-2.5"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      ) : activeTab === "created" ? (
        filteredCreatedTasks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-2.5">
            <div className="w-11 h-11 mx-auto bg-purple-50 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
              <Layers className="h-5 w-5" />
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">
              No projects created yet
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs mx-auto">
              Get started by creating your first project using the button above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3"
                  : "space-y-2",
              )}
            >
              {paginatedProjects.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  admin={isAdmin}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 font-medium">
                <div>
                  Showing{" "}
                  {Math.min(
                    (currentPage - 1) * itemsPerPage + 1,
                    currentList.length,
                  )}{" "}
                  - {Math.min(currentPage * itemsPerPage, currentList.length)}{" "}
                  of {currentList.length} projects
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    className="h-7 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 px-2.5"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <Button
                          key={pageNum}
                          variant={
                            pageNum === currentPage ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "h-7 w-7 p-0 text-xs font-bold rounded-lg",
                            pageNum === currentPage
                              ? "bg-indigo-600 text-white hover:bg-indigo-700"
                              : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200",
                          )}
                        >
                          {pageNum}
                        </Button>
                      ),
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    className="h-7 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 px-2.5"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* Kanban View Matrix */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
          {[
            {
              title: "To Do",
              status: "TODO",
              color: "bg-slate-400",
              count: groupedAssignedTasks["TODO"]?.length || 0,
            },
            {
              title: "In Progress",
              status: "IN_PROGRESS",
              color: "bg-indigo-500",
              count: groupedAssignedTasks["IN_PROGRESS"]?.length || 0,
            },
            {
              title: "Blocked",
              status: "BLOCKED",
              color: "bg-rose-500",
              count: groupedAssignedTasks["BLOCKED"]?.length || 0,
            },
            {
              title: "Completed",
              status: "DONE",
              color: "bg-emerald-500",
              count: groupedAssignedTasks["DONE"]?.length || 0,
            },
          ].map((column) => (
            <div
              key={column.status}
              className="bg-slate-100/60 dark:bg-slate-900/60 rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-800 space-y-2.5"
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div
                    className={cn("h-2.5 w-2.5 rounded-full", column.color)}
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {column.title}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-extrabold px-2 py-0.5 bg-white dark:bg-slate-800 shadow-2xs"
                >
                  {column.count}
                </Badge>
              </div>

              <div className="space-y-2.5">
                {groupedAssignedTasks[column.status]?.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-4">
                    Empty column
                  </p>
                ) : (
                  groupedAssignedTasks[column.status]?.map((task: any) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      showActions={false}
                      compact={true}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
