"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

export function MobileSplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 1. Check if mobile screen / mobile UA
    const checkIsMobile = () => {
      if (typeof window === "undefined") return false;
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      return isMobileUA || isSmallScreen;
    };

    const mobileDetected = checkIsMobile();
    setIsMobile(mobileDetected);

    if (!mobileDetected) {
      setIsVisible(false);
      return;
    }

    // 2. Check if splash already shown in this session
    const hasSeenSplash = sessionStorage.getItem("jamure_mobile_splash_shown");
    if (hasSeenSplash) {
      setIsVisible(false);
      return;
    }

    // Mark as shown in this session
    sessionStorage.setItem("jamure_mobile_splash_shown", "true");

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

  if (!isMobile || !isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[99999] md:hidden flex flex-col items-center justify-between p-8 bg-gradient-to-b from-slate-950 via-[#0b1120] to-slate-950 text-white select-none transition-opacity duration-500 ease-out ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background Decorative Ambient Radial Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-600/25 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-violet-600/20 rounded-full blur-[80px] pointer-events-none" />

      {/* Top Placeholder for balance */}
      <div className="w-full flex justify-end">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-400/70 bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-800/40">
          Mobile App
        </span>
      </div>

      {/* Center Brand Identity & Animated Icon */}
      <div className="flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-90 duration-700">
        {/* App Icon Container with Glowing Aura */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-3xl blur-md opacity-70 animate-pulse" />
          <div className="relative w-24 h-24 rounded-3xl bg-slate-900 border border-indigo-500/40 p-3.5 shadow-2xl flex items-center justify-center overflow-hidden">
            {/* Desktop / Mobile Brand Icon */}
            <img
              src="/Desktopicon.ico"
              alt="JamureChat Icon"
              className="w-full h-full object-contain filter drop-shadow-md animate-in zoom-in-95 duration-500"
              onError={(e) => {
                // Fallback to logolight.png or icons
                (e.target as HTMLImageElement).src = "/logolight.png";
              }}
            />
          </div>
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
            JamureChat
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Enterprise Team Hub & Communication
          </p>
        </div>

        {/* Sleek Horizontal Loading Progress Bar */}
        <div className="w-40 h-1.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/40 mt-2">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400 rounded-full animate-[pulse_1s_ease-in-out_infinite] w-full" />
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="text-center space-y-1">
        <p className="text-[11px] font-semibold text-slate-400">
          Fast • Secure • Real-time
        </p>
        <p className="text-[9px] text-slate-600">
          © 2026 Jamure Workspace
        </p>
      </div>
    </div>
  );
}

export default MobileSplashScreen;
