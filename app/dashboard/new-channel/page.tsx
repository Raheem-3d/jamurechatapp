"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, Users, Hash, Globe, Lock, ArrowLeft, Search, Building2, CheckCircle2, X } from "lucide-react"
import { toast } from "sonner"
import { usePermissions } from "@/lib/rbac-utils"
import { useTeamUsers } from "@/hooks/use-team-users"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type Department = {
  id: string
  name: string
}

type User = {
  id: string
  name: string
  email: string
  departmentId: string | null
}

export default function NewChannelPage() {
  const { data: session } = useSession()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [departmentId, setDepartmentId] = useState("")
  const [assignees, setAssignees] = useState<string[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const perms = usePermissions()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceRef = useRef<number | undefined>(undefined)

  const { users, loading: isfetchingUsers } = useTeamUsers()

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Instant local preview
    const previewUrl = URL.createObjectURL(file)
    setImage(previewUrl)

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      const rawUrl = data?.files?.[0]?.fileUrl
      if (rawUrl) {
        const cleanUrl = rawUrl.includes("/u/")
          ? `/u/${rawUrl.split("/u/")[1]}`
          : rawUrl
        setImage(cleanUrl)
        toast.success("Profile picture uploaded")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to upload image")
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Check if user has permission to manage channels
  useEffect(() => {
    if (session?.user) {
      if (!perms.canManageChannels) {
        toast.error("Access Denied", {
          description: "You don't have permission to create channels",
        })
        router.push("/dashboard")
      }
    }
  }, [session, router, perms])

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const departmentsRes = await fetch("/api/departments")

        if (departmentsRes.ok) {
          const departmentsData = await departmentsRes.json()
          setDepartments(departmentsData)
        }
      } catch (error) {
        console.error("Error fetching departments:", error)
        toast.error("Failed to load departments")
      }
    }

    fetchDepartments()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Channel name is required")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/channels/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.toLowerCase().replace(/\s+/g, "-"),
          description,
          isPublic,
          image,
          departmentId: !departmentId || departmentId === 'none' ? null : departmentId,
          members: assignees,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create channel")
      }

      const channel = await response.json()

      toast.success("Channel created successfully", {
        description: "Your new channel is ready for collaboration",
      })

      // Notify sidebar and other listeners to refresh immediately
      try {
        window.dispatchEvent(new CustomEvent('channel:created', { detail: channel }))
      } catch { }

      router.push(`/dashboard/channels/${channel.id}`)
      router.refresh()
    } catch (error) {
      toast.error("Failed to create channel")
    } finally {
      setIsLoading(false)
    }
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

  const toggleAssignee = (userId: string) => {
    setAssignees((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const selectedDepartment = departments.find(d => d.id === departmentId)

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
              Create Channel
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Create a new channel for team communication & collaboration
            </p>
          </div>
        </div>
      </div>

      {/* Form Content — 2-Column Widescreen Layout */}
      <form onSubmit={handleSubmit}>
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* LEFT COLUMN (7 cols): Channel Information */}
          <div className="lg:col-span-7 space-y-5 min-w-0">
            <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Hash className="h-4 w-4" />
                  </div>
                  Channel Details
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Channel Profile Picture (DP) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Channel Profile Picture (DP)
                  </Label>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center overflow-hidden shrink-0">
                      {image ? (
                        <img src={image} alt="Channel DP" className="w-full h-full object-cover" />
                      ) : (
                        <Hash className="h-6 w-6 text-indigo-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                        className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {isUploadingImage && (
                        <p className="text-[11px] text-indigo-500 font-medium">Uploading profile picture...</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Channel Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Channel Name <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm select-none">
                      #
                    </div>
                    <Input
                      id="name"
                      placeholder="e.g. marketing-team, announcements, project-alpha"
                      value={name}
                      onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      required
                      className="pl-7 h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Channel names are lowercase with hyphens instead of spaces
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the purpose of this channel..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm min-h-[80px] max-h-[140px] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Department & Privacy Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Department */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                      Department
                    </Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold">
                        <SelectValue placeholder="Select department (optional)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none" className="text-xs font-semibold">No department</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id} className="text-xs font-semibold">
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Privacy Toggle Card */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      {isPublic ? (
                        <Globe className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      Privacy Mode
                    </Label>

                    <div className="flex items-center justify-between p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 h-10">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        {isPublic ? "Public Channel" : "Private Channel"}
                      </span>
                      <Switch
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                        className="data-[state=checked]:bg-emerald-600 scale-90"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN (5 cols): Team Members & Submit */}
          <div className="lg:col-span-5 space-y-5 min-w-0">
            {/* Team Members Selection Card */}
            <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-blue-600 dark:text-blue-400">
                      <Users className="h-4 w-4" />
                    </div>
                    Add Channel Members
                  </CardTitle>
                  {assignees.length > 0 && (
                    <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs px-2 py-0.5">
                      {assignees.length} selected
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-3">
                {/* Selected Members Chips */}
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
                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
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

            {/* Summary & Submit Card */}
            <Card className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-3">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Type</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {isPublic ? "Public" : "Private"}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Dept</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">
                      {selectedDepartment ? selectedDepartment.name : "None"}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Members</p>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {assignees.length}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
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
                    disabled={isLoading || !name.trim()}
                    className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Hash className="h-4 w-4 mr-1.5" />
                        Create Channel
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