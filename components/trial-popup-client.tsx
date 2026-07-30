"use client";

import { useState } from "react";
import { X, Zap } from "lucide-react";

export default function TrialPopupClient({
  daysLeft,
  endDateFormatted,
}: {
  daysLeft: number;
  endDateFormatted: string;
}) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 bg-white/95 dark:bg-slate-900/95 border border-amber-300 dark:border-amber-700/60 shadow-2xl rounded-2xl p-3.5 px-4 backdrop-blur-md text-slate-800 dark:text-slate-100 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
        <Zap className="h-4 w-4 fill-white" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-black text-slate-900 dark:text-white">Free Trial Active</p>
          <span className="text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            {daysLeft} days left
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
          Ends on {endDateFormatted}
        </p>
      </div>

      <button
        onClick={() => setIsVisible(false)}
        className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
