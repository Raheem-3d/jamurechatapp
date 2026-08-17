"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export interface AreaChartDataPoint {
  date: string;
  completedTasks: number;
  createdTasks: number;
  createdRecords: number;
  totalActivity: number;
}

interface AreaChartInteractiveProps {
  data: AreaChartDataPoint[];
  title?: string;
  description?: string;
  onSelectPoint?: (data: AreaChartDataPoint) => void;
  showCreatedTasks?: boolean;
}

export default function AreaChartInteractive({
  data,
  title = "Task & Record Activity Velocity (Interactive Area Chart)",
  description = "Interactive time-series representation of workspace completed tasks, created tasks, and records over time.",
  onSelectPoint,
  showCreatedTasks = true,
}: AreaChartInteractiveProps) {
  const [activeMetric, setActiveMetric] = useState<"all" | "completed" | "created" | "records">("all");

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md text-xs space-y-2 min-w-[170px]">
          <p className="font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between">
            <span>📅 {label}</span>
            <span className="text-[10px] text-indigo-500 font-normal">Click for details</span>
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="text-slate-900 dark:text-white ml-2">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            {title}
          </h4>
          {description && <p className="text-xs text-slate-500 font-medium">{description}</p>}
        </div>

        {/* Interactive View Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-[11px] font-bold">
          <button
            onClick={() => setActiveMetric("all")}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              activeMetric === "all"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            All Metrics
          </button>
          <button
            onClick={() => setActiveMetric("completed")}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              activeMetric === "completed"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Completed Tasks
          </button>
          {showCreatedTasks && (
            <button
              onClick={() => setActiveMetric("created")}
              className={`px-2.5 py-1 rounded-xl transition-all ${
                activeMetric === "created"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Created Tasks
            </button>
          )}
          <button
            onClick={() => setActiveMetric("records")}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              activeMetric === "records"
                ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Records
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="w-full h-72 pt-2 cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                onSelectPoint?.(e.activePayload[0].payload);
              }
            }}
          >
            <defs>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorRecords" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} dy={5} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: "11px", fontWeight: "bold", paddingBottom: "10px" }}
            />

            {(activeMetric === "all" || activeMetric === "completed") && (
              <Area
                type="monotone"
                dataKey="completedTasks"
                name="Completed Tasks"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCompleted)"
                activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2, fill: "#ffffff" }}
              />
            )}

            {showCreatedTasks && (activeMetric === "all" || activeMetric === "created") && (
              <Area
                type="monotone"
                dataKey="createdTasks"
                name="Created Tasks"
                stroke="#6366f1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCreated)"
                activeDot={{ r: 6, stroke: "#6366f1", strokeWidth: 2, fill: "#ffffff" }}
              />
            )}

            {(activeMetric === "all" || activeMetric === "records") && (
              <Area
                type="monotone"
                dataKey="createdRecords"
                name="Created Records"
                stroke="#a855f7"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRecords)"
                activeDot={{ r: 6, stroke: "#a855f7", strokeWidth: 2, fill: "#ffffff" }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
