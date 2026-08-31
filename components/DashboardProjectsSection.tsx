"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Layers, Grid3X3, PlusCircle, ArrowRight } from "lucide-react";
import TaskCard from "@/components/task-card";
import { cn } from "@/lib/utils";

interface DashboardProjectsSectionProps {
  tasks: any[];
  userId: string;
  canCreateProjects?: boolean;
}

export function DashboardProjectsSection({
  tasks = [],
  userId,
  canCreateProjects = true,
}: DashboardProjectsSectionProps) {
  const [activeTab, setActiveTab] = useState<"assigned" | "created" | "all">("assigned");

  const assignedTasks = useMemo(() => {
    return tasks.filter((t) =>
      t.assignments?.some((a: any) => a.userId === userId || a.user?.id === userId)
    );
  }, [tasks, userId]);

  const createdTasks = useMemo(() => {
    return tasks.filter((t) => t.creatorId === userId || t.creator?.id === userId);
  }, [tasks, userId]);

  const currentList = useMemo(() => {
    if (activeTab === "assigned") return assignedTasks;
    if (activeTab === "created") return createdTasks;
    return tasks;
  }, [activeTab, assignedTasks, createdTasks, tasks]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Briefcase className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            My Projects
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
            Overview of your active projects and task flows
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canCreateProjects && (
            <Button
              asChild
              size="sm"
              className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl px-4 shadow-sm"
            >
              <Link href="/dashboard/tasks/new" className="flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4" />
                New Project
              </Link>
            </Button>
          )}

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700 px-4"
          >
            <Link href="/dashboard/tasks" className="flex items-center gap-1.5">
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Projects Container Card */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-sm overflow-hidden">
        <CardHeader className="pb-4 pt-4 px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Tabs Switcher */}
            <div className="flex items-center p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("assigned")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5",
                  activeTab === "assigned"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Briefcase className="h-3.5 w-3.5" />
                Assigned to Me
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {assignedTasks.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("created")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5",
                  activeTab === "created"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                Created by Me
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {createdTasks.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5",
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                All Projects
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {tasks.length}
                </Badge>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {currentList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {currentList.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  showActions={true}
                  client={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 mx-auto bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <p className="text-slate-800 dark:text-slate-200 text-base font-bold">
                  {activeTab === "assigned"
                    ? "No assigned projects found"
                    : activeTab === "created"
                    ? "No projects created by you yet"
                    : "No projects found"}
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                  Projects with task flows and records will appear here.
                </p>
              </div>
              {canCreateProjects && (
                <Button
                  asChild
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 text-xs font-bold"
                >
                  <Link href="/dashboard/tasks/new">
                    Create Project
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
