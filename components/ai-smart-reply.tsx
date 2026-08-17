"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, X, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AISmartReplyProps {
  channelId: string;
  lastMessage?: string;
  onSelectReply: (text: string) => void;
  enabled: boolean;
  onToggle: (val: boolean) => void;
}

export default function AISmartReply({
  channelId,
  lastMessage,
  onSelectReply,
  enabled,
  onToggle,
}: AISmartReplyProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetchedMsg, setLastFetchedMsg] = useState<string>("");

  const fetchSuggestions = async () => {
    if (!channelId || !enabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/suggest-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get suggestions");
      }
      const data = await res.json();
      // Normalize: API returns suggestions array
      const rawSuggs: any = data.suggestions || data.response || [];
      let parsed: string[] = [];
      if (Array.isArray(rawSuggs)) {
        parsed = rawSuggs.filter((s: any) => typeof s === "string" && s.trim()).slice(0, 3);
      } else if (typeof rawSuggs === "string") {
        try {
          const arr = JSON.parse(rawSuggs);
          if (Array.isArray(arr)) parsed = arr.slice(0, 3);
        } catch {
          parsed = [rawSuggs];
        }
      }
      setSuggestions(parsed.length > 0 ? parsed : ["Got it!", "On it!", "Thanks for the update!"]);
      setLastFetchedMsg(lastMessage || "");
    } catch (e: any) {
      toast.error("Smart reply: " + e.message);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when a new message arrives and feature is enabled
  useEffect(() => {
    if (enabled && lastMessage && lastMessage !== lastFetchedMsg) {
      fetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage, enabled]);

  // Fetch on first enable
  useEffect(() => {
    if (enabled && suggestions.length === 0) {
      fetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) {
    return (
      <button
        onClick={() => onToggle(true)}
        className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors font-semibold group px-2 py-1 rounded-lg hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30"
        title="Enable AI smart replies"
      >
        <Sparkles className="h-3 w-3 group-hover:text-indigo-500" />
        AI Replies
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 py-1.5 px-2 flex-wrap">
      {/* Label */}
      <div className="flex items-center gap-1 text-[10px] text-indigo-500 dark:text-indigo-400 font-bold shrink-0">
        <Sparkles className="h-3 w-3" />
        <span>Suggested</span>
      </div>

      {/* Suggestions */}
      {loading ? (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Thinking...</span>
        </div>
      ) : (
        <>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                onSelectReply(s);
                setSuggestions([]);
                onToggle(false);
              }}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full border transition-all duration-150 font-medium",
                "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700",
                "text-slate-700 dark:text-slate-300",
                "hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300",
                "flex items-center gap-1"
              )}
            >
              <ChevronRight className="h-2.5 w-2.5 text-indigo-400" />
              {s}
            </button>
          ))}
          {/* Refresh */}
          <button
            onClick={fetchSuggestions}
            className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
            title="Refresh suggestions"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </>
      )}

      {/* Close */}
      <button
        onClick={() => {
          onToggle(false);
          setSuggestions([]);
        }}
        className="ml-auto h-5 w-5 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
        title="Dismiss AI replies"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
