import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  MessageSquare,
  Users,
  CheckSquare,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Lock,
  Smartphone,
  Layers,
  ChevronRight,
  CheckCircle2,
} from "lucide-react"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-gradient-to-b from-indigo-500/15 via-violet-500/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-48 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[300px] bg-indigo-600/10 dark:bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
                JamureChat
              </span>
            </div>
          </Link>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer"
            >
              Sign In
            </Link>
            <Link
              href="/free-trial"
              className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 shadow-md shadow-indigo-600/25 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center px-4 sm:px-6 pt-8 sm:pt-14 pb-16 max-w-6xl mx-auto w-full space-y-12 sm:space-y-16">
        
        {/* 1. Hero Section */}
        <section className="text-center space-y-5 sm:space-y-6 max-w-3xl mx-auto">
          {/* Badge Chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs animate-in fade-in slide-in-from-top-3 duration-500">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-semibold text-indigo-700 dark:text-indigo-300 tracking-wide">
              Team Communication & Tasks Platform
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            Supercharge Your <br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
              Team Collaboration
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto px-2">
            Real-time chat, task workflows, instant buzz notifications, and departmental channels — built for modern high-performance teams.
          </p>

          {/* Mobile & Desktop CTA Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 sm:pt-4 w-full max-w-md mx-auto">
            <Link
              href="/free-trial"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold text-sm sm:text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Sign In to Workspace</span>
            </Link>
          </div>

          {/* Fast Trust Indicators */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Instant Setup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>PWA Mobile Ready</span>
            </div>
          </div>
        </section>

        {/* 2. Interactive App Preview Showcase Card */}
        <section className="relative mx-auto max-w-4xl w-full">
          <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-indigo-500/5">
            {/* Top Window Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 ml-2 hidden sm:inline">
                  Jamure Workspace • #general
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </div>
            </div>

            {/* Mock Chat & Workflow Preview UI */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4">
              {/* Left Column: Sample Live Channels */}
              <div className="hidden md:block md:col-span-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/50 space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">Channels</p>
                <div className="space-y-1 text-xs">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white font-medium flex items-center justify-between shadow-xs">
                    <span className="truncate"># general</span>
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">Active</span>
                  </div>
                  <div className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 font-medium flex items-center justify-between">
                    <span className="truncate"># product-updates</span>
                  </div>
                  <div className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 font-medium flex items-center justify-between">
                    <span className="truncate"># design-team</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Chat & Task Card */}
              <div className="col-span-1 md:col-span-8 space-y-3">
                {/* Chat Bubble 1 */}
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    AR
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800/70 rounded-2xl rounded-tl-sm p-3 text-xs space-y-1 max-w-[88%]">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold text-slate-900 dark:text-white">Abdul Raheem</span>
                      <span className="text-[10px] text-slate-400">10:45 AM</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">
                      Team, the new mobile updates are ready for deployment! Check your assigned tasks.
                    </p>
                  </div>
                </div>

                {/* Embedded Task Notification in Chat */}
                <div className="ml-10 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckSquare className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate">Finalize PWA Mobile Release</p>
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Priority: High • Due Today</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] bg-indigo-600 text-white font-bold px-2 py-1 rounded-lg shadow-xs">
                    In Progress
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Core Features Grid */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Everything Your Organization Needs
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Designed for speed, clarity, and friction-free team coordination on any device.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Channels</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Organized communication streams for all departments and private focus teams.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Task Management</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Assign, track deadlines, and collaborate on task items right inside chat threads.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Direct Messaging</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Fast 1-on-1 private messaging with rich media, voice notes, and file sharing.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all space-y-3 group">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Smart Buzz & Alerts</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Send urgent priority buzzes and instant notifications that never get missed.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Numbers & Stats Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4">
          <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 text-center">
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">100%</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Real-time Sync</div>
          </div>
          <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 text-center">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">99.9%</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Reliable Uptime</div>
          </div>
          <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 text-center">
            <div className="text-2xl sm:text-3xl font-black text-violet-600 dark:text-violet-400">256-bit</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Data Security</div>
          </div>
          <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 text-center">
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">PWA</div>
            <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Mobile Native Feel</div>
          </div>
        </section>

        {/* 5. Mobile & Desktop Bottom CTA Banner */}
        <section className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-6 sm:p-10 text-white text-center space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight">
            Ready to empower your workspace?
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 max-w-lg mx-auto">
            Get started today with our free trial. Join organizations collaborating faster every day.
          </p>
          <div className="pt-2">
            <Link
              href="/free-trial"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <span>Get Started for Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <MessageSquare className="w-3 h-3" />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-200">JamureChat</span>
            <span>• © 2026 All rights reserved</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure & Encrypted Workspace</span>
          </div>
        </div>
      </footer>
    </div>
  )
}