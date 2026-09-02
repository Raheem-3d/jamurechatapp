"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Building,
  Users,
  Sliders,
  BarChart3,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Lock,
  Loader2,
  ArrowLeft,
  ChevronRight,
  Briefcase,
  Hash,
  Globe,
  Bot,
  Sparkles,
  Bell,
  X,
  UserCheck,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Department = {
  id: string;
  name: string;
  _count?: { users: number };
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  department: { name: string } | null;
};

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
  | "REPORTS_VIEW";

const PERMISSION_GROUPS = [
  {
    label: "Projects & Tasks",
    icon: Briefcase,
    color: "indigo",
    permissions: [
      { key: "TASK_CREATE" as PermissionKey, label: "Create Tasks", desc: "Create new tasks" },
      { key: "TASK_EDIT" as PermissionKey, label: "Edit Tasks", desc: "Edit task details" },
      { key: "TASK_DELETE" as PermissionKey, label: "Delete Tasks", desc: "Remove tasks" },
      { key: "TASK_VIEW_ALL" as PermissionKey, label: "View All Tasks", desc: "See entire workspace tasks" },
      { key: "PROJECT_MANAGE" as PermissionKey, label: "Manage Projects", desc: "Full project admin access" },
    ],
  },
  {
    label: "Channels & Rooms",
    icon: Hash,
    color: "violet",
    permissions: [
      { key: "CHANNEL_CREATE" as PermissionKey, label: "Create Channels", desc: "Create new discussion rooms" },
      { key: "CHANNEL_MANAGE" as PermissionKey, label: "Manage Channels", desc: "Edit channel info & members" },
      { key: "CHANNEL_DELETE" as PermissionKey, label: "Delete Channels", desc: "Archive or delete channels" },
    ],
  },
  {
    label: "Workspace & Reports",
    icon: Globe,
    color: "emerald",
    permissions: [
      { key: "ORG_VIEW" as PermissionKey, label: "View Org Info", desc: "View organization summary" },
      { key: "REPORTS_VIEW" as PermissionKey, label: "View Analytics", desc: "Access reports & charts" },
    ],
  },
];

