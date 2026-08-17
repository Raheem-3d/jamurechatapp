"use client";

import type { ActivityLog as ActivityLogType } from "@/types/task";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Edit, Trash2, ArrowRight, UserCheck, Clock, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLogProps {
  activities: ActivityLogType[];
  showHeader?: boolean;
}

export function ActivityLog({ activities, showHeader = false }: ActivityLogProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "task_created":
        return <Plus className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
      case "task_updated":
        return <Edit className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />;
      case "task_deleted":
        return <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />;
      case "stage_moved":
      case "stage_changed":
        return <ArrowRight className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />;
      case "status_changed":
        return <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
      case "assignment_changed":
        return <UserCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />;
    }
  };

  const getActivityBadgeStyles = (type: string) => {
    switch (type) {
      case "task_created":
        return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60";
      case "task_updated":
        return "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60";
      case "task_deleted":
        return "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60";
      case "stage_moved":
      case "stage_changed":
        return "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-900/60";
      case "status_changed":
        return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/60";
      case "assignment_changed":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="w-full space-y-4">
      {showHeader && (
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              Activity Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Recent task updates
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No recent activity
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Activities will appear here as tasks are updated
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="group relative flex items-start gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-xs transition-all"
            >
              {/* Type Icon Badge */}
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800 shrink-0">
                {getActivityIcon(activity.type)}
              </div>

              <div className="flex-1 min-w-0">
                {/* Header row: User + Type Badge */}
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5 shrink-0 ring-1 ring-slate-200 dark:ring-slate-700">
                      <AvatarFallback className="text-[9px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                        {(activity.user?.name || "U")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {activity.user?.name || "User"}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-lg shrink-0 ${getActivityBadgeStyles(activity.type)}`}>
                    {activity.type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activity.description}
                </p>

                {/* Timestamp */}
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1.5">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}