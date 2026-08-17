"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square, Plus, Users, Timer } from "lucide-react";
import { toast } from "sonner";

export const formatSeconds = (seconds: number) => {
  if (!seconds || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${secs}s`;
};

type TaskTimeTrackerModalProps = {
  taskId: string;
  taskTitle: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTimeUpdated?: () => void;
};

export function TaskTimeTrackerModal({
  taskId,
  taskTitle,
  isOpen,
  onOpenChange,
  onTimeUpdated,
}: TaskTimeTrackerModalProps) {
  const [loading, setLoading] = useState(false);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [userBreakdown, setUserBreakdown] = useState<any[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);

  // Manual input states
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer states
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const fetchTimeLogs = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-log`);
      if (res.ok) {
        const data = await res.json();
        setTotalTimeSpent(data.totalTimeSpent || 0);
        setUserBreakdown(data.userBreakdown || []);
        setTimeLogs(data.timeLogs || []);
      }
    } catch (err) {
      console.error("Error fetching time logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTimeLogs();
    }
  }, [isOpen, taskId]);

  // Stopwatch effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleStartTimer = () => {
    setIsTimerRunning(true);
    toast.info("Timer started", { description: "Task time recording in progress..." });
  };

  const handleStopTimer = async () => {
    setIsTimerRunning(false);
    if (timerSeconds <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: timerSeconds,
          description: description || "Timer log",
        }),
      });

      if (!res.ok) throw new Error("Failed to save timer log");

      toast.success("Time logged successfully", {
        description: `Logged ${formatSeconds(timerSeconds)}`,
      });
      setTimerSeconds(0);
      setDescription("");
      fetchTimeLogs();
      onTimeUpdated?.();
    } catch (err) {
      toast.error("Failed to save time log");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hrs = parseInt(manualHours || "0", 10);
    const mins = parseInt(manualMinutes || "0", 10);
    const totalSecs = hrs * 3600 + mins * 60;

    if (totalSecs <= 0) {
      toast.error("Please enter a valid duration");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: totalSecs,
          description,
        }),
      });

      if (!res.ok) throw new Error("Failed to log time");

      toast.success("Time logged", {
        description: `Logged ${formatSeconds(totalSecs)}`,
      });
      setManualHours("");
      setManualMinutes("");
      setDescription("");
      fetchTimeLogs();
      onTimeUpdated?.();
    } catch (err) {
      toast.error("Failed to log time");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                <Timer className="h-4 w-4" />
              </div>
              Time Spent on Task
            </DialogTitle>
            <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs px-2.5 py-1">
              Total: {formatSeconds(totalTimeSpent)}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {taskTitle}
          </p>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Active Stopwatch Card */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Live Timer</p>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight mt-0.5">
                {formatSeconds(timerSeconds)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isTimerRunning ? (
                <Button
                  onClick={handleStartTimer}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-3.5"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5 fill-white" />
                  Start Timer
                </Button>
              ) : (
                <Button
                  onClick={handleStopTimer}
                  disabled={isSubmitting}
                  size="sm"
                  variant="destructive"
                  className="font-bold text-xs rounded-xl px-3.5"
                >
                  <Square className="h-3.5 w-3.5 mr-1.5 fill-white" />
                  Stop & Save
                </Button>
              )}
            </div>
          </div>

          {/* Manual Entry Form */}
          <form onSubmit={handleManualSubmit} className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Manual Time Entry</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Hours</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 1"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Minutes</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="e.g. 30"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg"
                />
              </div>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Note / Work Done</Label>
              <Input
                placeholder="What did you work on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs h-8 rounded-lg"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Time Log
            </Button>
          </form>

          {/* Team Member Time Breakdown (Manager Tracking View) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-indigo-500" />
              Team Time Breakdown (Manager Tracking)
            </h4>
            {userBreakdown.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {userBreakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={item.user?.image || ""} />
                        <AvatarFallback className="text-[9px] bg-indigo-600 text-white font-bold">
                          {item.user?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {item.user?.name || "Unknown User"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40">
                      {formatSeconds(item.totalSeconds)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                No time logged by team members yet
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
