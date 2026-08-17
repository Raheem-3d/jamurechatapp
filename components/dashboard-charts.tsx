"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Label,
} from "recharts";
import { TrendingUp, PieChartIcon, Activity } from "lucide-react";

interface TaskTrendDataPoint {
  date: string;
  completed: number;
  created: number;
}

interface TaskStatusDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface PerformanceDataPoint {
  metric: string;
  value: number;
}

interface DashboardChartsProps {
  taskTrendData: TaskTrendDataPoint[];
  taskStatusData: TaskStatusDataPoint[];
  performanceData: PerformanceDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-white dark:bg-gray-800 p-3 shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white mb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-white dark:bg-gray-800 p-3 shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">
          {payload[0].name}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show label if segment is too small (<5%)

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className="font-bold text-xs"
      style={{
        fontSize: "11px",
        fontWeight: "700",
        filter: "drop-shadow(0px 1px 1px rgba(0, 0, 0, 0.5))",
      }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};
