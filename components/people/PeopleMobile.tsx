"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  MessageSquare,
  Building,
  Shield,
  CheckCircle2,
  Mail,
  UserCheck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/lib/socket-client";
import { cn } from "@/lib/utils";

interface PeopleMobileProps {
  users: any[];
  departments: any[];
  currentUser: any;
}

export function PeopleMobile({ users = [], departments = [], currentUser }: PeopleMobileProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const { onlineUsers } = useSocket();

  const currentUserId = currentUser?.user?.id;

  // Filter based on role (similar to existing PeopleSearch business logic)
  const baseUsers = useMemo(() => {
    const role = currentUser?.user?.role;
    if (role === "EMPLOYEE") {
      return users.filter((u) => u.departmentId === currentUser?.user?.departmentId);
    }
    return users;
  }, [users, currentUser]);

  const filteredUsers = useMemo(() => {
    return baseUsers.filter((user) => {
      if (user.id === currentUserId) return false; // Don't show self in messaging list

      if (selectedDepartment !== "ALL" && user.departmentId !== selectedDepartment) {
        return false;
      }

      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      const nameMatch = user.name?.toLowerCase().includes(query);
      const emailMatch = user.email?.toLowerCase().includes(query);
      const deptMatch = user.department?.name?.toLowerCase().includes(query);

      return nameMatch || emailMatch || deptMatch;
    });
  }, [baseUsers, selectedDepartment, searchQuery, currentUserId]);

  const getDepartmentColor = (deptName?: string) => {
    switch (deptName?.toLowerCase()) {
      case "engineering":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "hr":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "sales":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "marketing":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20 w-full">
      {/* 1. Mobile Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>Workspace Team</span>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {filteredUsers.length} members
          </span>
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Team Directory
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
          Connect, message, and collaborate with your teammates
        </p>

        {/* Search Bar */}
        <div className="relative w-full mt-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or department..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Department Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setSelectedDepartment("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer",
              selectedDepartment === "ALL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            All Team
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setSelectedDepartment(dept.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer",
                selectedDepartment === dept.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              )}
            >
              {dept.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Team Member List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-14 px-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No teammates found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {searchQuery ? "Try searching for a different name or department." : "No team members in this department."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredUsers.map((user) => {
              const isOnline = Boolean(
                user?.id &&
                onlineUsers &&
                (Array.isArray(onlineUsers)
                  ? onlineUsers.includes(user.id)
                  : onlineUsers instanceof Set
                  ? onlineUsers.has(user.id)
                  : typeof onlineUsers === "object"
                  ? (onlineUsers as any)[user.id]
                  : false)
              );

              const userInitial = user.name ? user.name.charAt(0).toUpperCase() : "U";

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Avatar with Online Dot */}
                    <div className="relative shrink-0 w-11 h-11">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-2xs border border-slate-200/80 dark:border-slate-700">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name || "User"}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span>{userInitial}</span>
                        )}
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {user.name || "Teammate"}
                        </h3>
                        {user.role === "ADMIN" || user.role === "ORG_ADMIN" ? (
                          <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[8px] px-1.5 py-0">
                            Admin
                          </Badge>
                        ) : null}
                      </div>

                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                        {user.email}
                      </p>

                      {user.department?.name && (
                        <div className="mt-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border",
                              getDepartmentColor(user.department.name)
                            )}
                          >
                            <Building className="w-2.5 h-2.5" />
                            {user.department.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1-Tap Message Action Button */}
                  <Link
                    href={`/dashboard/messages/${user.id}`}
                    className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs active:scale-90 transition-transform shrink-0"
                    title={`Message ${user.name}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default PeopleMobile;
