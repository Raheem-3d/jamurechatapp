"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Shield, CheckCircle2, Lock, Briefcase, Hash, Eye, FileText, Trash2, Users, BarChart3, Globe, Bot } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type Department = {
  id: string
  name: string
}

type User = {
  id: string
  name: string
  email: string
  role: string
  departmentId: string | null
  department: {
    name: string
  } | null
}

// ── Permission definitions ──────────────────────────────────────────
type PermissionKey =
  | "ORG_VIEW"
  | "PROJECT_MANAGE"
  | "PROJECT_VIEW_ALL"
  | "TASK_CREATE"
  | "TASK_EDIT"
  | "TASK_VIEW"
  | "TASK_DELETE"
  | "TASK_VIEW_ALL"
  | "CHANNEL_CREATE"
  | "CHANNEL_VIEW_ALL"
  | "CHANNEL_MANAGE"
  | "CHANNEL_DELETE"
  | "REPORTS_VIEW"

type PermissionGroup = {
  label: string
  icon: React.ReactNode
  color: string
  permissions: { key: PermissionKey; label: string; desc: string }[]
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Projects & Tasks",
    icon: <Briefcase className="h-3.5 w-3.5" />,
    color: "indigo",
    permissions: [
      { key: "TASK_CREATE", label: "Create Tasks/Projects", desc: "Can create new tasks and projects" },
      { key: "TASK_EDIT", label: "Edit Tasks", desc: "Can edit existing tasks" },
      { key: "TASK_VIEW", label: "View Tasks", desc: "Can view task details" },
      { key: "TASK_DELETE", label: "Delete Tasks", desc: "Can delete tasks" },
      { key: "TASK_VIEW_ALL", label: "View All Tasks", desc: "Can view all org tasks (not just own)" },
      { key: "PROJECT_MANAGE", label: "Manage Projects", desc: "Full project management access" },
      { key: "PROJECT_VIEW_ALL", label: "View All Projects", desc: "Can see all org projects" },
    ],
  },
  {
    label: "Channels",
    icon: <Hash className="h-3.5 w-3.5" />,
    color: "violet",
    permissions: [
      { key: "CHANNEL_CREATE", label: "Create Channels", desc: "Can create new channels" },
      { key: "CHANNEL_MANAGE", label: "Manage Channels", desc: "Can edit/manage channels" },
      { key: "CHANNEL_VIEW_ALL", label: "View All Channels", desc: "Can see all org channels" },
      { key: "CHANNEL_DELETE", label: "Delete Channels", desc: "Can delete channels" },
    ],
  },
  {
    label: "Organization",
    icon: <Globe className="h-3.5 w-3.5" />,
    color: "emerald",
    permissions: [
      { key: "ORG_VIEW", label: "View Org Info", desc: "Can view organization details" },
      { key: "REPORTS_VIEW", label: "View Reports", desc: "Can view analytics and reports" },
    ],
  },
]

const COLOR_MAP: Record<string, string> = {
  indigo: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400",
  violet: "bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
}

const HEADER_COLOR_MAP: Record<string, string> = {
  indigo: "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40",
  violet: "bg-violet-50/50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40",
  emerald: "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40",
}

