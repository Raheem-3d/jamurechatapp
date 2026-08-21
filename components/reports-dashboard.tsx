"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Zap,
  Tag as TagIcon,
  Users,
  MessageSquare,
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  Image as ImageIcon,
  Film,
  Music,
  Building2,
  Search,
  ChevronRight,
  ShieldAlert,
  Loader2,
  ListTodo,
  FileCheck,
  History,
  AlertCircle,
  X,
  Sparkles,
  Award,
  ZapOff,
  RotateCcw,
  PieChart as PieIcon,
  Activity,
  Target,
  Eye,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

// High-Performance Interactive Recharts Components
import AreaChartInteractive, {
  AreaChartDataPoint,
} from "@/components/reports/area-chart-interactive";
import PieChartReports, {
  PieChartItem,
} from "@/components/reports/pie-chart-reports";
import RadarChartDots, {
  RadarMetric,
} from "@/components/reports/radar-chart-dots";
import RadialChartLabel, {
  RadialMetricItem,
} from "@/components/reports/radial-chart-label";

export default function ReportsDashboard() {
  const { isAdmin, canCreateTask } = usePermissions();
  const showCreatedTasks = isAdmin || canCreateTask;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Pagination states
  const [tasksPage, setTasksPage] = useState(1);
  const [recordsPage, setRecordsPage] = useState(1);
  const [workloadPage, setWorkloadPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [highlightType, setHighlightType] = useState<"fastest" | "slowest">("fastest");

  // Filters
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all" | "custom">(
    "30d",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [overviewData, setOverviewData] = useState<any>(null);
  const [detailedData, setDetailedData] = useState<any>(null);

  // Fetch report data
  const fetchReports = async () => {
    if (dateRange === "custom" && (!startDate || !endDate)) {
      return;
    }
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (dateRange === "7d") {
        queryParams.set(
          "startDate",
          subDays(new Date(), 7).toISOString().split("T")[0],
        );
      } else if (dateRange === "30d") {
        queryParams.set(
          "startDate",
          subDays(new Date(), 30).toISOString().split("T")[0],
        );
      } else if (dateRange === "90d") {
        queryParams.set(
          "startDate",
          subDays(new Date(), 90).toISOString().split("T")[0],
        );
      } else if (dateRange === "custom" && startDate && endDate) {
        queryParams.set("startDate", startDate);
        queryParams.set("endDate", endDate);
      }

      if (selectedDeptId) queryParams.set("departmentId", selectedDeptId);
      if (selectedUserId) queryParams.set("userId", selectedUserId);

      // Fetch Overview & Detailed data in parallel
      const [resOverview, resDetailed] = await Promise.all([
        fetch(`/api/reports/dashboard-overview?${queryParams.toString()}`),
        fetch(`/api/reports/detailed?${queryParams.toString()}`),
      ]);

      if (!resOverview.ok || !resDetailed.ok)
        throw new Error("Failed to load reporting data");

      const jsonOverview = await resOverview.json();
      const jsonDetailed = await resDetailed.json();

      setOverviewData(jsonOverview);
      setDetailedData(jsonDetailed);

      // Auto-select department if restricted admin has exactly 1 department option
      if (jsonOverview.departments && jsonOverview.departments.length === 1 && !selectedDeptId) {
        setSelectedDeptId(jsonOverview.departments[0].id);
      }
    } catch (err: any) {
      console.error("Reporting Error:", err);
      toast.error(err.message || "Failed to load detailed reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const refreshInterval = window.setInterval(() => {
      fetchReports();
    }, 30_000);

    return () => window.clearInterval(refreshInterval);
  }, [
    dateRange,
    startDate,
    endDate,
    selectedDeptId,
    selectedUserId,
  ]);

  useEffect(() => {
    setTasksPage(1);
    setRecordsPage(1);
    setWorkloadPage(1);
  }, [dateRange, startDate, endDate, selectedDeptId, selectedUserId, searchQuery]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!detailedData) return;
    try {
      let csvContent = "data:text/csv;charset=utf-8,";

      if (activeTab === "tasks" || activeTab === "overview") {
        csvContent +=
          "Task ID,Task Title,Status,Priority,Assigned User,Created By,Created Date,Deadline,Deadline Status,Delay (Hours)\n";
        detailedData.detailedTasks.forEach((t: any) => {
          csvContent += `"${t.id}","${t.title.replace(/"/g, '""')}","${t.status}","${t.priority}","${t.assignedUsers}","${t.creatorName}","${t.createdAt}","${t.deadline || "None"}","${t.deadlineStatus}","${t.delayHours}"\n`;
        });
      } else if (activeTab === "records") {
        csvContent +=
          "Record ID,Record Title,Status,Stage,Deadline (Due Date),Completed Date,Deadline Compliance,Rework Count,Created By,Assigned Users,Created Date\n";
        detailedData.detailedRecords.forEach((r: any) => {
          csvContent += `"${r.id}","${r.title.replace(/"/g, '""')}","${r.status}","${r.stageName}","${r.dueDate || "None"}","${r.completedAt || "In Progress"}","${r.deadlineStatus || "In Progress"}","${r.reworkCount || 0}","${r.creatorName}","${r.assignees}","${r.createdAt}"\n`;
        });
      } else if (activeTab === "workload") {
        csvContent +=
          "User Name,Department,Total Assigned Tasks,Completed Tasks,Pending Tasks,Overdue Tasks\n";
        detailedData.userWorkload.forEach((u: any) => {
          csvContent += `"${u.name}","${u.departmentName}","${u.totalAssignedTasks}","${u.completedTasks}","${u.pendingTasks}","${u.overdueTasks}"\n`;
        });
      } else if (activeTab === "timelogs") {
        csvContent +=
          "Time Log ID,Task Title,User Name,Logged Hours,Logged Minutes,Description,Date & Time\n";
        detailedData?.timeTrackingLogs?.forEach((l: any) => {
          csvContent += `"${l.id}","${l.taskTitle.replace(/"/g, '""')}","${l.userName}","${l.durationHours}","${l.durationMinutes}","${(l.description || "").replace(/"/g, '""')}","${l.createdAt}"\n`;
        });
      } else if (activeTab === "automations") {
        csvContent +=
          "Rule ID,Rule Name,Trigger Type,Status,Action Summary,Execution Time (ms),Date & Time\n";
        detailedData?.automationLogs?.forEach((a: any) => {
          csvContent += `"${a.id}","${a.ruleName.replace(/"/g, '""')}","${a.triggerType}","${a.status}","${(a.actionSummary || "").replace(/"/g, '""')}","${a.executionTimeMs}","${a.createdAt}"\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `JamureChat_Detailed_Report_${activeTab}_${format(new Date(), "yyyy-MM-dd")}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(encodedUri);

      toast.success("Detailed Report CSV exported successfully!");
    } catch (e) {
      toast.error("Failed to export CSV report");
    }
  };


  // Reset/Clear All Filters Handler
  const handleClearFilters = () => {
    if (!detailedData && !overviewData) {
      toast.info("Report data is still loading");
      return;
    }

    setSelectedUserId("");
    /*
      const csvRows: string[][] = [];
      const toCsvCell = (value: unknown) => {
        if (value === null || value === undefined) return "";
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
      };
      const appendSection = (
        title: string,
        headers: string[],
        rows: unknown[][],
      ) => {
        csvRows.push([title]);
        csvRows.push(headers);
        if (rows.length === 0) {
          csvRows.push(["No data available"]);
        } else {
          rows.forEach((row) => csvRows.push(row.map(toCsvCell)));
        }
        csvRows.push([]);
      };

      const tasks = detailedData?.detailedTasks || [];
      const records = detailedData?.detailedRecords || [];
      const workload = detailedData?.userWorkload || [];

      const appendTasks = (sectionTitle: string, rows: any[]) =>
        appendSection(
          sectionTitle,
          [
            "Task ID",
            "Task Title",
            "Status",
            "Priority",
            "Assigned Users",
            "Created By",
            "Created Date",
            "Deadline",
            "Deadline Status",
            "Delay (Hours)",
          ],
          rows.map((task) => [
            task.id,
            task.title,
            task.status,
            task.priority,
            task.assignedUsers,
            task.creatorName,
            task.createdAt,
            task.deadline,
            task.deadlineStatus,
            task.delayHours,
          ]),
        );

      const appendRecords = (sectionTitle: string, rows: any[]) =>
        appendSection(
          sectionTitle,
          [
            "Record ID",
            "Record Title",
            "Status",
            "Stage",
            "Deadline (Due Date)",
            "Completed Date",
            "Deadline Compliance",
            "Rework Count",
            "Created By",
            "Assigned Users",
            "Created Date",
            "Tags",
          ],
          rows.map((record) => [
            record.id,
            record.title,
            record.status,
            record.stageName,
            record.dueDate,
            record.completedAt,
            record.deadlineStatus,
            record.reworkCount,
            record.creatorName,
            record.assignees,
            record.createdAt,
            record.tags,
          ]),
        );

      const appendWorkload = (sectionTitle: string, rows: any[]) =>
        appendSection(
          sectionTitle,
          [
            "User ID",
            "User Name",
            "Email",
            "Department",
            "Assigned Tasks",
            "Completed Tasks",
            "Pending Tasks",
            "Overdue Tasks",
            "Created Records",
          ],
          rows.map((user) => [
            user.id,
            user.name,
            user.email,
            user.departmentName,
            user.totalAssignedTasks,
            user.completedTasks,
            user.pendingTasks,
            user.overdueTasks,
            user.totalCreatedRecords,
          ]),
        );

      if (activeTab === "overview") {
        appendSection(
          "Overview KPIs",
          ["Metric", "Value"],
          Object.entries(overviewData?.kpis || {}).map(([label, value]) => [
            label,
            value,
          ]),
        );
        appendSection(
          "Summary Metrics",
          ["Metric", "Value"],
          Object.entries(detailedData?.summary || {}).map(([label, value]) => [
            label,
            value,
          ]),
        );
        appendTasks("Task Performance", tasks);
        appendRecords("Record Performance", records);
        appendWorkload("Team Workload", workload);
        appendSection(
          "Task Status Breakdown",
          ["Status", "Count"],
          (overviewData?.taskStatusBreakdown || []).map((item: any) => [
            item.status,
            item.count,
          ]),
        );
        appendSection(
          "Task Priority Breakdown",
          ["Priority", "Count"],
          (overviewData?.taskPriorityBreakdown || []).map((item: any) => [
            item.priority,
            item.count,
          ]),
        );
        appendSection(
          "User Productivity",
          ["User ID", "Name", "Email", "Role", "Tasks Created", "Records Created", "Messages Sent"],
          (overviewData?.userProductivity || []).map((user: any) => [
            user.id,
            user.name,
            user.email,
            user.role,
            user.tasksCreated,
            user.recordsCreated,
            user.messagesSent,
          ]),
        );
        appendSection(
          "Tag Breakdown",
          ["Tag ID", "Tag Name", "Count"],
          (overviewData?.tagBreakdown || []).map((tag: any) => [tag.id, tag.name, tag.count]),
        );
        appendSection(
          "File Storage Breakdown",
          ["Type", "Count"],
          Object.entries(overviewData?.fileStorageBreakdown || {}).map(([type, count]) => [
            type,
            count,
          ]),
        );
        appendSection(
          "Time Tracking Logs",
          ["Log ID", "Task ID", "Task Title", "User", "Duration (Minutes)", "Duration (Hours)", "Description", "Created Date"],
          (detailedData?.timeTrackingLogs || []).map((log: any) => [
            log.id,
            log.taskId,
            log.taskTitle,
            log.userName,
            log.durationMinutes,
            log.durationHours,
            log.description,
            log.createdAt,
          ]),
        );
        appendSection(
          "Automation Logs",
          ["Log ID", "Rule Name", "Trigger Type", "Status", "Action Summary", "Execution Time (ms)", "Created Date"],
          (detailedData?.automationLogs || []).map((log: any) => [
            log.id,
            log.ruleName,
            log.triggerType,
            log.status,
            log.actionSummary,
            log.executionTimeMs,
            log.createdAt,
          ]),
        );
        appendSection(
          "Automation Rules",
          ["Rule ID", "Rule Name", "Trigger", "Enabled", "Creator", "Last Triggered", "Total Executions"],
          (detailedData?.automationReport || []).map((rule: any) => [
            rule.id,
            rule.name,
            rule.trigger,
            rule.enabled,
            rule.creatorName,
            rule.lastTriggered,
            rule.totalExecutions,
          ]),
        );
      } else if (activeTab === "tasks") {
        appendTasks("Task Performance", filteredTasks);
      } else if (activeTab === "records") {
        appendRecords("Record Performance", filteredRecords);
      } else if (activeTab === "workload") {
        appendWorkload("Team Workload", filteredWorkload);
      } else if (activeTab === "storage") {
        appendSection(
          "File Storage Breakdown",
          ["Type", "Count"],
          Object.entries(overviewData?.fileStorageBreakdown || {}).map(([type, count]) => [
            type,
            count,
          ]),
        );
      } else if (activeTab === "timelogs") {
        appendSection(
          "Time Tracking Logs",
          ["Log ID", "Task ID", "Task Title", "User", "Duration (Minutes)", "Duration (Hours)", "Description", "Created Date"],
          (detailedData?.timeTrackingLogs || []).map((log: any) => [
            log.id,
            log.taskId,
            log.taskTitle,
            log.userName,
            log.durationMinutes,
            log.durationHours,
            log.description,
            log.createdAt,
          ]),
        );
      } else if (activeTab === "automations") {
        appendSection(
          "Automation Logs",
          ["Log ID", "Rule Name", "Trigger Type", "Status", "Action Summary", "Execution Time (ms)", "Created Date"],
          (detailedData?.automationLogs || []).map((log: any) => [
            log.id,
            log.ruleName,
            log.triggerType,
            log.status,
            log.actionSummary,
            log.executionTimeMs,
            log.createdAt,
          ]),
        );
      }

      const csvContent = csvRows
        .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
        .join("\r\n");
      const blob = new Blob([`\uFEFF${csvContent}`], {
        type: "text/csv;charset=utf-8",
      });
      const encodedUri = URL.createObjectURL(blob);
  const filteredRecords = filterBySearch(detailedData?.detailedRecords, [
    "title",
    "assignees",
    "creatorName",
    "stageName",
  ]);
  const filteredWorkload = filterBySearch(detailedData?.userWorkload, [
    "name",
    "email",
  URL.revokeObjectURL(encodedUri);
    "departmentName",
  ]);

    */
    setSelectedDeptId("");
    setDateRange("all");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    toast.info("All report filters reset to default");
  };

  const summary = detailedData?.summary || {
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completedToday: 0,
    completedThisWeek: 0,
    completedThisMonth: 0,
    totalRecords: 0,
    completedRecords: 0,
    activeRecords: 0,
    overdueRecords: 0,
  };

  const filterBySearch = (items: any[] | undefined, fields: string[]) => {
    if (!searchQuery.trim() || !Array.isArray(items)) return items || [];
    const query = searchQuery.toLowerCase();
    return items.filter((item) =>
      fields.some((field) =>
        String(item[field] ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  };

  const filteredTasks = filterBySearch(detailedData?.detailedTasks, [
    "title",
    "assignedUsers",
    "creatorName",
    "status",
    "priority",
  ]);
  const filteredRecords = filterBySearch(detailedData?.detailedRecords, [
    "title",
    "assignees",
    "creatorName",
    "stageName",
  ]);
  const filteredWorkload = filterBySearch(detailedData?.userWorkload, [
    "name",
    "email",
    "departmentName",
  ]);

  const totalTasksPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE) || 1;
  const paginatedTasks = filteredTasks.slice(
    (tasksPage - 1) * ITEMS_PER_PAGE,
    tasksPage * ITEMS_PER_PAGE
  );

  const totalRecordsPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE) || 1;
  const paginatedRecords = filteredRecords.slice(
    (recordsPage - 1) * ITEMS_PER_PAGE,
    recordsPage * ITEMS_PER_PAGE
  );

  const totalWorkloadPages = Math.ceil(filteredWorkload.length / ITEMS_PER_PAGE) || 1;
  const paginatedWorkload = filteredWorkload.slice(
    (workloadPage - 1) * ITEMS_PER_PAGE,
    workloadPage * ITEMS_PER_PAGE
  );

  // 1. Area Chart - Interactive Data Computation
  const areaChartData: AreaChartDataPoint[] = (() => {
    const activityByDate = new Map<string, AreaChartDataPoint>();
    const getDateBucket = (value: string | Date) =>
      format(new Date(value), "yyyy-MM-dd");
    const getOrCreateBucket = (date: string) => {
      const existing = activityByDate.get(date);
      if (existing) return existing;
      const bucket = {
        date: format(new Date(`${date}T00:00:00`), "MMM dd"),
        completedTasks: 0,
        createdTasks: 0,
        createdRecords: 0,
        totalActivity: 0,
      };
      activityByDate.set(date, bucket);
      return bucket;
    };

    for (const task of detailedData?.detailedTasks || []) {
      if (task.createdAt) {
        const bucket = getOrCreateBucket(getDateBucket(task.createdAt));
        bucket.createdTasks += 1;
        bucket.totalActivity += 1;
      }
      if (task.status === "DONE" && task.updatedAt) {
        const bucket = getOrCreateBucket(getDateBucket(task.updatedAt));
        bucket.completedTasks += 1;
        bucket.totalActivity += 1;
      }
    }

    for (const record of detailedData?.detailedRecords || []) {
      if (record.createdAt) {
        const bucket = getOrCreateBucket(getDateBucket(record.createdAt));
        bucket.createdRecords += 1;
        bucket.totalActivity += 1;
      }
    }

    return Array.from(activityByDate.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, bucket]) => bucket);
  })();

  // 2. Pie Chart Data Computation
  const pieChartData: PieChartItem[] = (() => {
    if (overviewData?.taskPriorityBreakdown) {
      return overviewData.taskPriorityBreakdown.map((item: any) => ({
        name: `${item.priority.charAt(0) + item.priority.slice(1).toLowerCase()} Priority`,
        value: item.count,
        color:
          item.priority === "URGENT"
            ? "#ef4444"
            : item.priority === "HIGH"
              ? "#f59e0b"
              : item.priority === "MEDIUM"
                ? "#6366f1"
                : "#64748b",
      }));
    }
    return [];
  })();

  // 3. Radar Chart - Dots Data Computation
  const radarChartData: RadarMetric[] = (() => {
    const totalT = summary.totalTasks;
    const completionRate = totalT
      ? Math.round((summary.completedTasks / totalT) * 100)
      : 0;
    const onTimeRate = totalT
      ? Math.round(
          ((summary.completedTasks - summary.overdueTasks) / totalT) * 100,
        )
      : 0;
    const stageVelocity = detailedData?.stageAnalytics?.length
      ? Math.round(
          detailedData.stageAnalytics.reduce(
            (acc: number, s: any) => acc + s.conversionRate,
            0,
          ) / detailedData.stageAnalytics.length,
        )
      : 0;
    const recordQuality =
      summary.totalRecords > 0
        ? Math.round((summary.completedRecords / summary.totalRecords) * 100)
        : 0;
    const workloadScore = totalT
      ? Math.max(
          0,
          Math.round(((totalT - summary.overdueTasks) / totalT) * 100),
        )
      : 0;

    return [
      {
        subject: "Task Completion %",
        score: Math.max(0, Math.min(100, completionRate)),
        fullMark: 100,
      },
      {
        subject: "On-Time Speed",
        score: Math.max(0, Math.min(100, onTimeRate)),
        fullMark: 100,
      },
      {
        subject: "Workload Capacity",
        score: Math.max(0, Math.min(100, workloadScore)),
        fullMark: 100,
      },
      {
        subject: "Stage Velocity",
        score: Math.max(0, Math.min(100, stageVelocity)),
        fullMark: 100,
      },
      {
        subject: "Record Quality",
        score: Math.max(0, Math.min(100, recordQuality)),
        fullMark: 100,
      },
    ];
  })();

  // 4. Radial Chart - Label Data Computation
  const radialChartData: RadialMetricItem[] = (() => {
    const totalT = summary.totalTasks;
    const completionRate = totalT
      ? Math.round((summary.completedTasks / totalT) * 100)
      : 0;
    const onTimeDelivery = totalT
      ? Math.round(
          ((summary.completedTasks - summary.overdueTasks) / totalT) * 100,
        )
      : 0;
    const recordRatio =
      summary.totalRecords > 0
        ? Math.round((summary.completedRecords / summary.totalRecords) * 100)
        : 0;
    const teamEngagement = overviewData?.kpis?.completionRate ?? 0;

    return [
      {
        name: "Task Completion Target",
        value: Math.max(0, Math.min(100, completionRate)),
        fill: "#6366f1",
      },
      {
        name: "On-Time Delivery Rate",
        value: Math.max(0, Math.min(100, onTimeDelivery)),
        fill: "#10b981",
      },
      {
        name: "Record Accuracy Ratio",
        value: Math.max(0, Math.min(100, recordRatio)),
        fill: "#f59e0b",
      },
      {
        name: "Team Health Score",
        value: Math.max(0, Math.min(100, teamEngagement)),
        fill: "#a855f7",
      },
    ];
  })();

  const overallHealthScore = Math.round(
    radialChartData.reduce((acc, curr) => acc + curr.value, 0) /
      radialChartData.length,
  );

  const [showGuide, setShowGuide] = useState(false);
  const [guideSection, setGuideSection] = useState<"overview" | "tasks" | "records" | "workload" | "storage" | null>(null);

  const handleToggleGuide = (section: "overview" | "tasks" | "records" | "workload" | "storage") => {
    if (showGuide && guideSection === section) {
      setShowGuide(false);
      setGuideSection(null);
    } else {
      setShowGuide(true);
      setGuideSection(section);
    }
  };

  // Detail Modal State on Graph Click
  const [selectedChartDetail, setSelectedChartDetail] = useState<{
    chartType: "Area" | "Pie" | "Radar" | "Radial";
    title: string;
    subtitle: string;
    badgeText: string;
    color: string;
    metrics: { label: string; value: string | number }[];
    relatedTasks: any[];
    relatedRecords: any[];
  } | null>(null);

  // 1. Area Chart Click Handler
  const handleAreaClick = (dataPoint: AreaChartDataPoint) => {
    setSelectedChartDetail({
      chartType: "Area",
      title: `📈 Activity Details for ${dataPoint.date}`,
      subtitle: `Daily activity breakdown: ${dataPoint.completedTasks} tasks completed, ${showCreatedTasks ? `${dataPoint.createdTasks} tasks created, ` : ""}${dataPoint.createdRecords} records created.`,
      badgeText: `Total Score: ${dataPoint.totalActivity}`,
      color: "#6366f1",
      metrics: [
        { label: "Completed Tasks", value: dataPoint.completedTasks },
        ...(showCreatedTasks ? [{ label: "Created Tasks", value: dataPoint.createdTasks }] : []),
        { label: "Created Records", value: dataPoint.createdRecords },
        { label: "Total Combined Activity", value: dataPoint.totalActivity },
      ].filter(Boolean),
      relatedTasks: detailedData?.detailedTasks || [],
      relatedRecords: detailedData?.detailedRecords || [],
    });
  };

  // 2. Pie Chart Click Handler
  const handlePieClick = (item: PieChartItem) => {
    const priorityKey = item.name.split(" ")[0].toUpperCase();
    const matchingTasks =
      detailedData?.detailedTasks?.filter(
        (t: any) => (t.priority || "").toUpperCase() === priorityKey,
      ) ||
      detailedData?.detailedTasks ||
      [];

    setSelectedChartDetail({
      chartType: "Pie",
      title: `🥧 Priority Breakdown: ${item.name}`,
      subtitle: `Detailed inspection of all tasks with priority classification "${item.name}".`,
      badgeText: `${item.value} Tasks (${(item as any).percent || 0}%)`,
      color: item.color || "#a855f7",
      metrics: [
        { label: "Priority Category", value: item.name },
        { label: "Total Tasks", value: item.value },
        {
          label: "Share of Total Tasks",
          value: `${(item as any).percent || 0}%`,
        },
        { label: "Matching Task Count", value: matchingTasks.length },
      ],
      relatedTasks: matchingTasks,
      relatedRecords: [],
    });
  };

  // 3. Radar Chart - Dots Click Handler
  const handleRadarClick = (metric: RadarMetric) => {
    setSelectedChartDetail({
      chartType: "Radar",
      title: `🎯 Radar Performance Dimension: ${metric.subject}`,
      subtitle: `Multidimensional performance evaluation score and team diagnostic for ${metric.subject}.`,
      badgeText: `Score: ${metric.score} / ${metric.fullMark || 100}`,
      color: "#6366f1",
      metrics: [
        { label: "Performance Dimension", value: metric.subject },
        { label: "Evaluated Score", value: `${metric.score} / 100` },
        {
          label: "Performance Level",
          value:
            metric.score >= 85
              ? "Optimal (A+)"
              : metric.score >= 70
                ? "Good (B)"
                : "Needs Attention (C)",
        },
      ],
      relatedTasks: detailedData?.detailedTasks?.slice(0, 5) || [],
      relatedRecords: detailedData?.detailedRecords?.slice(0, 5) || [],
    });
  };

  // 4. Radial Chart - Label Click Handler
  const handleRadialClick = (arc: RadialMetricItem) => {
    setSelectedChartDetail({
      chartType: "Radial",
      title: `⭕ KPI Goal Progress: ${arc.name}`,
      subtitle: `Radial gauge metric status and target achievement breakdown for ${arc.name}.`,
      badgeText: `Achievement: ${arc.value}%`,
      color: arc.fill || "#10b981",
      metrics: [
        { label: "KPI Indicator", value: arc.name },
        { label: "Achievement Progress", value: `${arc.value}%` },
        {
          label: "Status",
          value: arc.value >= 80 ? "On Track 🟢" : "Requires Focus 🟡",
        },
      ],
      relatedTasks: detailedData?.detailedTasks?.slice(0, 5) || [],
      relatedRecords: detailedData?.detailedRecords?.slice(0, 5) || [],
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Control Header Bar */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md shrink-0">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
              Reporting & Analytics
              <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] px-2 py-0.5">
                Enterprise
              </Badge>
            </h1>

          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap w-full xl:w-auto xl:justify-end">
          {/* Department Select (Admin Only) */}
          {overviewData?.departments && overviewData.departments.length > 0 ? (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-2xs">
                <Building2 className="h-4 w-4 text-indigo-500 shrink-0" />
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-bold outline-none cursor-pointer"
                >
                  {overviewData?.departments?.length > 1 && (
                    <option value="" className="dark:bg-slate-900 font-medium">
                      All Departments
                    </option>
                  )}
                  {overviewData?.departments?.map((dept: any) => (
                    <option
                      key={dept.id}
                      value={dept.id}
                      className="dark:bg-slate-900 font-medium"
                    >
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Select (Admin Only) */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-2xs">
                <Users className="h-4 w-4 text-emerald-500 shrink-0" />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-bold outline-none cursor-pointer max-w-[130px] truncate"
                >
                  <option value="" className="dark:bg-slate-900 font-medium">
                    All Members
                  </option>
                  {overviewData?.allUsers?.map((u: any) => (
                    <option
                      key={u.id}
                      value={u.id}
                      className="dark:bg-slate-900 font-medium"
                    >
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <Badge
              variant="secondary"
              className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-xs px-3 py-1.5 rounded-2xl border border-amber-200 dark:border-amber-800"
            >
              🔒 Personal Employee Report
            </Badge>
          )}

          {/* Date Filter Buttons */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            {[
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "90d", label: "90 Days" },
              { id: "all", label: "All Time" },
              { id: "custom", label: "Custom" },
            ].map((btn: any) => (
              <button
                key={btn.id}
                onClick={() => {
                  setDateRange(btn.id as any);
                  if (btn.id !== "custom") {
                    setStartDate("");
                    setEndDate("");
                  }
                }}
                className={`px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                  dateRange === btn.id
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {dateRange === "custom" && (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 px-2 py-1 outline-none font-bold cursor-pointer"
              />
              <span className="text-slate-400 font-extrabold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 px-2 py-1 outline-none font-bold cursor-pointer"
              />
            </div>
          )}

          <Button
            size="sm"
            onClick={fetchReports}
            disabled={loading}
            variant="outline"
            className="h-9 rounded-2xl border-slate-200 dark:border-slate-800 gap-1 font-bold text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          {(selectedDeptId ||
            selectedUserId ||
            dateRange !== "all" ||
            startDate ||
            endDate ||
            searchQuery) && (
            <Button
              size="sm"
              onClick={handleClearFilters}
              variant="ghost"
              className="h-9 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 gap-1.5 font-bold text-xs border border-rose-200/60 dark:border-rose-900/60"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Filters
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="h-9 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-indigo-500/20 border-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Expandable Report Guide Banner */}
      {showGuide && guideSection && (
        <Card className="rounded-3xl border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-600" />
              Reporting Dashboard Guide: {
                guideSection === "overview" ? "Overview & Widgets" :
                guideSection === "tasks" ? "Task Performance" :
                guideSection === "records" ? "Record Performance" :
                guideSection === "workload" ? "Team Workload" : "Storage & Files"
              }
            </h3>
            <button
              onClick={() => {
                setShowGuide(false);
                setGuideSection(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="text-xs">
            {guideSection === "overview" && (
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                <p className="font-extrabold text-indigo-600 mb-1">📊 1. Overview & Widgets</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Is tab me workspace ka total status, task completion velocity, aur priority picture graphs ek nazar me dikhte hain.
                </p>
              </div>
            )}
            {guideSection === "tasks" && (
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                <p className="font-extrabold text-indigo-600 mb-1">🎯 2. Task Performance</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Har task ka timing, deadline compliance (Completed Before/After deadline), delay hours aur reassignments ka detailed log.
                </p>
              </div>
            )}
            {guideSection === "records" && (
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                <p className="font-extrabold text-indigo-600 mb-1">📄 3. Record Performance</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Har record ka stage status, rework count, aur assigned users ki complete list.
                </p>
              </div>
            )}
            {guideSection === "workload" && (
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                <p className="font-extrabold text-indigo-600 mb-1">👥 4. Team Workload</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Kaunsa employee kitne tasks aur records par kaam kar raha hai aur kis user par overdue risk hai.
                </p>
              </div>
            )}
            {guideSection === "storage" && (
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                <p className="font-extrabold text-indigo-600 mb-1">📁 6. Storage & Files</p>
                <p className="text-slate-600 dark:text-slate-300">
                  Is tab me workspace ki photos, videos, documents aur audio files ki storage and count stats dikhte hain.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Primary Tab Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 flex-wrap h-auto">
            <TabsTrigger
              value="overview"
              className="rounded-lg text-xs font-bold gap-1.5 px-3 py-1.5 flex items-center"
            >
              <BarChart3 className="h-4 w-4" /> Overview & Widgets
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleGuide("overview");
                }}
                className={`ml-1.5 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                  showGuide && guideSection === "overview"
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="View Guide"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="rounded-lg text-xs font-bold gap-1.5 px-3 py-1.5 flex items-center"
            >
              <ListTodo className="h-4 w-4 text-indigo-500" /> Task Performance
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleGuide("tasks");
                }}
                className={`ml-1.5 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                  showGuide && guideSection === "tasks"
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="View Guide"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </TabsTrigger>
            <TabsTrigger
              value="records"
              className="rounded-lg text-xs font-bold gap-1.5 px-3 py-1.5 flex items-center"
            >
              <FileCheck className="h-4 w-4 text-purple-500" /> Record
              Performance
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleGuide("records");
                }}
                className={`ml-1.5 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                  showGuide && guideSection === "records"
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="View Guide"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </TabsTrigger>
            <TabsTrigger
              value="workload"
              className="rounded-lg text-xs font-bold gap-1.5 px-3 py-1.5 flex items-center"
            >
              <Users className="h-4 w-4 text-emerald-500" /> Team Workload
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleGuide("workload");
                }}
                className={`ml-1.5 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                  showGuide && guideSection === "workload"
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="View Guide"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </TabsTrigger>
            <TabsTrigger
              value="storage"
              className="rounded-lg text-xs font-bold gap-1.5 px-3 py-1.5 flex items-center"
            >
              <ImageIcon className="h-4 w-4 text-indigo-500" /> Storage & Files
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleGuide("storage");
                }}
                className={`ml-1.5 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                  showGuide && guideSection === "storage"
                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="View Guide"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </TabsTrigger>
          </TabsList>

          {/* Search Box for Tabs */}
          {activeTab !== "overview" && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter results..."
                className="h-9 pl-9 pr-4 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 1: OVERVIEW & WIDGETS */}
        {/* -------------------------------------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-6 m-0">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Total Tasks
                  </p>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {summary.totalTasks}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-bold">
                    <span className="text-emerald-600">
                      {summary.completedTasks} Done
                    </span>
                    <span className="text-amber-600">
                      • {summary.pendingTasks} Pending
                    </span>
                    <span className="text-rose-600">
                      • {summary.overdueTasks} Overdue
                    </span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  <ListTodo className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Task Velocity
                  </p>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {summary.completedToday}{" "}
                    <span className="text-xs text-slate-500 font-normal">
                      Today
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-slate-500">
                    <span>{summary.completedThisWeek} This Week</span>
                    <span>• {summary.completedThisMonth} This Month</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Total Records
                  </p>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {summary.totalRecords}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-purple-600">
                    <span>{summary.completedRecords} Completed</span>
                    <span className="text-slate-500">
                      • {summary.activeRecords} Active
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>



          {/* Interactive Recharts Analytics Grid */}
          <div className="space-y-6 pt-2">


            {/* Row 1: Full-width Area Chart - Interactive */}
            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-6">
              <AreaChartInteractive
                data={areaChartData}
                onSelectPoint={handleAreaClick}
                showCreatedTasks={showCreatedTasks}
                title="1. Area Chart - Interactive (Task & Record Velocity Trend)"
                description="Click toggles or any data point on the chart to open detailed activity report."
              />
            </Card>

            {/* Row 2: 3-Column Grid for Pie Chart, Radar Chart (Dots), and Radial Chart (Label) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 2. Pie Chart */}
              <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-6 flex flex-col justify-between">
                <PieChartReports
                  data={pieChartData}
                  onSelectSlice={handlePieClick}
                  title="2. Pie Chart"
                  description="Click any priority slice to inspect matching tasks."
                />
              </Card>

              {/* 3. Radar Chart - Dots */}
              <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-6 flex flex-col justify-between">
                <RadarChartDots
                  data={radarChartData}
                  onSelectMetric={handleRadarClick}
                  title="3. Radar Chart - Dots"
                  description="Click any radar dot to view metric diagnostics."
                />
              </Card>

              {/* 4. Radial Chart - Label */}
              <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-6 flex flex-col justify-between md:col-span-2 lg:col-span-1">
                <RadialChartLabel
                  data={radialChartData}
                  overallScore={overallHealthScore}
                  onSelectArc={handleRadialClick}
                  title="4. Radial Chart - Label"
                  description="Click any progress arc to view achievement target details."
                />
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 2: TASK PERFORMANCE REPORT */}
        {/* -------------------------------------------------------------------------------- */}
        <TabsContent value="tasks" className="space-y-4 m-0">
          <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-indigo-600" /> Task
                  Performance Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Detailed performance breakdown for all tasks including
                  assigned users, deadline statuses, delay hours, and reopen
                  history.
                </CardDescription>
              </div>
              <Badge className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs">
                {filteredTasks.length} Tasks
              </Badge>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px] border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Task Title</th>
                    <th className="p-3.5">Assigned User</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Priority</th>
                    <th className="p-3.5">Allocated Days</th>
                    <th className="p-3.5">Deadline Status</th>
                    <th className="p-3.5">Reassigns</th>
                    <th className="p-3.5">Reopens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-12 text-slate-400"
                      >
                        No tasks match the selected report filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map((t: any) => (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3.5">
                          <p className="font-extrabold text-slate-900 dark:text-white">
                            {t.title}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            Created by {t.creatorName}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">
                          {t.assignedUsers}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            className={`font-bold text-[10px] ${
                              t.status === "DONE"
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                                : t.status === "IN_PROGRESS"
                                  ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                            }`}
                          >
                            {t.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-bold">
                          <span
                            className={
                              t.priority === "URGENT"
                                ? "text-rose-600"
                                : t.priority === "HIGH"
                                  ? "text-amber-600"
                                  : "text-slate-600"
                            }
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold">
                          {t.allocatedDays} Days
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex min-w-max items-center whitespace-nowrap rounded-xl px-2.5 py-1 text-[10px] font-extrabold leading-tight ${
                              t.deadlineStatus.includes("Before")
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200"
                                : t.deadlineStatus.includes("After") ||
                                    t.deadlineStatus.includes("Overdue")
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {t.deadlineStatus}
                            {t.delayHours > 0 && ` (${t.delayHours}h late)`}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-center">
                          {t.reassignCount}
                        </td>
                        <td className="p-3.5 font-bold text-center">
                          {t.reopenCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
            <PaginationControl
              currentPage={tasksPage}
              totalPages={totalTasksPages}
              totalItems={filteredTasks.length}
              onPageChange={setTasksPage}
            />
          </Card>
        </TabsContent>

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 3: RECORD PERFORMANCE REPORT */}
        {/* -------------------------------------------------------------------------------- */}
        <TabsContent value="records" className="space-y-4 m-0">
          {/* Executive Record Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-3xl border-purple-200/80 dark:border-purple-900/60 bg-white dark:bg-slate-900 shadow-xs p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Records Added To
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {summary.totalRecords}
                </h3>
                <p className="text-[10px] text-purple-600 font-bold mt-0.5">
                  Total Assigned/Created
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600">
                <FileCheck className="h-6 w-6" />
              </div>
            </Card>

            <Card className="rounded-3xl border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-slate-900 shadow-xs p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Completed Records
                </p>
                <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {summary.completedRecords}
                </h3>
                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                  {summary.totalRecords > 0
                    ? Math.round(
                        (summary.completedRecords / summary.totalRecords) * 100,
                      )
                    : 0}
                  % Success Rate
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </Card>

            <Card className="rounded-3xl border-amber-200/80 dark:border-amber-900/60 bg-white dark:bg-slate-900 shadow-xs p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Reworked Records
                </p>
                <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                  {summary.reworkedRecords || 0}
                </h3>
                <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                  Reopened or Moved Back
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600">
                <RotateCcw className="h-6 w-6" />
              </div>
            </Card>

            <Card className="rounded-3xl border-sky-200/80 dark:border-sky-900/60 bg-white dark:bg-slate-900 shadow-xs p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Active Records
                </p>
                <h3 className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 mt-0.5">
                  {summary.activeRecords}
                </h3>
                <p className="text-[10px] text-sky-600 font-bold mt-0.5">
                  Currently In Progress
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-600">
                <Clock className="h-6 w-6" />
              </div>
            </Card>
          </div>

          <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-purple-600" /> Detailed
                  Record Audit Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Detailed performance audit of all records including status,
                  rework history, and assigned team members.
                </CardDescription>
              </div>
              <Badge className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-extrabold text-xs">
                {filteredRecords.length} Records
              </Badge>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px] border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Record Name</th>
                    <th className="p-3.5">Current Stage</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Deadline (Due Date)</th>
                    <th className="p-3.5">Completed Date</th>
                    <th className="p-3.5">Rework History</th>
                    <th className="p-3.5">Assigned Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-slate-400"
                      >
                        No records match the selected report filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r: any) => (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3.5 font-extrabold text-slate-900 dark:text-white">
                          {r.title}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant="outline"
                            className="font-extrabold text-[10px]"
                          >
                            {r.stageName}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            className={`font-bold text-[10px] ${
                              r.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : r.status === "OVERDUE"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">
                          {r.dueDate
                            ? format(new Date(r.dueDate), "MMM d, yyyy")
                            : "None"}
                        </td>
                        <td className="p-3.5 font-bold">
                          {r.completedAt ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-extrabold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {format(
                                new Date(r.completedAt),
                                "MMM d, yyyy h:mm a",
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold text-[11px]">
                              ⏳ Not Completed Yet
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {r.reworkCount > 0 ? (
                            <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] gap-1">
                              <RotateCcw className="h-3 w-3" /> {r.reworkCount}{" "}
                              Rework(s)
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">
                              No Rework
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-600">
                          {r.assignees}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
            <PaginationControl
              currentPage={recordsPage}
              totalPages={totalRecordsPages}
              totalItems={filteredRecords.length}
              onPageChange={setRecordsPage}
            />
          </Card>
        </TabsContent>

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 4: TEAM WORKLOAD REPORT */}
        {/* -------------------------------------------------------------------------------- */}
        <TabsContent value="workload" className="space-y-4 m-0">
          <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" /> Current
                  Workload Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Active workload breakdown for every team member including
                  assigned tasks, pending items, and overdue risks.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px] border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">User Name</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Assigned Tasks</th>
                    <th className="p-3.5">Completed</th>
                    <th className="p-3.5">Pending</th>
                    <th className="p-3.5">Overdue Risks</th>
                    <th className="p-3.5">Created Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedWorkload.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-slate-400"
                      >
                        No team workload metrics found.
                      </td>
                    </tr>
                  ) : (
                    paginatedWorkload.map((u: any) => (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3.5">
                          <p className="font-extrabold text-slate-900 dark:text-white">
                            {u.name}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {u.email}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant="outline"
                            className="font-extrabold text-[10px]"
                          >
                            {u.departmentName}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-bold text-center">
                          {u.totalAssignedTasks}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-600 text-center">
                          {u.completedTasks}
                        </td>
                        <td className="p-3.5 font-bold text-amber-600 text-center">
                          {u.pendingTasks}
                        </td>
                        <td className="p-3.5 font-bold text-rose-600 text-center">
                          {u.overdueTasks}
                        </td>
                        <td className="p-3.5 font-bold text-purple-600 text-center">
                          {u.totalCreatedRecords}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
            <PaginationControl
              currentPage={workloadPage}
              totalPages={totalWorkloadPages}
              totalItems={filteredWorkload.length}
              onPageChange={setWorkloadPage}
            />
          </Card>
        </TabsContent>



        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 6: TIME TRACKING LOGS REPORT (Temporarily Commented Out) */}
        {/* -------------------------------------------------------------------------------- */}
        {/* <TabsContent value="timelogs" className="space-y-4 m-0">
          <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-cyan-500" /> Time Tracking & Logged Hours Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Detailed breakdown of work time logged by users across tasks.
                </CardDescription>
              </div>
              <Badge className="bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-extrabold text-xs">
                Total Logged: {summary.totalLoggedHours || 0} Hours
              </Badge>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px] border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Task Title</th>
                    <th className="p-3.5">Logged By User</th>
                    <th className="p-3.5">Logged Duration</th>
                    <th className="p-3.5">Work Description</th>
                    <th className="p-3.5">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {!detailedData?.timeTrackingLogs || detailedData.timeTrackingLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        No time logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    detailedData.timeTrackingLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-extrabold text-slate-900 dark:text-white">{log.taskTitle}</td>
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">{log.userName}</td>
                        <td className="p-3.5">
                          <Badge className="bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-extrabold text-[11px]">
                            ⏱️ {log.durationHours} Hours ({log.durationMinutes} mins)
                          </Badge>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">{log.description}</td>
                        <td className="p-3.5 text-slate-400 text-[10px]">
                          {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent> */}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 7: AUTOMATION EXECUTION LOGS REPORT (Temporarily Commented Out) */}
        {/* -------------------------------------------------------------------------------- */}
        {/* <TabsContent value="automations" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {detailedData?.automationReport?.map((rule: any) => (
              <Card key={rule.id} className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-rose-500" /> {rule.name}
                  </h4>
                  <Badge className={rule.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                    {rule.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 space-y-1 pt-1">
                  <p>Trigger: <span className="font-bold text-slate-800 dark:text-slate-200">{rule.trigger}</span></p>
                  <p>Total Executions: <span className="font-bold text-indigo-600">{rule.totalExecutions} times</span></p>
                  <p>Created By: <span className="font-semibold">{rule.creatorName}</span></p>
                </div>
              </Card>
            ))}
          </div>

          <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Zap className="h-5 w-5 text-rose-500" /> Automation Rule Execution Audit Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px] border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Rule Name</th>
                    <th className="p-3.5">Trigger Type</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Action Summary</th>
                    <th className="p-3.5">Execution Time</th>
                    <th className="p-3.5">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {!detailedData?.automationLogs || detailedData.automationLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        No automation execution logs found.
                      </td>
                    </tr>
                  ) : (
                    detailedData.automationLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-extrabold text-slate-900 dark:text-white">{log.ruleName}</td>
                        <td className="p-3.5 font-bold text-slate-600">{log.triggerType}</td>
                        <td className="p-3.5">
                          <Badge className={log.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
                            {log.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">{log.actionSummary}</td>
                        <td className="p-3.5 font-bold text-slate-500">{log.executionTimeMs} ms</td>
                        <td className="p-3.5 text-slate-400 text-[10px]">
                          {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent> */}

        {/* -------------------------------------------------------------------------------- */}
        {/* TAB 8: STORAGE & ATTACHMENTS REPORT */}
        {/* -------------------------------------------------------------------------------- */}
        <TabsContent value="storage" className="space-y-4 m-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">
                  Photos & Images
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {overviewData?.fileStorageBreakdown?.photos || 0}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                <ImageIcon className="h-6 w-6" />
              </div>
            </Card>

            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">
                  Videos & Media
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {overviewData?.fileStorageBreakdown?.videos || 0}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
                <Film className="h-6 w-6" />
              </div>
            </Card>

            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">
                  Documents & PDFs
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {overviewData?.fileStorageBreakdown?.docs || 0}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
                <FileText className="h-6 w-6" />
              </div>
            </Card>

            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500">
                  Voice & Audio
                </p>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {overviewData?.fileStorageBreakdown?.audio || 0}
                </h3>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                <Music className="h-6 w-6" />
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Interactive Chart Details Modal */}
      {selectedChartDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div
                  className="p-3 rounded-2xl text-white font-extrabold shadow-md"
                  style={{ backgroundColor: selectedChartDetail.color }}
                >
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      {selectedChartDetail.title}
                    </h3>
                    <Badge
                      className="font-extrabold text-xs"
                      style={{
                        backgroundColor: selectedChartDetail.color,
                        color: "#fff",
                      }}
                    >
                      {selectedChartDetail.badgeText}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {selectedChartDetail.subtitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedChartDetail(null)}
                className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Metrics Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedChartDetail.metrics.map((m, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-1"
                  >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {m.label}
                    </span>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white">
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Related Tasks Table */}
              {selectedChartDetail.relatedTasks &&
                selectedChartDetail.relatedTasks.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>
                        📋 Task Audit Breakdown (
                        {selectedChartDetail.relatedTasks.length})
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Filtered by clicked graph metric
                      </span>
                    </h4>
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
                          <tr>
                            <th className="p-3">Task Title</th>
                            <th className="p-3">Assignee</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Priority</th>
                            <th className="p-3">Deadline Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                          {selectedChartDetail.relatedTasks
                            .slice(0, 6)
                            .map((t: any) => (
                              <tr
                                key={t.id}
                                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                              >
                                <td className="p-3 font-extrabold text-slate-900 dark:text-white">
                                  {t.title}
                                </td>
                                <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                                  {t.assignedUsers}
                                </td>
                                <td className="p-3">
                                  <Badge
                                    className="font-extrabold text-[10px]"
                                    variant="secondary"
                                  >
                                    {t.status}
                                  </Badge>
                                </td>
                                <td className="p-3 font-bold">{t.priority}</td>
                                <td className="p-3 text-[11px] font-bold text-indigo-600">
                                  {t.deadlineStatus}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                💡 Tip: Click on any graph node, pie slice, radar dot, or radial
                arc to inspect detailed data.
              </span>
              <Button
                onClick={() => setSelectedChartDetail(null)}
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5"
              >
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PaginationControl = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 rounded-b-3xl">
      <div className="text-xs text-slate-500 font-medium">
        Showing page <span className="font-bold text-slate-950 dark:text-white">{currentPage}</span> of{" "}
        <span className="font-bold text-slate-950 dark:text-white">{totalPages}</span> ({totalItems} items)
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 rounded-xl px-2.5 text-xs font-bold gap-1 border-slate-200 dark:border-slate-800"
        >
          Previous
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
          .map((page, index, array) => {
            const showEllipsis = index > 0 && page - array[index - 1] > 1;
            return (
              <span key={page} className="flex items-center gap-1">
                {showEllipsis && <span className="text-slate-400 px-1 text-xs font-bold">...</span>}
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className={`h-8 w-8 p-0 rounded-xl text-xs font-bold ${
                    currentPage === page
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {page}
                </Button>
              </span>
            );
          })}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 rounded-xl px-2.5 text-xs font-bold gap-1 border-slate-200 dark:border-slate-800"
        >
          Next
        </Button>
      </div>
    </div>
  );
};
