"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserMultiSelect } from "@/components/user-multi-select";
import { toast } from "sonner";
import {
  Hash,
  MessageSquare,
  Bell,
  BellOff,
  UserPlus,
  Shield,
  Globe,
  Lock,
  Calendar,
  Clock,
  Trash2,
  ArrowLeft,
  Users,
  Briefcase,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Search,
  UserMinus,
  Building2,
  Info,
  ExternalLink,
  Loader2,
  Folder,
} from "lucide-react";
import { SharedContentPanel } from "@/components/shared-content-panel";

type ChannelInfoProps = {
  channel: any;
};

export function ChannelInfoDisplay({ channel }: ChannelInfoProps) {
  const [showSharedMediaPanel, setShowSharedMediaPanel] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [newMembers, setNewMembers] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<any[]>(channel?.members || []);
  const router = useRouter();

  const handleDeleteMember = async (memberId: string) => {
    setDeletingMemberId(memberId);
    try {
      const response = await fetch(`/api/channels/${channel.id}/member`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: memberId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete member");
      }

      setMembers((prev) => prev.filter((m) => m.id !== memberId));

      toast.success("Member Removed", {
        description: "The member has been removed from this channel.",
      });
      router.refresh();
    } catch (error) {
      console.error("Server Error:", error);
      toast.error("Error", {
        description: "Something went wrong while removing the member.",
      });
    } finally {
      setDeletingMemberId(null);
    }
  };

  const handleDeleteChannel = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/channels/${channel.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete channel");
      }

      toast.success("Channel Deleted", {
        description: "The channel has been permanently deleted.",
      });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast.error("Error", {
        description: "Failed to delete channel.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    toast.info(isMuted ? "Notifications Enabled" : "Notifications Muted", {
      description: isMuted
        ? "You will now receive notifications for this channel."
        : "Notifications have been muted for this channel.",
    });
  };

  const handleAddMembers = async () => {
    if (newMembers.length === 0) return;

    setIsAddingMembers(true);

    try {
      const response = await fetch(`/api/channels/${channel.id}/member`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIds: newMembers,
          isCurrentUserAdmin: channel.currentUserName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add members");
      }

      toast.success("Members Added", {
        description: `${newMembers.length} new member(s) added successfully.`,
      });

      setShowAddMembers(false);
      setNewMembers([]);
      router.refresh();
    } catch (error) {
      console.error("Error adding members:", error);
      toast.error("Error", {
        description: "Failed to add members.",
      });
    } finally {
      setIsAddingMembers(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    const name = m.user?.name || m.user?.username || "";
    const email = m.user?.email || "";
    const query = searchQuery.toLowerCase();
    return (
      name.toLowerCase().includes(query) || email.toLowerCase().includes(query)
    );
  });

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "high":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "low":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="group hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition-all"
          >
            <Link href={`/dashboard/channels/${channel.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Back to Chat
            </Link>
          </Button>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSharedMediaPanel(true)}
              className="rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold text-xs gap-1.5"
            >
              <Folder className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Shared Media & Docs
            </Button>

            <Button
              size="sm"
              asChild
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 border-0 transition-all hover:scale-[1.02]"
            >
              <Link href={`/dashboard/channels/${channel.id}`}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Open Channel Chat
              </Link>
            </Button>
          </div>
        </div>

        {/* Hero Header Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 p-6 md:p-8 shadow-sm backdrop-blur-xl">
          {/* Subtle Ambient Background Lighting */}
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start md:items-center space-x-4">
              <Avatar className="h-16 w-16 shrink-0 rounded-2xl border-2 border-indigo-500/30 shadow-lg shadow-indigo-500/20">
                <AvatarImage
                  src={channel.image || ""}
                  alt={channel.name}
                  className="object-cover rounded-2xl"
                />
                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-xl flex items-center justify-center">
                  {channel.image ? (
                    channel.name?.substring(0, 2)?.toUpperCase()
                  ) : channel.isPublic ? (
                    <Hash className="h-7 w-7 text-white" />
                  ) : (
                    <Lock className="h-6 w-6 text-white" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5">
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {channel.name}
                  </h1>
                </div>

                {/* Badge Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {channel.isPublic ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 rounded-lg px-2.5 py-0.5 font-semibold text-xs flex items-center gap-1"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Public Channel
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 rounded-lg px-2.5 py-0.5 font-semibold text-xs flex items-center gap-1"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Private Channel
                    </Badge>
                  )}

                  {channel.department && (
                    <Badge
                      variant="outline"
                      className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60 rounded-lg px-2.5 py-0.5 font-semibold text-xs flex items-center gap-1"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      {channel.department.name}
                    </Badge>
                  )}

                  {Boolean(channel.isTaskThread) && (
                    <Badge
                      variant="outline"
                      className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60 rounded-lg px-2.5 py-0.5 font-semibold text-xs flex items-center gap-1"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Task Thread
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs backdrop-blur-sm flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Messages
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {channel.messageCount || 0}
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs backdrop-blur-sm flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Members
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {members.length}
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs backdrop-blur-sm flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Created On
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 truncate max-w-[120px]">
                {channel.createdAt}
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs backdrop-blur-sm flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Access Level
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                {channel.isPublic ? "Public" : "Restricted"}
              </p>
            </div>
          </div>
        </div>

        {/* Tabbed Details Container */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 p-1.5 rounded-2xl w-full justify-start space-x-1 shadow-xs">
            <TabsTrigger
              value="about"
              className="rounded-xl px-4 py-2 font-medium text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2"
            >
              <Info className="h-4 w-4" />
              About & Details
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="rounded-xl px-4 py-2 font-medium text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Members ({members.length})
            </TabsTrigger>
            {channel.task && (
              <TabsTrigger
                value="task"
                className="rounded-xl px-4 py-2 font-medium text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2"
              >
                <Briefcase className="h-4 w-4" />
                Related Task
              </TabsTrigger>
            )}
          </TabsList>

          {/* TAB 1: ABOUT */}
          <TabsContent value="about" className="mt-4 space-y-4">
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-xs overflow-hidden backdrop-blur-xl">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-500" />
                  Channel Information
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Comprehensive metadata and settings for this channel.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5 p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/40">
                    <div className="flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <Calendar className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                      Created Date
                    </div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {channel.createdAt}
                    </p>
                  </div>

                  <div className="space-y-1.5 p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/40">
                    <div className="flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                      Last Activity
                    </div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {channel.updatedAt}
                    </p>
                  </div>

                  <div className="space-y-1.5 p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/40">
                    <div className="flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                      Total Conversations
                    </div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {channel.messageCount} messages recorded
                    </p>
                  </div>

                  <div className="space-y-1.5 p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/40">
                    <div className="flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <Shield className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                      Channel Visibility
                    </div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {channel.isPublic
                        ? "Public — Anyone in the workspace can view & join"
                        : "Private — Strictly accessible by invited members only"}
                    </p>
                  </div>
                </div>

                {channel.department && (
                  <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-1">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Assigned Department
                    </span>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      {channel.department.name}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Admin Danger Zone */}
            {channel.isCurrentUserAdmin && (
              <Card className="border-rose-200/80 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10 rounded-2xl overflow-hidden backdrop-blur-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription className="text-rose-600/80 dark:text-rose-400/80 text-xs">
                    Actions in this section are destructive and cannot be
                    undone.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-rose-200/60 dark:border-rose-900/40">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                        Delete this channel
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Permanently remove this channel and all message history.
                      </p>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-xs"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Channel
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl border-slate-200 dark:border-slate-800">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-rose-600" />
                            Confirm Channel Deletion
                          </DialogTitle>
                          <DialogDescription className="text-slate-500 dark:text-slate-400 pt-2">
                            Are you sure you want to delete{" "}
                            <strong className="text-slate-900 dark:text-white">
                              #{channel.name}
                            </strong>
                            ? This action is permanent and will delete all
                            messages, files, and chat history.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0 mt-4">
                          <Button
                            variant="outline"
                            className="rounded-xl border-slate-200 dark:border-slate-800"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDeleteChannel}
                            disabled={isDeleting}
                            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Delete Permanently"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: MEMBERS */}
          <TabsContent value="members" className="mt-4 space-y-4">
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-xs overflow-hidden backdrop-blur-xl">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-indigo-500" />
                      Channel Members
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                      Manage team members who have access to this channel.
                    </CardDescription>
                  </div>

                  {channel.isCurrentUserAdmin && (
                    <Dialog
                      modal={false}
                      open={showAddMembers}
                      onOpenChange={setShowAddMembers}
                    >
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Members
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl border-slate-200 dark:border-slate-800 max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-indigo-600" />
                            Add New Members
                          </DialogTitle>
                          <DialogDescription className="text-slate-500 dark:text-slate-400">
                            Select users from your organization to add to this
                            channel.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                          <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
                            Select Members
                          </Label>
                          <UserMultiSelect
                            selectedUsers={newMembers}
                            onChange={setNewMembers}
                            excludeUserIds={members.map((m: any) => m.userId)}
                          />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                          <Button
                            variant="outline"
                            onClick={() => setShowAddMembers(false)}
                            className="rounded-xl border-slate-200 dark:border-slate-800"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAddMembers}
                            disabled={
                              isAddingMembers || newMembers.length === 0
                            }
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            {isAddingMembers ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              "Add Selected Members"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {/* Filter Search Input */}
                <div className="mt-4 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search member by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 focus:bg-white dark:focus:bg-slate-900 transition-all text-sm"
                  />
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {filteredMembers.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Users className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium text-sm">No members found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredMembers.map((member: any) => {
                      const memberName =
                        member.user?.name ||
                        member.user?.username ||
                        "Unknown Member";
                      const memberEmail =
                        member.user?.email || "No email available";

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all"
                        >
                          <div className="flex items-center space-x-3.5">
                            <UserAvatar user={member.user} size="md" />
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                  {memberName}
                                </p>
                                {member.isAdmin && (
                                  <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Admin
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {memberEmail}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {channel.isCurrentUserAdmin &&
                              member.userId !== channel.currentUserId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={deletingMemberId === member.id}
                                  onClick={() => handleDeleteMember(member.id)}
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-medium"
                                >
                                  {deletingMemberId === member.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <UserMinus className="h-3.5 w-3.5 mr-1" />
                                      Remove
                                    </>
                                  )}
                                </Button>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: RELATED TASK */}
          {channel.task && (
            <TabsContent value="task" className="mt-4 space-y-4">
              <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-xs overflow-hidden backdrop-blur-xl">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-indigo-500" />
                        Related Task Context
                      </CardTitle>
                      <CardDescription className="text-slate-500 dark:text-slate-400">
                        This channel is linked to a specific workspace task.
                      </CardDescription>
                    </div>

                    <Button
                      size="sm"
                      asChild
                      className="rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
                    >
                      <Link href={`/dashboard/tasks/${channel.task.id}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Full Task
                      </Link>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                  {/* Task Header info */}
                  <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {channel.task.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="outline"
                          className={`rounded-lg px-2.5 py-0.5 font-bold text-xs ${getPriorityColor(
                            channel.task.priority,
                          )}`}
                        >
                          {channel.task.priority || "Normal"} Priority
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 rounded-lg px-2.5 py-0.5 font-bold text-xs"
                        >
                          {channel.task.status || "In Progress"}
                        </Badge>
                      </div>
                    </div>

                    {channel.task.description && (
                      <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed pt-1">
                        {channel.task.description}
                      </p>
                    )}
                  </div>

                  {/* Task Meta details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Created By
                      </p>
                      {channel.task.creator ? (
                        <div className="flex items-center space-x-2.5 pt-1">
                          <UserAvatar user={channel.task.creator} size="sm" />
                          <span className="font-semibold text-slate-900 dark:text-white text-sm">
                            {channel.task.creator.name || "Unknown Creator"}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Not specified
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Target Deadline
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white pt-1">
                        {(channel.task as any).deadlineStart &&
                        (channel.task as any).deadlineEnd
                          ? (channel.task as any).deadlineStart !==
                            (channel.task as any).deadlineEnd
                            ? `${new Date(
                                (channel.task as any).deadlineStart,
                              ).toLocaleDateString()} — ${new Date(
                                (channel.task as any).deadlineEnd,
                              ).toLocaleDateString()}`
                            : new Date(
                                (channel.task as any).deadlineEnd,
                              ).toLocaleDateString()
                          : channel.task.deadline
                            ? new Date(
                                channel.task.deadline,
                              ).toLocaleDateString()
                            : "No deadline specified"}
                      </p>
                    </div>
                  </div>

                  {/* Assignments */}
                  {channel.task.assignments &&
                    channel.task.assignments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Assigned Team Members
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {channel.task.assignments.map((assignment: any) => (
                            <div
                              key={assignment.id}
                              className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-full px-3 py-1 text-xs font-medium text-slate-900 dark:text-slate-100"
                            >
                              <UserAvatar user={assignment.user} size="sm" />
                              <span>{assignment.user?.name || "Assignee"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Shared Content Panel Modal */}
      <SharedContentPanel
        isOpen={showSharedMediaPanel}
        onClose={() => setShowSharedMediaPanel(false)}
        channelId={channel.id}
        channelName={channel.name}
      />
    </div>
  );
}

//

//
//
//
//
//
