"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Smile, CornerDownLeft, MessageSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "@/lib/socket-client";
import { useSession } from "next-auth/react";

type TaskCommentsProps = {
  taskId: string;
  comments: any[];
};

export default function TaskComments({ taskId, comments: initialComments }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(initialComments);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const { socket, isConnected, sendTaskUpdate } = useSocket();

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  useEffect(() => {
    if (!isConnected || !socket) return;

    const handleTaskUpdate = (updatedTask: any) => {
      if (updatedTask.id === taskId && updatedTask.comments) {
        setComments(updatedTask.comments);
      }
    };

    socket.on("task-updated", handleTaskUpdate);

    return () => {
      socket.off("task-updated", handleTaskUpdate);
    };
  }, [isConnected, socket, taskId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [newComment]);

  const handleEmojiClick = (emojiData: any) => {
    setNewComment((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (newComment.trim() && !isSubmitting) {
        submitComment(newComment.trim());
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && !isSubmitting) {
      submitComment(newComment.trim());
    }
  };

  const submitComment = async (contentToSend: string) => {
    setIsSubmitting(true);

    // Instant optimistic input clearing
    setNewComment("");
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch("/api/task-comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: contentToSend,
          taskId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      const newCommentData = await response.json();

      // Ensure state and textarea DOM element are 100% empty after send
      setNewComment("");
      if (textareaRef.current) {
        textareaRef.current.value = "";
        textareaRef.current.style.height = "auto";
      }

      // Update local comments list
      setComments((prev) => [newCommentData, ...prev]);

      // Send real-time socket update
      if (session?.user?.id) {
        sendTaskUpdate({
          id: taskId,
          comments: [newCommentData, ...comments],
        });
      }

      toast({
        title: "Comment Added",
        description: "Your comment has been posted successfully",
      });

      router.refresh();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setNewComment("");
      if (textareaRef.current) {
        textareaRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 overflow-hidden">
          <Textarea
            ref={textareaRef}
            placeholder="Write a comment or reply..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="w-full pr-12 pl-4 py-3 bg-transparent text-sm border-0 focus-visible:ring-0 resize-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 min-h-[60px]"
          />

          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-2">
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    type="button"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 border-none shadow-2xl rounded-2xl" align="start">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </PopoverContent>
              </Popover>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 hidden sm:inline-flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" /> Press <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">Enter</kbd> to send
              </span>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || isSubmitting}
              className="h-8 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                "Sending..."
              ) : (
                <>
                  <span>Send</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Comments Feed */}
      <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
        <AnimatePresence>
          {comments.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No discussion comments yet
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Be the first to share an update or question.
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-200 dark:hover:border-indigo-900/60 shadow-2xs transition-all"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 shrink-0 ring-1 ring-slate-200 dark:ring-slate-700">
                    <AvatarImage src={comment.user?.image || ""} alt={comment.user?.name || "User"} />
                    <AvatarFallback className="text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                      {comment.user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {comment.user?.name || "Team Member"}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={commentsEndRef} />
      </div>
    </div>
  );
}
