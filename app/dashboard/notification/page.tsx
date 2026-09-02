"use client"

import { useState, useEffect } from "react"
import {
  Bell,
  BellOff,
  Check,
  Filter,
  Search,
  CheckCircle2,
  MessageSquare,
  Calendar,
  AlertCircle,
  Users,
  MoreHorizontal,
  ArrowLeft,
  SlidersHorizontal,
  CheckCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useNotifications } from "@/contexts/notifications-context"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { NotificationsMobile } from "@/components/notifications/NotificationsMobile"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

export default function NotificationPage() {
  const { unreadCount, markAllAsRead, markAsRead, notifications } = useNotifications()
  const [isMuted, setIsMuted] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "read">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const savedMuteState = typeof window !== "undefined" ? localStorage.getItem("notificationsMuted") : null
    setIsMuted(savedMuteState === "true")
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("notificationsMuted", String(isMuted))
    }
  }, [isMuted, mounted])

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeFilter])

  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  // Filter notifications based on search query and active filter
  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.type.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      activeFilter === "all" ||
      (activeFilter === "unread" && !notification.read) ||
      (activeFilter === "read" && notification.read)

    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage)
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Notification Icon Handler
  const getNotificationIcon = (type: string) => {
    const lowerType = type.toLowerCase()
    if (lowerType.includes("announcement")) {
      return (
        <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/40 shrink-0">
          <AlertCircle className="h-4 w-4" />
        </div>
      )
    }
    if (lowerType.includes("message")) {
      return (
        <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shrink-0">
          <MessageSquare className="h-4 w-4" />
        </div>
      )
    }
    if (lowerType.includes("task") || lowerType.includes("project")) {
      return (
        <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 shrink-0">
          <Calendar className="h-4 w-4" />
        </div>
      )
    }
    return (
      <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-900/40 shrink-0">
        <Bell className="h-4 w-4" />
      </div>
    )
  }

  const getNotificationLink = (notification: any) => {
    if (notification.type && notification.type.includes("ANNOUNCEMENT")) {
      if (notification.announcementId && notification.organizationId) {
        return `/org/${notification.organizationId}/announcements/${notification.announcementId}`
      }
      if (notification.announcementId) {
        return `/org/${notification.announcementId}/announcements/${notification.announcementId}`
      }
    }
    if (notification.type === "CHANNEL_MESSAGE" || notification.channelId) {
      return `/dashboard/channels/${notification.channelId}`
    }
    if (notification.type === "DIRECT_MESSAGE" || notification.receiverId || notification.senderId) {
      const candidates = [
        notification.senderId,
        notification.receiverId,
        notification.messageId,
      ].filter(Boolean) as string[]
      return candidates[0] ? `/dashboard/messages/${candidates[0]}` : `/dashboard/messages`
    }
    if (notification.type === "TASK_ASSIGNED" || notification.taskId) {
      return `/dashboard/tasks/${notification.taskId || notification.id}`
    }
    if (notification.type === "CHANNEL" || notification.type === "CHANNEL_INVITE") {
      return `/dashboard/channels/${notification.channelId || notification.id}`
    }
    if (notification.type === "USER") {
      return `/dashboard/messages/${notification.senderId || notification.id}`
    }
    if (notification.type === "REMINDER") {
      return `/dashboard/reminders`
    }
    return "/dashboard"
  }

  if (!mounted) {
    return (
      <div className="w-full space-y-4">
        <div className="h-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 animate-pulse" />
        <div className="h-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Mobile Notifications View */}
      <div className="block md:hidden w-full">
        <NotificationsMobile
          notifications={notifications}
          unreadCount={unreadCount}
          markAllAsRead={handleMarkAllAsRead}
          markAsRead={markAsRead}
          isMuted={isMuted}
          toggleMute={toggleMute}
        />
      </div>

      {/* Desktop Notifications View (Exact Existing Design Preserved) */}
      <div className="hidden md:block w-full space-y-5">
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
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <Badge className="bg-indigo-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Stay updated with your latest activities and mentions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search notifications..."
                className="pl-9 pr-3 h-8 w-full md:w-56 text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 px-3">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-500 mr-1.5" />
                  Filter
                  {activeFilter !== "all" && (
                    <Badge variant="secondary" className="ml-1.5 text-[9px] px-1.5 py-0 font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {activeFilter}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 rounded-2xl border-slate-200 dark:border-slate-800 shadow-xl" align="end">
                <div className="space-y-1">
                  <Button
                    variant={activeFilter === "all" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-xs font-medium rounded-xl"
                    onClick={() => setActiveFilter("all")}
                  >
                    All Notifications
                    <Badge variant="outline" className="ml-auto text-[10px]">{notifications.length}</Badge>
                  </Button>
                  <Button
                    variant={activeFilter === "unread" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-xs font-medium rounded-xl"
                    onClick={() => setActiveFilter("unread")}
                  >
                    Unread Only
                    <Badge variant="outline" className="ml-auto text-[10px]">{unreadCount}</Badge>
                  </Button>
                  <Button
                    variant={activeFilter === "read" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-xs font-medium rounded-xl"
                    onClick={() => setActiveFilter("read")}
                  >
                    Read
                    <Badge variant="outline" className="ml-auto text-[10px]">{notifications.length - unreadCount}</Badge>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Quick Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-2xl border-slate-200 dark:border-slate-800 shadow-xl">
                <DropdownMenuItem onClick={handleMarkAllAsRead} className="text-xs font-medium cursor-pointer">
                  <CheckCheck className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                  Mark all as read
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleMute} className="text-xs font-medium cursor-pointer">
                  {isMuted ? (
                    <Bell className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                  ) : (
                    <BellOff className="h-3.5 w-3.5 mr-2 text-rose-500" />
                  )}
                  {isMuted ? "Unmute all" : "Mute notifications"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Grid: Notifications Feed + Control Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8/12): Notification Feed */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Recent Activity Stream
                </CardTitle>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="h-7 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2"
                    >
                      <CheckCheck className="h-3.5 w-3.5 mr-1" />
                      Mark all read
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {filteredNotifications.length > 0 ? (
                <>
                  {paginatedNotifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={getNotificationLink(notification)}
                      onClick={() => markAsRead(notification.id)}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all duration-150 flex items-start gap-3.5 relative group cursor-pointer block",
                        !notification.read
                          ? "bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-800/60 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700"
                          : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 hover:border-indigo-200 dark:hover:border-indigo-800"
                      )}
                    >
                      <div className="flex items-start gap-3.5 w-full">
                        {/* Notification Type Icon */}
                        {getNotificationIcon(notification.type)}

                        {/* Notification Body */}
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {notification.type.toUpperCase()}
                            </p>
                            {!notification.read && (
                              <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {notification.content}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-medium">
                      <div>
                        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredNotifications.length)} - {Math.min(currentPage * itemsPerPage, filteredNotifications.length)} of {filteredNotifications.length} notifications
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
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
                    <Bell className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No notifications found</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {searchQuery ? "Try searching for something else" : "You are all caught up!"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (4/12): Preferences & Quick Actions */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                Notification Status
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Workspace alert preferences
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isMuted ? (
                  <BellOff className="h-4 w-4 text-rose-500" />
                ) : (
                  <Bell className="h-4 w-4 text-emerald-500" />
                )}
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {isMuted ? "Notifications Muted" : "Alerts Active"}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isMuted ? "Sound and toasts disabled" : "Receiving live sound alerts"}
                  </p>
                </div>
              </div>
              <Button
                variant={isMuted ? "outline" : "secondary"}
                size="sm"
                onClick={toggleMute}
                className="h-7 text-[11px] font-bold px-2.5 rounded-lg"
              >
                {isMuted ? "Unmute" : "Mute"}
              </Button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Quick Shortcuts
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="w-full justify-start text-xs font-semibold h-8 rounded-xl border-slate-200 dark:border-slate-700"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                Mark all as read
              </Button>
            </div>
          </Card>
        </div>
      </div>
      </div>
    </div>
  )
}