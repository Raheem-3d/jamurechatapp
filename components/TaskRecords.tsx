"use client";

import { useState } from "react";
import type { Task, Tag, User, Stage } from "@/types/task";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, MoreHorizontal, Calendar, TagIcon } from "lucide-react";
import { formatDate } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskRecordsProps {
  tasks: Task[];
  tags: Tag[];
  users: User[];
  stages: Stage[];
  onTaskClick: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const getStageColorStyles = (color?: string) => {
  if (!color) return "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/40";
  const c = color.toLowerCase();
  if (c.includes("blue")) return "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900/40";
  if (c.includes("green") || c.includes("emerald")) return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40";
  if (c.includes("yellow") || c.includes("amber")) return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/40";
  if (c.includes("purple") || c.includes("violet")) return "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/40";
  if (c.includes("pink") || c.includes("rose")) return "bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-100 dark:border-pink-900/40";
  if (c.includes("red")) return "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/40";
  return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
};

export function TaskRecords({
  stages,
  tasks,
  tags,
  users,
  onTaskClick,
  onDeleteTask,
}: TaskRecordsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string>("");

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      task.tags.some((tag) => selectedTags.includes(tag.id));

    const matchesPriority =
      !selectedPriority || task.priority === selectedPriority;

    return matchesSearch && matchesTags && matchesPriority;
  });

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60";
      case "high":
        return "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-900/60";
      case "medium":
        return "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60";
      case "low":
        return "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            All Records
          </h2>
          <Badge
            variant="secondary"
            className="text-xs font-bold px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
          >
            {filteredTasks.length} total
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-64 min-w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3"
              >
                <TagIcon className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                Tags
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-1.5">
              {tags.map((tag) => (
                <DropdownMenuItem
                  key={tag.id}
                  onClick={() => {
                    setSelectedTags((prev) =>
                      prev.includes(tag.id)
                        ? prev.filter((id) => id !== tag.id)
                        : [...prev, tag.id]
                    );
                  }}
                  className="text-xs font-semibold cursor-pointer rounded-lg px-2.5 py-1.5"
                >
                  <Badge variant="secondary" className="mr-2 text-[10px]">
                    {tag.name}
                  </Badge>
                  {selectedTags.includes(tag.id) && (
                    <span className="ml-auto text-indigo-600 font-bold">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3"
              >
                <Filter className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
                Priority
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-1.5">
              <DropdownMenuItem
                onClick={() => setSelectedPriority("")}
                className="text-xs font-semibold cursor-pointer rounded-lg px-2.5 py-1.5"
              >
                All Priorities
                {!selectedPriority && (
                  <span className="ml-auto text-indigo-600 font-bold">✓</span>
                )}
              </DropdownMenuItem>
              {["urgent", "high", "medium", "low"].map((priority) => (
                <DropdownMenuItem
                  key={priority}
                  onClick={() => setSelectedPriority(priority)}
                  className="text-xs font-semibold cursor-pointer rounded-lg px-2.5 py-1.5 capitalize"
                >
                  <Badge className={cn("mr-2 text-[10px]", getPriorityBadgeClass(priority))}>
                    {priority}
                  </Badge>
                  {selectedPriority === priority && (
                    <span className="ml-auto text-indigo-600 font-bold">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
            <TableRow>
              <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 py-3">
                Record Title
              </TableHead>
              <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 py-3">
                Stage
              </TableHead>
              <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 py-3">
                Due Date
              </TableHead>
              <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 py-3">
                Tags
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400 font-medium">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => {
                const stageObj = stages.find((s) => s.id === task.stageId);

                return (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/80"
                    onClick={() => onTaskClick(task)}
                  >
                    <TableCell className="py-3">
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5 font-medium">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {stageObj?.name ? (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 border",
                            getStageColorStyles(stageObj.color)
                          )}
                        >
                          {stageObj.name}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No stage</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3">
                      {task.dueDate ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                          <span>{formatDate(task.dueDate, "MMM dd, yyyy")}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No due date</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {task.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="text-[9px] font-extrabold px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {task.tags.length > 2 && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-bold px-1 text-slate-500"
                          >
                            +{task.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl"
                        >
                          <DropdownMenuItem
                            onClick={() => onTaskClick(task)}
                            className="text-xs font-semibold cursor-pointer"
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask(task.id);
                            }}
                            className="text-xs font-semibold text-rose-600 dark:text-rose-400 cursor-pointer"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
