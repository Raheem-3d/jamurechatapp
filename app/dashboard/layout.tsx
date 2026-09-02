"use client";

import type React from "react";
import { useSession } from "next-auth/react";
import { NotificationsProvider } from "@/contexts/notifications-context";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog } from "@/components/ui/dialog";
import { SocketProvider } from "@/lib/socket-client";
import { NavigationLoader } from "@/components/navigation-loader";
import { redirect } from "next/navigation";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MobileSidebarDrawer } from "@/components/mobile/MobileSidebarDrawer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChatPage =
    pathname?.startsWith("/dashboard/channels") ||
    pathname?.startsWith("/dashboard/messages");
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default 256px (w-64)

  // Load sidebar width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem("sidebarWidth");
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth, 10));
    }
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <SocketProvider>
      <NotificationsProvider>
        <NavigationLoader />
        <div className="flex h-screen bg-slate-50/60 dark:bg-slate-950 overflow-hidden">
          {/* Desktop Sidebar */}
          <div
            className="hidden md:flex transition-all duration-300"
            style={{
              width: isCollapsed ? 80 : sidebarWidth,
            }}
          >
            <div className="flex flex-col flex-1 min-h-0 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex-1 overflow-y-auto">
                <Sidebar
                  isCollapsed={isCollapsed}
                  setIsCollapsed={setIsCollapsed}
                  sidebarWidth={sidebarWidth}
                  setSidebarWidth={setSidebarWidth}
                />
              </div>
            </div>
          </div>

          {/* Mobile Sidebar Sheet */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-80 p-0 border-r border-slate-200/80 dark:border-slate-800 shadow-2xl">
              <MobileSidebarDrawer onClose={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Main Content Area */}
          <div className="flex flex-col flex-1 overflow-hidden bg-slate-50/60 dark:bg-slate-950 relative">
            <Header />
            <main
              className={cn(
                "flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/60 dark:bg-slate-950 flex flex-col",
                isChatPage ? "p-2 md:p-3" : "px-4 py-3 sm:px-5 sm:py-4 md:p-6 pb-24 md:pb-6",
              )}
            >
              {children}
            </main>

            {/* Native Mobile Bottom Navigation Bar */}
            <MobileBottomNav />
          </div>
        </div>
      </NotificationsProvider>
    </SocketProvider>
  );
}
