"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  ArrowLeft,
  Briefcase,
  Clock,
  ShieldAlert,
  Bell,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { AssigneeManager } from "@/components/assignee-manager";
import { toast } from "sonner";
import { RoleBasedAccess } from "@/lib/role-based-access";
import { useTeamUsers } from "@/hooks/use-team-users";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  image?: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  priority?: string;
  status?: string;
  deadline?: string;
  createdAt?: string;
  assignees: User[];
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function TaskAssigneesPage() {
  const params = useParams();
  const taskId = params.taskId as string;
  const router = useRouter();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Team users
  const { users: allUsers, loading: usersLoading } = useTeamUsers();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const taskResponse = await fetch(`/api/tasks/${taskId}`);
        if (!taskResponse.ok) throw new Error("Failed to fetch task");
        const taskData = await taskResponse.json();
        setTask(taskData);

        const assigneesResponse = await fetch(`/api/tasks/${taskId}/assignees`);
        if (assigneesResponse.ok) {
          const assigneesData = await assigneesResponse.json();
          setTask((prev) => (prev ? { ...prev, assignees: assigneesData } : null));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        toast.error("Error loading assignees data");
      } finally {
        setLoading(false);
      }
    };

    if (taskId) {
      fetchData();
    }
  }, [taskId]);

  if (loading || usersLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
          <div className="grid gap-6 lg:grid-cols-12 mt-6">
            <div className="lg:col-span-8 h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="lg:col-span-4 h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm p-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Project Not Found
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {error || "Could not load the requested project details."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="rounded-xl text-xs font-bold"
            >
              Go Back
            </Button>
            <Button
              size="sm"
              onClick={() => window.location.reload()}
              className="rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const getPriorityBadge = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case "URGENT":
      case "HIGH":
        return (
          <Badge className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-bold px-2 py-0.5">
            {priority}
          </Badge>
        );
      case "MEDIUM":
        return (
          <Badge className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-bold px-2 py-0.5">
            Medium
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[10px] font-bold px-2 py-0.5">
            {priority || "Normal"}
          </Badge>
        );
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "DONE":
        return (
          <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5">
            Completed
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-bold px-2 py-0.5">
            In Progress
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5">
            {status || "To Do"}
          </Badge>
        );
    }
  };

  return (
    <RoleBasedAccess
      allowedRoles={["ORG_ADMIN", "MANAGER", "SUPER_ADMIN"]}
      fallback={
        <div className="max-w-xl mx-auto py-16 px-4">
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Access Restricted
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You need administrative permissions to manage project team assignments.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="rounded-xl text-xs font-bold mx-auto"
            >
              Go Back
            </Button>
          </Card>
        </div>
      }
    >
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl px-2 -ml-2"
          >
            <Link href={`/dashboard/tasks/${taskId}`} className="flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Project Overview
            </Link>
          </Button>
        </div>

        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/80 shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                  Manage Project Team
                </h1>
                {getPriorityBadge(task.priority)}
                {getStatusBadge(task.status)}
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {task.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8.5 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-700 px-3.5 shadow-2xs"
            >
              <Link href={`/dashboard/tasks/${taskId}/record`}>
                <Layers className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                Task Flow & Records
              </Link>
            </Button>
          </div>
        </div>

        {/* Master 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 Cols): Assignee Search & Management */}
          <div className="lg:col-span-8 space-y-6 min-w-0">
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Team Members Directory
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500 mt-0.5">
                      Assign or unassign members to delegate project responsibilities.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {allUsers.length} Directory Users
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                <AssigneeManager
                  taskId={taskId}
                  allUsers={allUsers}
                  assignees={task.assignees || []}
                  onAssigneesChange={(newAssignees) =>
                    setTask((prev) => (prev ? { ...prev, assignees: newAssignees } : null))
                  }
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column (4 Cols): Active Team Summary & Project Info */}
          <div className="lg:col-span-4 space-y-5 min-w-0">
            {/* Active Assignees Card */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Assigned Members ({task.assignees?.length || 0})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4.5">
                {!task.assignees || task.assignees.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <p>No team members assigned yet.</p>
                    <p className="text-[10px] mt-1 text-slate-400">
                      Use the directory on the left to assign users.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {task.assignees.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80"
                      >
                        <Avatar className="h-7 w-7 border border-white dark:border-slate-800 shrink-0">
                          <AvatarImage src={user.image || user.avatar || ""} alt={user.name} />
                          <AvatarFallback className="bg-indigo-600 text-white font-bold text-[10px]">
                            {user.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {user.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Context & Specifications Card */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="pb-3.5 pt-4.5 px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60 shrink-0">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-bold text-slate-900 dark:text-white">
                      Project Specifications
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Overview & schedule details
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* 2-Column Metric Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Status Tile */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Status
                    </span>
                    <div>{getStatusBadge(task.status)}</div>
                  </div>

                  {/* Priority Tile */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Priority
                    </span>
                    <div>{getPriorityBadge(task.priority)}</div>
                  </div>
                </div>

                {/* Deadline Tile */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Target Deadline
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {task.deadline
                          ? format(new Date(task.deadline), "MMM dd, yyyy")
                          : "No deadline assigned"}
                      </span>
                    </div>
                  </div>
                  {task.deadline && (
                    <Badge variant="outline" className="text-[10px] font-extrabold border-slate-200 dark:border-slate-700 shrink-0">
                      Scheduled
                    </Badge>
                  )}
                </div>

                {/* Scope Description Snippet (if available) */}
                {task.description && (
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Description / Scope
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {task.description.replace(/<!--[\s\S]*?-->/g, "").trim() || "No additional description provided."}
                    </p>
                  </div>
                )}

                {/* Smart Notification Callout */}
                <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                    <Bell className="h-3.5 w-3.5" />
                  </div>
                  <div className="space-y-0.5 leading-relaxed">
                    <p className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                      Automatic Member Notification
                    </p>
                    <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                      Assigned members receive real-time alerts and automatic access to the project discussion thread.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleBasedAccess>
  );
}
