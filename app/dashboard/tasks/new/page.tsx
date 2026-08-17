
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error("Project title is required")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          deadline,
          deadlineRange: useRange && deadlineRange.from ? { from: deadlineRange.from, to: deadlineRange.to ?? deadlineRange.from } : null,
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
      } catch {}

      if (canAccess) {
        router.push(`/dashboard/tasks/${task.id}/record`)
        router.refresh()
      }
      router.push(`/dashboard/tasks/${task.id}`)
      router.refresh()
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error("Failed to create project")
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
              Create New Project
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Set up a new project and assign team members
            </p>
          </div>
        </div>
      </div>

      {/* Form Content — 2-Column Layout */}
      <form onSubmit={handleSubmit}>
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT COLUMN (7 cols): Project Details */}
          <div className="lg:col-span-7 space-y-5 min-w-0">
            {/* Project Info Card */}
            <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  Project Information
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Project Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Project Title <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter project title..."
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

            {/* Client Access Card */}
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
                      filteredPeople.map((user) => {
                        const isSelected = assignees.includes(user.id)
                        return (
                          <button
                            type="button"
                            key={user.id}
                            onClick={() => toggleAssignee(user.id)}
                            className={cn(
                              "w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left",
                              isSelected
                                ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20"
                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                            )}
                          >
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className={cn(
                                "font-bold text-xs",
                                isSelected
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              )}>
                                {user.name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {user.name}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {user.email}
                              </p>
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
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Priority</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">{priority}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Members</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">{assignees.length}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Clients</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">{clientEmails.length}</p>
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
                    disabled={isLoading || isfetchingUsers || !title.trim()}
                    className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        Creating...
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