// ── Component ───────────────────────────────────────────────────────
export default function AdminSettings() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [newDepartmentName, setNewDepartmentName] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [selectedManager, setSelectedManager] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([])
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [searchUser, setSearchUser] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [editedDepartmentName, setEditedDepartmentName] = useState("")
  const [aiEnabled, setAiEnabled] = useState(true)
  const [isTogglingAI, setIsTogglingAI] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [departmentsRes, usersRes] = await Promise.all([fetch("/api/departments"), fetch("/api/users")])

        if (departmentsRes.ok && usersRes.ok) {
          const departmentsData = await departmentsRes.json()
          const usersData = await usersRes.json()
          setDepartments(departmentsData)
          setUsers(usersData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        })
      }
    }

    fetchData()
  }, [toast])

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const res = await fetch("/api/organization/settings/features")
        if (res.ok) {
          const data = await res.json()
          if (data.features && data.features.aiEnabled !== undefined) {
            setAiEnabled(data.features.aiEnabled)
          }
        }
      } catch (err) {
        console.error("Failed to fetch features:", err)
      }
    }
    fetchFeatures()
  }, [])

  const handleToggleAI = async (checked: boolean) => {
    setIsTogglingAI(true)
    try {
      const response = await fetch("/api/organization/settings/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiEnabled: checked }),
      })

      if (!response.ok) throw new Error("Failed to update AI feature setting")

      const data = await response.json()
      if (data.features && data.features.aiEnabled !== undefined) {
        setAiEnabled(data.features.aiEnabled)
      }
      toast({
        title: `AI Assistant ${checked ? "Enabled" : "Disabled"}`,
        description: `The AI Project Assistant has been successfully turned ${checked ? "on" : "off"} for everyone.`,
      })
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update AI assistant settings",
        variant: "destructive",
      })
    } finally {
      setIsTogglingAI(false)
    }
  }

  // When exactly 1 user is selected, fetch their existing permissions
  useEffect(() => {
    if (selectedUsers.length !== 1) {
      setSelectedPermissions([])
      return
    }
    const userId = selectedUsers[0]
    const user = users.find((u) => u.id === userId)
    // Don't load permissions for admins (API blocks it anyway)
    if (!user || user.role === "ORG_ADMIN" || user.role === "SUPER_ADMIN") {
      setSelectedPermissions([])
      return
    }

    setLoadingPerms(true)
    fetch(`/api/org-admin/users/${userId}/permissions`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.permissions)) {
          setSelectedPermissions(data.permissions as PermissionKey[])
        }
      })
      .catch(console.error)
      .finally(() => setLoadingPerms(false))
  }, [selectedUsers, users])

  const togglePermission = (key: PermissionKey) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    )
  }

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDepartmentName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDepartmentName }),
      })

      if (!response.ok) throw new Error("Failed to create department")

      const newDepartment = await response.json()
      setDepartments([...departments, newDepartment])
      setNewDepartmentName("")
      toast({ title: "Department Created", description: "The department has been created successfully" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to create department", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedUsers.length === 0 || (!selectedRole && !selectedDepartment && !selectedManager)) return

    setIsLoading(true)
    try {
      const updateData = {
        role: selectedRole || undefined,
        departmentId: selectedDepartment || undefined,
        managerId: selectedManager === "unassigned" ? null : (selectedManager || undefined),
      }

      const updatePromises = selectedUsers.map((userId) =>
        fetch(`/api/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        })
      )

      const responses = await Promise.all(updatePromises)
      const allSuccess = responses.every((res) => res.ok)

      if (!allSuccess) throw new Error("Failed to update one or more users")

      const updatedUsers = await Promise.all(responses.map((res) => res.json()))
      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          const updated = updatedUsers.find((u) => u.id === user.id)
          return updated || user
        })
      )

      // Also save permissions if exactly 1 non-admin user selected
      if (selectedUsers.length === 1) {
        const userId = selectedUsers[0]
        const user = users.find((u) => u.id === userId)
        if (user && user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN") {
          await fetch(`/api/org-admin/users/${userId}/permissions`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ permissions: selectedPermissions }),
          })
        }
      }

      setSelectedUsers([])
      setSelectedRole("")
      setSelectedDepartment("")
      setSelectedManager("")
      setSelectedPermissions([])
      setSearchUser("")
      toast({
        title: "Users Updated",
        description: `${selectedUsers.length} user(s) have been updated successfully`,
      })
      router.refresh()
    } catch (error) {
      toast({ title: "Error", description: "Failed to update users", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department)
    setEditedDepartmentName(department.name)
    setIsEditDialogOpen(true)
  }

  const handleSaveDepartment = async () => {
    if (!editingDepartment || !editedDepartmentName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/departments/${editingDepartment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editedDepartmentName }),
      })

      if (!response.ok) throw new Error("Failed to update department")

      const updatedDepartment = await response.json()
      setDepartments(departments.map((dept) => (dept.id === updatedDepartment.id ? updatedDepartment : dept)))
      setIsEditDialogOpen(false)
      setEditingDepartment(null)
      toast({ title: "Department Updated", description: "The department has been updated successfully" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to update department", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  // Check if selected user is an admin (permissions editing blocked)
  const selectedUserIsAdmin =
    selectedUsers.length === 1 &&
    ["ORG_ADMIN", "SUPER_ADMIN"].includes(users.find((u) => u.id === selectedUsers[0])?.role || "")

  const showPermissions = selectedUsers.length === 1 && !selectedUserIsAdmin

  return (
    <Tabs defaultValue="departments">
      <TabsList>
        <TabsTrigger value="departments">Departments</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="features">Feature Controls</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>

      {/* ── Departments Tab ── */}
      <TabsContent value="departments">
        <div className="space-y-6">
          <Card className="dark:bg-gray-900">
            <CardHeader>
              <CardTitle>Create Department</CardTitle>
              <CardDescription>Add a new department to your organization</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateDepartment}>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="department-name">Department Name</Label>
                  <Input
                    id="department-name"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    placeholder="Enter department name"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Department"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="dark:bg-gray-900">
            <CardHeader>
              <CardTitle>Existing Departments</CardTitle>
              <CardDescription>Manage your organization's departments</CardDescription>
            </CardHeader>
            <CardContent>
              {departments.length === 0 ? (
                <p className="text-sm text-gray-500">No departments yet</p>
              ) : (
                <div className="space-y-4">
                  {departments.map((department) => (
                    <div key={department.id} className="flex items-center justify-between border p-3 rounded-md">
                      <span className="font-medium">{department.name}</span>
                      <Button variant="outline" size="sm" onClick={() => handleEditDepartment(department)}>
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ── Users Tab ── */}
      <TabsContent value="users">
        <Card className="dark:bg-gray-900">
          <CardHeader>
            <CardTitle>Manage Users</CardTitle>
            <CardDescription>Select users to update their roles, departments and permissions</CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdateUser}>
            <CardContent className="space-y-5">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search-user">Search Users</Label>
                <Input
                  id="search-user"
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="dark:bg-gray-800"
                />
              </div>

              {/* User list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Users</Label>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={() => {
                      const filteredUsers = users.filter(
                        (user) =>
                          user.name.toLowerCase().includes(searchUser.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchUser.toLowerCase())
                      )
                      if (selectedUsers.length === filteredUsers.length && filteredUsers.length > 0) {
                        setSelectedUsers(selectedUsers.filter((id) => !filteredUsers.find((u) => u.id === id)))
                      } else {
                        setSelectedUsers([
                          ...selectedUsers.filter((id) => !filteredUsers.find((u) => u.id === id)),
                          ...filteredUsers.map((u) => u.id),
                        ])
                      }
                    }}
                  >
                    {(() => {
                      const filteredUsers = users.filter(
                        (user) =>
                          user.name.toLowerCase().includes(searchUser.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchUser.toLowerCase())
                      )
                      const allFiltered = filteredUsers.every((u) => selectedUsers.includes(u.id))
                      return allFiltered && filteredUsers.length > 0 ? "Deselect All" : "Select All"
                    })()}
                  </button>
                </div>

                <div className="border rounded-md p-3 space-y-2 max-h-64 overflow-y-auto dark:border-gray-700">
                  {(() => {
                    const filteredUsers = users.filter(
                      (user) =>
                        user.name.toLowerCase().includes(searchUser.toLowerCase()) ||
                        user.email.toLowerCase().includes(searchUser.toLowerCase())
                    )
                    return filteredUsers.length === 0 ? (
                      <p className="text-sm text-gray-500">No users found</p>
                    ) : (
                      filteredUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`user-${user.id}`}
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.id])
                              } else {
                                setSelectedUsers(selectedUsers.filter((id) => id !== user.id))
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer flex-1">
                            {user.name} ({user.email})
                          </label>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {user.role}
                          </span>
                        </div>
                      ))
                    )
                  })()}
                </div>
                {selectedUsers.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedUsers.length} user(s) selected
                  </p>
                )}
              </div>

              {/* ── Role / Dept / Manager ── */}
              {selectedUsers.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ORG_ADMIN">Admin</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manager">Assigned Manager</Label>
                    <Select value={selectedManager} onValueChange={setSelectedManager}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a manager (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">None</SelectItem>
                        {users
                          .filter((user) => !selectedUsers.includes(user.id) && user.role === "MANAGER")
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ── Permissions Section ── */}
                  {selectedUserIsAdmin ? (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 p-4 flex items-start gap-3">
                      <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          Admin Permissions Locked
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          Admins already have full access. Custom permissions cannot be modified for admin users.
                        </p>
                      </div>
                    </div>
                  ) : showPermissions ? (
                    <div className="space-y-3">
                      {/* Permissions header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Custom Permissions</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Grant specific abilities beyond default role
                            </p>
                          </div>
                        </div>
                        {loadingPerms && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
                        {selectedPermissions.length > 0 && !loadingPerms && (
                          <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs border-0">
                            {selectedPermissions.length} active
                          </Badge>
                        )}
                      </div>

                      {/* Permission groups */}
                      <div className="space-y-3">
                        {PERMISSION_GROUPS.map((group) => (
                          <div
                            key={group.label}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                          >
                            {/* Group header */}
                            <div className={cn("flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800", HEADER_COLOR_MAP[group.color])}>
                              <span className={cn("p-1 rounded-md border", COLOR_MAP[group.color])}>
                                {group.icon}
                              </span>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {group.label}
                              </span>
                              <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                {group.permissions.filter((p) => selectedPermissions.includes(p.key)).length} /
                                {group.permissions.length} selected
                              </span>
                            </div>

                            {/* Permission items */}
                            <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-white dark:bg-slate-900">
                              {group.permissions.map((perm) => {
                                const active = selectedPermissions.includes(perm.key)
                                return (
                                  <button
                                    key={perm.key}
                                    type="button"
                                    onClick={() => togglePermission(perm.key)}
                                    className={cn(
                                      "flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all",
                                      active
                                        ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800"
                                        : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                                    )}
                                  >
                                    <div className={cn(
                                      "h-4 w-4 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-all",
                                      active
                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                                    )}>
                                      {active && <CheckCircle2 className="h-3 w-3" />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className={cn(
                                        "text-xs font-bold truncate",
                                        active
                                          ? "text-indigo-700 dark:text-indigo-300"
                                          : "text-slate-700 dark:text-slate-300"
                                      )}>
                                        {perm.label}
                                      </p>
                                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                                        {perm.desc}
                                      </p>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Quick presets */}
                      <div className="flex flex-wrap gap-2">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 w-full">Quick presets:</p>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPermissions(["TASK_CREATE", "TASK_EDIT", "TASK_VIEW", "PROJECT_MANAGE", "PROJECT_VIEW_ALL"])
                          }
                          className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-colors"
                        >
                          🗂 Project Manager
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPermissions(["TASK_CREATE", "TASK_EDIT", "TASK_VIEW", "CHANNEL_CREATE"])
                          }
                          className="text-xs px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-semibold hover:bg-violet-100 dark:hover:bg-violet-950 transition-colors"
                        >
                          📋 Team Lead
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPermissions([
                              "TASK_CREATE", "TASK_EDIT", "TASK_VIEW", "TASK_DELETE", "TASK_VIEW_ALL",
                              "PROJECT_MANAGE", "PROJECT_VIEW_ALL",
                              "CHANNEL_CREATE", "CHANNEL_MANAGE", "CHANNEL_VIEW_ALL",
                              "ORG_VIEW", "REPORTS_VIEW",
                            ])
                          }
                          className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors"
                        >
                          ⚡ Full Access (like Admin)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPermissions([])}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          🔄 Clear All
                        </button>
                      </div>
                    </div>
                  ) : selectedUsers.length > 1 ? (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30 p-4 flex items-start gap-3">
                      <Users className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Select exactly <span className="font-bold">1 user</span> to manage custom permissions. Multiple users selected — only role/dept/manager will be updated.
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={isLoading || selectedUsers.length === 0 || (!selectedRole && !selectedDepartment && !selectedManager)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  `Update ${selectedUsers.length} User${selectedUsers.length !== 1 ? "s" : ""}`
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>

      {/* ── Analytics Tab ── */}
      <TabsContent value="analytics">
        <Card className="dark:bg-slate-900 border-slate-200/85 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Organization Analytics & Reports
            </CardTitle>
            <CardDescription className="text-xs">
              Redirecting you to the comprehensive reporting and analytics platform...
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-full text-indigo-600 animate-pulse">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              You are being redirected to the Reporting Dashboard.
            </p>
            <Button
              onClick={() => router.push("/dashboard/reports")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-6 text-xs shadow-sm"
            >
              Go to Reports Now
            </Button>
          </CardContent>
        </Card>
        <AnalyticsRedirectTrigger router={router} />
      </TabsContent>

      {/* ── Feature Controls Tab ── */}
      <TabsContent value="features">
        <div className="space-y-6">
          <Card className="dark:bg-gray-900 overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <CardHeader className="bg-gradient-to-r from-blue-50/50 via-indigo-50/10 to-purple-50/5 dark:from-slate-900/60 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-extrabold flex items-center gap-2 text-slate-850 dark:text-white">
                <Bot className="h-5 w-5 text-indigo-500" />
                AI Assistant Feature Controls
              </CardTitle>
              <CardDescription className="text-xs">
                Manage global availability of AI-powered capabilities across your organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-850/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-white">AI Project Assistant</span>
                    <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[9px] px-1.5 py-0.5 border-0">
                      Ollama Ready
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-lg leading-relaxed">
                    Enable or disable access to the AI Chat Panel (/dashboard/ai-assistant) for all team members. When disabled, the AI Assistant link is removed from navigation and direct URL access is blocked.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={aiEnabled}
                    onCheckedChange={handleToggleAI}
                    disabled={isTogglingAI}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>Update the department name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-department-name">Department Name</Label>
              <Input
                id="edit-department-name"
                value={editedDepartmentName}
                onChange={(e) => setEditedDepartmentName(e.target.value)}
                placeholder="Enter department name"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDepartment} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}

const AnalyticsRedirectTrigger = ({ router }: { router: any }) => {
  useEffect(() => {
    router.push("/dashboard/reports")
  }, [router])
  return null
}
