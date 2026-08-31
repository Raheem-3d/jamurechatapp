import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAccessLevelInfo } from "@/lib/client-access";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDeadlineRange, getPriorityColor, getStatusColor } from "@/lib/utils";
import TaskStatusUpdate from "@/components/task-status-update";
import TaskComments from "@/components/task-comments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarClock,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  Briefcase,
  UserCheck,
  Zap,
  History,
  Shield,
  FileText,
  Edit3,
  Bell,
  Calendar,
} from "lucide-react";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }> | { taskId: string };
}) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const rawTask = await db.task.findUnique({
    where: {
      id: taskId,
    },
    include: {
      creator: true,
      assignments: {
        include: {
          user: true,
        },
      },
      taskcomment: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      channel: true,
    },
  });

  if (!rawTask) {
    notFound();
  }

  const task = {
    ...rawTask,
    comments: (rawTask as any).comments || (rawTask as any).taskcomment || [],
  };

  const userId = (session.user as any)?.id;

  // Check if user is authorized to view this task
  const isCreator = task.creatorId === userId;
  const isAssignee = task.assignments.some(
    (assignment: any) => assignment.userId === userId
  );

  // Check client access level efficiently without duplicate DB queries
  let clientAccessLevel: any = null;
  if (isCreator || isAssignee) {
    clientAccessLevel = "EDIT";
  } else {
    const taskClient = await db.taskClient.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId,
        },
      },
      select: { accessLevel: true },
    });
    clientAccessLevel = taskClient?.accessLevel || null;
  }

  const hasAccess = isCreator || isAssignee || clientAccessLevel !== null;

  if (!hasAccess) {
    redirect("/dashboard/tasks");
  }

  // Determine user permissions
  const canEdit = isCreator || isAssignee || clientAccessLevel === "EDIT";
  const canComment =
    isCreator ||
    isAssignee ||
    clientAccessLevel === "COMMENT" ||
    clientAccessLevel === "EDIT";
  const accessInfo =
    clientAccessLevel && !isCreator && !isAssignee
      ? getAccessLevelInfo(clientAccessLevel)
      : null;

  // Calculate days until deadline
  const daysUntilDeadline = task.deadline
    ? differenceInDays(new Date(task.deadline), new Date())
    : null;

  // Determine urgency
  const isUrgent =
    daysUntilDeadline !== null &&
    daysUntilDeadline <= 1 &&
    task.status !== "DONE";
  const isOverdue =
    daysUntilDeadline !== null &&
    daysUntilDeadline < 0 &&
    task.status !== "DONE";

  // Construct unified history log array sorted descending
  const historyEvents = [
    {
      id: `created-${task.id}`,
      title: "Project Created",
      description: `Created by ${task.creator.name} on ${formatDate(task.createdAt)}`,
      date: new Date(task.createdAt),
      iconType: "created",
      user: task.creator,
    },
    ...task.assignments.map((assignment: any) => ({
      id: `assignment-${assignment.id}`,
      title: "Team Member Assigned",
      description: `${assignment.user?.name || "Team Member"} was assigned on ${formatDate(assignment.createdAt)}`,
      date: new Date(assignment.createdAt),
      iconType: "assignment",
      user: assignment.user,
    })),
    ...(task.updatedAt &&
      new Date(task.updatedAt).getTime() !== new Date(task.createdAt).getTime()
      ? [
        {
          id: `updated-${task.id}-${task.updatedAt}`,
          title: `Status: ${task.status === "DONE" ? "Completed" : task.status}`,
          description: `Last updated on ${formatDate(task.updatedAt)}`,
          date: new Date(task.updatedAt),
          iconType: "status",
          user: null,
        },
      ]
      : []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Get priority icon
  const getPriorityIcon = () => {
    switch (task.priority) {
      case "LOW":
      case "MEDIUM":
        return <Clock className="h-3.5 w-3.5" />;
      case "HIGH":
        return <AlertTriangle className="h-3.5 w-3.5" />;
      case "URGENT":
        return <AlertCircle className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  // Get unique assignments by user ID to avoid displaying duplicate assignees
  const uniqueAssignments = Array.from(
    new Map(task.assignments.map((a: any) => [a.userId, a])).values()
  );

  return (
    <div className="w-full space-y-4">
      {/* Full Width Top Navigation & Task Header Strip */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 px-3 shrink-0"
          >
            <Link href="/dashboard/tasks">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
              Back
            </Link>
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                {task.title}
              </h1>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Badge
                  className={cn(
                    "rounded-lg px-2.5 py-0.5 font-bold text-xs shadow-2xs flex items-center gap-1",
                    getStatusColor(task.status)
                  )}
                >
                  {task.status === "DONE" && <CheckCircle className="h-3.5 w-3.5" />}
                  {task.status === "DONE" ? "Completed" : task.status}
                </Badge>

                <Badge
                  className={cn(
                    "rounded-lg px-2.5 py-0.5 font-bold text-xs shadow-2xs flex items-center gap-1",
                    getPriorityColor(task.priority)
                  )}
                >
                  {getPriorityIcon()}
                  <span>{task.priority} Priority</span>
                </Badge>

                {(task.deadline || (task as any).deadlineStart) && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-lg px-2.5 py-0.5 font-bold text-xs flex items-center gap-1 border",
                      isOverdue
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60"
                        : isUrgent
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900/60"
                          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    )}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    {isOverdue ? "Overdue: " : "Due: "}
                    {formatDeadlineRange(task.deadline, (task as any).deadlineStart, (task as any).deadlineEnd)}
                  </Badge>
                )}

                {accessInfo && (
                  <Badge className={cn("rounded-lg px-2.5 py-0.5 font-bold text-xs", accessInfo.color)}>
                    {accessInfo.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {task.channel && canComment && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-9 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-3.5"
            >
              <Link href={`/dashboard/channels/${task.channel.id}`}>
                <MessageSquare className="h-4 w-4 mr-1.5" />
                Task Thread
              </Link>
            </Button>
          )}
          {canEdit && (
            <Button
              size="sm"
              asChild
              className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs px-4 shadow-xs"
            >
              <Link href={`/dashboard/tasks/${task.id}/edit`}>
                <Edit3 className="h-4 w-4 mr-1.5" />
                Edit Task
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Full Width 2-Column Responsive Layout */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5 Cols): Task Overview, Description, Status, & Assignees */}
        <div className="lg:col-span-5 space-y-5 min-w-0">
          {/* Project Overview Card */}
          <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  Project Overview
                </CardTitle>

                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Avatar className="h-5 w-5 ring-1 ring-slate-200 dark:ring-slate-700">
                    <AvatarImage src={task.creator.image || ""} alt={task.creator.name} />
                    <AvatarFallback className="bg-indigo-600 text-white font-bold text-[9px]">
                      {task.creator.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {task.creator.name}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Description Box */}
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Description
                </p>
                <div className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {task.description || "No description provided."}
                </div>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Created
                  </p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    {formatDate(task.createdAt)}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                    Target Deadline
                  </p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5 truncate">
                    <CalendarClock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    {(task.deadline || (task as any).deadlineStart) ? formatDeadlineRange(task.deadline, (task as any).deadlineStart, (task as any).deadlineEnd) : "No deadline"}
                  </p>
                </div>
              </div>

              {/* Status Updater */}
              {(isAssignee || canEdit) && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <TaskStatusUpdate taskId={taskId} currentStatus={task.status} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignees Card */}
          <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <CardHeader className="pb-2.5 pt-3.5 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-indigo-500" />
                  Assignees ({uniqueAssignments.length})
                </CardTitle>
                {canEdit && (
                  <Link
                    href={`/dashboard/tasks/${task.id}/assignees`}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Manage Assignees
                  </Link>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {uniqueAssignments.length === 0 ? (
                <p className="text-slate-400 text-xs italic text-center py-2">No assignees added yet</p>
              ) : (
                <div className="flex items-center gap-2.5 flex-wrap">
                  {uniqueAssignments.map((assignment: any) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs font-bold text-slate-800 dark:text-slate-200"
                    >
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={assignment.user.image || ""} alt={assignment.user.name} />
                        <AvatarFallback className="bg-indigo-600 text-white font-bold text-[9px]">
                          {assignment.user.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold">{assignment.user.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (7 Cols): Main Discussion & Comments Section */}
        <div className="lg:col-span-7 min-w-0">
          <Tabs defaultValue="comments" className="w-full space-y-4">
            <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <TabsList className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl w-full justify-start gap-1">
                <TabsTrigger
                  value="comments"
                  className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-xs flex items-center gap-1.5"
                >
                  <MessageSquare className="h-4 w-4" />
                  Project Discussion & Comments
                  <Badge variant="secondary" className="text-[10px] font-extrabold px-1.5 py-0 bg-slate-200/70 dark:bg-slate-700">
                    {task.comments.length}
                  </Badge>
                </TabsTrigger>

                <TabsTrigger
                  value="history"
                  className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-xs flex items-center gap-1.5"
                >
                  <History className="h-4 w-4" />
                  History Log
                </TabsTrigger>

                {accessInfo && (
                  <TabsTrigger
                    value="permissions"
                    className="rounded-lg text-xs font-bold px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-xs flex items-center gap-1.5"
                  >
                    <Shield className="h-4 w-4" />
                    Access Rights
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* Comments Tab */}
            <TabsContent value="comments" className="mt-0">
              <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-indigo-500" />
                      Discussion Feed
                    </span>
                    {!canComment && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                        View-only mode
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <TaskComments taskId={task.id} comments={task.comments} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Log Tab */}
            <TabsContent value="history" className="mt-0">
              <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="h-4 w-4 text-indigo-500" />
                    Project History Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="space-y-3.5">
                    {historyEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                      >
                        {event.iconType === "assignment" && event.user ? (
                          <Avatar className="h-8 w-8 ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                            <AvatarImage src={event.user.image || ""} alt={event.user.name} />
                            <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">
                              {event.user.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                        ) : event.iconType === "status" ? (
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/60 font-bold">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/60 font-bold">
                            <Briefcase className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-xs">{event.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Access Rights Tab */}
            {accessInfo && (
              <TabsContent value="permissions" className="mt-0">
                <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                  <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                      Access Rights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className={cn("p-4 rounded-xl text-xs font-bold", accessInfo.color)}>
                      <h3 className="font-extrabold text-sm mb-1">{accessInfo.label}</h3>
                      <p className="text-xs opacity-90 font-normal">{accessInfo.description}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-2">
                        Granted Permissions:
                      </h4>
                      <ul className="space-y-2">
                        {accessInfo.permissions.map((permission, index) => (
                          <li key={index} className="flex items-center text-xs text-slate-600 dark:text-slate-400 font-medium">
                            <CheckCircle className="h-4 w-4 mr-2 text-emerald-500 shrink-0" />
                            {permission}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}



