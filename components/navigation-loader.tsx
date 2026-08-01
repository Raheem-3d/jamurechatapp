"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  // Hide loader when pathname or searchParams change (navigation finished)
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  // Global click listener for <a> and <button> page navigations
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, mailto, tel, anchor hashes, or opening in new tab
      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        target.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey
      ) {
        return;
      }

      // If navigating to a different pathname, trigger instant loading indicator
      const targetPath = href.split("?")[0].split("#")[0];
      const currentPath = window.location.pathname;

      if (targetPath !== currentPath) {
        setLoading(true);
      }
    };

    document.addEventListener("click", handleAnchorClick, true);
    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[99999] pointer-events-none">
      {/* Top Animated Gradient Bar */}
      <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-[loading-bar_1.5s_infinite_linear] origin-left" />
      </div>

      {/* Top Right Floating Badge Indicator */}
      <div className="absolute top-3 right-4 sm:right-6 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 dark:bg-slate-800/90 text-white text-xs font-bold shadow-xl border border-slate-700/80 backdrop-blur-md">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
          <span>Loading page...</span>
        </div>
      </div>

      {/* Inline animation keyframes style */}
      <style jsx global>{`
        @keyframes loading-bar {
          0% {
            transform: translateX(-100%) scaleX(0.2);
          }
          50% {
            transform: translateX(0%) scaleX(0.6);
          }
          100% {
            transform: translateX(100%) scaleX(0.2);
          }
        }
      `}</style>
    </div>
  );
}
