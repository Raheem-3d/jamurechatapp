"use client";

import React, { useState, useEffect } from "react";

export function MobileSplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Check if mobile screen / mobile UA
    const checkIsMobile = () => {
      if (typeof window === "undefined") return false;
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      return isMobileUA || isSmallScreen;
    };

    const isMob = checkIsMobile();
    if (!isMob) return;

    // 2. Safe sessionStorage check
    try {
      const hasSeenSplash = sessionStorage.getItem("jamure_mobile_splash_shown");
      if (hasSeenSplash) return;
      sessionStorage.setItem("jamure_mobile_splash_shown", "true");
    } catch (err) {
      // safe fallback for restricted browsing modes
    }

    setIsVisible(true);

    // 3. Start fade out animation after 1.4s
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1400);

    // 4. Remove splash from DOM after transition completes (1.9s)
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 1900);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!mounted || !isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[99999] md:hidden flex flex-col items-center justify-between p-8 bg-[#0B0F19] text-white select-none transition-opacity duration-400 ease-out ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Top Spacing Header */}
      <div className="w-full flex justify-center pt-2">
        <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
          Workspace
        </span>
      </div>

      {/* Center Brand Identity & Crisp Vector Icon */}
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Crisp Sharp Icon Container */}
        <div className="w-20 h-20 rounded-2xl bg-[#131B2E] border border-slate-700/60 p-2.5 shadow-lg flex items-center justify-center">
          <img
            src="/icons/icon.svg"
            alt="JamureChat Logo"
            className="w-full h-full object-contain rounded-xl"
            style={{ imageRendering: "-webkit-optimize-contrast" }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/icons/icon-512x512.png";
            }}
          />
        </div>

        {/* Brand Title & Tagline */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            JamureChat
          </h1>
          <p className="text-xs text-slate-400 font-normal">
            Enterprise Team Hub & Real-time Chat
          </p>
        </div>

        {/* Clean Solid Loading Indicator */}
        <div className="pt-3 flex flex-col items-center gap-2">
          <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full w-full animate-[pulse_1.2s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="text-center pb-2">
        <p className="text-[10px] text-slate-400 tracking-wider">
          Fast • Secure • Encrypted
        </p>
      </div>
    </div>
  );
}

export default MobileSplashScreen;
