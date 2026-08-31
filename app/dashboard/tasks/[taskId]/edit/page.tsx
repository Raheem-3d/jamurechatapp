"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { format, addDays, addWeeks } from "date-fns"
import {
  CalendarIcon,
  Loader2,
  Trash2,
  ArrowLeft,
  Edit3,
  FileText,
  Users,
  CheckCircle2,
  Save,
  Clock,
  Layers,
  AlertCircle,
  X,
  Search,
  UserCheck,
  Plus,
  Check,
} from "lucide-react"
import { cn, parseLocalDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { useSocket } from "@/lib/socket-client"
import { RoleBasedAccess } from "@/lib/role-based-access"
import { useTeamUsers } from "@/hooks/use-team-users"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DescriptionGenerator } from "@/components/description-generator"

type UserItem = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
}

export default function EditTaskPage() {
  const [task, setTask] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [aiEnabled, setAiEnabled] = useState(true)

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch("/api/organization/me");
        if (!res.ok) return;
        const payload = await res.json();
        if (payload?.organization?.aiEnabled !== undefined) {
          setAiEnabled(payload.organization.aiEnabled);
        }
      } catch (err) {
        console.error("Failed to fetch organization setting for AI in edit task page:", err);
      }
    };
    fetchOrg();
  }, []);
  const [priority, setPriority] = useState("MEDIUM")
  const [status, setStatus] = useState("TODO")
  const [deadline, setDeadline] = useState<Date | undefined>(undefined)
  const [assignees, setAssignees] = useState<string[]>([])
  
  // Custom user details cache for assigned members to prevent showing raw IDs
  const [fetchedTaskUsers, setFetchedTaskUsers] = useState<UserItem[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [isfetching, setIsfetching] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { sendTaskUpdate, sendNotification } = useSocket()
  const taskId = params.taskId as string
  const { users: teamUsers, loading: usersLoading } = useTeamUsers()

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setIsfetching(true)
        const taskRes = await fetch(`/api/tasks/${taskId}`)

        if (!taskRes.ok) {
          throw new Error("Failed to fetch task")
        }

        const taskData = await taskRes.json()
        setTask(taskData)
        setTitle(taskData.title || "")
        setDescription(taskData.description || "")
        setPriority(taskData.priority || "MEDIUM")
        setStatus(taskData.status || "TODO")
        setDeadline(taskData.deadline ? (parseLocalDate(taskData.deadline) || undefined) : undefined)
        
        // Extract assigned user IDs and user objects
        if (taskData.assignments && Array.isArray(taskData.assignments)) {
          const assignedIds = taskData.assignments.map((a: any) => a.userId).filter(Boolean)
          const extractedUsers: UserItem[] = taskData.assignments
            .map((a: any) => a.user)
            .filter((u: any) => u && u.id)
          
          setAssignees(assignedIds)
          setFetchedTaskUsers(extractedUsers)
        }
      } catch (error) {
        console.error("Error fetching task:", error)
        toast({
          title: "Error",
          description: "Failed to load task data",
          variant: "destructive",
        })
        router.push("/dashboard/tasks")
      } finally {
        setIsfetching(false)
      }
    }

    if (taskId) {
      fetchTask()
    }
  }, [taskId, toast, router])

  // Combine teamUsers and fetchedTaskUsers into a master lookup map
  const masterUsersList = useMemo(() => {
    const userMap = new Map<string, UserItem>()
    
    // Add users from team API
    if (teamUsers && Array.isArray(teamUsers)) {
      teamUsers.forEach((u: any) => {
        if (u && u.id) {
          userMap.set(u.id, {
            id: u.id,
            name: u.name || u.email || "Team Member",
            email: u.email || "",
            image: u.image || null,
            role: u.role || null,
          })
        }
      })
    }

    // Add users from fetched task details (covers any assignees not in teamUsers list)
    fetchedTaskUsers.forEach((u) => {
      if (u && u.id && !userMap.has(u.id)) {
        userMap.set(u.id, {
          id: u.id,
          name: u.name || u.email || "Team Member",
          email: u.email || "",
          image: u.image || null,
          role: u.role || null,
        })
      }
    })

    return Array.from(userMap.values())
  }, [teamUsers, fetchedTaskUsers])

  // Selected User objects array
  const selectedUserObjects = useMemo(() => {
    return assignees
      .map((id) => masterUsersList.find((u) => u.id === id) || { id, name: "Team Member", email: "" })
      .filter(Boolean)
  }, [assignees, masterUsersList])

  // Filtered master users list for dropdown search
  const filteredUsersForSelection = useMemo(() => {
    if (!userSearchQuery.trim()) return masterUsersList
    const q = userSearchQuery.toLowerCase()
    return masterUsersList.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    )
  }, [masterUsersList, userSearchQuery])

  const toggleAssignee = (userId: string) => {
    if (assignees.includes(userId)) {
      setAssignees(assignees.filter((id) => id !== userId))
    } else {
      setAssignees([...assignees, userId])
    }
  }

  const removeAssignee = (userId: string) => {
    setAssignees(assignees.filter((id) => id !== userId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          status,
          deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
          assignees,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update task")
      }

      const updatedTask = await response.json()

      // Send task update via socket
      sendTaskUpdate(updatedTask)

      // Send notifications to new assignees
      const existingAssigneeIds = task?.assignments ? task.assignments.map((a: any) => a.userId) : []
      const newAssignees = assignees.filter((id) => !existingAssigneeIds.includes(id))

      if (newAssignees.length > 0) {
        newAssignees.forEach((assigneeId) => {
          sendNotification(assigneeId, {
            type: "TASK_ASSIGNED",
            content: `You have been assigned to task: ${title}`,
          })
        })
      }

      toast({
        title: "Task Updated",
        description: "Task details and assignees updated successfully.",
      })
      router.push(`/dashboard/tasks/${taskId}/record`)
      router.refresh()
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete task")
      }

      toast({
        title: "Task Deleted",
        description: "The task has been deleted permanently.",
      })
      router.push("/dashboard/tasks")
      router.refresh()
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const getPriorityBadgeColor = (p: string) => {
    switch (p) {
      case "URGENT":
        return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800"
      case "HIGH":
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800"
      case "LOW":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800"
      case "MEDIUM":
      default:
        return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800"
    }
  }

  const getStatusBadgeColor = (s: string) => {
    switch (s) {
      case "DONE":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800"
      case "IN_PROGRESS":
        return "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800"
      case "BLOCKED":
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800"
      case "TODO":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
  }

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const parts = name.trim().split(" ")
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      return name.substring(0, 2).toUpperCase()
    }
    if (email) return email.substring(0, 2).toUpperCase()
    return "U"
  }

  if (isfetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="h-10 w-10 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading task details...</p>
      </div>
    )
  }

  return (
    <RoleBasedAccess
      allowedRoles={["ORG_ADMIN", "MANAGER"]}
      fallback={
        <div className="max-w-xl mx-auto py-12 px-4">
          <Card className="border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm rounded-2xl">
            <CardHeader className="text-center pb-2">
              <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-2">
                <AlertCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl text-rose-900 dark:text-rose-100">Access Restricted</CardTitle>
              <CardDescription className="text-rose-700 dark:text-rose-300">
                You need Manager or Admin permissions to edit this task.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center pt-4">
              <Button variant="outline" onClick={() => router.back()} className="rounded-xl border-rose-300 text-rose-800 hover:bg-rose-100">
                <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
              </Button>
            </CardFooter>
          </Card>
        </div>
      }
    >
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        
        {/* Header Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg px-2 py-1 h-auto text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">Update Task</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Edit3 className="h-6 w-6 text-indigo-400" />
              Update Task & Assignees
            </h1>
            <p className="text-xs text-slate-400">
              Manage task content, status, priority, schedule, and team assignments.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge className={cn("px-2.5 py-1 text-xs font-bold rounded-lg border", getStatusBadgeColor(status))}>
              {status}
            </Badge>
            <Badge className={cn("px-2.5 py-1 text-xs font-bold rounded-lg border", getPriorityBadgeColor(priority))}>
              {priority} Priority
            </Badge>
          </div>
        </div>

        {/* Main Edit Form Grid */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (2 Cols) - Main Information & Team Assignees */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Task Details Card */}
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 pb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Task Information
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Primary details that define this task.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  {/* Title Field */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                      <span>Task Title <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-slate-400 font-normal">Required</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g. Design homepage wireframe & assets"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="rounded-xl border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-600 text-sm font-medium h-11"
                    />
                  </div>

                  {/* Description Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Description & Context
                      </Label>
                      {aiEnabled && (
                        <DescriptionGenerator
                          title={title}
                          onGenerate={(desc) => setDescription(desc)}
                          type="project"
                        />
                      )}
                    </div>
                    <Textarea
                      id="description"
                      placeholder="Provide detailed instructions, requirements, links or references..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={5}
                      className="rounded-xl border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-600 text-sm leading-relaxed"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Redesigned Team Member Assignees Card */}
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                        <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        Assigned Team Members
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Assign employees or managers responsible for completing this task.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                      {assignees.length} Selected
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  
                  {/* Searchable Assignee Selector Dropdown */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Add or Remove Assignees
                    </Label>
                    
                    <Popover open={isAssigneeDropdownOpen} onOpenChange={setIsAssigneeDropdownOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className="w-full h-11 justify-between text-left font-medium rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate">
                            <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            Select team members to assign...
                          </span>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {masterUsersList.length} Available
                          </Badge>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[360px] sm:w-[420px] p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800" align="start">
                        <div className="space-y-3">
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                            <Input
                              placeholder="Search by name or email..."
                              value={userSearchQuery}
                              onChange={(e) => setUserSearchQuery(e.target.value)}
                              className="pl-9 h-10 rounded-xl text-xs border-slate-200 dark:border-slate-800"
                            />
                          </div>

                          {/* Users List with Checkboxes */}
                          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                            {usersLoading && (
                              <div className="p-4 text-center text-xs text-slate-500">
                                Loading team users...
                              </div>
                            )}

                            {!usersLoading && filteredUsersForSelection.length === 0 && (
                              <div className="p-4 text-center text-xs text-slate-500">
                                No team members found.
                              </div>
                            )}

                            {filteredUsersForSelection.map((user) => {
                              const isSelected = assignees.includes(user.id)
                              return (
                                <div
                                  key={user.id}
                                  onClick={() => toggleAssignee(user.id)}
                                  className={cn(
                                    "flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors text-xs",
                                    isSelected
                                      ? "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-100"
                                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Avatar className="h-8 w-8 rounded-lg shrink-0">
                                      <AvatarImage src={user.image || undefined} />
                                      <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                                        {getInitials(user.name, user.email)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-xs truncate">
                                        {user.name || user.email || "Team Member"}
                                      </p>
                                      {user.email && (
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                          {user.email}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div
                                    className={cn(
                                      "h-5 w-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ml-2",
                                      isSelected
                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                    )}
                                  >
                                    {isSelected && <Check className="h-3.5 w-3.5" />}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Selected Team Members Badges Grid */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Currently Assigned ({selectedUserObjects.length})
                    </Label>

                    {selectedUserObjects.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/40">
                        <UserCheck className="h-5 w-5 mx-auto text-slate-400 mb-1" />
                        <p className="text-xs font-medium text-slate-500">No team members assigned yet</p>
                        <p className="text-[10px] text-slate-400">Click the dropdown above to assign team members.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {selectedUserObjects.map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="h-8 w-8 rounded-lg shrink-0">
                                <AvatarImage src={u.image || undefined} />
                                <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                                  {getInitials(u.name, u.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                                  {u.name || u.email || "Team Member"}
                                </p>
                                {u.email && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    {u.email}
                                  </p>
                                )}
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAssignee(u.id)}
                              className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0 ml-1"
                              title="Remove Assignee"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </CardContent>
              </Card>

            </div>

            {/* Right Column (1 Col) - Status, Priority & Deadline Sidebar */}
            <div className="space-y-6">
              
              {/* Task Status & Priority Settings Card */}
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 pb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Status & Priority
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  
                  {/* Status Field */}
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Task Status
                    </Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 font-semibold text-sm">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="TODO" className="font-medium">📌 To Do</SelectItem>
                        <SelectItem value="IN_PROGRESS" className="font-medium text-sky-600">⏳ In Progress</SelectItem>
                        <SelectItem value="BLOCKED" className="font-medium text-rose-600">🚫 Blocked</SelectItem>
                        <SelectItem value="DONE" className="font-medium text-emerald-600">✓ Completed / Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority Field */}
                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Priority Level
                    </Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 dark:border-slate-800 font-semibold text-sm">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="LOW" className="font-medium text-emerald-600">🟢 Low Priority</SelectItem>
                        <SelectItem value="MEDIUM" className="font-medium text-blue-600">🔷 Medium Priority</SelectItem>
                        <SelectItem value="HIGH" className="font-medium text-amber-600">⚡ High Priority</SelectItem>
                        <SelectItem value="URGENT" className="font-medium text-rose-600">🔥 Urgent Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </CardContent>
              </Card>

              {/* Target Deadline Card */}
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 pb-4">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Target Deadline
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deadline" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Scheduled Due Date
                    </Label>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-11 justify-start text-left font-medium rounded-xl border-slate-200 dark:border-slate-800",
                            !deadline && "text-slate-400"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          {deadline ? format(deadline, "PPP") : "No due date set"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden shadow-xl" align="center">
                        <Calendar
                          mode="single"
                          selected={deadline}
                          onSelect={setDeadline}
                          initialFocus
                          className="p-3"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Quick Presets */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quick Presets</span>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeadline(new Date())}
                        className="text-xs rounded-lg h-8 border-slate-200 hover:bg-slate-100 dark:border-slate-800"
                      >
                        Today
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeadline(addDays(new Date(), 1))}
                        className="text-xs rounded-lg h-8 border-slate-200 hover:bg-slate-100 dark:border-slate-800"
                      >
                        Tomorrow
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeadline(addWeeks(new Date(), 1))}
                        className="text-xs rounded-lg h-8 border-slate-200 hover:bg-slate-100 dark:border-slate-800"
                      >
                        In 1 Week
                      </Button>
                      {deadline && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeadline(undefined)}
                          className="text-xs rounded-lg h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                        >
                          <X className="h-3 w-3 mr-1" /> Clear Date
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

          {/* Action Toolbar Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full sm:w-auto text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl h-11 font-semibold gap-2"
            >
              <Trash2 className="h-4 w-4" /> Delete Task
            </Button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                type="button"
                onClick={() => router.back()}
                className="w-1/2 sm:w-auto rounded-xl h-11 font-semibold px-6 border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-1/2 sm:w-auto rounded-xl h-11 font-bold px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Update Task & Assignees
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Alert Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <Trash2 className="h-5 w-5" /> Permanently Delete Task?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete task <strong>"{title}"</strong> and remove all associated assignments, task logs, and comments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting} className="rounded-xl font-semibold">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  "Delete Permanently"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleBasedAccess>
  )
}