export function OrgAdminMobile({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"departments" | "users" | "features" | "analytics">("departments");

  // Data state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Department creation / edit state
  const [newDeptName, setNewDeptName] = useState("");
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [isSavingDept, setIsSavingDept] = useState(false);

  // User management state
  const [searchUser, setSearchUser] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [editDeptId, setEditDeptId] = useState<string>("");
  const [editPermissions, setEditPermissions] = useState<PermissionKey[]>([]);
  const [isLoadingPerms, setIsLoadingPerms] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Feature controls state
  const [aiEnabled, setAiEnabled] = useState(true);
  const [smartReplyEnabled, setSmartReplyEnabled] = useState(true);
  const [buzzEnabled, setBuzzEnabled] = useState(true);
  const [allowPublicChannels, setAllowPublicChannels] = useState(true);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [deptRes, userRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/users"),
      ]);

      if (deptRes.ok) {
        const d = await deptRes.json();
        setDepartments(Array.isArray(d) ? d : []);
      }
      if (userRes.ok) {
        const u = await userRes.json();
        setUsers(Array.isArray(u) ? u : []);
      }
    } catch (err) {
      console.error("Failed to load admin data", err);
      toast.error("Failed to load organization data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Create Department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    setIsCreatingDept(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create department");
      }

      const created = await res.json();
      setDepartments((prev) => [...prev, created]);
      setNewDeptName("");
      toast.success(`Department "${created.name}" created successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create department");
    } finally {
      setIsCreatingDept(false);
    }
  };

  // Edit Department
  const handleSaveDepartment = async () => {
    if (!editingDept || !editDeptName.trim()) return;

    setIsSavingDept(true);
    try {
      const res = await fetch(`/api/departments/${editingDept.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editDeptName.trim() }),
      });

      if (!res.ok) throw new Error("Failed to update department");

      const updated = await res.json();
      setDepartments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setEditingDept(null);
      toast.success("Department updated successfully");
    } catch (err) {
      toast.error("Failed to update department");
    } finally {
      setIsSavingDept(false);
    }
  };

  // Open Edit User Modal
  const openEditUser = async (user: User) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditDeptId(user.departmentId || "none");
    setEditPermissions([]);

    if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN") {
      setIsLoadingPerms(true);
      try {
        const res = await fetch(`/api/users/${user.id}/permissions`);
        if (res.ok) {
          const data = await res.json();
          setEditPermissions(data.permissions || []);
        }
      } catch (err) {
        console.error("Failed to fetch user permissions", err);
      } finally {
        setIsLoadingPerms(false);
      }
    }
  };

  // Save User Edit
  const handleSaveUser = async () => {
    if (!editingUser) return;

    setIsSavingUser(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          departmentId: editDeptId === "none" ? null : editDeptId,
          permissions: editRole === "ORG_ADMIN" ? [] : editPermissions,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update user");
      }

      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
      toast.success(`User "${editingUser.name}" updated`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setIsSavingUser(false);
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete user");

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
      toast.success("User removed from workspace");
    } catch (err) {
      toast.error("Failed to delete user");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const togglePermission = (perm: PermissionKey) => {
    setEditPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const filteredUsers = users.filter((u) => {
    if (!searchUser.trim()) return true;
    const q = searchUser.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 select-none">
      {/* 1. Sticky Mobile Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-transform shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.back()}
                className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-transform shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div>
              <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Organization Admin
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Workspace management & permissions
              </p>
            </div>
          </div>

          <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[9px] px-2 py-0.5 border-0">
            Org Admin
          </Badge>
        </div>

        {/* Horizontal Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("departments")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
              activeTab === "departments"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Departments ({departments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
              activeTab === "users"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users & Roles ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("features")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
              activeTab === "features"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Features</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer",
              activeTab === "analytics"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </div>
      </header>

      {/* 2. Content Body */}
      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-400 font-medium">Loading organization configuration...</p>
          </div>
        ) : (
          <>
            {/* ── TAB 1: DEPARTMENTS ── */}
            {activeTab === "departments" && (
              <div className="space-y-4">
                {/* Create Department Card */}
                <form
                  onSubmit={handleCreateDepartment}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      Add New Department
                    </h3>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="e.g. Product Engineering, Marketing..."
                      className="rounded-2xl h-10 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                    <Button
                      type="submit"
                      disabled={isCreatingDept || !newDeptName.trim()}
                      className="rounded-2xl h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 shadow-xs active:scale-95"
                    >
                      {isCreatingDept ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                    </Button>
                  </div>
                </form>

                {/* Departments List */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2">
                    Active Departments ({departments.length})
                  </p>

                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
                    {departments.length === 0 ? (
                      <div className="py-10 text-center px-4">
                        <Building className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No departments yet</p>
                        <p className="text-[10px] text-slate-400">Create your first department above.</p>
                      </div>
                    ) : (
                      departments.map((dept) => (
                        <div
                          key={dept.id}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              <Building className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {dept.name}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                Department ID: {dept.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingDept(dept);
                              setEditDeptName(dept.name);
                            }}
                            className="rounded-xl h-8 px-3 text-xs font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
                          >
                            <Edit2 className="w-3 h-3 mr-1 text-slate-400" />
                            Edit
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: USERS & ROLES ── */}
            {activeTab === "users" && (
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Search teammate by name, email, department..."
                    className="pl-9 pr-8 h-10 rounded-2xl bg-white dark:bg-slate-900 text-xs border-slate-200/80 dark:border-slate-800"
                  />
                  {searchUser && (
                    <button
                      type="button"
                      onClick={() => setSearchUser("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Users List */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
                  {filteredUsers.length === 0 ? (
                    <div className="py-12 text-center px-4">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No teammates found</p>
                      <p className="text-[10px] text-slate-400">Try adjusting your search query.</p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => {
                      const userInitial = user.name ? user.name.charAt(0).toUpperCase() : "U";
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="w-10 h-10 rounded-full ring-2 ring-indigo-500/20 shrink-0">
                              <AvatarFallback className="bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs">
                                {userInitial}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {user.name}
                                </p>
                                <Badge
                                  className={cn(
                                    "text-[8px] font-extrabold px-1.5 py-0 border-0",
                                    user.role === "ORG_ADMIN" || user.role === "ADMIN"
                                      ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                                      : user.role === "MANAGER"
                                      ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                  )}
                                >
                                  {user.role}
                                </Badge>
                              </div>

                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {user.email}
                              </p>

                              {user.department?.name && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                                  <Building className="w-2.5 h-2.5" />
                                  {user.department.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditUser(user)}
                              className="rounded-xl h-8 px-2.5 text-xs font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
                            >
                              <Sliders className="w-3 h-3 mr-1 text-slate-400" />
                              Manage
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToDelete(user)}
                              className="rounded-xl h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── TAB 3: FEATURES ── */}
            {activeTab === "features" && (
              <div className="space-y-3">
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
                  {/* AI Assistant */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Jamure AI Assistant Hub</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Workspace query analysis and summaries
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={aiEnabled}
                      onCheckedChange={setAiEnabled}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>

                  {/* AI Smart Reply */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Smart Message Rewriter</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          AI tone and writing suggestions
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={smartReplyEnabled}
                      onCheckedChange={setSmartReplyEnabled}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>

                  {/* Buzz Notifications */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Buzz Urgent Alerts</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          High-priority sound alerts for leads
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={buzzEnabled}
                      onCheckedChange={setBuzzEnabled}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>

                  {/* Public Channels Creation */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Hash className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Public Channel Rooms</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Allow employees to create public channels
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={allowPublicChannels}
                      onCheckedChange={setAllowPublicChannels}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: ANALYTICS ── */}
            {activeTab === "analytics" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="w-8 h-8 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mb-2 shadow-xs">
                      <Users className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{users.length}</p>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Total Members</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="w-8 h-8 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center mb-2 shadow-xs">
                      <Building className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{departments.length}</p>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Departments</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="w-8 h-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-2 shadow-xs">
                      <Shield className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {users.filter((u) => u.role === "ORG_ADMIN" || u.role === "ADMIN").length}
                    </p>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Admin Users</p>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="w-8 h-8 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center mb-2 shadow-xs">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {users.filter((u) => u.role === "MANAGER").length}
                    </p>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">Team Leads</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Workspace Health & Compliance</p>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Role-Based Access Control (RBAC) is active. Granular permission overrides are securely synced with the database.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Department Modal */}
      <Dialog open={!!editingDept} onOpenChange={(open) => !open && setEditingDept(null)}>
        <DialogContent className="max-w-sm w-[90vw] rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader className="text-left mb-2">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Edit Department Name
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs text-slate-600 dark:text-slate-400">Department Name</Label>
            <Input
              value={editDeptName}
              onChange={(e) => setEditDeptName(e.target.value)}
              className="rounded-2xl h-10 text-xs bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingDept(null)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSavingDept || !editDeptName.trim()}
              onClick={handleSaveDepartment}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              {isSavingDept ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User & Permissions Sheet */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-left mb-2">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              Manage {editingUser?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Role Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">User Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="rounded-2xl h-10 text-xs bg-slate-50 dark:bg-slate-800">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="ORG_ADMIN">Admin (Full Workspace Access)</SelectItem>
                  <SelectItem value="MANAGER">Manager (Department Lead)</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee (Standard Access)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Department</Label>
              <Select value={editDeptId} onValueChange={setEditDeptId}>
                <SelectTrigger className="rounded-2xl h-10 text-xs bg-slate-50 dark:bg-slate-800">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="none">No Department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Granular Permissions Section */}
            {editRole === "ORG_ADMIN" ? (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Admins have full unconstrained access across all modules.</span>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Custom Permission Overrides ({editPermissions.length})
                  </Label>
                  {isLoadingPerms && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
                </div>

                <div className="space-y-2.5">
                  {PERMISSION_GROUPS.map((group) => {
                    const GroupIcon = group.icon;
                    return (
                      <div
                        key={group.label}
                        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-850/40 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <GroupIcon className="w-3.5 h-3.5 text-indigo-500" />
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{group.label}</p>
                        </div>

                        <div className="space-y-1.5">
                          {group.permissions.map((perm) => {
                            const isGranted = editPermissions.includes(perm.key);
                            return (
                              <button
                                key={perm.key}
                                type="button"
                                onClick={() => togglePermission(perm.key)}
                                className={cn(
                                  "w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer",
                                  isGranted
                                    ? "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800"
                                    : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                                )}
                              >
                                <div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">{perm.label}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{perm.desc}</p>
                                </div>
                                <div
                                  className={cn(
                                    "w-4 h-4 rounded-md border flex items-center justify-center shrink-0",
                                    isGranted
                                      ? "bg-indigo-600 border-indigo-600 text-white"
                                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                                  )}
                                >
                                  {isGranted && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="grid grid-cols-2 gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingUser(null)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSavingUser}
              onClick={handleSaveUser}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              {isSavingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="max-w-xs w-[90vw] rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Remove Teammate?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Are you sure you want to remove <span className="font-bold">{userToDelete?.name}</span> from the workspace?
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserToDelete(null)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isDeletingUser}
              onClick={handleDeleteUser}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              {isDeletingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OrgAdminMobile;
