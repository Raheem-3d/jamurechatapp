
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import RealTimeMessages from "@/components/real-time-messages";
import MessageInput from "@/components/message-input";
import { useSocket } from "@/hooks/use-socket";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Search,
  Paperclip,
  Smile,
  Mic
} from "lucide-react";

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
  const isOnline = onlineUsers.includes(recipient?.id);

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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
      {/* Header - Sleek Enterprise Bar */}
      <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-indigo-500/20 shrink-0">
            <AvatarImage
              src={recipient.image || ""}
              alt={recipient.name || ""}
            />
            <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-sm">
              {recipient.name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                {recipient.name}
              </h2>
              {recipient.department && (
                <Badge
                  variant="secondary"
                  className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] px-2 py-0.5"
                >
                  {recipient.department.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                {isOnline ? "Online" : lastSeenText ? `Last seen ${lastSeenText}` : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/40">
        <RealTimeMessages
          initialMessages={messages}
          receiverId={recipient.id}
          onlineUsers={onlineUsers}
        />
      </div>

      {/* Input Area - WhatsApp Style */}
      <div className="bg-[#f0f2f5] dark:bg-[#111b21] p-3 border-t border-slate-200/80 dark:border-slate-800">
        <MessageInput
          channelId={undefined}
          receiverId={recipient.id}
          mentionables={mentionables}
        />
      </div>
    </div>
  );
}



