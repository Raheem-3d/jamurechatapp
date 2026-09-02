"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlarmClock,
  Plus,
  Bell,
  BellOff,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  MoreVertical,
  Trash2,
  User,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format, isAfter, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

interface RemindersMobileProps {
  currentUser: any;
  reminders: any[];
  onToggleMute: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

export function RemindersMobile({
  currentUser,
  reminders = [],
  onToggleMute,
  onDeleteReminder,
}: RemindersMobileProps) {
  const [filter, setFilter] = useState<"all" | "upcoming" | "muted" | "completed">("all");

  const filteredReminders = useMemo(() => {
    const now = new Date();
    return reminders.filter((item) => {
      const remindDate = new Date(item.remindAt);
      if (filter === "upcoming") {
        return !item.isSent && isAfter(remindDate, now);
      }
      if (filter === "muted") {
        return item.isMuted;
      }
      if (filter === "completed") {
        return item.isSent || isBefore(remindDate, now);
      }
      return true;
    });
  }, [reminders, filter]);

  const upcomingCount = useMemo(() => {
    const now = new Date();
    return reminders.filter((r) => !r.isSent && isAfter(new Date(r.remindAt), now)).length;
  }, [reminders]);

  return (
    <div className="flex flex-col gap-3.5 pb-28 w-full">
      {/* 1. Mobile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
            <AlarmClock className="w-3.5 h-3.5" />
            <span>Reminders & Alerts</span>
          </div>

          <Link
            href="/dashboard/reminders/create"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-transform"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New</span>
          </Link>
        </div>

        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          Reminders Hub
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
          Automate follow-ups, milestones, and personal deadline alerts
        </p>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { id: "all", label: `All (${reminders.length})` },
            { id: "upcoming", label: `Upcoming (${upcomingCount})` },
            { id: "muted", label: "Muted" },
            { id: "completed", label: "Past / Sent" },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id as any)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
                filter === chip.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Reminders List */}
      <div className="space-y-3">
        {filteredReminders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200/80 dark:border-slate-800 text-center shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <AlarmClock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No reminders found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              You have no active reminders matching this filter.
            </p>
            <Link
              href="/dashboard/reminders/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-2xl bg-indigo-600 text-white text-xs font-bold shadow-xs active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>Create Reminder</span>
            </Link>
          </div>
        ) : (
          filteredReminders.map((reminder) => {
            const remindDate = new Date(reminder.remindAt);
            const isPast = isBefore(remindDate, new Date());
            const dateFormatted = format(remindDate, "MMM d, yyyy • h:mm a");

            return (
              <div
                key={reminder.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 active:scale-[0.99] transition-transform"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {reminder.title}
                    </h3>
                    {reminder.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {reminder.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onToggleMute(reminder.id)}
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer",
                        reminder.isMuted
                          ? "bg-rose-50 dark:bg-rose-950/60 text-rose-500"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-600"
                      )}
                      title={reminder.isMuted ? "Unmute reminder" : "Mute reminder"}
                    >
                      {reminder.isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label="Options"
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 rounded-2xl shadow-xl text-xs">
                        <DropdownMenuItem
                          onClick={() => onDeleteReminder(reminder.id)}
                          className="flex items-center gap-2 text-rose-600 dark:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Meta Badges */}
                <div className="flex items-center gap-2 flex-wrap text-[10px]">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                    <Clock className="w-3 h-3" />
                    {dateFormatted}
                  </span>

                  {reminder.priority === "HIGH" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400">
                      High Priority
                    </span>
                  )}

                  {isPast ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Past
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  )}
                </div>

                {/* Assignee Footer */}
                {reminder.assignee?.name && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Assigned to: </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {reminder.assignee.name}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RemindersMobile;
