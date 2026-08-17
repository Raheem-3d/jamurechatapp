"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CalendarIcon,
  ArrowLeft,
  BellRing,
  Clock,
  Users,
  Tag,
  FileText,
  AlertTriangle,
  Zap,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}

interface CreateReminderFormProps {
  currentUser: User;
  users: User[];
}

export function CreateReminderForm({
  currentUser,
  users,
}: CreateReminderFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    remindAt: (() => {
      const d = new Date();
      d.setHours(d.getHours() + 1, 0, 0, 0);
      return d;
    })(),
    assigneeId: currentUser.id,
    priority: "MEDIUM",
    type: "GENERAL",
  });

  const isAdmin =
    currentUser.role === "ORG_ADMIN" ||
    currentUser.role === "SUPER_ADMIN" ||
    currentUser.role === "MANAGER";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Reminder title is required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          remindAt: formData.remindAt.toISOString(),
        }),
      });

      if (response.ok) {
        toast.success("Reminder created successfully");
        router.push("/dashboard/reminders");
        router.refresh();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to create reminder");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create reminder"
      );
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    {
      value: "LOW",
      label: "Low",
      icon: <Clock className="h-3.5 w-3.5" />,
      color:
        "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    },
    {
      value: "MEDIUM",
      label: "Medium",
      icon: <Zap className="h-3.5 w-3.5" />,
      color:
        "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    },
    {
      value: "HIGH",
      label: "High",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      color:
        "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    },
    {
      value: "URGENT",
      label: "Urgent",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      color:
        "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    },
  ];

  const typeOptions = [
    { value: "GENERAL", label: "General" },
    { value: "TASK_DEADLINE", label: "Task Deadline" },
    { value: "MEETING", label: "Meeting" },
    { value: "FOLLOW_UP", label: "Follow Up" },
    { value: "PERSONAL", label: "Personal" },
  ];

  const selectedAssignee = users.find((u) => u.id === formData.assigneeId);

  return (
    <div className="w-full space-y-4">
      {/* Top Header Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="h-9 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 px-3 shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
            Back
          </Button>

          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Create Reminder
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Set up a new reminder for yourself or team members
            </p>
          </div>
        </div>
      </div>

      {/* Form Content — 2-Column Layout */}
      <form onSubmit={handleSubmit}>
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT COLUMN (7 cols): Reminder Details */}
          <div className="lg:col-span-7 space-y-5 min-w-0">

            {/* Reminder Info Card */}
            <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  Reminder Information
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reminder Title <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter reminder title..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Add more details about this reminder..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm min-h-[80px] max-h-[140px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Priority</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {priorityOptions.map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setFormData({ ...formData, priority: opt.value })}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                          formData.priority === opt.value
                            ? cn(opt.color, "ring-2 ring-indigo-500/30 shadow-xs")
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Card */}
            <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 bg-violet-50 dark:bg-violet-950/60 rounded-lg text-violet-600 dark:text-violet-400">
                    <BellRing className="h-4 w-4" />
                  </div>
                  Schedule & Type
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-slate-400" />
                      Type
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                        {typeOptions.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs font-semibold">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Remind At — Date */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                      Remind At
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-10 justify-start text-left font-medium rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                          {format(formData.remindAt, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 rounded-xl border-slate-200 dark:border-slate-800 shadow-xl"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={formData.remindAt}
                          onSelect={(date) =>
                            date &&
                            setFormData((prev) => {
                              const d = new Date(date);
                              d.setHours(prev.remindAt.getHours(), prev.remindAt.getMinutes(), 0, 0);
                              return { ...prev, remindAt: d };
                            })
                          }
                          initialFocus
                          className="rounded-xl"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Time picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    Time
                  </Label>
                  <Input
                    type="time"
                    value={format(formData.remindAt, "HH:mm")}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(":").map(Number);
                      setFormData((prev) => {
                        const d = new Date(prev.remindAt);
                        d.setHours(hours, minutes, 0, 0);
                        return { ...prev, remindAt: d };
                      });
                    }}
                    className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Reminder will fire at{" "}
                    <span className="text-indigo-500 font-bold">
                      {format(formData.remindAt, "h:mm a, MMM d yyyy")}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN (5 cols): Assignee + Submit */}
          <div className="lg:col-span-5 space-y-5 min-w-0">

            {/* Assign To Card */}
            <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-blue-600 dark:text-blue-400">
                    <Users className="h-4 w-4" />
                  </div>
                  Assign To
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-3">
                {/* Selected assignee preview */}
                {selectedAssignee && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={selectedAssignee.image} />
                      <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">
                        {selectedAssignee.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {selectedAssignee.name}
                        {selectedAssignee.id === currentUser.id && (
                          <span className="ml-1.5 text-[10px] text-indigo-500 font-semibold">(You)</span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {selectedAssignee.email}
                      </p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  </div>
                )}

                {/* User list */}
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {(isAdmin ? users : users.filter((u) => u.id === currentUser.id)).map((user) => {
                    const isSelected = formData.assigneeId === user.id;
                    return (
                      <button
                        type="button"
                        key={user.id}
                        onClick={() => setFormData({ ...formData, assigneeId: user.id })}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left",
                          isSelected
                            ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        )}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={user.image} />
                          <AvatarFallback
                            className={cn(
                              "font-bold text-xs",
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            )}
                          >
                            {user.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {user.name}
                            {user.id === currentUser.id && (
                              <span className="ml-1.5 text-[10px] text-indigo-500 font-semibold">(You)</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {user.email}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {!isAdmin && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center font-medium">
                    Only admins & managers can assign reminders to others
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Submit Actions Card */}
            <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-3">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Priority</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {formData.priority}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Type</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
                      {typeOptions.find((t) => t.value === formData.type)?.label || formData.type}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Time</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {format(formData.remindAt, "h:mm a")}
                    </p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1 h-10 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !formData.title.trim()}
                    className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <BellRing className="h-4 w-4 mr-1.5" />
                        Create Reminder
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
