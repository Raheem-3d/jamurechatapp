"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { PieChart as PieIcon } from "lucide-react";

export interface PieChartItem {
  name: string;
  value: number;
  color?: string;
}

interface PieChartReportsProps {
  data: PieChartItem[];
  title?: string;
  description?: string;
  onSelectSlice?: (item: PieChartItem) => void;
}

const DEFAULT_COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Rose
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#64748b", // Slate
];

export default function PieChartReports({
  data,
  title = "Task Priority & Distribution Pie Chart",
  description = "Visual slice percentage of tasks categorized by priority and status.",
  onSelectSlice,
}: PieChartReportsProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  const dataWithPercent = data.map((item, idx) => ({
    ...item,
    percent: totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : "0",
    color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
  }));

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (percent < 0.05) return null; // Hide labels for very small slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[11px] font-extrabold drop-shadow-md"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md text-xs space-y-1">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
            <span>{d.name}</span>
          </div>
          <div className="text-slate-600 dark:text-slate-300 font-medium">
            Count: <span className="font-bold text-slate-900 dark:text-white">{d.value}</span> ({d.percent}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-4">
      <div>
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <PieIcon className="h-4 w-4 text-purple-600" />
          {title}
        </h4>
        {description && <p className="text-xs text-slate-500 font-medium">{description}</p>}
      </div>

      <div className="w-full h-72 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataWithPercent}
              cx="50%"
              cy="48%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {dataWithPercent.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={activeIndex === index ? "#ffffff" : "transparent"}
                  strokeWidth={2}
                  onClick={() => onSelectSlice?.(entry)}
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    filter: activeIndex === index ? "drop-shadow(0px 6px 12px rgba(0,0,0,0.25))" : "none",
                    transform: activeIndex === index ? "scale(1.04)" : "scale(1)",
                    transformOrigin: "center center",
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: "11px", fontWeight: "bold", paddingTop: "10px" }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Count Display */}
        <div className="absolute inset-0 top-[-25px] flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white">{totalValue}</span>
          <span className="text-[10px] font-semibold text-slate-400">Total Tasks</span>
        </div>
      </div>
    </div>
  );
}
