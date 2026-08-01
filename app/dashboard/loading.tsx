import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] w-full p-6 space-y-4">
      {/* Centered Loading Spinner Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center text-center max-w-sm w-full space-y-3">
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 animate-pulse">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Loading Content...
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Please wait while we fetch the latest page data.
          </p>
        </div>
      </div>
    </div>
  );
}
