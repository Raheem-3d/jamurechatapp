"use client";

import { useState, useEffect, useRef } from "react";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
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
    onClose();
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
      <DialogContent className="w-[94vw] max-w-[94vw] sm:max-w-xl md:max-w-2xl max-h-[88vh] sm:max-h-[85vh] rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden flex flex-col [&>button]:hidden">
        {/* Header Section */}
        <DialogHeader className="p-3 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 sm:space-y-3 shrink-0">
          {/* Top Title & Controls Row */}
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 truncate">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">Datewise Message Search</span>
            </DialogTitle>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Results Navigation Counter */}
              {results.length > 0 && (
                <div className="flex items-center gap-0.5 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 px-1.5 whitespace-nowrap">
                    {selectedIndex + 1}/{results.length}
                  </span>
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Previous match (Up)"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Next match (Down)"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors shrink-0 cursor-pointer"
                title="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword, sender, file name, links..."
              className="h-9 sm:h-10 pl-9 pr-8 rounded-xl sm:rounded-2xl text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Datewise Search Quick Presets (Scrollable) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 no-scrollbar scroll-smooth">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                <CalendarIcon className="h-3 w-3 text-indigo-500" />
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
                  type="button"
                  onClick={() => applyDatePreset(p.id)}
                  className={cn(
                    "px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold shrink-0 transition-all border shadow-2xs active:scale-95 cursor-pointer",
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
              <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 bg-amber-50/80 dark:bg-amber-950/30 p-2 sm:p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-800/50 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 dark:text-amber-300 shrink-0 w-8">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-7 sm:h-8 px-2 rounded-lg text-[11px] sm:text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 dark:text-amber-300 shrink-0 w-8">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-7 sm:h-8 px-2 rounded-lg text-[11px] sm:text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => applyDatePreset("any")}
                    className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg self-center xs:self-auto shrink-0 flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    title="Reset date filter"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="xs:hidden">Reset</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* WhatsApp-Style Filter Chips */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 no-scrollbar scroll-smooth">
            {filterChips.map((chip) => {
              const Icon = chip.icon;
              const isActive = activeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveFilter(chip.id)}
                  className={cn(
                    "flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold shrink-0 transition-all border shadow-2xs active:scale-95 cursor-pointer",
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-500/20"
                      : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {chip.label}
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Results List Section */}
        <div className="flex-1 p-2.5 sm:p-4 space-y-2 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 sm:py-16 gap-3">
              <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Searching messages...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center rounded-2xl sm:rounded-3xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
              <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
                <Search className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mb-1">No Messages Found</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-xs">
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
                    "p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer border flex flex-col gap-1.5 sm:gap-2 group active:scale-[0.99]",
                    isSelected
                      ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 shadow-xs ring-1 sm:ring-2 ring-indigo-500/20"
                      : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-5 w-5 sm:h-6 sm:w-6 shrink-0">
                        <AvatarImage src={msg.sender?.image} />
                        <AvatarFallback className="text-[8px] sm:text-[9px] bg-indigo-600 text-white font-bold">
                          {msg.sender?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {renderHighlightedText(msg.sender?.name || "User", searchQuery)}
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium whitespace-nowrap">
                        • {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] uppercase font-extrabold px-1.5 py-0 h-4 bg-white dark:bg-slate-900">
                        {msg.matchType || "text"}
                      </Badge>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors hidden sm:inline" />
                    </div>
                  </div>

                  {/* Snippet Content */}
                  <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2 sm:line-clamp-3 bg-white/70 dark:bg-slate-950/70 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-100 dark:border-slate-800/80 break-words">
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

export default WhatsAppMessageSearch;
