"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Global channel/navigation loader that shows when transitioning between pages
 * Automatically displays based on route changes
 */
export function ChannelLoader() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Show loader immediately on route change
    setIsLoading(true);

    // Hide loader after page has loaded (or after timeout)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/5 dark:bg-black/20 backdrop-blur-xs z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 animate-fadeIn">
        {/* Animated Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-900"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500 dark:border-t-blue-400 dark:border-r-blue-400 animate-spin"></div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Loading channel
          </p>
          <div className="flex gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }}></span>
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }}></span>
          </div>
        </div>
      </div>
    </div>
  );
}
