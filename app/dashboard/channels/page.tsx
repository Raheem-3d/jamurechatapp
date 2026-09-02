"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Hash,
  Users,
  Lock,
  Plus,
  Search,
  Loader2,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Building,
  Radio,
  ArrowRight,
  Shield,
  Layers,
  Compass,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/lib/rbac-utils";
import { cn } from "@/lib/utils";

type Channel = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  isDepartment: boolean;
  image?: string | null;
  department?: {
    name?: string;
  } | null;
  createdAt: string;
  _count?: {
    members?: number;
    messages?: number;
  };
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [allOrgChannels, setAllOrgChannels] = useState<Channel[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"my" | "department" | "public" | "explore">("my");
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const perms = usePermissions();

  const fetchMyChannels = async () => {
    try {
      setIsLoading(true);
      // Fetch exact joined channels identical to Sidebar
      const [channelsRes, unreadRes] = await Promise.all([
        fetch("/api/channels"),
        fetch("/api/messages/unread-counts"),
      ]);

      if (channelsRes.ok) {
        const data = await channelsRes.json();
        const rawChannels = Array.isArray(data) ? data : [];
        // Filter exactly like sidebar.tsx (exclude task threads and internal channels)
        const filtered = rawChannels.filter((channel: any) => {
          if (!channel?.name) return false;
          const name = String(channel.name).toLowerCase();
          if (name.startsWith("task") || name.startsWith("internal")) return false;
          return true;
        });
        setChannels(filtered);
      }

      if (unreadRes.ok) {
        const unreadData = await unreadRes.json();
        setUnreadCounts(unreadData.channels || {});
      }
    } catch (error) {
      console.error("Error fetching channels:", error);
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExploreChannels = async () => {
    try {
      const res = await fetch("/api/channels/all");
      if (res.ok) {
        const data = await res.json();
        setAllOrgChannels(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching all org channels:", err);
    }
  };

  useEffect(() => {
    fetchMyChannels();
    fetchExploreChannels();

    const handleRefresh = () => {
      fetchMyChannels();
    };

    window.addEventListener("channel:created", handleRefresh);
    window.addEventListener("channel:assigned", handleRefresh);

    return () => {
      window.removeEventListener("channel:created", handleRefresh);
      window.removeEventListener("channel:assigned", handleRefresh);
    };
  }, []);

  const handleJoinChannel = async (channelId: string) => {
    try {
      const response = await fetch(`/api/channels/${channelId}/join`, {
        method: "POST",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "You have joined the channel",
        });
        fetchMyChannels();
        router.push(`/dashboard/channels/${channelId}`);
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to join channel");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filtered list based on search and active tab
  const displayedChannels = useMemo(() => {
    let source = channels;

    if (activeTab === "explore") {
      source = allOrgChannels;
    } else if (activeTab === "department") {
      source = channels.filter((c) => c.isDepartment || c.department);
    } else if (activeTab === "public") {
      source = channels.filter((c) => c.isPublic);
    }

    if (!searchQuery.trim()) return source;

    const query = searchQuery.toLowerCase();
    return source.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query)) ||
        (c.department?.name && c.department.name.toLowerCase().includes(query))
    );
  }, [channels, allOrgChannels, activeTab, searchQuery]);

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto w-full">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Workspace Channels</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Channels
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time discussion rooms, project channels, and team spaces
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {perms.canCreateChannels && (
            <Button
              asChild
              size="sm"
              className="h-10 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-sm active:scale-95 transition-all gap-1.5 cursor-pointer"
            >
              <Link href="/dashboard/channels/new">
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Channel</span>
              </Link>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-10 px-3.5 rounded-2xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all gap-1.5 cursor-pointer"
          >
            <Link href="/dashboard/channels/all">
              <Compass className="w-4 h-4 text-indigo-500" />
              <span>Explore All</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Search Field */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your channels by name or department..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* 3. Segmented Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 px-1 pt-1 overflow-x-auto">
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          {/* My Channels */}
          <button
            onClick={() => setActiveTab("my")}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer relative ${
              activeTab === "my"
                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>My Channels</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "my"
                  ? "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}
            >
              {channels.length}
            </span>
          </button>

          {/* Department */}
          <button
            onClick={() => setActiveTab("department")}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer relative ${
              activeTab === "department"
                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>Department</span>
          </button>

          {/* Public */}
          <button
            onClick={() => setActiveTab("public")}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer relative ${
              activeTab === "public"
                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>Public</span>
          </button>

          {/* Explore All */}
          <button
            onClick={() => setActiveTab("explore")}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer relative ${
              activeTab === "explore"
                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Discover All</span>
          </button>
        </div>
      </div>

      {/* 4. Channels List Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between pb-1 px-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {activeTab === "my"
              ? "Your Active Channels (Sidebar List)"
              : activeTab === "explore"
              ? "All Organization Channels"
              : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Channels`}
          </span>
          <span className="text-[11px] text-slate-400">
            {displayedChannels.length} channels
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-48 gap-2.5">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-400 font-medium">Loading your channels...</p>
          </div>
        ) : displayedChannels.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2.5">
              <Hash className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No channels found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery ? "Try searching with different keywords." : "You have not joined any channels in this view yet."}
            </p>
            {activeTab !== "explore" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("explore")}
                className="mt-4 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
              >
                Browse All Organization Channels
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayedChannels.map((channel) => {
              const unread = unreadCounts[channel.id] || 0;
              const isJoined = channels.some((c) => c.id === channel.id);

              return (
                <div
                  key={channel.id}
                  className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all flex items-center justify-between gap-3 group"
                >
                  {/* Left Link Container */}
                  <Link
                    href={`/dashboard/channels/${channel.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    {/* Icon / Image */}
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold group-hover:scale-105 transition-transform">
                      {channel.image ? (
                        <img
                          src={channel.image}
                          alt={channel.name}
                          className="w-full h-full rounded-2xl object-cover"
                        />
                      ) : channel.isPublic ? (
                        <Hash className="w-5 h-5" />
                      ) : (
                        <Lock className="w-4 h-4 text-amber-500" />
                      )}
                    </div>

                    {/* Name & Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {channel.name}
                        </h4>

                        {channel.department?.name && (
                          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shrink-0">
                            {channel.department.name}
                          </span>
                        )}

                        {channel.isPublic ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                            Public
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 shrink-0">
                            Private
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {channel.description || "Workspace team discussion & messages"}
                      </p>
                    </div>
                  </Link>

                  {/* Right Actions / Indicators */}
                  <div className="flex items-center gap-2 shrink-0">
                    {unread > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold animate-pulse">
                        {unread}
                      </span>
                    )}

                    {activeTab === "explore" && !isJoined ? (
                      <Button
                        size="sm"
                        onClick={() => handleJoinChannel(channel.id)}
                        className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        Join
                      </Button>
                    ) : (
                      <Link
                        href={`/dashboard/channels/${channel.id}`}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
