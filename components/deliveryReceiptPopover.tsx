"use client";

import { Check, Clock, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export type Attachment = {
  fileUrl: string;
  fileName?: string | null;
  fileType?: string | null;
};

export type Reactions = Record<string, string[]>;

export type Message = {
  id: string;
  content: string;
  senderId: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  status?: MessageStatus;
  sender: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    lastSeen?: Date | string;
    role?: string;
    departmentId?: string;
  };
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  attachments?: Attachment[];
  isPinned?: boolean;
  receiverId?: string | null;
  seenBy?: string[] | null;
  readAt?: Record<string, string> | null; // { userId: "2024-02-03T10:30:45.123Z", ... }
  channelId?: string | null;
  pinnedMessageId?: string | null;
  pinnedPreview?: string | null;
  pinnedAuthor?: string | null;
  reactions?: Reactions;
};

export type DeliveryReceiptPopoverProps = {
  message: Message;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  getParticipantName?: (userId: string) => string;
  isLoading?: boolean;
  children?: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
};

export default function DeliveryReceiptPopover({
  message,
  isOpen,
  onOpenChange,
  getParticipantName,
  isLoading = false,
  children,
  side = "top",
  align = "start",
}: DeliveryReceiptPopoverProps) {
  const seenByArray = Array.isArray(message.seenBy) ? message.seenBy : [];
  const readAtMap = (message.readAt || {}) as Record<string, string>;

  // Default name resolver - use provided function or fallback to ID
  const resolveName = (userId: string): string => {
    if (getParticipantName) {
      return getParticipantName(userId);
    }
    // Try to find name from message.sender if it's the same user
    if (message.sender.id === userId && message.sender.name) {
      return message.sender.name;
    }
    return `User ${userId.slice(0, 6)}...`;
  };

  const formatReadTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown time";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Popover open={isOpen} onOpenChange={onOpenChange}>
        {children && <PopoverTrigger asChild>{children}</PopoverTrigger>}
        <PopoverContent 
          className="w-72 p-4" 
          side={side} 
          align={align}
          sideOffset={5}
        >
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Loading read receipts...
            </span>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // No receipts state
  if (seenByArray.length === 0) {
    return (
      <Popover open={isOpen} onOpenChange={onOpenChange}>
        {children && <PopoverTrigger asChild>{children}</PopoverTrigger>}
        <PopoverContent 
          className="w-64 p-4" 
          side={side} 
          align={align}
          sideOffset={5}
        >
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              No read receipts yet
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
              Message status: {message.status || "unknown"}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      {children && <PopoverTrigger asChild>{children}</PopoverTrigger>}
      <PopoverContent 
        className="w-80 max-h-96 overflow-y-auto p-4" 
        side={side} 
        align={align}
        sideOffset={5}
      >
        <div className="space-y-4">
          {/* Header with counts */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Read Receipts
            </h3>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {seenByArray.length} {seenByArray.length === 1 ? "person" : "people"}
                </span>
              </div>
              {message.status && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Status: {message.status}
                </span>
              )}
            </div>
          </div>

          {/* Read By Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Read By
            </h4>
            <div className="space-y-2">
              {seenByArray.map((userId) => (
                <div
                  key={userId}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate font-medium">
                      {resolveName(userId)}
                    </p>
                    {readAtMap[userId] && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeAgo(readAtMap[userId])}
                        </p>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          •
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatReadTime(readAtMap[userId])}
                        </p>
                      </div>
                    )}
                  </div>
                  {readAtMap[userId] && (
                    <div className="flex-shrink-0 ml-2">
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Message Info */}
          {message.createdAt && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Sent:</span>
                  <span>
                    {new Date(message.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {message.updatedAt && message.updatedAt !== message.createdAt && (
                  <div className="flex justify-between mt-1">
                    <span>Edited:</span>
                    <span>
                      {new Date(message.updatedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
            <p>Click outside to close</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}