"use client";

import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Pin,
  PinOff,
  ChevronRight,
  Search,
  X,
  Sparkles,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Music,
  ArrowUpDown,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PinnedMessageBannerProps {
  pinnedMessages: any[];
  onUnpinMessage: (messageId: string) => void;
  onJumpToMessage: (messageId: string) => void;
  canPin?: boolean;
}

export function PinnedMessageBanner({
  pinnedMessages = [],
  onUnpinMessage,
  onJumpToMessage,
  canPin = true,
}: PinnedMessageBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Keep index within range
  useEffect(() => {
    if (currentIndex >= pinnedMessages.length && pinnedMessages.length > 0) {
      setCurrentIndex(0);
    }
  }, [pinnedMessages.length, currentIndex]);

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return null;
  }

  const activeMessage = pinnedMessages[currentIndex] || pinnedMessages[0];

  const handleNextPin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
  };

  const getMessageSnippet = (msg: any) => {
    if (msg.content && msg.content.trim().length > 0) {
      return msg.content;
    }
    if (msg.fileName || msg.fileUrl) {
      const type = (msg.fileType || "").toLowerCase();
      if (type.startsWith("image/")) return "📷 Photo";
      if (type.startsWith("video/")) return "📹 Video";
      if (type.startsWith("audio/")) return "🎵 Voice Note";
      return `📄 ${msg.fileName || "Document"}`;
    }
    if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
      return `📎 ${msg.attachments.length} Attachment(s)`;
    }
    return "Pinned Message";
  };

  // Filter & sort for Pinned Panel
  const filteredPinned = pinnedMessages
    .filter((msg) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const contentMatch = (msg.content || "").toLowerCase().includes(q);
      const senderMatch = (msg.sender?.name || "").toLowerCase().includes(q);
      const fileMatch = (msg.fileName || "").toLowerCase().includes(q);
      return contentMatch || senderMatch || fileMatch;
    })
    .sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

  return (
    <>
      {/* WhatsApp-Style Top Banner */}
      <div className="bg-[#f0f2f5]/95 dark:bg-[#111b21]/95 border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-2 flex items-center justify-between shadow-2xs backdrop-blur-md transition-all select-none z-20">
        <div
          onClick={() => activeMessage && onJumpToMessage(activeMessage.id)}
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
          title="Click to scroll to pinned message"
        >
          {/* Pin Icon Badge */}
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 group-hover:scale-110 transition-transform">
            <Pin className="h-3.5 w-3.5 fill-current" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Pinned Message {pinnedMessages.length > 1 && `(${currentIndex + 1}/${pinnedMessages.length})`}
              </span>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                • {activeMessage?.sender?.name || "User"}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {getMessageSnippet(activeMessage)}
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {pinnedMessages.length > 1 && (
            <button
              onClick={handleNextPin}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Next pinned message"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsPanelOpen(true)}
            className="h-7 px-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl gap-1"
          >
            All ({pinnedMessages.length})
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Pinned Messages Panel Modal */}
      <Dialog open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <DialogContent className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-0 overflow-hidden max-w-xl w-[95vw]">
          {/* Modal Header */}
          <DialogHeader className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl shadow-md">
                <Pin className="h-5 w-5 fill-current" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  Pinned Messages
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {pinnedMessages.length} message(s) pinned in this conversation
                </p>
              </div>
            </div>

            {/* Sort Toggle */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
              className="h-8 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 gap-1"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-indigo-500" />
              {sortOrder === "newest" ? "Newest" : "Oldest"}
            </Button>
          </DialogHeader>

          {/* Search Bar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/20">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pinned messages..."
                className="h-9 pl-9 pr-8 rounded-2xl text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Pinned Messages List */}
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {filteredPinned.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 mb-2">
                  <Pin className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  No pinned messages found
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {searchQuery ? "Try matching a different search term." : "Pin important messages to find them easily."}
                </p>
              </div>
            ) : (
              filteredPinned.map((msg) => (
                <div
                  key={msg.id}
                  className="group relative p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 hover:border-amber-400/80 dark:hover:border-amber-500/80 transition-all shadow-2xs"
                >
                  {/* Sender Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={msg.sender?.image} />
                        <AvatarFallback className="text-[9px] bg-indigo-600 text-white font-bold">
                          {msg.sender?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {msg.sender?.name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        • {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setIsPanelOpen(false);
                          onJumpToMessage(msg.id);
                        }}
                        className="h-7 px-2.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 hover:bg-amber-50 text-amber-700 dark:text-amber-400 border border-slate-200 dark:border-slate-700 gap-1"
                        title="Jump to message in chat"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Jump
                      </Button>

                      {canPin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onUnpinMessage(msg.id)}
                          className="h-7 w-7 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Unpin message"
                        >
                          <PinOff className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Message Content Preview */}
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    {getMessageSnippet(msg)}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
