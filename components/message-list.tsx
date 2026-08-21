"use client";
import { useState, useEffect, useRef } from "react";
import {
  formatDistanceToNow,
  isToday,
  isYesterday,
  format,
  isSameDay,
} from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  MoreHorizontal,
  Trash,
  Edit,
  File,
  Maximize,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Check,
  Pin,
  PinOff,
  Smile,
  Download,
  FileText,
  Reply,
  ReplyIcon,
  Copy,
  Loader2Icon,
  FolderIcon,
  Computer,
  Clock,
  Info,
  BellRing,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSocket } from "@/lib/socket-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DownloadButton from "./DownloadButton";
import { MessageVideoComponent } from "./MessageVideoComponent";
import Link from "next/link";
import EmojiPicker from "emoji-picker-react";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { createPortal } from "react-dom";
import { ReactionPicker } from "./ReactionPicker";
import { DialogDescription } from "@radix-ui/react-dialog";
import DeliveryReceiptPopover from "./deliveryReceiptPopover";
import { isBuzzMessage, parseBuzzDisplayData } from "@/lib/buzz-utils";

// ------------------ TYPES ------------------
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

export type MessageListProps = {
  messages: Message[];
  currentUserId?: string;
  onlineUsers?: string[];
  users?: Array<{ id: string; name: string }>;
};

const calculateMessageStatus = (
  message: Message,
  isCurrentUser: boolean,
  onlineUsers?: string[],
): MessageStatus => {
  // Only show status for current user's messages
  if (!isCurrentUser) return "sending";

  // If explicit status is set, use it (for "sending" or temporary states)
  if (message.status === "sending") return "sending";

  // Check if message has been read (seenBy contains recipients)
  // This is the highest priority - if anyone read it, show blue ticks
  const seenByArray = Array.isArray(message.seenBy) ? message.seenBy : [];
  if (seenByArray.length > 0) {
    return "read"; // Double blue ticks (seen by at least one recipient)
  }

  // Check if recipient is online = delivered
  // For DMs: if recipient is in onlineUsers, they received it
  if (message.receiverId && onlineUsers?.includes(message.receiverId)) {
    return "delivered"; // Double gray ticks
  }

  // Check if it's a channel message and assume delivered
  // In future, could check specific channel members, but for now:
  // Channel messages are delivered to the group chat once posted
  if (message.channelId) {
    return "delivered";
  }

  // Default: message sent to server but not yet delivered to recipient device
  return "sent"; // Single gray tick
};

const MessageStatusIcon = ({
  status,
  isCurrentUser,
  message,
  showReceipts,
  getParticipantName,
}: {
  status?: MessageStatus;
  isCurrentUser: boolean;
  message?: Message;
  showReceipts?: boolean;
  getParticipantName?: (userId: string) => string;
}) => {
  const [receiptOpen, setReceiptOpen] = useState(false);

  if (!isCurrentUser || !message) return null;

  const iconContent = (
    <span className="ml-1 flex items-center cursor-pointer hover:opacity-80 transition-opacity">
      {status === "sending" ? (
        <Loader2Icon className="h-3 w-3 text-gray-400 dark:text-gray-500 animate-spin" />
      ) : status === "sent" ? (
        <Check className="h-3 w-3 text-[#8696A0] dark:text-[#8696A0]" />
      ) : status === "delivered" ? (
        <span className="flex -space-x-1.5">
          <Check className="h-3 w-3 text-[#8696A0] dark:text-[#8696A0]" />
          <Check className="h-3 w-3 text-[#8696A0] dark:text-[#8696A0]" />
        </span>
      ) : status === "read" ? (
        <span className="flex -space-x-1.5">
          <Check className="h-3 w-3 text-[#53BDEB] dark:text-[#53BDEB]" />
          <Check className="h-3 w-3 text-[#53BDEB] dark:text-[#53BDEB]" />
        </span>
      ) : null}
    </span>
  );

  // Show receipt details for read messages
  if (status === "read" && (message.seenBy?.length || 0) > 0) {
    return (
      <>
        <div onClick={() => setReceiptOpen(!receiptOpen)}>{iconContent}</div>
        <DeliveryReceiptPopover
          message={message}
          isOpen={receiptOpen}
          onOpenChange={setReceiptOpen}
          getParticipantName={getParticipantName}
        />
      </>
    );
  }

  return iconContent;
};

const LastSeenIndicator = ({
  lastSeen,
  isOnline,
}: {
  lastSeen?: Date | string;
  isOnline: boolean;
}) => {
  if (isOnline)
    return (
      <span className="text-xs text-[#00A884] dark:text-[#00A884]">online</span>
    );
  if (lastSeen) {
    const lastSeenDate =
      typeof lastSeen === "string" ? new Date(lastSeen) : lastSeen;
    return (
      <span className="text-xs text-[#8696A0] dark:text-[#8696A0]">
        last seen {formatDistanceToNow(lastSeenDate, { addSuffix: true })}
      </span>
    );
  }
  return null;
};

// const renderMessageWithLinks = (text: string) => {
//   const urlRegex = /(https?:\/\/[^\s]+)/g;
//   if (text.startsWith("@")) {
//     const match = text.match(/^@(\w+)/);
//     if (match) {
//       const username = match.input;
//       const rest = text.slice(match[0].length);
//       return (
//         <>
//           <span className="text-blue-500 dark:text-blue-400 font-semibold">
//             {username}
//           </span>
//           {/* <span>{rest}</span> */}
//         </>
//       );
//     }
//   }
//   return text.split(urlRegex).map((part, index) => {
//     if (part.match(urlRegex)) {
//       const handleLinkClick = (e: React.MouseEvent) => {
//         e.preventDefault();
//         const electronAPI = (window as any).electronAPI;
//         if (electronAPI?.openExternalLink) {
//           electronAPI.openExternalLink(part);
//         } else {
//           // Fallback for non-Electron environment
//           window.open(part, '_blank');
//         }
//       };
//       return (
//         <a
//           key={index}
//           href={part}
//           onClick={handleLinkClick}
//           className="text-blue-500 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
//         >
//           <LinkIcon className="h-3 w-3" />
//           {part}
//         </a>
//       );
//     }
//     return <span key={index}>{part}</span>;
//   });
// };

// ------------------ MAIN ------------------

