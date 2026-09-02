// =====================
// MessageInput tsx - WhatsApp Style
// =====================
"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Paperclip,
  File,
  X,
  Loader2,
  Smile,
  AtSign,
  Copy,
  Video,
  Music,
  BellRing,
  Mic,
  Upload,
} from "lucide-react";
import { buildBuzzNotificationData } from "@/lib/buzz-utils";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import EmojiPicker from "emoji-picker-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/use-socket";
import { MessageRewriter } from "@/components/message-rewriter";
import AISmartReply from "@/components/ai-smart-reply";
import dynamic from "next/dynamic";

export type Mentionable = {
  id: string;
  name: string;
  type: "user" | "channel";
  avatarUrl?: string | null;
};

type MessageInputProps = {
  channelId?: string;
  receiverId?: string;
  onMessageSent?: () => void;
  mentionables?: Mentionable[];
};

type UploadedFileData = {
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
};

type PinnedRef = { id: string; author?: string; preview?: string };

export default function MessageInput({
  channelId,
  receiverId,
  onMessageSent,
  mentionables = [],
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [smartReplyEnabled, setSmartReplyEnabled] = useState(false);
  const [lastChannelMessage, setLastChannelMessage] = useState("");

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const res = await fetch("/api/organization/me");
        if (!res.ok) return;
        const payload = await res.json();
        if (payload?.organization?.aiEnabled !== undefined) {
          setAiEnabled(payload.organization.aiEnabled);
        }
      } catch (err) {
        console.error("Failed to fetch organization setting for AI in input:", err);
      }
    };
    fetchOrg();
  }, []);
  const [isBuzzing, setIsBuzzing] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pinned, setPinned] = useState<PinnedRef | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<{
    messageId: string;
    preview?: string | null;
    senderName?: string | null;
  } | null>(null);
  const [replyAttachment, setReplyAttachment] = useState<{
    messageId: string;
    attachmentIndex: number;
    attachment?: {
      fileUrl: string;
      fileName?: string | null;
      fileType?: string | null;
    } | null;
  } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // mentions state

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [loadingMentions, setLoadingMentions] = useState(false);
  const [mentionsChannelUser, setMentionsChannelUser] = useState<Mentionable[]>(
    [],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const { sendBuzz, isConnected } = useSocket();

  // Listen for pinned message event from MessageList
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{
        id: string;
        content?: string;
        senderName?: string;
      }>;
      const d = ce.detail;
      if (!d) return;
      setPinned({
        id: d.id,
        author: d.senderName,
        preview: (d.content || "").slice(0, 120),
      });
    };
    window.addEventListener("message:pinned", handler as EventListener);
    return () =>
      window.removeEventListener("message:pinned", handler as EventListener);
  }, []);

  // Listen for reply-to-message events (double-click dispatch from MessageList)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{
        messageId: string;
        preview?: string;
        senderName?: string;
      }>;
      const d = ce.detail;
      if (!d || !d.messageId) return;
      setReplyToMessage({
        messageId: d.messageId,
        preview: d.preview ?? null,
        senderName: d.senderName ?? null,
      });
      // Also pin reference so server sees pinnedMessageId if necessary
      setPinned({
        id: d.messageId,
        author: d.senderName,
        preview: d.preview ? d.preview.slice(0, 120) : undefined,
      });
    };
    window.addEventListener("reply:message", handler as EventListener);
    return () =>
      window.removeEventListener("reply:message", handler as EventListener);
  }, []);

  // Track last received channel message for AI Smart Reply
  useEffect(() => {
    if (!channelId || typeof window === "undefined") return;
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ channelId?: string; content?: string; senderId?: string }>;
      const d = ce.detail;
      if (d?.channelId === channelId && d?.content) {
        setLastChannelMessage(d.content);
      }
    };
    window.addEventListener("message:received", handler as EventListener);
    return () => window.removeEventListener("message:received", handler as EventListener);
  }, [channelId]);

  // Listen for reply-to-attachment events
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{
        messageId: string;
        attachmentIndex: number;
        attachment?: any;
      }>;
      const d = ce.detail;
      if (!d) return;
      setReplyAttachment({
        messageId: d.messageId,
        attachmentIndex: d.attachmentIndex,
        attachment: d.attachment || null,
      });
      // also set pinned reference for server-side pinnedMessageId usage
      setPinned({ id: d.messageId, author: undefined, preview: undefined });
    };
    window.addEventListener("reply:attachment", handler as EventListener);
    return () =>
      window.removeEventListener("reply:attachment", handler as EventListener);
  }, []);

  // Autosize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, 500);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > 500 ? "auto" : "hidden";
  }, [message]);

  // Paste files (all types supported)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData?.files.length) return;
      const pastedFiles = Array.from(e.clipboardData.files);
      // Accept all file types now, not just images
      if (pastedFiles.length) {
        handleNewFiles(pastedFiles);
        toast.success(`${pastedFiles.length} file(s) ready to send`);
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  // Global Enter key handler for file-only sends (when textarea is empty but files exist)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle Enter key without shift
      if (e.key !== "Enter" || e.shiftKey) return;

      // Don't interfere if mention picker is open
      if (mentionOpen) return;

      // Don't trigger if user is typing in the textarea with text
      if (message.trim().length > 0) return;

      // Only trigger if we have files but no message (file-only send)
      if (files.length > 0 && !isSubmitting && !isUploading) {
        // Check if the active element is within our dropZoneRef or the textarea
        const activeEl = document.activeElement;
        const isInComponent =
          dropZoneRef.current?.contains(activeEl) ||
          activeEl === textareaRef.current ||
          activeEl === document.body;

        if (isInComponent) {
          e.preventDefault();
          handleSubmit();
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [files.length, message, mentionOpen, isSubmitting, isUploading]);

  // Click outside to close mentions
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node))
        setMentionOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load mentionable
  useEffect(() => {
    let abort = false;

    async function loadMentionables() {
      setLoadingMentions(true);
      try {
        if (channelId) {
          const res = await fetch(
            `/api/messages/mentionables?channelId=${encodeURIComponent(
              channelId,
            )}`,
            { cache: "no-store" },
          );
          if (!res.ok) throw new Error("Failed to load mentionables (channel)");
          const data = await res.json();
          if (!abort) setMentionsChannelUser(data.mentionables ?? []);
        }
      } catch (e) {
        console.log(e);
        setMentionsChannelUser([]);
      } finally {
        if (!abort) setLoadingMentions(false);
      }
    }

    loadMentionables();
    return () => {
      abort = true;
    };
  }, [channelId]);

  const handleNewFiles = (newFiles: File[]) => {
    const oversized = newFiles.filter((f) => f.size > 5 * 1024 * 1024 * 1024);
    if (oversized.length) {
      toast.error("Files must be smaller than 5GB");
      return;
    }
    setFiles((prev) => {
      if (prev.length + newFiles.length > 50) {
        toast.error("You can only upload up to 50 files at once");
        return prev;
      }
      return [...prev, ...newFiles];
    });
  };

  // FIXED: Reset file input after selection to allow selecting same file again
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    handleNewFiles(Array.from(e.target.files));

    // Reset the file input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  // Copy image file (or fallback to base64 text) to clipboard
  const copyImage = async (i: number) => {
    const file = files[i];
    if (!file) return;

    try {
      // Prefer the async clipboard write with a ClipboardItem (image binary)
      if (navigator.clipboard && (navigator.clipboard as any).write) {
        const blob = file.slice(0, file.size, file.type);
        const ClipboardItemCtor =
          (window as any).ClipboardItem || (window as any).ClipboardItem;
        if (typeof ClipboardItemCtor === "function") {
          const item = new ClipboardItemCtor({ [file.type]: blob });
          await navigator.clipboard.write([item]);
          toast.success("Image copied to clipboard");
          return;
        }
      }

      // Fallback: copy base64 data URL as text (many editors won't turn this into an image)
      const dataUrl: string = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(dataUrl);
        toast.success("Image copied as base64 (fallback)");
        return;
      }

      toast.error("Copy not supported in this browser");
    } catch (err) {
      console.error("copy image error", err);
      toast.error(
        "Failed to copy image. Your browser may not support clipboard image writes.",
      );
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const handleEmojiClick = (emojiData: any) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // IMPROVED: Better DnD handlers with visual feedback
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set dragging to false if leaving the drop zone completely
    const relatedTarget = e.relatedTarget as Node;
    if (!dropZoneRef.current?.contains(relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleNewFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, []);

  const mentionCandidates = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    const list = q
      ? mentionables.filter((m) => m.name.toLowerCase().includes(q))
      : mentionables;
    const list2 = q
      ? mentionsChannelUser.filter((m) => m.name.toLowerCase().includes(q))
      : mentionsChannelUser;
    return [...list.slice(0, 8), ...list2.slice(0, 8)];
  }, [mentionQuery, mentionables, mentionsChannelUser]);

  const openMentionIfNeeded = (val: string) => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? val.length;
    const upto = val.slice(0, caret);
    const m = upto.match(/(^|\s)@([\w-]{0,32})$/);

    if (m) {
      setMentionOpen(true);
      setMentionQuery(m[2] || "");
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  };

  const insertMention = (name: string) => {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? message.length;
    const upto = message.slice(0, caret);
    const rest = message.slice(caret);
    const upto2 = upto.replace(/@[^\s]*$/, "@");
    const next = `${upto2}${name} ${rest}`;
    setMessage(next);
    setMentionOpen(false);
    setMentionQuery("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleChange = (val: string) => {
    setMessage(val);
    openMentionIfNeeded(val);
  };

  // FIXED: Improved keydown handler with better shift+enter handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
        e.preventDefault();
        if (e.key === "ArrowDown")
          setMentionIndex((i) =>
            Math.min(i + 1, Math.max(mentionCandidates.length - 1, 0)),
          );
        if (e.key === "ArrowUp") setMentionIndex((i) => Math.max(i - 1, 0));
        if (e.key === "Enter") {
          const chosen = mentionCandidates[mentionIndex];
          if (chosen) insertMention(chosen.name);
        }
        if (e.key === "Escape") setMentionOpen(false);
        return;
      }
    }

    // FIXED: Only prevent default for Enter without Shift
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // FIXED: Submit logic - allow files-only submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Allow submission if there are files OR message is not empty
    const hasContent = message.trim().length > 0 || files.length > 0;
    if (!hasContent || isSubmitting || isUploading) return;
    if (!session?.user) return;

    setIsSubmitting(true);

    try {
      let uploadedFiles: UploadedFileData[] = [];
      if (files.length > 0) {
        uploadedFiles = await uploadFiles();
        if (!uploadedFiles.length) throw new Error("File upload failed");
      }

      // If replying to an attachment, append a hidden marker to content and include pinnedMessageId
      let sendContent = message.trim();
      if (replyAttachment) {
        try {
          const marker = JSON.stringify({
            messageId: replyAttachment.messageId,
            attachmentIndex: replyAttachment.attachmentIndex,
          });
          sendContent = `${sendContent}\n\n__ATTACH_REPLY__:${marker}`;
        } catch (err) {
          console.warn("Failed to encode reply attachment marker", err);
        }
      }

      const clientId = "c_" + Math.random().toString(36).slice(2, 10);
      const currentUser = session.user as any;
      const payload: any = {
        content: sendContent,
        channelId,
        receiverId,
        files: uploadedFiles,
        clientId,
      };
      if (pinned?.id) payload.pinnedMessageId = pinned.id;
      if (replyToMessage?.messageId)
        payload.replyToMessageId = replyToMessage.messageId;

      // Optimistically add a temporary message locally marked as 'sending'
      const tempMsg = {
        id: clientId,
        content: sendContent,
        senderId: currentUser.id,
        receiverId: receiverId || null,
        channelId: channelId || null,
        createdAt: new Date().toISOString(),
        sender: {
          id: currentUser.id,
          name: currentUser.name || "You",
          email: currentUser.email || "",
          image: currentUser.image || null,
        },
        status: "sending",
      } as any;
      window.dispatchEvent(
        new CustomEvent("message:received", { detail: tempMsg }),
      );

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to send message");

      // Reset form state
      setMessage("");
      setFiles([]);
      setPinned(null);
      setReplyAttachment(null);
      setReplyToMessage(null);
      onMessageSent?.();
      const sentMsg = await res.json();

      // Include clientId so real-time-messages can replace the optimistic message
      window.dispatchEvent(
        new CustomEvent("message:received", {
          detail: { ...sentMsg, clientId },
        }),
      );
      window.dispatchEvent(
        new CustomEvent("message:status-update", {
          detail: { messageId: sentMsg.id, status: "sent" },
        }),
      );
      toast.success("Message sent successfully");
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Set focus after component renders
    // fileInputRef.current.focus();
    fileInputRef.current?.focus();

    // focus on send message  BUTTON
  }, []);

  // When sending a message, the focus should automatically return to the textarea, so there's no need to click on the textarea again and again
  useEffect(() => {
    if (!isSubmitting) {
      textareaRef.current?.focus();
    }
  }, [isSubmitting]);

  // Upload helper
  async function uploadFiles(): Promise<UploadedFileData[]> {
    if (files.length === 0) return [];
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedFiles: UploadedFileData[] = [];

      // Split files into small (<100MB) and large (>=100MB) categories
      const CHUNK_THRESHOLD = 100 * 1024 * 1024; // 100MB
      const smallFiles = files.filter((f) => f.size < CHUNK_THRESHOLD);
      const largeFiles = files.filter((f) => f.size >= CHUNK_THRESHOLD);

      // Upload small files normally (multipart)
      if (smallFiles.length > 0) {
        const formData = new FormData();
        smallFiles.forEach((file) => formData.append("files", file));

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to upload small file(s)");
        const data = await response.json();
        uploadedFiles.push(
          ...data.files.map((f: any, idx: number) => ({
            fileUrl: f.fileUrl,
            fileName: smallFiles[idx].name,
            fileType: smallFiles[idx].type,
          })),
        );
      }

      // Upload large files using chunked upload
      for (const file of largeFiles) {
        const result = await uploadFileChunked(file);
        if (result) uploadedFiles.push(result);
      }

      setUploadProgress(100);
      return uploadedFiles;
    } catch (e) {
      console.error("upload error", e);
      toast.error("Failed to upload file(s). Please try again.");
      return [];
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  // Chunked upload for large files
  async function uploadFileChunked(
    file: File,
  ): Promise<UploadedFileData | null> {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks (reduced from 10MB to avoid truncation)
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append("chunk", chunk);
      formData.append("chunkIndex", String(i));
      formData.append("totalChunks", String(totalChunks));
      formData.append("fileId", fileId);
      formData.append("fileName", file.name);
      formData.append("fileType", file.type || "application/octet-stream");

      // Retry logic for failed chunks
      let retries = 3;
      let success = false;
      let lastError: any = null;

      while (retries > 0 && !success) {
        try {
          const response = await fetch("/api/upload/chunk", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          success = true;

          // Update progress
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          setUploadProgress(progress);

          if (data.complete && data.files && data.files[0]) {
            console.log(`${file.name} uploaded successfully`);
            return {
              fileUrl: data.files[0].fileUrl,
              fileName: file.name,
              fileType: file.type,
            };
          }
        } catch (error) {
          lastError = error;
          retries--;
          if (retries > 0) {
            console.warn(
              `Chunk ${i + 1}/${totalChunks} failed, retrying... (${retries} attempts left)`,
            );
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        }
      }

      if (!success) {
        toast.error(
          `Failed to upload chunk ${i + 1}/${totalChunks} of ${file.name} after 3 attempts`,
        );
        console.error("Chunk upload failed:", lastError);
        return null;
      }
    }

    return null;
  }

  const handleBuzz = async () => {
    if (isBuzzing || isSubmitting || isUploading) return;
    if (!session?.user) return;
    if (!channelId && !receiverId) {
      toast.error("Select a channel or user to buzz.");
      return;
    }

    const buzzMessage = message.trim() || "Buzz!";
    const clientId = `buzz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const senderName = session.user.name || session.user.email || "Someone";
    const buzzInfo = buildBuzzNotificationData(senderName, buzzMessage);
    const optimisticMsg = {
      id: clientId,
      content: buzzInfo.systemContent,
      isBuzz: true,
      senderId: session.user.id,
      channelId: channelId || null,
      receiverId: receiverId || null,
      createdAt: new Date().toISOString(),
      sender: {
        id: session.user.id,
        name: senderName,
        email: session.user.email || "",
        image: session.user.image || null,
      },
      status: "sending",
    } as any;

    window.dispatchEvent(
      new CustomEvent("message:received", { detail: optimisticMsg }),
    );

    setIsBuzzing(true);
    try {
      let ok = false;
      if (isConnected && sendBuzz) {
        ok = await sendBuzz({
          channelId,
          receiverId,
          message: buzzMessage,
          clientId,
        });
      }
      if (!ok) {
        const res = await fetch("/api/buzz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId,
            receiverId,
            message: buzzMessage,
            clientId,
          }),
        });
        if (res.status === 429) throw new Error("Rate limited");
        ok = res.ok;
      }
      if (ok) {
        window.dispatchEvent(
          new CustomEvent("message:status-update", {
            detail: { messageId: clientId, status: "sent" },
          }),
        );
        setMessage("");
        toast.success("Buzz sent 🚀");
      } else {
        window.dispatchEvent(
          new CustomEvent("message:status-update", {
            detail: { messageId: clientId, status: "failed" },
          }),
        );
        throw new Error("Failed");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(
        e?.message === "Rate limited"
          ? "Too many buzzes. Try later."
          : "Couldn't buzz. Try again.",
      );
    } finally {
      setIsBuzzing(false);
    }
  };

  // FIXED: Check if we have content to enable submit button
  const hasContent = message.trim().length > 0 || files.length > 0;

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        "bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md p-2 sm:p-3 relative transition-all duration-200 border-t border-slate-200/80 dark:border-slate-800/80",
        isDragging &&
          "ring-4 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-opacity-50",
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-indigo-500/20 dark:bg-indigo-500/30 flex items-center justify-center z-50 rounded-2xl border-4 border-dashed border-indigo-500 border-opacity-70">
          <div className="text-center p-4 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-indigo-500 mx-2">
            <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-indigo-600 mx-auto mb-2 sm:mb-4 animate-bounce" />
            <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-1 sm:mb-2">
              Drop files to upload
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Release files anywhere in this area
            </p>
          </div>
        </div>
      )}

      {/* Reply Preview - WhatsApp Style */}
      <div className="space-y-1 sm:space-y-2 mb-1 sm:mb-2">
        {replyToMessage && (
          <div className="flex items-start gap-2 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 p-2 sm:p-2.5 border-l-4 border-indigo-600 mx-1">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">
                Replying to {replyToMessage.senderName ?? "message"}
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 break-words line-clamp-2">
                {replyToMessage.preview ?? ""}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0 -mr-1 -mt-1 rounded-full"
              onClick={() => {
                setReplyToMessage(null);
                setPinned(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* File Previews */}
      {files.length > 0 && (
        <div className="mb-2 p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs mx-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
              onClick={() => setFiles([])}
              disabled={isUploading || isSubmitting}
            >
              Clear all
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {files.map((file, index) => {
              const isImage = file.type.startsWith("image/");
              const isVideo = file.type.startsWith("video/");
              const isAudio = file.type.startsWith("audio/");
              return (
                <div key={index} className="relative flex-shrink-0 group">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    {isImage ? (
                      <img
                        src={previews[index]}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : isVideo ? (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/50">
                        <Video className="h-6 w-6 text-indigo-600" />
                      </div>
                    ) : isAudio ? (
                      <div className="w-full h-full flex items-center justify-center bg-amber-50 dark:bg-amber-950/50">
                        <Music className="h-6 w-6 text-amber-600" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                        <File className="h-6 w-6 text-slate-500" />
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      disabled={isUploading || isSubmitting}
                      className="absolute top-1 right-1 h-5 w-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                    >
                      <X className="h-3 w-3 stroke-[3]" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate rounded-b-xl">
                    {file.name}
                  </div>
                </div>
              );
            })}
          </div>
          {isUploading && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress
                value={uploadProgress}
                className="h-1.5 bg-slate-100 dark:bg-slate-800"
              />
            </div>
          )}
        </div>
      )}

      {/* AI Smart Reply Strip - channel only */}
      {aiEnabled && channelId && (
        <div className="border-b border-slate-200/80 dark:border-slate-800 mb-2">
          <AISmartReply
            channelId={channelId}
            lastMessage={lastChannelMessage}
            onSelectReply={(text) => setMessage(text)}
            enabled={smartReplyEnabled}
            onToggle={setSmartReplyEnabled}
          />
        </div>
      )}

      {/* WhatsApp-Style Input Form */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 w-full"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.zip,.mp3,svg,.gif,.csv,.json,.xml,.xlsx,exe,.apk,.dmg,.iso,.rar,.7z,.tar,.gz,.psd,.ai,.ttf,.otf,
          .epub,.mobi,.vcf,.vcf,.xlsm,.pages,.key,.numbers,.odt,.ods,.odp,.rtf,.wav,.flac,.aac,.ogg,.wma,.m4a,.mov,.wmv,.flv,.3gp,.m4v,.avchd,.ts,.mts,.m2ts,.vob,.divx,.asf,.rmvb,.mpeg,.mpg,.mpeg,.mpe,.qt,.f4v,.rm,.xvid,
          .cab,.bin,.cue,.toast,.vcd,.iso,.mdf,.nrg,.uue,.xxe,.zipx,.rar,.alz,.arc,.arj,.bz2,.bzip2,.cab,.cpio,.gz,.lzh,.lzma,.lzo,.rz,.sfark,.szip,.tar,.tbz2,.tgz,.txz,.xz,.z,.zoo,.zst,spl,sit,.sitx,"
        />

        {/* WhatsApp-style Rounded Input Box */}
        <div className="flex-1 flex items-center bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl px-2 sm:px-3 py-1 shadow-2xs focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all min-w-0">
          {/* Emoji Button */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                title="Add emoji"
              >
                <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden" align="start" side="top" sideOffset={12}>
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={300}
                height={360}
              />
            </PopoverContent>
          </Popover>

          {/* Message Input Textarea (Native without rogue borders/rings) */}
          <div className="flex-1 relative mx-1 min-w-0" ref={wrapperRef}>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                handleChange(e.target.value);
                // Auto grow textarea smoothly
                if (textareaRef.current) {
                  textareaRef.current.style.height = "auto";
                  textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
                }
              }}
              onKeyDown={(e) => {
                if (mentionOpen) {
                  if (
                    ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)
                  ) {
                    e.preventDefault();
                    if (e.key === "ArrowDown")
                      setMentionIndex((i) =>
                        Math.min(
                          i + 1,
                          Math.max(mentionCandidates.length - 1, 0),
                        ),
                      );
                    if (e.key === "ArrowUp")
                      setMentionIndex((i) => Math.max(i - 1, 0));
                    if (e.key === "Enter") {
                      const chosen = mentionCandidates[mentionIndex];
                      if (chosen) insertMention(chosen.name);
                    }
                    if (e.key === "Escape") setMentionOpen(false);
                    return;
                  }
                }

                if (e.key === "Enter" && e.shiftKey) {
                  return;
                }

                // Send message on Enter
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const hasContent =
                    message.trim().length > 0 || files.length > 0;
                  if (hasContent && !isSubmitting && !isUploading) {
                    handleSubmit();
                  }
                }
              }}
              placeholder="Message"
              rows={1}
              className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder-slate-500 text-sm leading-5 py-1 px-1.5 resize-none border-0 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-none appearance-none block min-h-[26px] max-h-[120px]"
              disabled={isSubmitting || isUploading}
            />

            {/* Mention Dropdown */}
            {mentionOpen && mentionCandidates.length > 0 && (
              <div className="absolute left-0 bottom-12 z-20 w-60 sm:w-72 max-h-48 sm:max-h-64 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                {mentionCandidates.map((m, i) => (
                  <button
                    type="button"
                    key={m.type + m.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(m.name);
                    }}
                    className={cn(
                      "w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2.5",
                      i === mentionIndex && "bg-slate-50 dark:bg-slate-800",
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {m.name}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {m.type}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Action Buttons Inside Input Pill */}
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Attachment Button (Always visible on mobile & desktop) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || isUploading}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Attach files or media"
            >
              <Paperclip className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* Buzz Button */}
            <button
              type="button"
              title="Send Buzz notification"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              onClick={handleBuzz}
              disabled={isSubmitting || isUploading || isBuzzing}
            >
              {isBuzzing ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-amber-500" />
              ) : (
                <BellRing className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
              )}
            </button>

            {/* AI Rewriter */}
            {aiEnabled && (
              <MessageRewriter
                message={message}
                onApply={(rewritten) => setMessage(rewritten)}
                disabled={isSubmitting || isUploading}
              />
            )}
          </div>
        </div>

        {/* WhatsApp-Style Circular Send Button */}
        <button
          type="submit"
          disabled={!hasContent || isSubmitting || isUploading}
          className={cn(
            "w-9 h-9 sm:w-11 sm:h-11 rounded-full flex-shrink-0 shadow-sm flex items-center justify-center transition-all duration-200 cursor-pointer",
            hasContent && !isSubmitting && !isUploading
              ? "bg-indigo-600 hover:bg-indigo-700 text-white scale-105 active:scale-95 shadow-indigo-500/25"
              : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60",
          )}
          title="Send message"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 ml-0.5 stroke-[2.5]" />
          )}
        </button>
      </form>
    </div>
  );
}
