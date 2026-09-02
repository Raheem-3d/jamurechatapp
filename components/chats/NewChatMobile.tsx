"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  MessageSquare,
  Users,
  FolderPlus,
  Hash,
  Briefcase,
  Building,
  Shield,
  CheckCircle2,
  ChevronRight,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/lib/socket-client";
import { useTeamUsers } from "@/hooks/use-team-users";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export function NewChatMobile() {
  const router = useRouter();
  const { data: session } = useSession();
  const { users, loading: isFetchingUsers } = useTeamUsers();
  const { onlineUsers } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");

  const currentUserId = session?.user?.id;

  // Extract unique departments from users
  const departments = useMemo(() => {
    const map = new Map<string, string>();
    (users || []).forEach((u: any) => {
      if (u.department?.id && u.department?.name) {
        map.set(u.department.id, u.department.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [users]);

  // Filter users excluding self and matching query
  const filteredUsers = useMemo(() => {
    return (users || []).filter((u: any) => {
      if (u.id === currentUserId) return false;

      if (selectedDept !== "ALL" && u.departmentId !== selectedDept && u.department?.id !== selectedDept) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.department?.name?.toLowerCase().includes(q)
      );
    });
  }, [users, currentUserId, selectedDept, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* 1. Sticky Mobile Header with Safe Area */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-xs">
        <div className="flex items-center gap-2.5 mb-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-90 transition-transform shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
              New Direct Message
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
              Select a teammate to start a conversation
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teammate by name or email..."
            className="w-full pl-9 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Department Filter Chips */}
        {departments.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setSelectedDept("ALL")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer",
                selectedDept === "ALL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              )}
            >
              All Teammates
            </button>
            {departments.map((dept) => (
              <button
                key={dept.id}
                type="button"
                onClick={() => setSelectedDept(dept.id)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer",
                  selectedDept === dept.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                )}
              >
                {dept.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 2. Content Body */}
      <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Quick Action Group Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
          <Link
            href="/dashboard/new-channel"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 shadow-xs">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Create New Channel</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Team project & department group</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="/dashboard/tasks/new"
            className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Create New Task / Project</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Assign deliverables to teammates</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Teammates List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Workspace Contacts ({filteredUsers.length})
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            {isFetchingUsers ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span>Loading team directory...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center px-4">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto mb-2.5">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No teammates found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different name or email.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredUsers.map((user: any) => {
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
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => router.push(`/dashboard/messages/${user.id}`)}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 active:bg-slate-100 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Avatar with Online Dot */}
                        <div className="relative shrink-0 w-11 h-11">
                          <div className="w-11 h-11 rounded-full overflow-hidden bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs border border-slate-200/80 dark:border-slate-700">
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

                        {/* User Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
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
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                              <Building className="w-2.5 h-2.5" />
                              {user.department.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Direct Message Action */}
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 ml-2 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-2xs">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewChatMobile;
