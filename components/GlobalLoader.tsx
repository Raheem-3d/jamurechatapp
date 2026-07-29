"use client";

import { useLoadingStore } from "@/app/stores/useLoadingStore";

export default function GlobalLoader() {
  const count = useLoadingStore((s) => s.count);

  if (count === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 dark:bg-black/40 backdrop-blur-sm pointer-events-none">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
        {/* Animated Spinner */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-gray-100 dark:border-gray-700"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500 dark:border-t-blue-400 dark:border-r-blue-400 animate-spin"></div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Loading
          </p>
          <div className="flex gap-1">
            <span 
              className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce" 
              style={{ animationDelay: "0ms" }}
            ></span>
            <span 
              className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce" 
              style={{ animationDelay: "150ms" }}
            ></span>
            <span 
              className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce" 
              style={{ animationDelay: "300ms" }}
            ></span>
          </div>
        </div>
      </div>
    </div>
  );
}