const renderMessageWithLinks = (text: string) => {
  if (typeof window === "undefined" || !text) return null;

  // Regex patterns:
  // 1. Quoted folder paths: "C:\path with spaces" or 'C:\path with spaces' or `file:///C:/path with spaces`
  // 2. Web URLs (https?://...)
  // 3. File URLs (file:///[^\n<>"'`]+)
  // 4. Windows paths with spaces (C:\path\subfolder or C:/path/subfolder)
  // 5. UNC network share paths (\\server\share with spaces)
  // 6. User mentions (@username)
  const combinedRegex =
    /(["'\`](?:[a-zA-Z]:[\\/]|file:\/\/\/?|\\\\|\/\/)[^\n"'\`]+["'\`])|(https?:\/\/[^\s]+)|(file:\/\/\/[^\n<>"'\`]+)|([a-zA-Z]:[\\/](?:(?!\s{2,}|["'\`<>]|\s+(?:and|or|is|to|in|for|the|a|an)\s+|[.,;:!?](\s|$))[^\n<>"'\`])+)|(\\\\[^\n<>"'\`]+)|(\/\/[^\n<>"'\`]+)|(@\w+)/g;

  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(match[0]);
    lastIndex = combinedRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  const handleOpenFolder = async (e: React.MouseEvent, pathStr: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Clean surrounding quotes and trailing punctuation
    let cleanPath = pathStr
      .replace(/^["'`]|["'`]$/g, "")
      .replace(/[.,;:!?]+$/, "")
      .trim();

    try {
      cleanPath = decodeURIComponent(cleanPath);
    } catch {}

    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.openPath) {
      try {
        const res = await electronAPI.openPath(cleanPath);
        if (res?.success !== false) {
          toast.success("Opening folder in File Explorer");
          return;
        }
      } catch (err) {
        console.error("openPath failed:", err);
      }
    }

    if (electronAPI?.openFileInFolder) {
      try {
        await electronAPI.openFileInFolder(cleanPath);
        toast.success("Opening folder in File Explorer");
        return;
      } catch (err) {
        console.error("openFileInFolder failed:", err);
      }
    }

    if (electronAPI?.openExternalLink) {
      try {
        const fileUrl = cleanPath.startsWith("file://")
          ? cleanPath
          : `file:///${cleanPath.replace(/\\/g, "/")}`;
        await electronAPI.openExternalLink(fileUrl);
        toast.success("Opening folder...");
        return;
      } catch (err) {
        console.error("openExternalLink failed:", err);
      }
    }

    // Try opening directly via server API if running on local environment
    try {
      const apiRes = await fetch("/api/open-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderPath: cleanPath }),
      });
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.success) {
          toast.success("Opening folder in File Explorer");
          return;
        }
      }
    } catch (err) {
      console.log("Local open-folder API unavailable, fallback to clipboard:", err);
    }

    // Web browser environment fallback: Copy path to clipboard & notify user
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(cleanPath);
        toast.success(`Folder path copied to clipboard: ${cleanPath}`);
      } else {
        toast.info(`Folder path: ${cleanPath}`);
      }
    } catch {
      toast.info(`Folder path: ${cleanPath}`);
    }
  };

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    const cleanUrl = url.replace(/[.,;:!?]+$/, "").trim();
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.openExternalLink) {
      electronAPI.openExternalLink(cleanUrl);
    } else {
      window.open(cleanUrl, "_blank");
    }
  };

  return parts.map((part, index) => {
    // Clean part for testing match type
    const unquotedPart = part.replace(/^["'`]|["'`]$/g, "").trim();

    // 1. Web URLs
    if (unquotedPart.match(/^https?:\/\//i)) {
      return (
        <a
          key={index}
          href={unquotedPart}
          onClick={(e) => handleLinkClick(e, unquotedPart)}
          className="text-[#027EB5] dark:text-[#53BDEB] hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
        >
          <LinkIcon className="h-3.5 w-3.5 inline-block" />
          {unquotedPart}
        </a>
      );
    }

    // 2. Folder / File paths (C:\..., D:/..., \\server\..., //server/..., file:///...)
    if (
      unquotedPart.match(/^file:\/\/\//i) ||
      unquotedPart.match(/^[a-zA-Z]:[\\/]/) ||
      unquotedPart.match(/^\\\\[^\n<>"']+/) ||
      unquotedPart.match(/^\/\/[^\n<>"']+/)
    ) {
      return (
        <button
          key={index}
          type="button"
          onClick={(e) => handleOpenFolder(e, part)}
          className="text-[#027EB5] dark:text-[#53BDEB] hover:underline inline-flex items-center gap-1 cursor-pointer font-medium bg-[#027EB5]/10 dark:bg-[#53BDEB]/10 px-1.5 py-0.5 rounded text-left"
          title={`Click to open folder: ${unquotedPart}`}
        >
          <FolderIcon className="h-3.5 w-3.5 inline-block text-[#027EB5] dark:text-[#53BDEB] shrink-0" />
          <span>{unquotedPart}</span>
        </button>
      );
    }

    // 3. User Mentions (@username)
    if (part.match(/^@\w+$/)) {
      return (
        <span
          key={index}
          className="text-[#027EB5] dark:text-[#53BDEB] font-semibold"
        >
          {part}
        </span>
      );
    }

    // 4. Regular text
    return <span key={index}>{part}</span>;
  });
};

export default function MessageList({
  messages,
  currentUserId,
  onlineUsers,
  users,
}: MessageListProps) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<{
    url: string;
    type: string | null;
    name?: string;
  } | null>(null);

  const [expandedMessages, setExpandedMessages] = useState<
    Record<string, boolean>
  >({});
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isPinning, setIsPinning] = useState<string | null>(null);
  const [messageStatuses, setMessageStatuses] = useState<
    Record<string, MessageStatus>
  >({});
  const [openAttachmentReactionFor, setOpenAttachmentReactionFor] = useState<
    string | null
  >(null);
  const [openReactionFor, setOpenReactionFor] = useState<string | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, boolean>>(
    {},
  );
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoMessageId, setInfoMessageId] = useState<string | null>(null);
  const [allUser, setAllUser] = useState<Array<{ id: string; name: string }>>(
    [],
  );

  const {
    deleteMessage,
    editMessage,
    markMessageAsRead,
    pinMessage,
    unpinMessage,
    addReaction,
    removeReaction,
  } = useSocket() as any;

  const MAX_PREVIEW_LENGTH = 300;
  const MAX_PREVIEW_LINES = 15;

  // Helper to resolve user names for read receipts
  const getParticipantName = (userId: string): string => {
    // First, try to find in the provided users list
    if (allUser.length > 0) {
      const user = allUser.find((u) => u.id === userId);
      if (user) {
        return user.name;
      }
    }
    // Second, find the user in messages to get their name
    const userMessage = messages.find((m) => m.senderId === userId);
    if (userMessage) {
      return userMessage.sender.name;
    }
    // Fallback to abbreviated ID if not found
    return `User ${userId.slice(0, 8)}`;
  };

  const fetchAllUser = async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Request failed");
      const data = await response.json();
      setAllUser(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchAllUser();
  }, []);

  const DeliveryInfoDialog = ({ message }: { message: Message }) => {
    const seenByArray = Array.isArray(message.seenBy) ? message.seenBy : [];
    const readAtMap = (message.readAt || {}) as Record<string, string>;

    const formatReadTime = (isoString: string) => {
      try {
        const date = new Date(isoString);
        return formatDistanceToNow(date, { addSuffix: true });
      } catch {
        return isoString;
      }
    };

    return (
      <Dialog
        open={infoDialogOpen}
        onOpenChange={(isOpen) => {
          setInfoDialogOpen(isOpen);
          if (!isOpen) {
            setInfoMessageId(null);
          }
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-[#111B21] border-[#D1D7DB] dark:border-[#2A3942]">
          <DialogHeader>
            <DialogTitle className="text-[#111B21] dark:text-[#E9EDEF]">
              Message Info
            </DialogTitle>
            <DialogDescription className="sr-only">
              Delivery and read receipt information for this message
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Read by Section */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-[#111B21] dark:text-[#E9EDEF]">
                <Check className="h-4 w-4 text-[#00A884]" />
                Read by ({seenByArray.length})
              </h3>

              {seenByArray.length > 0 ? (
                <div className="space-y-2">
                  {seenByArray.map((userId) => (
                    <div
                      key={userId}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#F0F2F5] dark:bg-[#202C33]"
                    >
                      <p className="text-sm font-medium text-[#111B21] dark:text-[#E9EDEF]">
                        {getParticipantName(userId)}
                      </p>

                      {readAtMap[userId] && (
                        <p className="text-xs text-[#8696A0] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatReadTime(readAtMap[userId])}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#8696A0]">No read receipts yet</p>
              )}
            </div>

            {/* Delivered to Section */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-[#111B21] dark:text-[#E9EDEF]">
                <Check className="h-4 w-4 text-[#53BDEB]" />
                Delivered to
              </h3>
              <p className="text-sm text-[#8696A0]">
                Message has been sent to all recipients
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Mark messages as read when they enter viewport
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!markMessageAsRead) return;

    const toMark = new Set<string>();
    let flushTimer: number | null = null;

    const flush = () => {
      if (flushTimer) {
        window.clearTimeout(flushTimer);
        flushTimer = null;
      }
      const ids = Array.from(toMark);
      if (ids.length > 0) {
        markMessageAsRead(ids);
        toMark.clear();
      }
    };
    //
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (document.visibilityState !== "visible") continue;
          const el = entry.target as HTMLElement;
          const id = el.id?.replace("msg-", "");
          if (!id) continue;
          const msg = messages.find((m) => m.id === id);
          if (!msg) continue;
          if (msg.senderId === currentUserId) continue;
          toMark.add(id);
        }
        if (toMark.size > 0) {
          if (typeof window === "undefined") return;
          if (flushTimer) window.clearTimeout(flushTimer);
          flushTimer = window.setTimeout(flush, 150);
        }
      },
      { threshold: 0.6 },
    );

    for (const m of messages) {
      const el = document.getElementById(`msg-${m.id}`);
      if (el) observer.observe(el);
    }

    return () => {
      observer.disconnect();
      if (typeof window === "undefined") return;
      if (flushTimer) window.clearTimeout(flushTimer);
    };
  }, [messages, currentUserId, markMessageAsRead]);

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) return;
    setIsEditing(true);
    try {
      await editMessage(messageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent("");
      toast.success("Message updated");
    } catch (error) {
      toast.error("Failed to update message");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setIsDeleting(messageId);
    try {
      await deleteMessage(messageId);
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleReplyByDoubleClick = (message: Message) => {
    const preview = (message.content || "").slice(0, 300);
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("reply:message", {
        detail: {
          messageId: message.id,
          preview,
          senderName: message.sender?.name,
        },
      }),
    );
  };

  // Pin/Unpin functionality

  useEffect(() => {
    const map: Record<string, boolean> = {};
    messages.forEach((m) => {
      map[m.id] = !!m.isPinned;
    });
    setPinnedMessages(map);
  }, [messages]);

  const handlePinMessage = async (
    messageId: string,
    isPinnedParam?: boolean,
  ) => {
    const currentlyPinned =
      typeof isPinnedParam === "boolean"
        ? isPinnedParam
        : !!pinnedMessages[messageId];
    const newPinnedState = !currentlyPinned;
    setIsPinning(messageId);
    setPinnedMessages((prev) => ({ ...prev, [messageId]: newPinnedState }));
    try {
      const response = await fetch("/api/messages/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, pin: newPinnedState }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update pinned status");
      }

      toast.success(newPinnedState ? "Message pinned 📌" : "Message unpinned");

      // Notify parent/components
      const targetMsg = messages.find((m) => m.id === messageId);
      if (targetMsg) {
        window.dispatchEvent(
          new CustomEvent("message:pinned-updated", {
            detail: {
              messageId,
              isPinned: newPinnedState,
              message: { ...targetMsg, isPinned: newPinnedState },
            },
          }),
        );
      }
    } catch (error: any) {
      setPinnedMessages((prev) => ({ ...prev, [messageId]: currentlyPinned }));
      toast.error(error.message || (currentlyPinned ? "Failed to unpin message" : "Failed to pin message"));
    } finally {
      setIsPinning(null);
    }
  };

  // Reactions
  const [localReactions, setLocalReactions] = useState<
    Record<string, Reactions>
  >({});

  const parseReactions = (rawReactions: any): Record<string, string[]> => {
    const byEmoji: Record<string, string[]> = {};
    if (!rawReactions) return byEmoji;

    if (Array.isArray(rawReactions)) {
      for (const r of rawReactions) {
        if (r && r.emoji && r.userId) {
          if (!byEmoji[r.emoji]) byEmoji[r.emoji] = [];
          if (!byEmoji[r.emoji].includes(r.userId)) {
            byEmoji[r.emoji].push(r.userId);
          }
        }
      }
    } else if (typeof rawReactions === "object") {
      for (const [emoji, userIds] of Object.entries(rawReactions)) {
        if (Array.isArray(userIds)) {
          byEmoji[emoji] = Array.from(new Set(userIds.map(String)));
        }
      }
    }
    return byEmoji;
  };

  useEffect(() => {
    setLocalReactions((prev) => {
      const next = { ...prev };
      for (const m of messages) {
        const parsed = parseReactions((m as any).reactions);
        if ((m as any).reactions !== undefined) {
          next[m.id] = parsed;
        } else if (!next[m.id]) {
          next[m.id] = parsed;
        }
      }
      return next;
    });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onRxn = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || !detail.messageId) return;
      const { messageId, reactions } = detail;
      console.log("💬 MessageList received reaction update:", {
        messageId,
        reactions,
      });
      const parsed = parseReactions(reactions);
      setLocalReactions((prev) => ({
        ...prev,
        [messageId]: parsed,
      }));
    };
    window.addEventListener("message:reaction-update", onRxn as EventListener);
    return () =>
      window.removeEventListener(
        "message:reaction-update",
        onRxn as EventListener,
      );
  }, []);

  // Message status updates
  useEffect(() => {
    const onStatus = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      const { messageId, status } = detail;
      if (!messageId || !status) return;
      setMessageStatuses((prev) => ({ ...prev, [messageId]: status }));
    };

    const onMessagesRead = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      const { messageIds } = detail;
      if (!Array.isArray(messageIds)) return;
      setMessageStatuses((prev) => {
        const next = { ...prev };
        for (const id of messageIds) next[id] = "read";
        return next;
      });
    };
    if (typeof window === "undefined") return;

    window.addEventListener("message:status-update", onStatus as EventListener);
    window.addEventListener("messages:read", onMessagesRead as EventListener);

    return () => {
      window.removeEventListener(
        "message:status-update",
        onStatus as EventListener,
      );
      window.removeEventListener(
        "messages:read",
        onMessagesRead as EventListener,
      );
    };
  }, []);

  // Attachments
  const [attachmentsMap, setAttachmentsMap] = useState<Record<string, any[]>>(
    {},
  );

  const reactionButtonRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const map: Record<string, any[]> = {};
    for (const m of messages) {
      if (m.attachments && m.attachments.length > 0) map[m.id] = m.attachments;
    }
    setAttachmentsMap(map);
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAttachmentsUpdated = (e: Event) => {
      const detail = (
        e as CustomEvent<{ messageId: string; attachments: any[] }>
      ).detail;
      if (!detail) return;
      setAttachmentsMap((prev) => ({
        ...prev,
        [detail.messageId]: detail.attachments,
      }));
    };
    window.addEventListener(
      "message:attachments-updated",
      onAttachmentsUpdated as EventListener,
    );
    return () =>
      window.removeEventListener(
        "message:attachments-updated",
        onAttachmentsUpdated as EventListener,
      );
  }, []);

  const getAttachments = (message: Message): any[] => {
    let raw = attachmentsMap[message?.id] ?? message?.attachments ?? [];
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = [];
      }
    }
    return Array.isArray(raw) ? raw : [];
  };

  // Helper to get date label for messages (Today, Yesterday, or date)
  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d, yyyy");
  };

  // Helper to check if we should show a date separator
  const shouldShowDateSeparator = (
    currentMessage: Message,
    previousMessage: Message | undefined,
  ): boolean => {
    if (!previousMessage) return true; // Always show date for first message

    const currentDate =
      typeof currentMessage.createdAt === "string"
        ? new Date(currentMessage.createdAt)
        : currentMessage.createdAt;
    const previousDate =
      typeof previousMessage.createdAt === "string"
        ? new Date(previousMessage.createdAt)
        : previousMessage.createdAt;

    return !isSameDay(currentDate, previousDate);
  };

  // Date separator component
  // const DateSeparator = ({ date }: { date: Date }) => (
  //   <div className="flex items-center justify-center my-3 gap-3">
  //     <div className="flex-1 h-px bg-[#D1D7DB] dark:bg-[#2A3942]" />
  //     <span className="text-xs font-medium text-[#8696A0] dark:text-[#8696A0] px-2 whitespace-nowrap bg-[#D1D7DB] dark:bg-[#2A3942]">
  //       {getDateLabel(date)}
  //     </span>
  //     <div className="flex-1 h-px bg-[#D1D7DB] dark:bg-[#2A3942]" />
  //   </div>
  // );

  const DateSeparator = ({ date }: { date: Date }) => (
    <div className="flex items-center justify-center my-3 gap-3">
      <div className="flex-1 h-px bg-[#D1D7DB] dark:bg-[#2A3942]" />
      <span className="text-xs font-medium text-[#8696A0] dark:text-[#8696A0] px-3 py-2 rounded-md whitespace-nowrap bg-[#ECE5DD] dark:bg-[#2A3942]">
        {getDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-[#D1D7DB] dark:bg-[#2A3942]" />
    </div>
  );

  const toggleAttachmentReaction = async (
    messageId: string,
    attachmentIndex: number,
    emoji: string,
  ) => {
    try {
      const res = await fetch("/api/messages/attachment-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          attachmentIndex,
          action: "toggle-reaction",
          emoji,
        }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      if (data?.attachments) {
        setAttachmentsMap((prev) => ({
          ...prev,
          [messageId]: data.attachments,
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update reaction on attachment");
    }
  };

  const deleteAttachment = async (
    messageId: string,
    attachmentIndex: number,
  ) => {
    try {
      const res = await fetch("/api/messages/attachment-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, attachmentIndex, action: "delete" }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      if (data?.attachments)
        setAttachmentsMap((prev) => ({
          ...prev,
          [messageId]: data.attachments,
        }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete attachment");
    }
  };

  const replyToAttachment = (message: Message, attachmentIndex: number) => {
    const attachments = getAttachments(message);
    const att = attachments[attachmentIndex];
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("reply:attachment", {
        detail: { messageId: message.id, attachmentIndex, attachment: att },
      }),
    );
  };

  const hasUserReacted = (msgId: string, emoji: string) => {
    const users = localReactions[msgId]?.[emoji] || [];
    return currentUserId ? users.includes(currentUserId) : false;
  };

  const toggleReaction = async (msg: Message, emoji: string) => {
    const msgId = msg.id;
    const userId = currentUserId;
    if (!userId) return;

    const already = hasUserReacted(msgId, emoji);

    setLocalReactions((prev) => {
      const next = { ...prev };
      const current = { ...(next[msgId] || {}) };
      const users = new Set(current[emoji] || []);
      if (already) users.delete(userId);
      else users.add(userId);
      const arr = Array.from(users);
      if (arr.length > 0) current[emoji] = arr;
      else delete current[emoji];
      next[msgId] = current;
      return next;
    });

    try {
      if (already) await removeReaction?.(msgId, emoji);
      else await addReaction?.(msgId, emoji);
    } catch (e) {
      setLocalReactions((prev) => {
        const next = { ...prev };
        const current = { ...(next[msgId] || {}) };
        const users = new Set(current[emoji] || []);
        if (already) users.add(userId!);
        else users.delete(userId!);
        const arr = Array.from(users);
        if (arr.length > 0) current[emoji] = arr;
        else delete current[emoji];
        next[msgId] = current;
        return next;
      });
      toast.error("Couldn't update your reaction");
    }
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };
  const shouldTruncate = (content: string) =>
    content.length > MAX_PREVIEW_LENGTH ||
    content.split("\n").length > MAX_PREVIEW_LINES;

  const renderMessageContent = (message: Message) => {
    const isExpanded = expandedMessages[message.id];
    const needsTruncation = shouldTruncate(message.content);

    // Handle attachment-reply marker injected by MessageInput. We expect the
    // marker to be appended to the message content like:
    //   "...user typed text...\n\n__ATTACH_REPLY__:{"messageId":"...","attachmentIndex":0}"
    // Parse that marker, render the referenced attachment (image/file/preview)
    // and then render the typed message below it. Do not show the raw marker.
    const MARKER = "__ATTACH_REPLY__:";
    if (message.content && message.content.includes(MARKER)) {
      const idx = message.content.lastIndexOf(MARKER);
      const typed = message.content.slice(0, idx).trim();
      const payloadStr = message.content.slice(idx + MARKER.length).trim();
      let parsed: { messageId?: string; attachmentIndex?: number } | null =
        null;
      try {
        parsed = JSON.parse(payloadStr);
      } catch (err) {
        // ignore parse errors and fall back to normal rendering below
        parsed = null;
      }

      if (parsed && parsed.messageId != null) {
        const orig = messages.find((m) => m.id === parsed!.messageId);
        const att = orig
          ? (attachmentsMap[orig.id] ?? orig.attachments ?? [])[
              parsed.attachmentIndex ?? 0
            ]
          : null;

        const preview = att ? (
          att.fileType?.startsWith("image/") ? (
            <div className="mb-2 rounded-lg border border-[#E9EDEF] dark:border-[#2A3942] bg-white dark:bg-[#111B21] p-2 w-max">
              <img
                src={att.fileUrl}
                alt={att.fileName || "attachment preview"}
                className="max-h-40 rounded-md object-contain"
              />
            </div>
          ) : (
            <div className="mb-2 rounded-lg border border-[#E9EDEF] dark:border-[#2A3942] bg-white dark:bg-[#111B21] p-2">
              <div className="flex items-center gap-2">
                {getFileIcon(att.fileType)}
                <div className="text-sm text-[#111B21] dark:text-[#E9EDEF] truncate">
                  <div className="font-medium">{att.fileName || "File"}</div>
                  <div className="text-xs text-[#8696A0]">
                    {att.fileType || "Unknown type"}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          // If we couldn't find the original attachment, show a simple textual reference
          <div className="mb-2 rounded-lg border border-[#E9EDEF] dark:border-[#2A3942] bg-white dark:bg-[#111B21] p-2 text-sm text-[#111B21] dark:text-[#E9EDEF]">
            Replying to attachment
          </div>
        );

        return (
          <div>
            {preview}
            <div className="whitespace-pre-wrap break-words text-[#111B21] dark:text-[#E9EDEF] leading-normal text-[16.2px]">
              {typed ? renderMessageWithLinks(typed) : null}
            </div>
          </div>
        );
      }
      // if parsing failed, fall through to normal behavior so marker isn't displayed raw
    }

    if (!needsTruncation)
      return (
        <div className="whitespace-pre-wrap break-words text-[#111B21] dark:text-[#E9EDEF] leading-normal text-[16.2px]">
          {renderMessageWithLinks(message.content)}
        </div>
      );
    if (isExpanded) {
      return (
        <div className="whitespace-pre-wrap break-words text-[#111B21] dark:text-[#E9EDEF] leading-normal text-[16.2px]">
          {renderMessageWithLinks(message.content)}
          <button
            onClick={() => toggleMessageExpansion(message.id)}
            className="text-[#027EB5] dark:text-[#53BDEB] text-sm mt-2 flex items-center hover:underline"
          >
            Show less <ChevronUp className="h-4 w-4 ml-1" />
          </button>
        </div>
      );
    }
    if (message.content.split("\n").length > MAX_PREVIEW_LINES) {
      const lines = message.content.split("\n");
      const truncated = lines.slice(0, MAX_PREVIEW_LINES).join("\n");
      return (
        <div>
          <div className="whitespace-pre-wrap break-words text-[#111B21] dark:text-[#E9EDEF] leading-normal text-[16.2px]">
            {renderMessageWithLinks(truncated + "...")}
          </div>
          <button
            onClick={() => toggleMessageExpansion(message.id)}
            className="text-[#027EB5] dark:text-[#53BDEB] text-sm mt-2 flex items-center hover:underline"
          >
            Read more <ChevronDown className="h-4 w-4 ml-1" />
          </button>
        </div>
      );
    }
    return (
      <div>
        <div className="whitespace-pre-wrap break-words text-[#111B21] dark:text-[#E9EDEF] leading-normal text-[16.2px]">
          {renderMessageWithLinks(
            message.content.substring(0, MAX_PREVIEW_LENGTH) + "...",
          )}
        </div>
        <button
          onClick={() => toggleMessageExpansion(message.id)}
          className="text-[#027EB5] dark:text-[#53BDEB] text-sm mt-2 flex items-center hover:underline"
        >
          Read more <ChevronDown className="h-4 w-4 ml-1" />
        </button>
      </div>
    );
  };

  const isMessageEdited = (message: Message) => {
    if (!message.updatedAt) return false;
    const created =
      typeof message.createdAt === "string"
        ? new Date(message.createdAt)
        : message.createdAt;
    const updated =
      typeof message.updatedAt === "string"
        ? new Date(message.updatedAt)
        : message.updatedAt;
    return updated.getTime() - created.getTime() > 1000;
  };

  const ReactionChip = ({
    emoji,
    count,
    active,
    onClick,
  }: {
    emoji: string;
    count: number;
    active?: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "h-7 px-2 inline-flex items-center gap-1 rounded-full border text-xs transition-all",
        active
          ? "bg-[#F0F2F5] dark:bg-[#2A3942] border-[#00A884] text-[#111B21] dark:text-[#E9EDEF]"
          : "bg-white dark:bg-[#202C33] border-[#D1D7DB] dark:border-[#2A3942] text-[#54656F] dark:text-[#8696A0]",
      )}
      title={active ? "Remove your reaction" : "React"}
      type="button"
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className="min-w-[1ch] tabular-nums font-medium">{count}</span>
    </button>
  );

  const AttachmentReactionPicker = ({
    message,
    attachmentIndex,
    attKey,
    toggleAttachmentReaction,
    openAttachmentReactionFor,
    setOpenAttachmentReactionFor,
    buttonClassName,
  }: {
    message: Message;
    attachmentIndex: number;
    attKey: string;
    toggleAttachmentReaction: (
      messageId: string,
      attachmentIndex: number,
      emoji: string,
    ) => void;
    openAttachmentReactionFor: string | null;
    setOpenAttachmentReactionFor: (
      value: string | null | ((prev: string | null) => string | null),
    ) => void;
    buttonClassName: string;
  }) => {
    const pickerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      if (openAttachmentReactionFor !== attKey) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        // Close only if clicking outside both the picker and the button
        if (
          pickerRef.current &&
          !pickerRef.current.contains(target) &&
          buttonRef.current &&
          !buttonRef.current.contains(target)
        ) {
          setOpenAttachmentReactionFor(null);
        }
      };

      // Add slight delay before attaching listener to prevent immediate closure
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [openAttachmentReactionFor, attKey]);

    return (
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={(ev) => {
            ev.stopPropagation();
            setOpenAttachmentReactionFor((prev) =>
              prev === attKey ? null : attKey,
            );
          }}
          className={buttonClassName}
          title="React to attachment"
          type="button"
        >
          <Smile className="h-4 w-4" />
        </button>

        {openAttachmentReactionFor === attKey && (
          <div
            ref={pickerRef}
            className="absolute right-0 mt-2 z-50 shadow-lg"
            onClick={(ev) => ev.stopPropagation()}
          >
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                toggleAttachmentReaction(
                  message.id,
                  attachmentIndex,
                  emojiData.emoji,
                );
                setOpenAttachmentReactionFor(null);
              }}
              width={350}
              height={400}
              searchDisabled={false}
              skinTonesDisabled={false}
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}
      </div>
    );
  };

  const getFileIcon = (fileType: string | null | undefined) => {
    if (!fileType) return <File className="h-4 w-4 text-[#8696A0]" />;

    if (fileType.startsWith("image/"))
      return <File className="h-4 w-4 text-[#8696A0]" />;
    if (fileType.startsWith("video/"))
      return <File className="h-4 w-4 text-[#8696A0]" />;
    if (fileType.includes("pdf"))
      return <FileText className="h-4 w-4 text-[#8696A0]" />;
    if (fileType.includes("word") || fileType.includes("document"))
      return <FileText className="h-4 w-4 text-[#8696A0]" />;
    if (fileType.includes("zip") || fileType.includes("compressed"))
      return <File className="h-4 w-4 text-[#8696A0]" />;

    return <File className="h-4 w-4 text-[#8696A0]" />;
  };

  const handleCopyMessage = async (message: Message) => {
    // Check if message has any content
    const hasContent =
      message.content || message.attachments?.length || message.fileUrl;
    if (!hasContent) {
      toast.info("Message is empty");
      return;
    }

    try {
      // Check if we're in Electron environment
      if ((window as any).electronAPI) {
        await handleCopyWithElectron(message);
      } else {
        await handleCopyWithWebAPI(message);
      }
    } catch (err) {
      console.error("Copy failed", err);
      toast.error("Couldn't copy the message to clipboard");
    }
  };

  // Electron-specific copy function
  const handleCopyWithElectron = async (message: Message) => {
    try {
      // First try to copy image if available
      const imageUrl = await getImageUrlToCopy(message);
      if (imageUrl && (window as any).electronAPI) {
        const result = await (window as any).electronAPI.copyImage(imageUrl);
        if (result.success) {
          toast.success("Image copied to clipboard");
          return;
        } else {
          console.error("Electron image copy failed:", result.error);
          // Fall through to text copy
        }
      }

      // Copy text content
      const text = getTextContent(message);
      if ((window as any).electronAPI) {
        const result = await (window as any).electronAPI.copyText(text);
        if (result.success) {
          toast.success("Message copied to clipboard");
        } else {
          throw new Error(result.error);
        }
      }
    } catch (err) {
      console.error("Electron copy failed", err);
      throw err;
    }
  };

  // Web API fallback
  const handleCopyWithWebAPI = async (message: Message) => {
    try {
      // First try to copy image if available
      const imageToCopy = await getImageToCopy(message);
      if (imageToCopy) {
        const success = await copyImageToClipboard(imageToCopy);
        if (success) {
          toast.success("Image copied to clipboard");
          return;
        }
        // If image copy fails, fall through to text copy
      }

      // If no image or image copy failed, copy text content
      await copyTextContent(message);
      toast.success("Message copied to clipboard");
    } catch (err) {
      console.error("Web API copy failed", err);
      throw err;
    }
  };

  // Helper to get image URL for Electron
  const getImageUrlToCopy = async (
    message: Message,
  ): Promise<string | null> => {
    try {
      // Check attachments first
      if (
        Array.isArray(message.attachments) &&
        message.attachments.length > 0
      ) {
        const imageAttachment = message.attachments.find((attachment: any) =>
          attachment.fileType?.startsWith("image/"),
        );
        if (imageAttachment) {
          return imageAttachment.fileUrl;
        }
      }

      // Check fileUrl if it's an image
      if (message.fileUrl && message.fileType?.startsWith("image/")) {
        return message.fileUrl;
      }

      return null;
    } catch (error) {
      console.error("Error getting image URL:", error);
      return null;
    }
  };

  // Get text content for both Electron and Web
  const getTextContent = (message: Message): string => {
    let text = message.content || "";

    // If no text content but has attachments, create a descriptive text
    if (
      !text &&
      Array.isArray(message.attachments) &&
      message.attachments.length > 0
    ) {
      const attachmentTexts = message.attachments.map(
        (att: any, index: number) =>
          `Attachment ${index + 1}: ${att.fileName || "File"} (${
            att.fileType || "Unknown type"
          })`,
      );
      text = attachmentTexts.join("\n");
    }

    // If no text content but has fileUrl, create descriptive text
    if (!text && message.fileUrl) {
      text = `File: ${message.fileName || "File"} (${
        message.fileType || "Unknown type"
      })`;
    }

    if (!text.trim()) {
      text = "Empty message";
    }

    return text;
  };

  // Web API image copy functions
  const getImageToCopy = async (
    message: Message,
  ): Promise<{ blob: Blob; name: string } | null> => {
    try {
      let imageUrl: string | null = null;
      let imageName: string = "image";

      // Check attachments first
      if (
        Array.isArray(message.attachments) &&
        message.attachments.length > 0
      ) {
        const imageAttachment = message.attachments.find((attachment: any) =>
          attachment.fileType?.startsWith("image/"),
        );
        if (imageAttachment) {
          imageUrl = imageAttachment.fileUrl;
          imageName = imageAttachment.fileName || "image";
        }
      }

      // Check fileUrl if it's an image
      if (
        !imageUrl &&
        message.fileUrl &&
        message.fileType?.startsWith("image/")
      ) {
        imageUrl = message.fileUrl;
        imageName = message.fileName || "image";
      }

      if (!imageUrl) {
        return null; // No image found
      }

      // fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error("Failed to fetch image:", response.status);
        return null;
      }

      const blob = await response.blob();
      return { blob, name: imageName };
    } catch (error) {
      console.error("Error getting image:", error);
      return null;
    }
  };

  // Web API image to clipboard
  const copyImageToClipboard = async (imageData: {
    blob: Blob;
    name: string;
  }): Promise<boolean> => {
    try {
      if (navigator.clipboard && (navigator.clipboard as any).write) {
        const ClipboardItem = (window as any).ClipboardItem;
        if (ClipboardItem) {
          const item = new ClipboardItem({
            [imageData.blob.type]: imageData.blob,
          });
          await (navigator.clipboard as any).write([item]);
          return true;
        }
      }
      return false; // Image copy not supported
    } catch (clipboardError) {
      console.error("Clipboard API failed:", clipboardError);
      return false;
    }
  };

  // Web API text copy
  const copyTextContent = async (message: Message): Promise<void> => {
    const text = getTextContent(message);

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, 99999);

      try {
        const successful = document.execCommand("copy");
        if (!successful) {
          throw new Error("execCommand copy failed");
        }
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  // Note: Do NOT early-return before hooks; render empty state conditionally in JSX below.

  // refs for scrolling behavior
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    // Prefer sentinel for reliable scrolling after layout/async image loads
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior, block: "end" });
    } else if (scrollContainerRef.current) {
      const sc = scrollContainerRef.current;
      sc.scrollTop = sc.scrollHeight;
    }
  };

  // On first mount (page refresh), jump to the last message
  useEffect(() => {
    // Small rAF to ensure DOM painted before scrolling
    const id = requestAnimationFrame(() => scrollToBottom("auto"));
    return () => cancelAnimationFrame(id);
  }, []);

  // Whenever messages change, keep view at bottom
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length]);

  return (
    <div className="relative w-full min-h-full h-full bg-[#F0F2F5] dark:bg-[#0B141A]">
      {/* Background Image - Light mode (absolute to container, not viewport) */}
      <div className="absolute inset-0 z-0 dark:hidden pointer-events-none opacity-40">
        <img
          src="https://img.freepik.com/premium-photo/white-speech-bubbles-3d-chat-icons_1235831-169431.jpg?w=1480  "
          alt="background"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Background Image - Dark mode (absolute to container, not viewport) */}
      <div
        className="absolute inset-0 z-0 hidden dark:block pointer-events-none opacity-20"
        style={{
          backgroundImage: `url('/d1.webp')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      ></div>

      {/* Content Overlay */}
      <div className="relative z-10 w-full h-full min-h-full flex flex-col">
        {/* Dialog for file preview */}
        <Dialog
          open={!!selectedFile}
          onOpenChange={(open) => !open && setSelectedFile(null)}
        >
          <DialogContent className="w-[95vw] sm:max-w-[90vw] max-h-[90vh] bg-white dark:bg-[#111B21] border-[#D1D7DB] dark:border-[#2A3942] rounded-lg z-50 p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base text-[#111B21] dark:text-[#E9EDEF]">
                {selectedFile?.type?.startsWith("image/")
                  ? "Image Preview"
                  : selectedFile?.type?.startsWith("video/")
                    ? "Video Preview"
                    : selectedFile?.type?.includes("pdf")
                      ? "PDF Document"
                      : "File Preview"}
              </DialogTitle>
            </DialogHeader>
            {selectedFile && (
              <div className="flex flex-col items-center justify-center p-2 sm:p-4">
                {selectedFile.type?.startsWith("image/") ? (
                  <div className="text-center">
                    <img
                      src={selectedFile.url}
                      alt="Preview"
                      className="max-h-[60vh] sm:max-h-[70vh] max-w-full object-contain rounded-lg mx-auto"
                    />
                    <DownloadButton
                      url={selectedFile.url}
                      filename={selectedFile.name || "image.png"}
                      className="flex items-center gap-2 px-3 sm:px-4 py-2 my-3 sm:my-5 bg-[#00A884] hover:bg-[#008C71] text-white text-sm rounded-md transition-colors mx-auto"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </DownloadButton>
                  </div>
                ) : selectedFile.type?.startsWith("video/") ? (
                  <div className="flex flex-col items-center w-full">
                    <video
                      controls
                      className="max-h-[60vh] sm:max-h-[70vh] max-w-full w-full rounded-lg"
                    >
                      <source src={selectedFile.url} type={selectedFile.type} />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : selectedFile.type?.includes("pdf") ? (
                  <div className="flex flex-col items-center justify-center p-6 bg-[#F0F2F5] dark:bg-[#202C33] rounded-lg">
                    <FileText className="h-16 w-16 text-[#8696A0] mb-4" />
                    <p className="text-[#54656F] dark:text-[#8696A0] mb-4 text-center">
                      PDF files can't be previewed in the browser. Please
                      download to view.
                    </p>
                    <DownloadButton
                      url={selectedFile.url}
                      filename={selectedFile.name || "document.pdf"}
                      className="flex items-center gap-2 px-4 py-2 bg-[#00A884] hover:bg-[#008C71] text-white rounded-md transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </DownloadButton>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 bg-[#F0F2F5] dark:bg-[#202C33] rounded-lg">
                    <File className="h-16 w-16 text-[#8696A0] mb-4" />
                    <p className="text-[#54656F] dark:text-[#8696A0] mb-4 text-center">
                      This file type can't be previewed in the browser.
                    </p>
                    <DownloadButton
                      url={selectedFile.url}
                      filename={selectedFile.name || "file"}
                      className="flex items-center gap-2 px-4 py-2 bg-[#00A884] hover:bg-[#008C71] text-white rounded-md transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download File
                    </DownloadButton>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Messages Container - Scrollable area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-8 py-3"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(134, 150, 160, 0.3) transparent",
          }}
        >
          {/* Custom scrollbar for webkit browsers */}
          <style jsx global>{`
            .flex-1::-webkit-scrollbar {
              width: 6px;
            }
            .flex-1::-webkit-scrollbar-track {
              background: transparent;
            }
            .flex-1::-webkit-scrollbar-thumb {
              background-color: rgba(134, 150, 160, 0.3);
              border-radius: 3px;
            }
            .flex-1::-webkit-scrollbar-thumb:hover {
              background-color: rgba(134, 150, 160, 0.5);
            }
          `}</style>

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex items-center justify-center py-12 h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#F0F2F5] dark:bg-[#202C33] rounded-full flex items-center justify-center">
                  <FileText className="h-8 w-8 text-[#8696A0]" />
                </div>
                <p className="text-[#54656F] dark:text-[#8696A0] text-lg font-medium">
                  No messages yet
                </p>
                <p className="text-[#8696A0] dark:text-[#54656F] text-sm mt-1">
                  Start a conversation
                </p>
              </div>
            </div>
          )}

          <div className="max-w-[100%] sm:max-w-[80%] md:max-w-[100%] lg:max-w-[95%] xl:max-w-[100%] mx-auto space-y-[2px]">
            {messages.map((message, idx) => {
              const isCurrentUser = message?.senderId === currentUserId;
              const isOnline = !!onlineUsers?.includes(message.senderId);
              const createdAt =
                typeof message.createdAt === "string"
                  ? new Date(message.createdAt)
                  : message.createdAt;
              const senderName = message?.sender?.name || message?.sender?.email || "User";
              const senderImage = message?.sender?.image || "/placeholder.svg";
              const isPinned = !!pinnedMessages[message.id];

              const prev = messages[idx - 1];
              const isFirstInGroup =
                !prev || prev.senderId !== message.senderId;
              const next = messages[idx + 1];
              const isLastInGroup = !next || next.senderId !== message.senderId;

              const rxn = localReactions[message.id] || {};
              const rxnEntries = Object.entries(rxn).sort(
                (a, b) => (b[1]?.length || 0) - (a[1]?.length || 0),
              );

              const showDateSeparator = shouldShowDateSeparator(message, prev);
              const isBuzzMessageItem = isBuzzMessage(message as any);

              if (isBuzzMessageItem) {
                const buzzData = parseBuzzDisplayData(message as any);
                return (
                  <div key={message.id}>
                    {showDateSeparator && <DateSeparator date={createdAt} />}
                    <div className="flex justify-center my-3 px-2">
                      <div className="max-w-[90%] rounded-2xl border border-red-200/80 bg-red-50/90 px-3 py-2.5 text-sm text-red-800 shadow-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                        <div className="flex items-center gap-2 font-semibold">
                          <BellRing className="h-4 w-4 shrink-0" />
                          <span>Buzz</span>
                        </div>
                        <div className="mt-1 whitespace-pre-wrap break-words">
                          <div className="font-medium text-red-900 dark:text-red-200">
                            {buzzData.senderName}
                          </div>
                          <div className="mt-0.5">{buzzData.message}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={message.id}>
                  {/* Date separator */}
                  {showDateSeparator && <DateSeparator date={createdAt} />}

                  <div
                    id={`msg-${message.id}`}
                    className={`flex ${
                      isCurrentUser ? "justify-end" : "justify-start"
                    } group relative mb-[2px]`}
                  >
                    <div
                      className={`flex ${
                        isCurrentUser ? "flex-row-reverse" : "flex-row"
                      } gap-2 max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[60%]`}
                    >
                      {/* Avatar - WhatsApp style: 40px, only on first in group */}
                      {isFirstInGroup ? (
                        <div className="relative flex-shrink-0 hidden sm:block self-end">
                          <Avatar className="h-10 w-10 border border-white dark:border-[#2A3942]">
                            <AvatarImage src={senderImage} />
                            <AvatarFallback className="bg-[#00A884] text-white font-medium text-sm">
                              {(senderName || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && !isCurrentUser && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00A884] border-2 border-white dark:border-[#0B141A] rounded-full"></div>
                          )}
                        </div>
                      ) : (
                        <div className="h-10 w-10 hidden sm:block flex-shrink-0" />
                      )}

                      {/* Message Content */}
                      <div className="min-w-0 flex-1">
                        {/* Sender name only on first in group, WhatsApp style */}
                        {isFirstInGroup && !isCurrentUser && (
                          <div className="flex items-center gap-2 px-2 mb-1">
                            <span className="text-[13px] font-medium text-[#00A884] truncate max-w-[200px]">
                              {senderName}
                            </span>
                          </div>
                        )}

                        {/* Message Bubble - WhatsApp style */}
                        <div className="relative group">
                          <div
                            className={cn(
                              "relative px-[9px] py-[6px] shadow-sm max-w-full",
                              isCurrentUser
                                ? "bg-[#DCF8C6] dark:bg-[#005C4B] text-[#111B21] dark:text-[#E9EDEF] rounded-[7.5px] rounded-tr-[0px]"
                                : "bg-white dark:bg-[#202C33] text-[#111B21] dark:text-[#E9EDEF] rounded-[7.5px] rounded-tl-[0px]",
                              // First in group gets full radius on own side
                              isFirstInGroup &&
                                isCurrentUser &&
                                "rounded-tr-[7.5px]",
                              isFirstInGroup &&
                                !isCurrentUser &&
                                "rounded-tl-[7.5px]",
                              // Last in group gets tail effect
                              isLastInGroup &&
                                isCurrentUser &&
                                "rounded-br-[0px]",
                              isLastInGroup &&
                                !isCurrentUser &&
                                "rounded-bl-[0px]",
                              isPinned &&
                                "border-l-4 border-l-[#FFD700] dark:border-l-[#FFD700]",
                            )}
                            onDoubleClick={() => {
                              if (editingMessageId) return;
                              handleReplyByDoubleClick(message);
                            }}
                            title="Double-click to reply"
                            style={{
                              boxShadow: "0 1px 0.5px rgba(11, 20, 26, 0.13)",
                            }}
                          >
                            {isPinned && (
                              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px] font-bold mb-1 pb-0.5 border-b border-amber-500/20">
                                <Pin className="h-3 w-3 fill-current" />
                                Pinned Message
                              </div>
                            )}
                            {editingMessageId === message.id ? (
                              <div className="space-y-3">
                                <Textarea
                                  value={editContent}
                                  onChange={(e) =>
                                    setEditContent(e.target.value)
                                  }
                                  className="min-h-[80px] text-sm resize-none border-[#D1D7DB] dark:border-[#2A3942] focus:border-[#00A884] dark:focus:border-[#00A884] bg-white dark:bg-[#111B21] text-[#111B21] dark:text-[#E9EDEF] rounded-lg"
                                  placeholder="Edit your message..."
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelEdit}
                                    disabled={isEditing}
                                    className="border-[#D1D7DB] dark:border-[#2A3942] hover:bg-[#F0F2F5] dark:hover:bg-[#2A3942] text-[#54656F]"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveEdit(message.id)}
                                    disabled={isEditing || !editContent.trim()}
                                    className="bg-[#00A884] hover:bg-[#008C71] text-white"
                                  >
                                    <Save className="h-4 w-4 mr-1" />
                                    {isEditing ? "Saving..." : "Save"}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Pinned Message Reply - WhatsApp style */}
                                {message.pinnedMessageId && (
                                  <div className="mb-2 flex items-start gap-2 rounded-[7.5px] bg-[#FFF9C4] dark:bg-[#2A3942] p-2 border-l-4 border-[#FFD700]">
                                    <Reply className="h-4 w-4 mt-0.5 text-[#FFD700] flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium text-[#00A884] mb-0.5">
                                        {(() => {
                                          const pinned = messages.find(
                                            (m) =>
                                              m.id === message.pinnedMessageId,
                                          );
                                          return pinned
                                            ? pinned.sender.name
                                            : message.pinnedAuthor || "Unknown";
                                        })()}
                                      </div>
                                      {(() => {
                                        const pinned = messages.find(
                                          (m) =>
                                            m.id === message.pinnedMessageId,
                                        );
                                        if (pinned) {
                                          return (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                document
                                                  .getElementById(
                                                    `msg-${pinned.id}`,
                                                  )
                                                  ?.scrollIntoView({
                                                    behavior: "smooth",
                                                    block: "center",
                                                  })
                                              }
                                              className="text-sm text-[#111B21] dark:text-[#E9EDEF] hover:underline text-left w-full line-clamp-2"
                                              title="Jump to original"
                                            >
                                              {pinned.content.slice(0, 100)}
                                              {pinned.content.length > 100 &&
                                                "..."}
                                            </button>
                                          );
                                        }
                                        return (
                                          <div className="text-sm text-[#8696A0] opacity-80 line-clamp-2">
                                            {message.pinnedPreview ||
                                              "Referenced message"}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Message Content */}
                                <div className="mb-1">
                                  {renderMessageContent(message)}
                                </div>

                                {/* Attachments */}
                                {getAttachments(message).length > 0 && (
                                  <div className="mt-1 space-y-1">
                                    {getAttachments(message).map((att, ai) => {
                                      const arr = Array.isArray(
                                        (att as any).reactions,
                                      )
                                        ? ((att as any).reactions as {
                                            emoji: string;
                                            userId: string;
                                          }[])
                                        : [];
                                      const byEmoji: Record<string, string[]> =
                                        {};
                                      for (const r of arr) {
                                        if (!byEmoji[r.emoji])
                                          byEmoji[r.emoji] = [];
                                        byEmoji[r.emoji].push(r.userId);
                                      }
                                      const attEntries = Object.entries(
                                        byEmoji,
                                      ).sort(
                                        (a, b) =>
                                          (b[1]?.length || 0) -
                                          (a[1]?.length || 0),
                                      );

                                      const attKey = `${message.id}:att:${ai}`;

                                      return (
                                        <div
                                          key={attKey}
                                          className="relative group"
                                        >
                                          {att.fileType?.startsWith(
                                            "image/",
                                          ) ? (
                                            <div className="relative inline-block">
                                              <img
                                                src={att.fileUrl}
                                                alt={
                                                  att.fileName || "Attachment"
                                                }
                                                className="max-h-64 max-w-full rounded-[6px] cursor-pointer hover:opacity-95 transition-opacity"
                                                onClick={() =>
                                                  setSelectedFile({
                                                    url: att.fileUrl,
                                                    type: att.fileType ?? null,
                                                    name:
                                                      att.fileName || undefined,
                                                  })
                                                }
                                              />
                                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFile({
                                                      url: att.fileUrl,
                                                      type:
                                                        att.fileType ?? null,
                                                      name:
                                                        att.fileName ||
                                                        undefined,
                                                    });
                                                  }}
                                                  className="bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80"
                                                  title="Open image"
                                                >
                                                  <Maximize className="h-3 w-3" />
                                                </button>

                                                <button
                                                  onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    replyToAttachment(
                                                      message,
                                                      ai,
                                                    );
                                                  }}
                                                  className="bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80"
                                                  title="Reply to attachment"
                                                  type="button"
                                                >
                                                  <Reply className="h-3 w-3" />
                                                </button>

                                                <AttachmentReactionPicker
                                                  message={message}
                                                  attachmentIndex={ai}
                                                  attKey={attKey}
                                                  toggleAttachmentReaction={
                                                    toggleAttachmentReaction
                                                  }
                                                  openAttachmentReactionFor={
                                                    openAttachmentReactionFor
                                                  }
                                                  setOpenAttachmentReactionFor={
                                                    setOpenAttachmentReactionFor
                                                  }
                                                  buttonClassName="bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80"
                                                />

                                                {isCurrentUser && (
                                                  <button
                                                    onClick={(ev) => {
                                                      ev.stopPropagation();
                                                      if (
                                                        window.confirm(
                                                          "Delete this attachment?",
                                                        )
                                                      ) {
                                                        deleteAttachment(
                                                          message.id,
                                                          ai,
                                                        );
                                                      }
                                                    }}
                                                    className="bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700"
                                                    title="Delete attachment"
                                                  >
                                                    <Trash className="h-3 w-3" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          ) : att.fileType?.startsWith(
                                              "video/",
                                            ) ? (
                                            <MessageVideoComponent
                                              videoUrl={att.fileUrl}
                                              fileName={
                                                //
                                                att.fileName || "video.mp4"
                                              }
                                              messageId={message.id}
                                              onPreview={(data) =>
                                                setSelectedFile(data)
                                              }
                                            />
                                          ) : (
                                            <div className="flex items-center gap-3 p-3 rounded-[6px] bg-[#F0F2F5] dark:bg-[#2A3942] hover:bg-[#E9EDEF] dark:hover:bg-[#2A3942]/80 transition-colors group/file max-w-[320px]">
                                              <div className="flex-shrink-0 w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center">
                                                {getFileIcon(att.fileType)}
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-[#111B21] dark:text-[#E9EDEF]">
                                                  {att.fileName ||
                                                    "Download file"}
                                                </p>
                                                <p className="truncate text-xs text-[#8696A0] uppercase">
                                                  {att.fileType?.split(
                                                    "/",
                                                  )[1] || "FILE"}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                                <button
                                                  onClick={() =>
                                                    setSelectedFile({
                                                      url: att.fileUrl,
                                                      type:
                                                        att.fileType ?? null,
                                                      name:
                                                        att.fileName ||
                                                        undefined,
                                                    })
                                                  }
                                                  className="text-[#8696A0] hover:text-[#54656F] dark:hover:text-[#E9EDEF] p-1.5 rounded-full hover:bg-white dark:hover:bg-[#111B21]"
                                                  title="Preview file"
                                                >
                                                  <Maximize className="h-4 w-4" />
                                                </button>
                                                <button
                                                  onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    replyToAttachment(
                                                      message,
                                                      ai,
                                                    );
                                                  }}
                                                  className="text-[#8696A0] hover:text-[#54656F] dark:hover:text-[#E9EDEF] p-1.5 rounded-full hover:bg-white dark:hover:bg-[#111B21]"
                                                  title="Reply to attachment"
                                                  type="button"
                                                >
                                                  <Reply className="h-4 w-4" />
                                                </button>
                                                <a
                                                  href={att.fileUrl}
                                                  download={
                                                    att.fileName || "file"
                                                  }
                                                  className="text-[#8696A0] hover:text-[#54656F] dark:hover:text-[#E9EDEF] p-1.5 rounded-full hover:bg-white dark:hover:bg-[#111B21]"
                                                  title="Download file"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                >
                                                  <Download className="h-4 w-4" />
                                                </a>

                                                <AttachmentReactionPicker
                                                  message={message}
                                                  attachmentIndex={ai}
                                                  attKey={attKey}
                                                  toggleAttachmentReaction={
                                                    toggleAttachmentReaction
                                                  }
                                                  openAttachmentReactionFor={
                                                    openAttachmentReactionFor
                                                  }
                                                  setOpenAttachmentReactionFor={
                                                    setOpenAttachmentReactionFor
                                                  }
                                                  buttonClassName="text-[#8696A0] hover:text-[#54656F] dark:hover:text-[#E9EDEF] p-1.5 rounded-full hover:bg-white dark:hover:bg-[#111B21]"
                                                />

                                                {isCurrentUser && (
                                                  <button
                                                    onClick={(ev) => {
                                                      ev.stopPropagation();
                                                      if (
                                                        window.confirm(
                                                          "Delete this attachment?",
                                                        )
                                                      ) {
                                                        deleteAttachment(
                                                          message.id,
                                                          ai,
                                                        );
                                                      }
                                                    }}
                                                    className="text-red-600 dark:text-red-400 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    title="Delete attachment"
                                                  >
                                                    <Trash className="h-4 w-4" />
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {attEntries.length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                              {attEntries.map(
                                                ([emoji, userIds]) => (
                                                  <ReactionChip
                                                    key={emoji}
                                                    emoji={emoji}
                                                    count={userIds.length}
                                                    active={
                                                      currentUserId
                                                        ? userIds.includes(
                                                            currentUserId,
                                                          )
                                                        : false
                                                    }
                                                    onClick={() =>
                                                      toggleAttachmentReaction(
                                                        message.id,
                                                        ai,
                                                        emoji,
                                                      )
                                                    }
                                                  />
                                                ),
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {/* File URL */}

                                {message.fileUrl && !message.attachments && (
                                  <div className="mt-1">
                                    {message.fileType?.startsWith("image/") ? (
                                      <div className="relative group inline-block">
                                        <img
                                          src={message.fileUrl}
                                          alt={message.fileName || "Attachment"}
                                          className="max-h-64 max-w-full rounded-[6px] cursor-pointer hover:opacity-95 transition-opacity"
                                          onClick={() =>
                                            setSelectedFile({
                                              url: message.fileUrl!,
                                              type: message.fileType ?? null,
                                              name:
                                                message.fileName || undefined,
                                            })
                                          }
                                        />
                                        <button
                                          onClick={() =>
                                            setSelectedFile({
                                              url: message.fileUrl!,
                                              type: message.fileType ?? null,
                                              name:
                                                message.fileName || undefined,
                                            })
                                          }
                                          className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80"
                                          title="Open image"
                                        >
                                          <Maximize className="h-3 w-3" />
                                        </button>
                                      </div>
                                    ) : message.fileType?.startsWith(
                                        "audio/",
                                      ) ? (
                                      <div className="mt-1">
                                        <audio
                                          controls
                                          src={message.fileUrl}
                                          className="w-full max-w-[260px] rounded-md"
                                        >
                                          Your browser does not support the
                                          audio element.
                                        </audio>
                                        {message.fileName && (
                                          <div className="text-xs text-[#8696A0] mt-1 truncate">
                                            {message.fileName}
                                          </div>
                                        )}
                                      </div>
                                    ) : message.fileType?.startsWith(
                                        "video/",
                                      ) ? (
                                      <MessageVideoComponent
                                        videoUrl={message.fileUrl}
                                        fileName={
                                          message.fileName || "video.mp4"
                                        }
                                        messageId={message.id}
                                        onPreview={(data) =>
                                          setSelectedFile(data)
                                        }
                                      />
                                    ) : (
                                      <div className="flex items-center gap-3 p-3 rounded-[6px] bg-[#F0F2F5] dark:bg-[#2A3942] hover:bg-[#E9EDEF] dark:hover:bg-[#2A3942]/80 transition-colors group max-w-[320px]">
                                        <div className="flex-shrink-0 w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center">
                                          {getFileIcon(message.fileType)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-sm font-medium text-[#111B21] dark:text-[#E9EDEF]">
                                            {message.fileName ||
                                              "Download file"}
                                          </p>
                                          <p className="truncate text-xs text-[#8696A0] uppercase">
                                            {message.fileType?.split("/")[1] ||
                                              "FILE"}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={() =>
                                              setSelectedFile({
                                                url: message.fileUrl!,
                                                type: message.fileType ?? null,
                                                name:
                                                  message.fileName || undefined,
                                              })
                                            }
                                            className="text-[#8696A0] hover:text-[#54656F] dark:hover:text-[#E9EDEF] p-1.5 rounded-full hover:bg-white dark:hover:bg-[#111B21]"
                                            title="Preview file"
                                          >
                                            <Maximize className="h-4 w-4" />
                                          </button>
                                          <a
                                            href={message.fileUrl}
                                            download={
                                              message.fileName || "file"
                                            }
                                            className="text-[#8696A0] hover:text-[#54656F] dark:hover:text-[#E9EDEF] p-1.5 rounded-full hover:bg-white dark:hover:bg-[#111B21]"
                                            title="Download file"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Download className="h-4 w-4" />
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Reactions - WhatsApp style positioned at bottom */}
                                {rxnEntries.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {rxnEntries.map(([emoji, userIds]) => (
                                      <ReactionChip
                                        key={emoji}
                                        emoji={emoji}
                                        count={userIds.length}
                                        active={hasUserReacted(
                                          message.id,
                                          emoji,
                                        )}
                                        onClick={() =>
                                          toggleReaction(message, emoji)
                                        }
                                      />
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Message Actions - WhatsApp style hover actions */}
                          <div
                            className={cn(
                              "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-0.5 z-30",
                              "bg-white dark:bg-[#202C33] shadow-md rounded-md border border-[#E9EDEF] dark:border-[#2A3942] p-0.5",
                              isCurrentUser ? "-left-16" : "-right-16",
                            )}
                          >
                            {/* Quick Pin/Unpin Action Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePinMessage(message.id);
                              }}
                              className="h-7 w-7 rounded-sm hover:bg-[#F0F2F5] dark:hover:bg-[#2A3942] p-0 text-[#54656F]"
                              title={isPinned ? "Unpin message" : "Pin message"}
                            >
                              {isPinned ? (
                                <PinOff className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
                              ) : (
                                <Pin className="h-3.5 w-3.5 hover:text-amber-500" />
                              )}
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 rounded-sm hover:bg-[#F0F2F5] dark:hover:bg-[#2A3942] p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4 text-[#54656F]" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align="end"
                                className="w-48 bg-white dark:bg-[#111B21] border-[#D1D7DB] dark:border-[#2A3942]"
                              >
                                <DropdownMenuItem
                                  onClick={() => handlePinMessage(message.id)}
                                  className="text-[#111B21] dark:text-[#E9EDEF] focus:bg-[#F0F2F5] dark:focus:bg-[#2A3942] cursor-pointer font-semibold"
                                >
                                  {isPinned ? (
                                    <>
                                      <PinOff className="h-4 w-4 mr-2 text-amber-500" />
                                      Unpin Message
                                    </>
                                  ) : (
                                    <>
                                      <Pin className="h-4 w-4 mr-2 text-amber-500" />
                                      Pin Message
                                    </>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleCopyMessage(message)}
                                  className="text-[#111B21] dark:text-[#E9EDEF] focus:bg-[#F0F2F5] dark:focus:bg-[#2A3942] cursor-pointer"
                                >
                                  <Copy className="h-4 w-4 mr-2 text-[#8696A0]" />{" "}
                                  Copy
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  ref={(node) => {
                                    reactionButtonRef.current =
                                      node as HTMLElement;
                                  }}
                                  onClick={() => {
                                    setOpenReactionFor(message.id);
                                  }}
                                  className="text-[#111B21] dark:text-[#E9EDEF] focus:bg-[#F0F2F5] dark:focus:bg-[#2A3942] cursor-pointer"
                                >
                                  <Smile className="h-4 w-4 mr-2 text-[#8696A0]" />{" "}
                                  React
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() =>
                                    handleReplyByDoubleClick(message)
                                  }
                                  className="text-[#111B21] dark:text-[#E9EDEF] focus:bg-[#F0F2F5] dark:focus:bg-[#2A3942] cursor-pointer"
                                >
                                  <Reply className="h-4 w-4 mr-2 text-[#8696A0]" />{" "}
                                  Reply
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-[#E9EDEF] dark:bg-[#2A3942]" />
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setInfoMessageId(message.id);
                                    requestAnimationFrame(() => {
                                      setInfoDialogOpen(true);
                                    });
                                  }}
                                  className="text-[#111B21] dark:text-[#E9EDEF] focus:bg-[#F0F2F5] dark:focus:bg-[#2A3942] cursor-pointer"
                                >
                                  <Info className="h-4 w-4 mr-2 text-[#8696A0]" />{" "}
                                  Info
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <ReactionPicker
                            message={message}
                            isOpen={openReactionFor === message.id}
                            anchorRef={reactionButtonRef}
                            onClose={() => setOpenReactionFor(null)}
                            onReact={(emoji) => toggleReaction(message, emoji)}
                          />

                          {/* Timestamp and status - WhatsApp style: inline at bottom right */}
                          {!editingMessageId && (
                            <div
                              className={`flex items-center justify-end gap-1 mt-0`}
                            >
                              <span className="text-[11px] text-[#666] dark:text-[#FFFFFF99] leading-none">
                                {createdAt.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {/* {isMessageEdited(message) && " (edited)"} */}
                              </span>
                              {isCurrentUser && (
                                <MessageStatusIcon
                                  status={
                                    messageStatuses[message.id] ||
                                    calculateMessageStatus(
                                      message,
                                      isCurrentUser,
                                      onlineUsers,
                                    )
                                  }
                                  isCurrentUser={isCurrentUser}
                                  message={message}
                                  showReceipts={true}
                                  getParticipantName={getParticipantName}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} className="h-px" />
          </div>
        </div>
      </div>

      {/* Delivery Info Dialog */}
      {infoMessageId && (
        <DeliveryInfoDialog
          message={messages.find((m) => m.id === infoMessageId)!}
        />
      )}
    </div>
  );
}
