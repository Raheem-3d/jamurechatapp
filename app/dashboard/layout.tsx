"use client";

import type React from "react";

import { useSession } from "next-auth/react";
import { NotificationsProvider } from "@/contexts/notifications-context";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog } from "@/components/ui/dialog";
import { SocketProvider } from "@/lib/socket-client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChatPage = pathname?.startsWith("/dashboard/channels") || pathname?.startsWith("/dashboard/messages");
  const { data: session, status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default 256px (w-64)

  // Initialize Socket.io connection handled by SocketProvider below

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
        <div className="flex h-screen bg-slate-50/60 dark:bg-slate-950">
          {/* Desktop Sidebar */}
          <div
            className="hidden md:flex transition-all duration-300"
            style={{
              width: isCollapsed ? 80 : sidebarWidth,
            }}
          >
            {/* ✅ Use isCollapsed here */}
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

          {/* Mobile Sidebar */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <Dialog>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto">
                    <Sidebar />
                  </div>
                </div>
              </SheetContent>
            </Dialog>
          </Sheet>

          {/* Main Content */}
          <div className="flex flex-col flex-1 overflow-hidden bg-slate-50/60 dark:bg-slate-950">
            <div className=" md:hidden flex items-center justify-between p-4 border-b bg-card">
              {/* <Dialog>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Dialog> */}
            </div>
            <Header />
            <main className={cn("flex-1 overflow-auto bg-slate-50/60 dark:bg-slate-950 flex flex-col", isChatPage ? "p-2 md:p-3" : "p-4 md:p-6")}>
              {children}
            </main>
          </div>
        </div>
      </NotificationsProvider>
    </SocketProvider>
  );
}
