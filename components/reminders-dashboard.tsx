"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { format, isAfter, isBefore } from "date-fns"
import {
  Clock,
  Plus,
  Bell,
  BellOff,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  AlarmClock,
  User,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface I_User {
  id: string
  name: string
  email: string
  image?: string
  role: string
}

interface Reminder {
  id: string
  title: string
  description?: string
  remindAt: string
  isMuted: boolean
  isSent: boolean
  priority: string
  type: string
  creatorId: string
  assigneeId: string
  creator: I_User
  assignee: I_User
  createdAt: string
  sentAt?: string
}

interface RemindersDashboardProps {
  currentUser: I_User
  reminders: Reminder[]
  users: I_User[]
}

export function RemindersDashboard({ currentUser, reminders: initialReminders, users }: RemindersDashboardProps) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)
  const [filter, setFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  const toggleMute = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}/toggle-mute`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setReminders((prev) =>
          prev.map((reminder) => (reminder.id === reminderId ? { ...reminder, isMuted: !reminder.isMuted } : reminder)),
        )
        toast({
          title: "Success",
          description: `Reminder ${data.action}`,
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle mute",
        variant: "destructive",
      })
    }
  }

  const deleteReminder = async (reminderId: string) => {
    try {
      const response = await fetch(`/api/reminders/${reminderId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setReminders((prev) => prev.filter((reminder) => reminder.id !== reminderId))
        toast({
          title: "Success",
          description: "Reminder deleted successfully",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      })
    }
  }

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

  const getFilteredReminders = () => {
    const now = new Date()
    switch (filter) {
      case "upcoming":
        return reminders.filter((r) => isAfter(new Date(r.remindAt), now) && !r.isSent)
      case "overdue":
        return reminders.filter((r) => isBefore(new Date(r.remindAt), now) && !r.isSent)
      case "sent":
        return reminders.filter((r) => r.isSent)
      case "muted":
        return reminders.filter((r) => r.isMuted)
      case "assigned":
        return reminders.filter((r) => r.assigneeId === currentUser.id)
      case "created":
        return reminders.filter((r) => r.creatorId === currentUser.id)
      default:
        return reminders
    }
  }

  const filteredReminders = getFilteredReminders()
  const totalPages = Math.ceil(filteredReminders.length / itemsPerPage)
  const paginatedReminders = filteredReminders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const upcomingCount = reminders.filter((r) => isAfter(new Date(r.remindAt), new Date()) && !r.isSent).length
  const overdueCount = reminders.filter((r) => isBefore(new Date(r.remindAt), new Date()) && !r.isSent).length
  const sentCount = reminders.filter((r) => r.isSent).length

  return (
    <div className="w-full space-y-5">
      {/* Sleek Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 px-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shrink-0"
              onClick={() => router.back()}
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/80 shrink-0">
              <AlarmClock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Reminders
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Manage your reminders and stay on top of important tasks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs px-3.5 shadow-xs">
              <Link href="/dashboard/reminders/create" className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Create Reminder
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Reminders</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{reminders.length}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Upcoming</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{upcomingCount}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40">
              <Clock className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Overdue</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{overdueCount}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/40">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Completed / Sent</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{sentCount}</p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main List Container */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Your Reminders</CardTitle>
              <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] px-2 py-0.5">
                {filteredReminders.length}
              </Badge>
            </div>

            {/* Filter Tabs */}
            <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
              <TabsList className="bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl h-8">
                <TabsTrigger value="all" className="text-[11px] font-semibold h-6 rounded-lg px-2.5">All</TabsTrigger>
                <TabsTrigger value="upcoming" className="text-[11px] font-semibold h-6 rounded-lg px-2.5">Upcoming</TabsTrigger>
                <TabsTrigger value="overdue" className="text-[11px] font-semibold h-6 rounded-lg px-2.5">Overdue</TabsTrigger>
                <TabsTrigger value="sent" className="text-[11px] font-semibold h-6 rounded-lg px-2.5">Sent</TabsTrigger>
                <TabsTrigger value="muted" className="text-[11px] font-semibold h-6 rounded-lg px-2.5">Muted</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {filteredReminders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
                <AlarmClock className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No reminders found</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {filter === "all"
                  ? "You don't have any reminders set up yet. Create your first reminder to stay organized."
                  : `No ${filter} reminders match your current filter.`}
              </p>
              <Button asChild size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs px-4 shadow-xs">
                <Link href="/dashboard/reminders/create" className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Create Reminder
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {paginatedReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {reminder.title}
                      </h3>
                      {getPriorityBadge(reminder.priority)}
                      {reminder.isMuted && (
                        <Badge variant="outline" className="text-[9px] font-semibold border-rose-200 text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0">
                          Muted
                        </Badge>
                      )}
                    </div>

                    {reminder.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {reminder.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{format(new Date(reminder.remindAt), "PPP 'at' p")}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={reminder.assignee?.image || ""} alt={reminder.assignee?.name} />
                          <AvatarFallback className="text-[8px] bg-indigo-600 text-white font-bold">
                            {reminder.assignee?.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{reminder.assignee?.name || "Assigned"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleMute(reminder.id)}
                      className="h-8 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 px-3"
                      title={reminder.isMuted ? "Unmute reminder" : "Mute reminder"}
                    >
                      {reminder.isMuted ? (
                        <>
                          <Bell className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                          Unmute
                        </>
                      ) : (
                        <>
                          <BellOff className="h-3.5 w-3.5 mr-1 text-rose-500" />
                          Mute
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReminder(reminder.id)}
                      className="h-8 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5"
                      title="Delete reminder"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-medium">
                  <div>
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredReminders.length)} - {Math.min(currentPage * itemsPerPage, filteredReminders.length)} of {filteredReminders.length} reminders
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      className="h-7 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 px-2.5"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "h-7 w-7 p-0 text-xs font-bold rounded-lg",
                            pageNum === currentPage
                              ? "bg-indigo-600 text-white hover:bg-indigo-700"
                              : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                          )}
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      className="h-7 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 px-2.5"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}