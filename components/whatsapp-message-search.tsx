"use client";

import { useState, useEffect, useRef } from "react";
import { format, formatDistanceToNow, subDays, startOfWeek, startOfMonth } from "date-fns";
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Film,
  FileText,
  Link as LinkIcon,
  Music,
  MessageSquare,
  Filter,
  Loader2,
  ExternalLink,
  Calendar as CalendarIcon,
  RotateCcw,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface WhatsAppMessageSearchProps {
  isOpen: boolean;
  onClose: () => void;
  channelId?: string;
  receiverId?: string;
  onJumpToMessage: (messageId: string) => void;
}

export function WhatsAppMessageSearch({
  isOpen,
  onClose,
  channelId,
  receiverId,
  onJumpToMessage,
}: WhatsAppMessageSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "photos" | "videos" | "docs" | "links" | "audio" | "text"
  >("all");
  const [datePreset, setDatePreset] = useState<"any" | "today" | "yesterday" | "week" | "month" | "custom">("any");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle Date Presets
  const applyDatePreset = (preset: "any" | "today" | "yesterday" | "week" | "month" | "custom") => {
    setDatePreset(preset);
    const now = new Date();
    const formatDateStr = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "any") {
      setStartDate("");
      setEndDate("");
      setShowDatePicker(false);
    } else if (preset === "today") {
      const todayStr = formatDateStr(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
      setShowDatePicker(false);
    } else if (preset === "yesterday") {
      const yestStr = formatDateStr(subDays(now, 1));
      setStartDate(yestStr);
      setEndDate(yestStr);
      setShowDatePicker(false);
    } else if (preset === "week") {
      setStartDate(formatDateStr(startOfWeek(now, { weekStartsOn: 1 })));
      setEndDate(formatDateStr(now));
      setShowDatePicker(false);
    } else if (preset === "month") {
      setStartDate(formatDateStr(startOfMonth(now)));
      setEndDate(formatDateStr(now));
      setShowDatePicker(false);
    } else if (preset === "custom") {
      setShowDatePicker(true);
    }
  };

  // Fetch search results from backend API
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function performSearch() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (channelId) queryParams.set("channelId", channelId);
        if (receiverId) queryParams.set("receiverId", receiverId);
        if (searchQuery.trim()) queryParams.set("q", searchQuery.trim());
        if (activeFilter !== "all") queryParams.set("filter", activeFilter);
        if (startDate) queryParams.set("startDate", startDate);
        if (endDate) queryParams.set("endDate", endDate);

        const res = await fetch(`/api/messages/search?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Search request failed");
        const data = await res.json();

        if (isMounted) {
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, channelId, receiverId, searchQuery, activeFilter, startDate, endDate]);

  // Cycle navigation
  const handleNext = () => {
    if (results.length === 0) return;
    const nextIdx = (selectedIndex + 1) % results.length;
    setSelectedIndex(nextIdx);
    if (results[nextIdx]) {
      onJumpToMessage(results[nextIdx].id);
    }
  };

  const handlePrev = () => {
    if (results.length === 0) return;
    const prevIdx = (selectedIndex - 1 + results.length) % results.length;
    setSelectedIndex(prevIdx);
    if (results[prevIdx]) {
      onJumpToMessage(results[prevIdx].id);
    }
  };

  const handleResultClick = (idx: number, msgId: string) => {
    setSelectedIndex(idx);
    onJumpToMessage(msgId);
  };

  // Helper to highlight matching text in snippet
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-300 dark:bg-amber-700 text-slate-900 dark:text-white px-1 rounded font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const filterChips: { id: any; label: string; icon: any }[] = [
    { id: "all", label: "All", icon: Filter },
    { id: "photos", label: "Photos", icon: ImageIcon },
    { id: "videos", label: "Videos", icon: Film },
    { id: "docs", label: "Docs", icon: FileText },
    { id: "links", label: "Links", icon: LinkIcon },
    { id: "audio", label: "Audio", icon: Music },
    { id: "text", label: "Text", icon: MessageSquare },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden max-w-xl sm:max-w-2xl w-[95vw]">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Datewise Message Search
            </DialogTitle>

            {/* Results Navigation Counter */}
            {results.length > 0 && (
              <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">
                  {selectedIndex + 1} of {results.length}
                </span>
                <button
                  onClick={handlePrev}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Previous match (Up)"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Next match (Down)"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Real-time Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword, file name, link, or sender..."
              className="h-10 pl-10 pr-9 rounded-2xl text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Datewise Search Quick Presets */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                <CalendarIcon className="h-3.5 w-3.5 text-indigo-500" />
                Date:
              </span>
              {[
                { id: "any", label: "Any Time" },
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "week", label: "This Week" },
                { id: "month", label: "This Month" },
                { id: "custom", label: "Custom Range" },
              ].map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => applyDatePreset(p.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all border shadow-2xs",
                    datePreset === p.id
                      ? "bg-amber-500 text-white border-amber-500 shadow-amber-500/20"
                      : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Picker */}
            {(showDatePicker || datePreset === "custom") && (
              <div className="flex items-center gap-2 bg-amber-50/80 dark:bg-amber-950/40 p-2.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs">
                <div className="flex-1 flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 shrink-0">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-8 px-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium"
                  />
                </div>
                <div className="flex-1 flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 shrink-0">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-8 px-2 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => applyDatePreset("any")}
                    className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg shrink-0"
                    title="Clear date filter"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* WhatsApp-Style Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {filterChips.map((chip) => {
              const Icon = chip.icon;
              const isActive = activeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border shadow-2xs",
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20"
                      : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Results List */}
        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Searching messages...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">No Messages Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                {searchQuery || startDate || endDate
                  ? "No matches found for your search query and date range filter."
                  : "Type a keyword above or select a date range to search messages."}
              </p>
            </div>
          ) : (
            results.map((msg, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={msg.id}
                  onClick={() => handleResultClick(idx, msg.id)}
                  className={cn(
                    "p-3.5 rounded-2xl transition-all cursor-pointer border flex flex-col gap-2 group",
                    isSelected
                      ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 shadow-md ring-2 ring-indigo-500/20"
                      : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={msg.sender?.image} />
                        <AvatarFallback className="text-[9px] bg-indigo-600 text-white font-bold">
                          {msg.sender?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {renderHighlightedText(msg.sender?.name || "User", searchQuery)}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        • {format(new Date(msg.createdAt), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[10px] uppercase font-extrabold px-1.5 py-0 h-4 bg-white dark:bg-slate-900">
                        {msg.matchType || "text"}
                      </Badge>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>

                  {/* Snippet Content */}
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-3 bg-white/70 dark:bg-slate-950/70 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 break-words">
                    {msg.content
                      ? renderHighlightedText(msg.content, searchQuery)
                      : msg.fileName
                      ? renderHighlightedText(`📎 File: ${msg.fileName}`, searchQuery)
                      : "Attachment"}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
