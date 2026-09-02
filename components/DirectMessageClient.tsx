
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import RealTimeMessages from "@/components/real-time-messages";
import MessageInput from "@/components/message-input";
import { useSocket } from "@/hooks/use-socket";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Search,
  Paperclip,
  Smile,
  Mic,
  Folder,
  ArrowLeft
} from "lucide-react";
import { SharedContentPanel } from "@/components/shared-content-panel";
import { WhatsAppMessageSearch } from "@/components/whatsapp-message-search";

type Mentionable = {
  id: string;
  name: string;
  type: "user" | "channel";
  avatarUrl?: string | null;
};

export default function DirectMessageClient({
  recipient,
  messages,
  channelId,
}: any) {
  const { onlineUsers } = useSocket();
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const isOnline = Boolean(
    recipient?.id &&
    onlineUsers &&
    (Array.isArray(onlineUsers)
      ? onlineUsers.includes(recipient.id)
      : onlineUsers instanceof Set
      ? onlineUsers.has(recipient.id)
      : typeof onlineUsers === "object"
      ? (onlineUsers as any)[recipient.id]
      : false)
  );

  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem("lastSeenMap");
    return stored ? JSON.parse(stored) : {};
  });

  const [mentionables, setMentionables] = useState<Mentionable[]>([]);
  const [loadingMentions, setLoadingMentions] = useState(false);

  useEffect(() => {
    let abort = false;
    async function loadMentionables() {
      setLoadingMentions(true);

      try {
        if (channelId) {
          const res = await fetch(
            `/api/messages/mentionables?receiverId=${encodeURIComponent(
              channelId
            )}`,
            { cache: "no-store" }
          );
          if (!res.ok) throw new Error("Failed to load mentionables");
          const data = await res.json();
       

          if (!abort) setMentionables(data.mentionables ?? []);
        }
        if (recipient) {
          const res = await fetch(
            `/api/messages/mentionables?receiverId=${encodeURIComponent(
              recipient.id
            )}`,
            { cache: "no-store" }
          );
          if (!res.ok) throw new Error("Failed to load mentionables");
          const data = await res.json();
       

          if (!abort) setMentionables(data.mentionables ?? []);
        }
      } catch (e) {
        console.error(e);
        if (!abort) {
          setMentionables([
            {
              id: recipient.id,
              name: recipient.name ?? "User",
              type: "user",
              avatarUrl: recipient.image ?? null,
            },
          ]);
        }
      } finally {
        if (!abort) setLoadingMentions(false);
      }
    }
    if (recipient?.id) loadMentionables();
    return () => {
      abort = true;
    };
  }, [recipient?.id, recipient?.name, recipient?.image]);

  useEffect(() => {
    const storedMap = localStorage.getItem("lastSeenMap");
    let initialLastSeen: string | null = null;

    if (storedMap) {
      try {
        const parsedMap = JSON.parse(storedMap);
        initialLastSeen = parsedMap[recipient.id] || null;
      } catch (e) {
        console.error("Error parsing lastSeenMap", e);
      }
    }

    if (!isOnline && lastSeenMap[recipient.id]) {
      const newLastSeenDate = new Date(lastSeenMap[recipient.id]);
      const storedLastSeenDate = initialLastSeen
        ? new Date(initialLastSeen)
        : null;
      if (!storedLastSeenDate || newLastSeenDate > storedLastSeenDate) {
        initialLastSeen = lastSeenMap[recipient.id];
      }
    }

    setLastSeen(initialLastSeen);

    if (initialLastSeen) {
      const currentMap = storedMap ? JSON.parse(storedMap) : {};
      localStorage.setItem(
        "lastSeenMap",
        JSON.stringify({ ...currentMap, [recipient.id]: initialLastSeen })
      );
    }
  }, [recipient.id, isOnline, lastSeenMap]);

  const lastSeenText = lastSeen
    ? formatDistanceToNow(new Date(lastSeen), {
        addSuffix: true,
        includeSeconds: false,
      })
    : null;

  const [showSharedMediaPanel, setShowSharedMediaPanel] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-4", "ring-indigo-500", "bg-indigo-100/60", "dark:bg-indigo-900/50", "rounded-2xl", "transition-all", "duration-500");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-indigo-500", "bg-indigo-100/60", "dark:bg-indigo-900/50", "rounded-2xl");
      }, 2500);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full w-full bg-white dark:bg-slate-900 md:rounded-2xl md:border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs relative">
      {/* Header - Fixed & Pinned at Top on Mobile & Desktop */}
      <div className="shrink-0 sticky top-0 z-30 px-3 sm:px-5 py-2.5 sm:py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs select-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
          {/* Back to Chats on Mobile */}
          <Link
            href="/dashboard/chats"
            className="p-1.5 -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 md:hidden flex items-center justify-center cursor-pointer shrink-0"
            title="Back to Chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none min-w-0"
            onClick={() => setShowSharedMediaPanel(true)}
            title="Click to view shared media, docs & links"
          >
            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-indigo-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <AvatarImage
                src={recipient.image || ""}
                alt={recipient.name || ""}
              />
              <AvatarFallback className="bg-indigo-600 text-white font-bold text-sm">
                {recipient.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {recipient.name}
                </h2>
                {recipient.department && (
                  <Badge
                    variant="secondary"
                    className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[9px] px-1.5 py-0 hidden sm:inline-flex border-0"
                  >
                    {recipient.department.name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
                />
                <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] font-medium truncate">
                  {isOnline ? "online" : lastSeenText ? `last seen ${lastSeenText}` : "offline"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/80 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-all border border-slate-200/60 dark:border-slate-700/60 shadow-xs cursor-pointer"
            title="Search Messages"
          >
            <Search className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline sm:ml-1.5">Search</span>
          </button>

          <button
            onClick={() => setShowSharedMediaPanel(true)}
            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/80 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-all border border-slate-200/60 dark:border-slate-700/60 shadow-xs cursor-pointer"
            title="Shared Media, Docs & Links"
          >
            <Folder className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline sm:ml-1.5">Shared Content</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Message Search Modal */}
      <WhatsAppMessageSearch
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        receiverId={recipient.id}
        onJumpToMessage={handleJumpToMessage}
      />

      {/* Shared Content Panel */}
      <SharedContentPanel
        isOpen={showSharedMediaPanel}
        onClose={() => setShowSharedMediaPanel(false)}
        receiverId={recipient.id}
        recipientName={recipient.name}
      />

      {/* Messages Area - Independently Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-slate-50/50 dark:bg-slate-950/40">
        <RealTimeMessages
          initialMessages={messages}
          receiverId={recipient.id}
          onlineUsers={onlineUsers}
        />
      </div>

      {/* Input Area - Fixed Above Keyboard */}
      <div className="shrink-0 sticky bottom-0 z-20 bg-[#f0f2f5] dark:bg-[#111b21] p-2.5 sm:p-3 border-t border-slate-200/80 dark:border-slate-800 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <MessageInput
          channelId={undefined}
          receiverId={recipient.id}
          mentionables={mentionables}
        />
      </div>
    </div>
  );
}



