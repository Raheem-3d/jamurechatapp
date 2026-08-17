"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { BellRing, ExternalLink, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type BuzzPayload = {
  channelId?: string;
  fromUserId?: string;
  userId?: string;
  senderName?: string;
  message?: string;
  title?: string;
};

export function BuzzOverlay() {
  const [activeBuzz, setActiveBuzz] = useState<BuzzPayload | null>(null);
  const router = useRouter();
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play synthesized buzzer sound via Web Audio API
  const playSynthBuzzer = () => {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3); // Drop to A4

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (err) {
      console.warn("Synth audio error:", err);
    }
  };

  const handleTriggerBuzz = (payload: BuzzPayload) => {
    console.log("🚨 BuzzOverlay triggered:", payload);
    setActiveBuzz(payload);

    // 1. Play audio chime
    playSynthBuzzer();
    try {
      const audio = new Audio("/sounds/buzz.mp3");
      audio.play().catch(() => {});
    } catch {}
  };

  useEffect(() => {
    // Listen for custom event from socket-client
    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        handleTriggerBuzz(detail);
      }
    };

    window.addEventListener("buzz:received", handleCustomEvent);

    // Listen for Electron IPC if available
    const electronAPI = (window as any).electronAPI;
    let removeListener: (() => void) | null = null;
    if (electronAPI?.onBuzzPopup) {
      removeListener = electronAPI.onBuzzPopup((data: BuzzPayload) => {
        handleTriggerBuzz(data);
      });
    }

    return () => {
      window.removeEventListener("buzz:received", handleCustomEvent);
      if (removeListener) removeListener();
    };
  }, []);

  if (!activeBuzz) return null;

  const targetUserId = activeBuzz.userId || activeBuzz.fromUserId;
  const targetChannelId = activeBuzz.channelId;

  const handleOpenChat = () => {
    setActiveBuzz(null);
    if (targetChannelId) {
      router.push(`/dashboard/channels/${targetChannelId}`);
    } else if (targetUserId) {
      router.push(`/dashboard/messages/${targetUserId}`);
    } else {
      router.push("/dashboard");
    }
  };

  const handleDismiss = () => {
    setActiveBuzz(null);
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <style jsx global>{`
        @keyframes buzzShake {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          15% {
            transform: translate(-6px, -4px) rotate(-1.5deg);
          }
          30% {
            transform: translate(6px, 4px) rotate(1.5deg);
          }
          45% {
            transform: translate(-5px, 3px) rotate(-1deg);
          }
          60% {
            transform: translate(5px, -3px) rotate(1deg);
          }
          75% {
            transform: translate(-3px, -2px) rotate(-0.5deg);
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
        }
        .buzz-shake {
          animation: buzzShake 0.4s ease-in-out infinite;
        }
      `}</style>

      <div className="relative w-full max-w-md bg-[#111b21] dark:bg-[#111b21] border-2 border-red-500/80 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.5)] buzz-shake text-white flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Pulsing Icon */}
        <div className="relative mb-4">
          <div className="absolute -inset-3 rounded-full bg-red-500/30 animate-ping" />
          <div className="relative h-16 w-16 bg-red-500/20 border border-red-500/50 rounded-full flex items-center justify-center text-red-500">
            <BellRing className="h-8 w-8 animate-bounce" />
          </div>
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          Urgent Buzz Alert
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {activeBuzz.title ||
            (activeBuzz.senderName
              ? `Buzz from ${activeBuzz.senderName}!`
              : "High-Priority Buzz!")}
        </h2>

        <p className="text-gray-300 text-sm mb-6 max-w-xs">
          {activeBuzz.message && activeBuzz.message !== "Buzz!"
            ? `${activeBuzz.senderName || "Someone"}: ${activeBuzz.message}`
            : `${activeBuzz.senderName || "Someone"} is trying to get your attention immediately!`}
        </p>

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="flex-1 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Dismiss
          </Button>
          <Button
            onClick={handleOpenChat}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
          >
            <ExternalLink className="h-4 w-4" />
            Open Chat
          </Button>
        </div>
      </div>
    </div>
  );
}
