
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Hash,
  Users,
  Info,
  Settings,
  Trash2,
  Bell,
  BellOff,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageSummarizer } from "@/components/message-summarizer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { toast } from "sonner";

type ChannelHeaderProps = {
  channel: any;
};

export default function ChannelHeader({ channel }: ChannelHeaderProps) {
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState(channel.members); // ✅ Initialize with channel.members
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const isAdmin = channel.members?.some(
    (member: any) => member.userId === user?.id && member.isAdmin
  );

  const handleDeleteChannel = async () => {
    if (!isAdmin) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/channels/${channel.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete channel");
      }

      toast.success("Channel Deleted", {
        description: "The channel has been deleted successfully",
      });
      
       window.location.reload();
       router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast.error("Error", {
        description: "Failed to delete channel",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/channels/${channel.id}/member`, {
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: memberId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete member");
      }

      // ✅ Update local state to remove deleted member
      setMembers((prevMembers: any) => 
        prevMembers.filter((m: any) => m.id !== memberId)
      );

      toast.success("Member Removed", {
        description: "The member has been removed successfully.",
      });
      router.refresh();
    } catch (error) {
      console.error("Server Error:", error);
      toast.error("Error", {
        description: "Something went wrong while removing the member.",
      });
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && channel?.id) {
      const stored = localStorage.getItem(`muted_channel_${channel.id}`);
      setIsMuted(stored === "true");
    }
  }, [channel?.id]);

  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    if (typeof window !== "undefined" && channel?.id) {
      if (nextState) {
        localStorage.setItem(`muted_channel_${channel.id}`, "true");
      } else {
        localStorage.removeItem(`muted_channel_${channel.id}`);
      }
    }
    toast.success(nextState ? "Notifications Muted" : "Notifications Enabled", {
      description: nextState
        ? "You will no longer receive notifications for this channel"
        : "You will now receive notifications for this channel",
    });
  };

  // Use members state for display
  const displayMembers = members || channel.members || [];

  return (
    <div>
      <motion.div
        className="px-5 py-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shadow-xs"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shrink-0"
            onClick={() => router.back()}
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800/80 shrink-0 font-bold">
            <Hash className="h-4 w-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                {channel.name}
              </h2>
              {channel.department && (
                <Badge
                  variant="secondary"
                  className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] px-2 py-0.5"
                >
                  {channel.department.name}
                </Badge>
              )}
              {channel.isTaskThread && channel.task && (
                <Badge
                  variant="secondary"
                  className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-extrabold text-[10px] px-2 py-0.5"
                >
                  Task Thread
                </Badge>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {displayMembers.length} {displayMembers.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMembers(true)}
            className="h-8 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 px-3"
          >
            <Users className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
            Members
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="h-8 w-8 p-0 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            title={isMuted ? "Unmute Notifications" : "Mute Notifications"}
          >
            {isMuted ? (
              <BellOff className="h-4 w-4 text-rose-500" />
            ) : (
              <Bell className="h-4 w-4 text-slate-400" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end"
              className="dark:bg-gray-800 dark:border-gray-700"
            >
              <DropdownMenuItem asChild className="dark:hover:bg-gray-700">
                <Link
                  href={`/dashboard/channels/${channel.id}/info`}
                  className="flex items-center"
                >
                  <Info className="h-4 w-4 mr-2" />
                  Channel Info
                </Link>
              </DropdownMenuItem>
              {/* <DropdownMenuItem
                onClick={toggleMute}
                className="flex items-center dark:hover:bg-gray-700"
              >
                {isMuted ? (
                  <Bell className="h-4 w-4 mr-2" />
                ) : (
                  <BellOff className="h-4 w-4 mr-2" />
                )}
                {isMuted ? "Enable Notifications" : "Mute Notifications"}
              </DropdownMenuItem> */}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator className="dark:bg-gray-600" />
                  <DropdownMenuItem asChild className="dark:hover:bg-gray-700">
                    <Link
                      href={{
                        pathname: `/dashboard/channels/${channel.id}/edit`,
                        query: { data: JSON.stringify(channel) },
                      }}
                      className="flex items-center"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Channel
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Channel
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:text-gray-100">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">Channel Members</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              {displayMembers.length} members in this channel
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            <div className="space-y-4 py-2">
              {displayMembers.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md dark:hover:bg-gray-700"
                >
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage
                        src={member.user?.image || ""}
                        alt={member.user?.name}
                      />
                      <AvatarFallback className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {member.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link 
                        href={`/dashboard/messages/${member.userId}`}
                        className="hover:underline"
                      >
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {member.user?.name || "Unknown User"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {member.user?.email || "No email"}
                        </p>
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {member.isAdmin && (
                      <Badge className="bg-blue-100 text-blue-800 border-none dark:bg-blue-900 dark:text-blue-200">
                        Admin
                      </Badge>
                    )}
                    {isAdmin && member.userId !== user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {isAdmin && (
            <DialogFooter>
              <Button asChild>
                <Link href={`/dashboard/channels/${channel.id}/members`}>
                  Manage Members
                </Link>
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="dark:bg-gray-800 dark:text-gray-100">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">Delete Channel</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Are you sure you want to delete this channel? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChannel}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}