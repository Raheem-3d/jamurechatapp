
"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Plus, X, Users, Briefcase, Mail, Search, ArrowLeft, FileText, CalendarDays, Shield, CheckCircle2, AlertTriangle, Clock, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { usePermissions } from "@/lib/rbac-utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DescriptionGenerator } from "@/components/description-generator"
import { useTeamUsers } from "@/hooks/use-team-users"

type User = {
  id: string
  name: string
  email: string
  role: string
}

type ClientEmail = {
  email: string
  role: string
  access: string
}

export default function NewTaskPage() {
  const { data: session } = useSession()
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
        console.error("Failed to fetch organization setting for AI in new task page:", err);
      }
    };
    fetchOrg();
  }, []);
  const [priority, setPriority] = useState("MEDIUM")
  const [deadline, setDeadline] = useState<Date | undefined>(undefined)
  const [deadlineRange, setDeadlineRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined })
  const [useRange, setUseRange] = useState(false)
  const [assignees, setAssignees] = useState<string[]>([])
  const [clientEmails, setClientEmails] = useState<ClientEmail[]>([])
  const [newClientEmail, setNewClientEmail] = useState("")
  const [newClientRole, setNewClientRole] = useState("CLIENT")
  const [newClientAccess, setNewClientAccess] = useState("VIEW")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const perms = usePermissions()
  // Accept either canCreateTasks or canManageProjects
  const canAccess = perms.canCreateTasks || perms.canManageProjects
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceRef = useRef<number | undefined>(undefined)

  // Use the new hook to get team users
  const { users, loading: isfetchingUsers } = useTeamUsers()

  // Check if user has permission to create tasks/projects
  useEffect(() => {
    if (session?.user) {
      if (!perms.canCreateTasks && !perms.canManageProjects) {
        toast.error("Access Denied", {
          description: "You don't have permission to create projects. You need either TASK_CREATE or PROJECT_MANAGE permission.",
        })
        router.push("/dashboard")
      }
    }
  }, [session, router, perms])

  const [mode, setMode] = useState<"project" | "subtask">("project")
  const [selectedParentTaskId, setSelectedParentTaskId] = useState("none")
  const [parentProjects, setParentProjects] = useState<any[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)

  // Fetch parent projects if mode is subtask
  useEffect(() => {
    if (mode === "subtask" && parentProjects.length === 0) {
      const fetchProjects = async () => {
        setIsLoadingProjects(true)
        try {
          const res = await fetch("/api/tasks")
          if (res.ok) {
            const data = await res.json()
            const activeProjects = (Array.isArray(data) ? data : []).filter((p: any) => p.status !== "DONE")
            setParentProjects(activeProjects)
          }
        } catch (err) {
          console.error("Failed to fetch projects:", err)
        } finally {
          setIsLoadingProjects(false)
        }
      }
      fetchProjects()
    }
  }, [mode, parentProjects.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error(mode === "subtask" ? "Task title is required" : "Project title is required")
      return
    }

    setIsLoading(true)

    try {
      if (mode === "subtask") {
        // Quick Subtask creation
        const finalDeadline = useRange && deadlineRange.from
          ? format(deadlineRange.to || deadlineRange.from, "yyyy-MM-dd")
          : deadline
            ? format(deadline, "yyyy-MM-dd")
            : null

        const finalStartDate = useRange && deadlineRange.from ? format(deadlineRange.from, "yyyy-MM-dd") : null
        const finalEndDate = useRange && deadlineRange.to ? format(deadlineRange.to, "yyyy-MM-dd") : null

        const targetTaskId = selectedParentTaskId && selectedParentTaskId !== "none" ? selectedParentTaskId : null

        if (targetTaskId) {
          const res = await fetch(`/api/tasks/${targetTaskId}/subtasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              description: description.trim(),
              priority,
              deadline: finalDeadline,
              startDate: finalStartDate,
              endDate: finalEndDate,
              assigneeIds: assignees,
            }),
          })

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            throw new Error(errData.error || "Failed to create quick task")
          }

          const data = await res.json()
          toast.success("Quick Subtask Created", {
            description: `Added "${title}" under the existing project.`,
          })

          try {
            window.dispatchEvent(new CustomEvent('subtask:created', { detail: data.subtask }))
          } catch { }

          router.push(`/dashboard/tasks/${targetTaskId}`)
          return
        } else {
          // Standalone quick task
          const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              description,
              priority,
              deadline: finalDeadline,
              deadlineRange: useRange && deadlineRange.from ? {
                from: finalStartDate,
                to: finalEndDate ?? finalStartDate,
              } : null,
              assignees,
              isQuickTask: true,
            }),
          })

          if (!response.ok) {
            throw new Error("Failed to create task")
          }

          const task = await response.json()
          toast.success("Quick Task Created", {
            description: `Created standalone quick task "${title}".`,
          })

          try {
            window.dispatchEvent(new CustomEvent('task:created', { detail: task }))
          } catch { }

          router.push(`/dashboard/tasks/${task.id}`)
          return
        }
      }

      // Main Project creation
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
          deadlineRange: useRange && deadlineRange.from ? {
            from: format(deadlineRange.from, "yyyy-MM-dd"),
            to: format(deadlineRange.to ?? deadlineRange.from, "yyyy-MM-dd")
          } : null,
          assignees,
          clientEmails,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create project")
      }

      const task = await response.json()

      toast.success("Project Created", {
        description: "Your new project has been created successfully.",
      })

      // Notify sidebar and other listeners to refresh immediately
      try {
        window.dispatchEvent(new CustomEvent('task:created', { detail: task }))
        window.dispatchEvent(new CustomEvent('project:created', { detail: task }))
      } catch { }

      if (canAccess) {
        router.push(`/dashboard/tasks/${task.id}`)
      } else {
        router.push("/dashboard/tasks")
      }
    } catch (error: any) {
      console.error("Error creating task/project:", error)
      toast.error("Error", {
        description: error.message || "Failed to create task",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAssignee = (userId: string) => {
    setAssignees((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const addClientEmail = () => {
    if (!newClientEmail.trim()) {
      toast.error("Email is required")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClientEmail)) {
      toast.error("Please enter a valid email address")
      return
    }

    if (clientEmails.some(client => client.email === newClientEmail)) {
      toast.error("This email is already added")
      return
    }

    setClientEmails(prev => [
      ...prev,
      {
        email: newClientEmail,
        role: newClientRole,
        access: newClientAccess
      }
    ])
    setNewClientEmail("")
  }

  const removeClientEmail = (email: string) => {
    setClientEmails(prev => prev.filter(client => client.email !== email))
  }

  useEffect(() => {
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => window.clearTimeout(debounceRef.current)
  }, [search])

  const filteredPeople = useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    if (!q) return users ?? []
    return (users ?? []).filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  }, [users, debouncedSearch])

  const priorityOptions = [
    { value: "LOW", label: "Low", icon: <Clock className="h-3.5 w-3.5" />, color: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
    { value: "MEDIUM", label: "Medium", icon: <Zap className="h-3.5 w-3.5" />, color: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
    { value: "HIGH", label: "High", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
    { value: "URGENT", label: "Urgent", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800" },
  ]

  const getAccessBadgeColor = (access: string) => {
    switch (access) {
      case "EDIT": return "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
      case "COMMENT": return "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
      case "VIEW": return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
      default: return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Top Header Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              {mode === "project" ? "Create New Project" : "Add Quick Subtask"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {mode === "project"
                ? "Set up a full project with assignees and task flows"
                : "Create an urgent or intermediate task linked to an existing running project"}
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shrink-0">
          <button
            type="button"
            onClick={() => setMode("project")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              mode === "project"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Briefcase className="h-3.5 w-3.5" />
            New Project
          </button>
          <button
            type="button"
            onClick={() => setMode("subtask")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              mode === "subtask"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Quick Subtask
          </button>
        </div>
      </div>

      {/* Form Content — 2-Column Layout */}
      <form onSubmit={handleSubmit}>
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT COLUMN (7 cols): Project / Subtask Details */}
          <div className="lg:col-span-7 space-y-5 min-w-0">
            {/* Info Card */}
            <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  {mode === "project" ? "Project Information" : "Subtask Information"}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* If Subtask Mode: Parent Project Selection */}
                {mode === "subtask" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                      Parent Project <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                    </Label>
                    <Select
                      value={selectedParentTaskId}
                      onValueChange={setSelectedParentTaskId}
                      disabled={isLoadingProjects}
                    >
                      <SelectTrigger className="h-10 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <SelectValue
                          placeholder={
                            isLoadingProjects
                              ? "Loading running projects..."
                              : "None (Standalone Quick Task)"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-56">
                        <SelectItem value="none" className="text-xs font-semibold text-slate-500">
                          🚫 None (Standalone Quick Task)
                        </SelectItem>
                        {parentProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                            {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {mode === "project" ? "Project Title" : "Task Title"} <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder={mode === "project" ? "Enter project title..." : "e.g., Fix urgent mobile checkout bug, review contract draft..."}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Description
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
                    placeholder="Describe the project goals and requirements..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm min-h-[80px] max-h-[140px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Priority & Deadline Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Priority */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Priority</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {priorityOptions.map((opt) => (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => setPriority(opt.value)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                            priority === opt.value
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

                  {/* Deadline */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Deadline</Label>
                      <div className="flex items-center gap-1.5">
                        <Checkbox id="use-range" checked={useRange} onCheckedChange={(v) => setUseRange(!!v)} className="h-3.5 w-3.5" />
                        <Label htmlFor="use-range" className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold cursor-pointer">Date range</Label>
                      </div>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-10 justify-start text-left font-medium rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm",
                            (!useRange && !deadline || (useRange && !deadlineRange.from)) && "text-slate-400 dark:text-slate-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
                          {!useRange
                            ? (deadline ? format(deadline, "PPP") : "Select deadline")
                            : (deadlineRange.from && deadlineRange.to
                              ? `${format(deadlineRange.from, "MMM d")} — ${format(deadlineRange.to, "MMM d")}`
                              : (deadlineRange.from
                                ? `${format(deadlineRange.from, "MMM d")} — …`
                                : "Select deadline range"))}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl border-slate-200 dark:border-slate-800 shadow-xl" align="start">
                        {!useRange ? (
                          <Calendar
                            mode="single"
                            selected={deadline}
                            onSelect={setDeadline}
                            initialFocus
                            className="rounded-xl"
                          />
                        ) : (
                          <Calendar
                            mode="range"
                            selected={deadlineRange as any}
                            onSelect={(r: any) => setDeadlineRange(r || { from: undefined, to: undefined })}
                            numberOfMonths={2}
                            initialFocus
                            className="rounded-xl"
                          />
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Access Card - Only in Full Project Mode */}
            {mode === "project" && (
              <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
                <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <Shield className="h-4 w-4" />
                    </div>
                    Client Access
                    {clientEmails.length > 0 && (
                      <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] px-1.5 py-0">
                        {clientEmails.length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-3">
                  {/* Add Client Input */}
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <Input
                      type="email"
                      placeholder="Enter client email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addClientEmail() } }}
                      className="flex-1 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                    />
                    <Select value={newClientAccess} onValueChange={setNewClientAccess}>
                      <SelectTrigger className="w-full sm:w-[120px] h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold">
                        <SelectValue placeholder="Access" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="VIEW" className="text-xs font-semibold">View Only</SelectItem>
                        <SelectItem value="COMMENT" className="text-xs font-semibold">Can Comment</SelectItem>
                        <SelectItem value="EDIT" className="text-xs font-semibold">Can Edit</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      onClick={addClientEmail}
                      size="sm"
                      className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-3"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  </div>

                  {/* Client List */}
                  {clientEmails.length > 0 && (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {clientEmails.map((client) => (
                        <div key={client.email} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
                              <Mail className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{client.email}</p>
                              <Badge className={cn("text-[10px] font-bold px-1.5 py-0 mt-0.5", getAccessBadgeColor(client.access))}>
                                {client.access}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeClientEmail(client.email)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {clientEmails.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2 font-medium italic">
                      No clients added yet. Invite clients to give them project access.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN (5 cols): Team Members + Submit */}
          <div className="lg:col-span-5 space-y-5 min-w-0">
            {/* Team Members Card */}
            <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-blue-600 dark:text-blue-400">
                      <Users className="h-4 w-4" />
                    </div>
                    Team Members
                  </CardTitle>
                  {assignees.length > 0 && (
                    <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs px-2 py-0.5">
                      {assignees.length} selected
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-3">
                {/* Selected Assignees Chips */}
                {assignees.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pb-2 border-b border-slate-100 dark:border-slate-800">
                    {assignees.map((id) => {
                      const u = (users ?? []).find((x) => x.id === id)
                      if (!u) return null
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold"
                        >
                          <span className="truncate max-w-[100px]">{u.name}</span>
                          <button type="button" onClick={() => toggleAssignee(id)} className="ml-0.5 hover:text-rose-600 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search team members..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                  />
                </div>

                {/* Users List */}
                {isfetchingUsers ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mr-2" />
                    <span className="text-xs text-slate-500 font-medium">Loading team members...</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                    {filteredPeople.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="w-9 h-9 mx-auto bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 mb-2">
                          <Users className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {search ? "No members found" : "No team members available"}
                        </p>
                      </div>
                    ) : (
                      filteredPeople.map((person) => {
                        const isSelected = assignees.includes(person.id)
                        return (
                          <button
                            type="button"
                            key={person.id}
                            onClick={() => toggleAssignee(person.id)}
                            className={cn(
                              "w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all",
                              isSelected
                                ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 shadow-2xs"
                                : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="h-7 w-7 ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                                <AvatarFallback className="bg-indigo-600 text-white font-bold text-[10px]">
                                  {person.name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {person.name}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                  {person.email}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Actions Card */}
            <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-3">
                {/* Summary */}
                <div className={cn("grid gap-2 text-center", mode === "project" ? "grid-cols-3" : "grid-cols-2")}>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Priority</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">{priority}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Members</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">{assignees.length}</p>
                  </div>
                  {mode === "project" && (
                    <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Clients</p>
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">{clientEmails.length}</p>
                    </div>
                  )}
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
                    disabled={isLoading || isfetchingUsers || !title.trim() || (mode === "subtask" && !selectedParentTaskId)}
                    className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        {mode === "subtask" ? "Creating Task..." : "Creating Project..."}
                      </>
                    ) : mode === "subtask" ? (
                      <>
                        <Zap className="h-4 w-4 mr-1.5 text-amber-300" />
                        Create Quick Subtask
                      </>
                    ) : (
                      <>
                        <Briefcase className="h-4 w-4 mr-1.5" />
                        Create Project
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
  )
}