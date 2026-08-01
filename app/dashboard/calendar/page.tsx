"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { usePermissions } from "@/lib/rbac-utils"
import Link from "next/link"
import { isSameDay, format, addMonths, subMonths } from "date-fns"
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle,
  AlertCircle,
  Target,
  Users,
  BarChart3,
  CheckCircle2,
  CalendarDays,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Task = {
  id: string
  title: string
  status: string
  priority: string
  deadline?: string
  deadlineStart?: string
  deadlineEnd?: string
  updatedAt?: string
  description?: string
}

export default function TaskCalendarPage() {
  const { data: session } = useSession()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { canCreateTasks } = usePermissions()

  // Fetch tasks with deadlines
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/tasks?withDeadlines=true")
        if (response.ok) {
          const data = await response.json()
          setTasks(data)
        } else {
          // Fallback mock data for demo
          setTasks([
            {
              id: "1",
              title: "Complete Project Report",
              status: "IN_PROGRESS",
              priority: "HIGH",
              deadlineStart: new Date().toISOString(),
              deadlineEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              description: "Finalize the quarterly project report with all metrics for stakeholder review",
            },
            {
              id: "2",
              title: "Team Meeting - Sprint Planning",
              status: "TODO",
              priority: "MEDIUM",
              deadline: new Date(Date.now() + 86400000).toISOString(),
              description: "Weekly standup meeting to discuss project progress and plan next sprint tasks",
            },
            {
              id: "3",
              title: "Code Review Session",
              status: "TODO",
              priority: "LOW",
              deadlineStart: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
              deadlineEnd: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
              description: "Review pull requests for the new feature implementation and provide feedback",
            },
            {
              id: "4",
              title: "Client Presentation",
              status: "TODO",
              priority: "URGENT",
              deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
              description: "Present final project deliverables and gather client feedback",
            },
          ])
        }
      } catch (error) {
        console.error("Error fetching tasks:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTasks()
  }, [])

  // Range helpers & colors
  const normalizeYMD = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const parseDate = (val?: string) => (val ? new Date(val) : undefined)
  const getTaskRange = (t: Task) => {
    let start = parseDate(t.deadlineStart) ?? parseDate(t.deadline) ?? parseDate(t.deadlineEnd) ?? parseDate(t.updatedAt)
    let end = parseDate(t.deadlineEnd) ?? parseDate(t.deadline) ?? parseDate(t.deadlineStart) ?? parseDate(t.updatedAt)

    if (t.status === "DONE") {
      const doneDate = parseDate(t.updatedAt) ?? new Date()
      // Mark completed on calendar for doneDate (and prior start dates up to doneDate).
      // Completed task will NOT appear on any future dates after doneDate.
      end = doneDate
      if (!start || start > doneDate) {
        start = doneDate
      }
    }

    return start && end ? { start: normalizeYMD(start), end: normalizeYMD(end) } : undefined
  }
  const dayInRange = (day: Date, t: Task) => {
    const r = getTaskRange(t)
    if (!r) return false
    const d = normalizeYMD(day)
    return d >= r.start && d <= r.end
  }

  const upcomingTasksCount = tasks.filter((task) => {
    if (task.status === "DONE") return false
    const r = getTaskRange(task)
    return r ? r.end >= new Date() : false
  }).length

  const completedTasksCount = tasks.filter((task) => task.status === "DONE").length
  const inProgressTasksCount = tasks.filter((task) => task.status === "IN_PROGRESS").length

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  // Selected date tasks
  const selectedDateTasks = date ? tasks.filter((task) => dayInRange(date, task)) : []

  // Priority Pill Component
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] px-1.5 py-0">Urgent</Badge>
      case "HIGH":
        return <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] px-1.5 py-0">High</Badge>
      case "MEDIUM":
        return <Badge className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] px-1.5 py-0">Medium</Badge>
      default:
        return <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[10px] px-1.5 py-0">Low</Badge>
    }
  }

  // Custom Calendar Component
  const CustomCalendar = () => {
    const today = new Date()
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const currentDate = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    return (
      <div className="w-full">
        {/* Day Header Row */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {dayNames.map((day) => (
            <div
              key={day}
              className="py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Month Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
            const isToday = isSameDay(day, today)
            const isSelected = date && isSameDay(day, date)
            const dayTasks = tasks.filter((task) => dayInRange(day, task))

            return (
              <div
                key={index}
                onClick={() => setDate(day)}
                className={`
                  min-h-[95px] p-2.5 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between group relative overflow-hidden
                  ${isCurrentMonth ? "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs" : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-900 text-slate-400 opacity-60"}
                  ${isToday ? "ring-2 ring-indigo-500/80 border-indigo-300 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/30" : ""}
                  ${isSelected ? "ring-2 ring-indigo-600 border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/50 shadow-sm" : ""}
                `}
              >
                {/* Date Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isToday
                        ? "h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]"
                        : isCurrentMonth
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-400 dark:text-slate-600"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] px-1.5 py-0 font-extrabold">
                      {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                    </Badge>
                  )}
                </div>

                {/* Day Tasks Micro List */}
                <div className="mt-1 space-y-1 overflow-hidden max-h-[50px]">
                  {dayTasks.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-semibold truncate flex items-center gap-1",
                        t.status === "DONE"
                          ? "bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold"
                          : "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300"
                      )}
                      title={`${t.title} (${t.status === "DONE" ? "Completed" : t.status})`}
                    >
                      {t.status === "DONE" ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : null}
                      <span className={t.status === "DONE" ? "line-through opacity-85 truncate" : "truncate"}>
                        {t.title}
                      </span>
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 pl-1">
                      +{dayTasks.length - 2} more
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-5">
      {/* Sleek Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 px-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/80 shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Task Calendar
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Manage your tasks and deadlines efficiently
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevMonth}
                className="h-7 w-7 p-0 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-bold px-2 text-slate-900 dark:text-white min-w-[110px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="h-7 w-7 p-0 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentMonth(new Date())
                setDate(new Date())
              }}
              className="h-8 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold px-3"
            >
              Today
            </Button>

            {canCreateTasks && (
              <Button asChild size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs px-3 shadow-xs">
                <Link href="/dashboard/tasks/new" className="flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  New Task
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Deadlines</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{tasks.length}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40">
              <CalendarIcon className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Upcoming</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{upcomingTasksCount}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40">
              <Clock className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Completed</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{completedTasksCount}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">In Progress</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{inProgressTasksCount}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Layout: Calendar Grid + Selected Date Task Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Calendar Grid */}
        <Card className="lg:col-span-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4">
          <CustomCalendar />
        </Card>

        {/* Right Column: Selected Date Task Details Side Panel */}
        <Card className="lg:col-span-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-indigo-500" />
                  {date ? format(date, "EEEE, MMM d") : "Selected Date"}
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tasks scheduled for this date
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs px-2 py-0.5">
                {selectedDateTasks.length} {selectedDateTasks.length === 1 ? "Task" : "Tasks"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {selectedDateTasks.length > 0 ? (
              selectedDateTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {t.title}
                    </h4>
                    {getPriorityBadge(t.priority)}
                  </div>

                  {t.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold flex items-center gap-1",
                        t.status === "DONE"
                          ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      {t.status === "DONE" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          Completed
                        </>
                      ) : (
                        t.status
                      )}
                    </Badge>

                    <Button variant="ghost" size="sm" asChild className="h-6 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2">
                      <Link href={`/dashboard/tasks/${t.id}/record`} className="flex items-center gap-1">
                        View
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <div className="w-10 h-10 mx-auto bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 mb-2">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No tasks on this date</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Select another day or add a new task</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}