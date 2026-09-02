"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellRing, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    setPermissionState(Notification.permission);

    // If permission is already granted or denied, don't show the prompt
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      return;
    }

    // Check if user dismissed recently (within 24 hours)
    const dismissedTime = localStorage.getItem("jamurechat_notif_dismissed");
    if (dismissedTime) {
      const diff = Date.now() - parseInt(dismissedTime, 10);
      if (diff < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Show prompt after 2 seconds of entering the app
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Your browser does not support notifications");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);

      if (result === "granted") {
        setShowPrompt(false);
        toast.success("✅ Notifications enabled successfully!");

        // Show instant test notification via Service Worker (Works on Mobile Android + Desktop)
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("🔔 JamureChat Notifications Active", {
            body: "You will now receive instant message & task alerts on your phone!",
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-192x192.png",
            vibrate: [200, 100, 200],
            tag: "welcome-notification",
            data: { url: "/dashboard" },
          } as any);
        } else {
          new Notification("🔔 JamureChat Notifications Active", {
            body: "You will now receive instant message & task alerts on your phone!",
            icon: "/icons/icon-192x192.png",
          });
        }
      } else if (result === "denied") {
        setShowPrompt(false);
        toast.error("Notifications were blocked. You can enable them in browser settings.");
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      toast.error("Failed to request permission");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("jamurechat_notif_dismissed", Date.now().toString());
  };

  if (!showPrompt || permissionState !== "default") {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9998] animate-in fade-in slide-in-from-top-5 duration-300">
      <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md border border-indigo-500/40 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
              Enable Notifications
            </h4>
            <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
              Get instant message alerts & buzz notifications on your phone
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleRequestPermission}
            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            Allow
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss notification prompt"
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
