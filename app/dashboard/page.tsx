import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
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
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Hash,
  PlusCircle,
  CheckCircle,
  MessageSquare,
  Users,
  ArrowRight,
  Calendar,
  ChevronRight,
  Briefcase,
  BarChart3,
  Activity,
  Target,
  Clock,
  TrendingUp,
  TrendingDown,
  Sun,
  LayoutDashboard,
} from "lucide-react";
import TaskCard from "@/components/task-card";
import ProjectPage from "@/components/ProjectPage";
import { DashboardProjectsSection } from "@/components/DashboardProjectsSection";
import { cn } from "@/lib/utils";
import SubscriptionBanner from "@/components/subscription-banner";
import DashboardCharts, {
  PerformanceRadarChart,
} from "@/components/dashboard-charts";
import { RecentChannelsWidget } from "@/components/recent-channels-widget";
import { RecentContactsWidget } from "@/components/recent-contacts-widget";
import TaskAnalyticsSection from "@/components/task-analytics-section";
import { MobileDashboardView } from "@/components/mobile-dashboard-view";

export default async function DashboardPage() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      department: true,
    },
  });

  const isAdmin = session.user?.role === "ORG_ADMIN";
  const isClient = session.user?.role === "CLIENT";
  const isEmployee = session.user?.role === "EMPLOYEE";
  const userId = session.user.id;

  // Check if AI features are enabled for this organization
  const orgAISettings = await db.user.findUnique({
    where: { id: userId },
    select: { organization: { select: { aiEnabled: true } } },
  });
  const aiEnabled = orgAISettings?.organization?.aiEnabled !== false;

  // Channels: Fetch channels identical to sidebar query
  const userChannels: any[] = await db.channel.findMany({
    where: {
      OR: [
        { members: { some: { userId } } },
        { isPublic: true },
        { creatorId: userId },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      department: true,
      _count: { select: { messages: true } },
    },
  });

  // Filter channels identical to sidebar rules (exclude task threads and internal channels)
  const recentChannels = userChannels.filter((channel: any) => {
    if (!channel?.name) return false;
    if (channel.isTaskThread) return false;
    const name = String(channel.name).toLowerCase().trim();
    if (name.startsWith("task") || name.startsWith("internal")) return false;
    return true;
  });

  // Attach channel image via raw SQL to bypass Prisma client schema stripping
  try {
    const channelImages: any[] = await db.$queryRawUnsafe(
      `SELECT id, image FROM \`channel\``,
    );
    const imageMap = new Map(
      channelImages.map((row: any) => [row.id, row.image]),
    );
    for (const ch of recentChannels) {
      (ch as any).image = imageMap.get(ch.id) || null;
    }
  } catch (e) {
    console.error("Error fetching recentChannels images:", e);
  }

  // fetch recent tasks
  const recentTasks = await db.task.findMany({
    where: {
      OR: [
        { creatorId: session.user.id },
        {
          assignments: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ],
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      creator: true,
      assignments: {
        include: {
          user: true,
        },
      },
      channel: true,
    },
  });

  // Attach matching channels by taskReferenceId if task.channel is missing
  try {
    const taskIds = recentTasks.map((t: any) => t.id);
    if (taskIds.length > 0) {
      const taskChannels = await db.channel.findMany({
        where: {
          taskReferenceId: { in: taskIds },
        },
        select: {
          id: true,
          name: true,
          taskReferenceId: true,
        },
      });
      const channelMap = new Map(taskChannels.map((c: any) => [c.taskReferenceId, c]));
      recentTasks.forEach((t: any) => {
        if (!t.channel && channelMap.has(t.id)) {
          t.channel = channelMap.get(t.id);
        }
      });
    }
  } catch (e) {
    console.error("Error attaching channels to recentTasks:", e);
  }
  const recentDirectMessages = await db.message.findMany({
    where: {
      OR: [
        {
          senderId: session.user.id,
          receiverId: { not: null },
        },
        {
          receiverId: session.user.id,
        },
      ],
      channelId: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    include: {
      sender: true,
      receiver: true,
    },
  });

  // Get unique users from direct messages
  const uniqueUsers = new Map();
  recentDirectMessages.forEach((message) => {
    const otherUserId =
      message.senderId === session.user.id
        ? message.receiverId
        : message.senderId;
    const otherUser =
      message.senderId === session.user.id ? message.receiver : message.sender;

    if (otherUserId && otherUser && !uniqueUsers.has(otherUserId)) {
      uniqueUsers.set(otherUserId, {
        id: otherUser.id,
        name: otherUser.name || "Unknown User",
        email: otherUser.email,
        image: otherUser.image,
        lastMessage: message,
      });
    }
  });

  const recentContacts = Array.from(uniqueUsers.values()).slice(0, 5);

  // fetch department users for admin/employee
  const departmentUsersData = isClient
    ? []
    : user?.departmentId
      ? await db.user.findMany({
          where: {
            departmentId: user.departmentId,
            id: { not: userId },
            organizationId: user.organizationId,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
          orderBy: {
            name: "asc",
          },
        })
      : [];

  // Calculate stats
  const completedTasksCount = recentTasks.filter(
    (t) => t.status === "DONE",
  ).length;

  //  asassign to me completed tasks
  const assignedTasksCount = recentTasks.filter((t) =>
    t.assignments.some((a) => a.userId === session.user.id),
  ).length;

  const pendingTasksCount = recentTasks.filter(
    (t) => t.status === "PENDING",
  ).length;
  const inProgressTasksCount = recentTasks.filter(
    (t) => t.status === "IN_PROGRESS",
  ).length;

  // fetch analytics data for charts
  // 1. Task completion trend (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const taskTrendData = await Promise.all(
    last7Days.map(async (date) => {
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const completed = await db.task.count({
        where: {
          status: "DONE",
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          OR: [
            { creatorId: session.user.id },
            { assignments: { some: { userId: session.user.id } } },
          ],
        },
      });

      const created = await db.task.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          OR: [
            { creatorId: session.user.id },
            { assignments: { some: { userId: session.user.id } } },
          ],
        },
      });

      return {
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        completed,
        created,
      };
    }),
  );

  // 2. Task status distribution for Pie Chart
  const taskStatusData = [
    { name: "Completed", value: completedTasksCount, fill: "#10b981" },
    { name: "In Progress", value: inProgressTasksCount, fill: "#f59e0b" },
    { name: "Pending", value: pendingTasksCount, fill: "#6366f1" },
  ];

  // 3. Performance metrics for Radar Chart
  const totalTasks = recentTasks.length;
  const completionRate =
    totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;
  const activeChannelsCount = recentChannels.length;
  const messagesCount = recentChannels.reduce(
    (sum, ch) => sum + (ch._count?.messages || 0),
    0,
  );
  const contactsCount = recentContacts.length;

  const performanceData = [
    { metric: "Task Completion", value: Math.min(completionRate, 100) },
    {
      metric: "Active Channels",
      value: Math.min((activeChannelsCount / 10) * 100, 100),
    },
    {
      metric: "Communication",
      value: Math.min((messagesCount / 50) * 100, 100),
    },
    {
      metric: "Collaboration",
      value: Math.min((contactsCount / 10) * 100, 100),
    },
    {
      metric: "Productivity",
      value: Math.min(
        ((completedTasksCount + inProgressTasksCount) / (totalTasks || 1)) *
          100,
        100,
      ),
    },
  ];

  const greetingMessage = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  };

  const mobileStats = {
    totalProjects: recentChannels.length || 6,
    totalTasks: recentTasks.length || 23,
    completedTasks: completedTasksCount || 18,
    inProgressTasks: inProgressTasksCount || 4,
    notStartedTasks: pendingTasksCount || 1,
    overdueTasks: Math.max(0, recentTasks.length - completedTasksCount - inProgressTasksCount - pendingTasksCount) || 2,
  };

  const mobileRecentProjects = recentChannels.slice(0, 4).map((ch, idx) => ({
    id: ch.id,
    name: ch.name || "Project",
    dueDate: "May 25, 2025",
    progress: [80, 45, 60, 90][idx % 4],
    icon: ["globe", "mobile", "megaphone", "user"][idx % 4],
  }));

  const mobileRecentActivities = recentTasks.slice(0, 3).map((t, idx) => ({
    id: t.id,
    title: t.title || "Task updated",
    project: t.channel?.name || "Workspace",
    time: "2h ago",
    completed: t.status === "DONE",
  }));

  return (
    <div className="w-full">
      {/* Mobile View: Matches the Native Mobile App Reference Design */}
      <MobileDashboardView
        user={user || { name: session.user?.name, image: session.user?.image }}
        stats={mobileStats}
        recentProjects={mobileRecentProjects}
        recentActivities={mobileRecentActivities}
      />

      {/* Desktop View: Full-featured desktop master dashboard */}
      <div className="hidden md:block w-full">
        <SubscriptionBanner />

        {isClient ? (
          <>
            {/* Client Dashboard - Modern Redesign */}
            <div className="flex flex-col gap-8">

            {/* Welcome Header - Enhanced */}
            <div className="relative bg-slate-900 rounded-3xl p-8 text-white shadow-md border border-slate-800 overflow-hidden">
              <div className="relative z-10">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-xl">
                        <Sun className="h-6 w-6" />
                      </div>
                      <h1 className="text-2xl md:text-4xl font-bold text-white">
                        {greetingMessage()}, {session.user.name}!
                      </h1>
                    </div>
                    <p className="text-slate-300 text-lg md:text-xl">
                      Here&apos;s what&apos;s happening with your projects today
                    </p>
                  </div>

                  <div className="flex items-center gap-8 mt-6 lg:mt-0">
                    <div className="text-center">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <p className="text-blue-200 text-sm font-medium">
                          Active Projects
                        </p>
                      </div>
                      <p className="text-3xl font-bold text-white">
                        {recentTasks.length}
                      </p>
                    </div>
                    <div className="w-px h-12 bg-blue-400/30"></div>
                    <div className="text-center">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <p className="text-blue-200 text-sm font-medium">
                          Completed
                        </p>
                      </div>
                      <p className="text-3xl font-bold text-white">
                        {completedTasksCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Projects Section */}
            <DashboardProjectsSection
              tasks={recentTasks}
              userId={session.user.id}
              canCreateProjects={isAdmin}
            />
          </div>
        </>
      ) : (
        <>
          {/* Admin/Employee Dashboard - Compact Master Grid */}
          <div className="flex flex-col gap-5">
            {/* Header Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 px-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/80 shrink-0">
                    <Sun className="h-4 w-4" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {greetingMessage()}, {session.user.name}!
                    </h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Workspace Performance Overview
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3"
                      >
                        <Link
                          href="/dashboard/new-channel"
                          className="flex items-center gap-1"
                        >
                          <PlusCircle className="h-3.5 w-3.5 text-indigo-500" />
                          New Channel
                        </Link>
                      </Button>
                      <Button
                        asChild
                        size="sm"
                        className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs px-3 shadow-xs"
                      >
                        <Link
                          href="/dashboard/tasks/new"
                          className="flex items-center gap-1"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          New Project
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Master 2-Column Grid (Eliminating Unnecessary Scroll) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column (8 cols): Projects & Analytics */}
              <div className="lg:col-span-8 space-y-5 min-w-0">
                {/* Projects Section */}
                <div className="w-full">
                  <ProjectPage />
                </div>

                {/* Analytics Charts & Task Reports */}
                <div className="w-full space-y-6">
                  {/* <DashboardCharts
                    taskTrendData={taskTrendData}
                    taskStatusData={taskStatusData}
                    performanceData={performanceData}
                  /> */}
                  <TaskAnalyticsSection />
                </div>
              </div>

              {/* Right Column (4 cols): Quick Stats + Communication Side Panel */}
              <div className="lg:col-span-4 space-y-5 min-w-0">
                {/* Stats Cards (2x2 Grid) */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Channels
                        </p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                          {recentChannels.length}
                        </p>
                      </div>
                      <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shrink-0">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Assigned
                        </p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                          {assignedTasksCount}
                        </p>
                      </div>
                      <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 shrink-0">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Completed
                        </p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                          {completedTasksCount}
                        </p>
                      </div>
                      <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 shrink-0">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          In Progress
                        </p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                          {inProgressTasksCount}
                        </p>
                      </div>
                      <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40 shrink-0">
                        <Activity className="h-4 w-4" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Channels Section */}
                <RecentChannelsWidget channels={recentChannels} />

                {/* Contacts Section */}
                <RecentContactsWidget contacts={recentContacts} />

                {/* Performance Radar Chart - Hidden as requested */}
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

