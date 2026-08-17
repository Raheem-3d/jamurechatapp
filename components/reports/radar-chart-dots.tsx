"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Activity } from "lucide-react";

export interface RadarMetric {
  subject: string;
  score: number;
  fullMark: number;
}

interface RadarChartDotsProps {
  data: RadarMetric[];
  title?: string;
  description?: string;
  onSelectMetric?: (metric: RadarMetric) => void;
}

export default function RadarChartDots({
  data,
  title = "Team Performance Radar (Dots)",
  description = "Multidimensional efficiency metrics: On-Time Rate, Task Velocity, Workload Capacity, Stage Speed & Quality.",
  onSelectMetric,
}: RadarChartDotsProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md text-xs space-y-1">
          <div className="font-extrabold text-indigo-600 dark:text-indigo-400">
            📌 {d.subject}
          </div>
          <div className="text-slate-600 dark:text-slate-300 font-medium">
            Score: <span className="font-bold text-slate-900 dark:text-white">{d.score} / {d.fullMark || 100}</span>
          </div>
          <p className="text-[10px] text-indigo-500 font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
            Click dot for detailed report
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-4">
      <div>
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-600" />
          {title}
        </h4>
        {description && <p className="text-xs text-slate-500 font-medium">{description}</p>}
      </div>

      <div className="w-full h-72 cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="75%"
            data={data}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                onSelectMetric?.(e.activePayload[0].payload);
              }
            }}
          >
            <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 9 }} />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Team Efficiency Score"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="#6366f1"
              fillOpacity={0.45}
              // Prominent Dots styling as requested: Radar Chart - Dots
              dot={{
                r: 5,
                fill: "#6366f1",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 8,
                fill: "#4f46e5",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
