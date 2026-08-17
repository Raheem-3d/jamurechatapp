"use client";

import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Target } from "lucide-react";

export interface RadialMetricItem {
  name: string;
  value: number; // 0-100 percentage score
  fill: string;
}

interface RadialChartLabelProps {
  data: RadialMetricItem[];
  title?: string;
  description?: string;
  overallScore?: number;
  onSelectArc?: (item: RadialMetricItem) => void;
}

export default function RadialChartLabel({
  data,
  title = "Target KPI Completion Radial Gauge (Label)",
  description = "Progress arcs with percentage labels for On-time Completion, Workload Efficiency, and Record Accuracy.",
  overallScore,
  onSelectArc,
}: RadialChartLabelProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md text-xs space-y-1">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: d.fill }}
            />
            <span>{d.name}</span>
          </div>
          <div className="text-slate-600 dark:text-slate-300 font-medium">
            Score:{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {d.value}%
            </span>
          </div>
          <p className="text-[10px] text-emerald-600 font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
            Click label arc for details
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
          <Target className="h-4 w-4 text-emerald-600" />
          {title}
        </h4>
        {description && (
          <p className="text-xs text-slate-500 font-medium">{description}</p>
        )}
      </div>

      <div className="w-full h-72 relative cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="46%"
            innerRadius="25%"
            outerRadius="85%"
            barSize={16}
            data={data}
            startAngle={180}
            endAngle={-180}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload.length > 0) {
                onSelectArc?.(e.activePayload[0].payload);
              }
            }}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: "#f1f5f9" }}
              dataKey="value"
              cornerRadius={10}
              // Prominent numeric label as requested: Radial Chart - Label
              label={{
                position: "insideStart",
                fill: "#ffffff",
                fontSize: 10,
                fontWeight: "bold",
                formatter: (val: any) => `${val}%`,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconSize={10}
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{
                fontSize: "11px",
                fontWeight: "bold",
                paddingTop: "10px",
              }}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Central Label Score indicator */}
        <div className="absolute left-1/2 top-[46%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full  px-3 py-2 text-center shadow-sm dark:bg-slate-900/90 pointer-events-none">
          <span className="whitespace-nowrap text-md font-extrabold leading-none text-emerald-600 dark:text-emerald-400">
            {overallScore ?? 0}%
          </span>
          <span className="mt-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider leading-none text-slate-500">
            Overall Health
          </span>
        </div>
      </div>
    </div>
  );
}
