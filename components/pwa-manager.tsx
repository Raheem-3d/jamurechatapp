"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";

export function PWAManager() {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Mobile state
  const [isMobile, setIsMobile] = useState(false);

  // Notification state
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [permissionState, setPermissionState] = useState<string>("default");

  useEffect(() => {
    setMounted(true);

    const checkIsMobile = () => {
      if (typeof window === "undefined") return false;
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      return isMobileDevice || isSmallScreen;
    };

    const checkIsInstalled = () => {
      if (typeof window === "undefined") return false;
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      const storedInstalled = localStorage.getItem("jamurechat_pwa_installed") === "true";
      return isStandaloneMode || storedInstalled;
    };

    const mobileStatus = checkIsMobile();
    const installedStatus = checkIsInstalled();

    setIsMobile(mobileStatus);
    setIsStandalone(installedStatus);

    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };
    window.addEventListener("resize", handleResize);

    // 1. Register Service Worker safely
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        navigator.serviceWorker
          .register("/sw.js")
          .then(() => console.log("✅ Service Worker Registered"))
          .catch((e) => console.error("❌ SW registration failed", e));
      } catch (err) {
        console.warn("SW register error:", err);
      }
    }

    // 2. Notification Permission Check
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission);
      if (Notification.permission === "default") {
        const notifDismissed = localStorage.getItem("jamurechat_notif_dismissed");
        const shouldShowNotif =
          !notifDismissed || Date.now() - parseInt(notifDismissed, 10) > 24 * 60 * 60 * 1000;

        if (shouldShowNotif) {
          setTimeout(() => setShowNotifPrompt(true), 2500);
        }
      }
    }

    // 3. If already installed / downloaded, NEVER show install popup again
    if (installedStatus) {
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    // 4. PWA Installation setup (Mobile view only)
    const userAgent = typeof window !== "undefined" ? window.navigator.userAgent.toLowerCase() : "";
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);

    if (isIosDevice && isSafari) {
      setIsIOS(true);
    }

    const lastDismissed = typeof window !== "undefined" ? localStorage.getItem("jamurechat_pwa_dismissed") : null;
    const pwaRecentlyDismissed =
      lastDismissed && Date.now() - parseInt(lastDismissed, 10) < 3 * 24 * 60 * 60 * 1000;

    // Show popup on mobile if not recently dismissed
    if (!pwaRecentlyDismissed && mobileStatus) {
      if (isIosDevice && isSafari) {
        const timer = setTimeout(() => setShowInstallPrompt(true), 3500);
        return () => {
          clearTimeout(timer);
          window.removeEventListener("resize", handleResize);
        };
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show popup automatically if on mobile and not recently dismissed
      if (checkIsMobile() && !pwaRecentlyDismissed && !checkIsInstalled()) {
        setTimeout(() => setShowInstallPrompt(true), 3000);
      }
    };

    const handleAppInstalled = () => {
      localStorage.setItem("jamurechat_pwa_installed", "true");
      setIsStandalone(true);
      setShowInstallPrompt(false);
      setShowIOSGuide(false);
      setDeferredPrompt(null);
      console.log("✅ JamureChat PWA was installed successfully");
    };

    // Listen for manual install trigger from mobile drawer / settings
    const handleManualInstallTrigger = () => {
      if (!checkIsMobile()) return;
      if (isIosDevice && isSafari) {
        setShowIOSGuide(true);
      } else if (deferredPrompt) {
        handleInstallClick();
      } else {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("open-pwa-install", handleManualInstallTrigger);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("open-pwa-install", handleManualInstallTrigger);
    };
  }, [deferredPrompt, isIOS]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      toast.info("Tap your browser menu (⋮) and select 'Install app' or 'Add to Home Screen'");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult?.outcome === "accepted") {
        localStorage.setItem("jamurechat_pwa_installed", "true");
        setIsStandalone(true);
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
        toast.success("JamureChat app installed successfully!");
      }
    } catch (err) {
      console.error("Error triggering PWA install prompt:", err);
    }
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    setShowIOSGuide(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("jamurechat_pwa_dismissed", Date.now().toString());
    }
  };

  const handleRequestNotification = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Your browser does not support notifications");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);

      if (result === "granted") {
        setShowNotifPrompt(false);
        toast.success("✅ Notifications enabled successfully!");

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
        setShowNotifPrompt(false);
        toast.error("Notifications were blocked. You can enable them in browser settings.");
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      toast.error("Failed to request permission");
    }
  };

  const handleDismissNotif = () => {
    setShowNotifPrompt(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("jamurechat_notif_dismissed", Date.now().toString());
    }
  };

  if (!mounted) return null;

  return (
    <>
      {/* 1. Notification Permission Prompt */}
      {showNotifPrompt && permissionState === "default" && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9998] animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md border border-indigo-500/40 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
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
                onClick={handleRequestNotification}
                className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Allow
              </button>
              <button
                onClick={handleDismissNotif}
                aria-label="Dismiss notification prompt"
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PWA Install Prompt Banner (Mobile View Only) */}
      {!isStandalone && showInstallPrompt && isMobile && (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] md:hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md border border-indigo-500/30 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 p-0.5 shadow-md flex-shrink-0 flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-indigo-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                  Install JamureChat
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-medium px-1.5 py-0.5 rounded-full">
                    App
                  </span>
                </h4>
                <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                  Install on your mobile phone for faster 1-click access
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleInstallClick}
                className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install
              </button>
              <button
                onClick={handleDismissInstall}
                aria-label="Dismiss installation prompt"
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. iOS Safari Installation Guide Modal (Mobile View Only) */}
      {showIOSGuide && isMobile && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 md:hidden">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Install on iPhone / iPad</h3>
              <p className="text-xs text-slate-400 mt-1">
                Follow these 2 quick steps to add JamureChat to your Home Screen:
              </p>
            </div>

            <div className="space-y-3.5 text-xs text-slate-200">
              <div className="flex items-center gap-3 bg-slate-800/70 p-3 rounded-xl border border-slate-700/50">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 flex items-center justify-center flex-shrink-0 text-indigo-300">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <span>
                  1. Tap the <strong>Share</strong> button at the bottom of Safari.
                </span>
              </div>

              <div className="flex items-center gap-3 bg-slate-800/70 p-3 rounded-xl border border-slate-700/50">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 flex items-center justify-center flex-shrink-0 text-indigo-300">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span>
                  2. Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default PWAManager;
