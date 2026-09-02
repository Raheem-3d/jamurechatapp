"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NotificationsPanel } from "@/components/notifications-panel"
import { useNotifications } from "@/contexts/notifications-context"
import { Badge } from "@/components/ui/badge"

export function NotificationsButton() {
  const { unreadCount } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-8.5 w-8.5 rounded-2xl border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs cursor-pointer active:scale-95"
        >
          <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 min-w-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 md:w-96">
        <NotificationsPanel />
      </PopoverContent>
    </Popover>
  )
}
