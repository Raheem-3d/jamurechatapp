"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, UserCheck, X, Users, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  image?: string;
  role: string;
  department?: { id: string; name: string } | string;
}

interface AssigneeManagerProps {
  taskId: string;
  allUsers: User[];
  assignees: User[];
  onAssigneesChange: (assignees: User[]) => void;
}

export function AssigneeManager({
  taskId,
  allUsers = [],
  assignees = [],
  onAssigneesChange,
}: AssigneeManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "assigned" | "unassigned">("all");
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const assignedSet = useMemo(() => {
    return new Set(assignees.map((a) => a.id));
  }, [assignees]);

  const isAssigned = (userId: string) => assignedSet.has(userId);

  const filteredUsers = useMemo(() => {
    return allUsers.filter((user) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === "assigned") return isAssigned(user.id);
      if (filterType === "unassigned") return !isAssigned(user.id);
      return true;
    });
  }, [allUsers, searchTerm, filterType, assignedSet]);

  const handleAssignToggle = async (user: User) => {
    setLoadingUserId(user.id);
    const currentlyAssigned = isAssigned(user.id);

    try {
      if (currentlyAssigned) {
        // Unassign user
        const response = await fetch(`/api/tasks/${taskId}/assignees`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });

        if (!response.ok) throw new Error("Failed to unassign user");

        const newAssignees = assignees.filter((a) => a.id !== user.id);
        onAssigneesChange(newAssignees);

        toast.success("User Unassigned", {
          description: `${user.name} was removed from this task.`,
        });
      } else {
        // Assign user
        const response = await fetch(`/api/tasks/${taskId}/assignees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });

        if (!response.ok) throw new Error("Failed to assign user");

        const newAssignees = [...assignees, user];
        onAssigneesChange(newAssignees);

        toast.success("User Assigned", {
          description: `${user.name} has been assigned to this task.`,
        });
      }
    } catch (error) {
      toast.error("Assignment Error", {
        description: error instanceof Error ? error.message : "Failed to update assignment",
      });
    } finally {
      setLoadingUserId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ORG_ADMIN":
      case "SUPER_ADMIN":
        return (
          <Badge className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-bold px-2 py-0.5">
            Admin
          </Badge>
        );
      case "MANAGER":
        return (
          <Badge className="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px] font-bold px-2 py-0.5">
            Manager
          </Badge>
        );
      case "CLIENT":
        return (
          <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5">
            Client
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-600 dark:text-slate-400 text-[10px] font-semibold px-2 py-0.5">
            Member
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar: Search + Quick Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 pl-10 pr-9 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-indigo-500/20"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150",
              filterType === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            All ({allUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("assigned")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1",
              filterType === "assigned"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Assigned ({assignees.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("unassigned")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150",
              filterType === "unassigned"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Unassigned ({Math.max(0, allUsers.length - assignees.length)})
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
            <Users className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No matching team members
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const assigned = isAssigned(user.id);
            const isLoading = loadingUserId === user.id;

            return (
              <div
                key={user.id}
                className={cn(
                  "flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all duration-150",
                  assigned
                    ? "bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200/70 dark:border-indigo-900/60"
                    : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                {/* Left: Avatar & User Info */}
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700 shrink-0">
                    <AvatarImage src={user.image || user.avatar || ""} alt={user.name} />
                    <AvatarFallback className="bg-indigo-600 text-white font-bold text-xs">
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      {getRoleBadge(user.role)}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Right: Action Button */}
                <div className="shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAssignToggle(user)}
                    disabled={isLoading}
                    variant={assigned ? "outline" : "default"}
                    className={cn(
                      "h-8 text-xs font-bold rounded-xl px-3 transition-all",
                      assigned
                        ? "border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 shadow-2xs"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : assigned ? (
                      <span className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Assigned</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Assign</span>
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
