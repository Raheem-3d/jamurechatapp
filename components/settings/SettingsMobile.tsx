"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import {
  User,
  Settings,
  Shield,
  Bell,
  BellOff,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Building,
  Mail,
  CheckCircle2,
  Lock,
  Sparkles,
  Smartphone,
  ExternalLink,
  Info,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import ProfileSettings from "@/components/profile-settings";
import AdminSettings from "@/components/admin-settings";
import NotificationSettings from "@/components/notification-settings";
import { OrgAdminMobile } from "@/components/admin/OrgAdminMobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SettingsMobileProps {
  user: any;
  isAdmin: boolean;
}

export function SettingsMobile({ user, isAdmin }: SettingsMobileProps) {
  const { theme, setTheme } = useTheme();
  const [activeSheet, setActiveSheet] = useState<"profile" | "admin" | "notifications" | "security" | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="flex flex-col gap-4 pb-20 w-full">
      {/* 1. Profile Hero Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0 overflow-hidden">
            {user?.image ? (
              <img src={user.image} alt={user.name || "Avatar"} className="w-full h-full object-cover" />
            ) : (
              userInitial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {user?.name || "Workspace Member"}
              </h2>
              {isAdmin && (
                <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[9px] px-1.5 py-0 border-0">
                  Admin
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
              {user?.email}
            </p>
            {user?.department?.name && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                <Building className="w-3 h-3" /> {user.department.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Group: Account & Profile */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
          Account & Credentials
        </p>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
          <button
            onClick={() => setActiveSheet("profile")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Personal Profile</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Avatar, name & email</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => setActiveSheet("notifications")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800 transition-colors text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Notification Preferences</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Alerts, buzz & sound</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* 3. Group: Appearance & Interface */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
          Appearance & App
        </p>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                {theme === "dark" ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Dark Theme</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {theme === "dark" ? "Dark mode active" : "Light mode active"}
                </p>
              </div>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              className="data-[state=checked]:bg-indigo-600"
            />
          </div>

          <div className="flex items-center justify-between p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">PWA Native Mode</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Enabled & Installed</p>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* 4. Group: Organization & Admin (if privileged) */}
      {isAdmin && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
            Workspace Administration
          </p>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <button
              onClick={() => setActiveSheet("admin")}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Admin Management</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Departments, roles & organization</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Group: Actions / Sign Out */}
      <div className="pt-2">
        <button
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200/80 dark:border-rose-900/50 text-xs font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Jamure</span>
        </button>
      </div>

      {/* Profile Modal Sheet */}
      <Dialog open={activeSheet === "profile"} onOpenChange={(open) => !open && setActiveSheet(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-left mb-2">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              Personal Profile
            </DialogTitle>
          </DialogHeader>
          <ProfileSettings user={user} />
        </DialogContent>
      </Dialog>

      {/* Notification Modal Sheet */}
      <Dialog open={activeSheet === "notifications"} onOpenChange={(open) => !open && setActiveSheet(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-left mb-2">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-purple-500" />
              Notification Settings
            </DialogTitle>
          </DialogHeader>
          <NotificationSettings />
        </DialogContent>
      </Dialog>

      {/* Full-Screen Dedicated Mobile Organization Administration Screen */}
      {isAdmin && activeSheet === "admin" && (
        <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
          <OrgAdminMobile onBack={() => setActiveSheet(null)} />
        </div>
      )}

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <DialogContent className="max-w-xs w-[90vw] rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <LogOut className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Sign Out</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Are you sure you want to sign out of your Jamure workspace session?
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSignOutConfirm(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SettingsMobile;
