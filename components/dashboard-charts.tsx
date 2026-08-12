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

// export function PerformanceRadarChart({
//   performanceData,
// }: {
//   performanceData: PerformanceDataPoint[];
// }) {
//   return (
//     <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
//       <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
//         <div className="flex items-center gap-2.5">
//           <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400">
//             <Activity className="h-4 w-4" />
//           </div>
//           <div>
//             <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
//               Performance Overview
//             </CardTitle>
//             <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400">
//               Multi-dimensional analysis
//             </CardDescription>
//           </div>
//         </div>
//       </CardHeader>
//       <CardContent className="p-4 pt-2">
//         <ResponsiveContainer width="100%" height={220}>
//           <RadarChart data={performanceData}>
//             <PolarGrid stroke="#cbd5e1" className="dark:stroke-slate-800" />
//             <PolarAngleAxis
//               dataKey="metric"
//               tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
//             />
//             <PolarRadiusAxis
//               angle={90}
//               domain={[0, 100]}
//               tick={{ fill: "#94a3b8", fontSize: 9 }}
//             />
//             <Radar
//               name="Performance"
//               dataKey="value"
//               stroke="#10b981"
//               fill="#10b981"
//               fillOpacity={0.5}
//               strokeWidth={2}
//               dot={{
//                 r: 3,
//                 fill: "#10b981",
//                 strokeWidth: 1.5,
//                 stroke: "#fff",
//               }}
//             />
//             <Tooltip
//               content={({ active, payload }: any) => {
//                 if (active && payload && payload.length) {
//                   return (
//                     <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-md">
//                       <p className="font-bold text-xs text-slate-900 dark:text-white mb-0.5">
//                         {payload[0].payload.metric}
//                       </p>
//                       <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
//                         Score: {payload[0].value.toFixed(1)}%
//                       </p>
//                     </div>
//                   );
//                 }
//                 return null;
//               }}
//             />
//           </RadarChart>
//         </ResponsiveContainer>
//       </CardContent>
//     </Card>
//   );
// }

// export default function DashboardCharts({
//   taskTrendData,
//   taskStatusData,
//   performanceData,
// }: DashboardChartsProps) {
//   return (
//     <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//       {/* Area Chart - Task Trends */}
//       <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
//         <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
//           <div className="flex items-center gap-2.5">
//             <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
//               <TrendingUp className="h-4 w-4" />
//             </div>
//             <div>
//               <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
//                 Task Trends
//               </CardTitle>
//               <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400">
//                 Last 7 days completion vs creation
//               </CardDescription>
//             </div>
//           </div>
//         </CardHeader>
//         <CardContent className="p-4 pt-3">
//           <ResponsiveContainer width="100%" height={210}>
//             <AreaChart data={taskTrendData}>
//               <defs>
//                 <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
//                   <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
//                   <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
//                 </linearGradient>
//                 <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
//                   <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
//                   <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
//                 </linearGradient>
//               </defs>
//               <CartesianGrid
//                 strokeDasharray="3 3"
//                 stroke="#cbd5e1"
//                 className="dark:stroke-slate-800"
//               />
//               <XAxis
//                 dataKey="date"
//                 stroke="#94a3b8"
//                 tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
//                 tickLine={false}
//               />
//               <YAxis
//                 stroke="#94a3b8"
//                 tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
//                 tickLine={false}
//                 width={24}
//               />
//               <Tooltip content={<CustomTooltip />} />
//               <Legend
//                 wrapperStyle={{
//                   paddingTop: "8px",
//                   fontSize: "11px",
//                   fontWeight: "600",
//                 }}
//                 iconType="circle"
//                 iconSize={7}
//               />
//               <Area
//                 type="monotone"
//                 dataKey="completed"
//                 stroke="#10b981"
//                 strokeWidth={2}
//                 fillOpacity={1}
//                 fill="url(#colorCompleted)"
//                 name="Completed"
//               />
//               <Area
//                 type="monotone"
//                 dataKey="created"
//                 stroke="#6366f1"
//                 strokeWidth={2}
//                 fillOpacity={1}
//                 fill="url(#colorCreated)"
//                 name="Created"
//               />
//             </AreaChart>
//           </ResponsiveContainer>
//         </CardContent>
//       </Card>

//       {/* Pie Chart - Task Status Distribution  */}
//       <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
//         <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
//           <div className="flex items-center gap-2.5">
//             <div className="p-1.5 bg-purple-50 dark:bg-purple-950/60 rounded-lg text-purple-600 dark:text-purple-400">
//               <PieChartIcon className="h-4 w-4" />
//             </div>
//             <div>
//               <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
//                 Task Status
//               </CardTitle>
//               <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400">
//                 Workspace status breakdown
//               </CardDescription>
//             </div>
//           </div>
//         </CardHeader>
//         <CardContent className="p-4 pt-3">
//           <ResponsiveContainer width="100%" height={210}>
//             <PieChart>
//               <Pie
//                 data={taskStatusData}
//                 cx="50%"
//                 cy="50%"
//                 labelLine={false}
//                 label={renderCustomizedLabel}
//                 outerRadius={70}
//                 dataKey="value"
//                 strokeWidth={2}
//                 stroke="#fff"
//               >
//                 {taskStatusData.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={entry.fill} />
//                 ))}
//               </Pie>
//               <Tooltip content={<CustomPieTooltip />} />
//               <Legend
//                 verticalAlign="bottom"
//                 height={24}
//                 iconType="circle"
//                 iconSize={7}
//                 wrapperStyle={{ fontSize: "10px", fontWeight: "600" }}
//                 formatter={(value, entry: any) => (
//                   <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
//                     {value} ({entry.payload.value})
//                   </span>
//                 )}
//               />
//             </PieChart>
//           </ResponsiveContainer>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
