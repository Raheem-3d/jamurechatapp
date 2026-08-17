import { subscriptionScheduler } from "./subscription-scheduler"

let isInitialized = false

export function initializeReminderSystem() {
  if (isInitialized) {
    return
  }

  // Reminders are now handled asynchronously via scheduled Cron Job endpoint (/api/cron/process-reminders)
  // Start subscription scheduler (5 minutes interval)
  subscriptionScheduler.start(5 * 60 * 1000)

  isInitialized = true
}

// Auto-run subscription scheduler on server startup
if (typeof window === "undefined") {
  setTimeout(() => {
    initializeReminderSystem()
  }, 1000)
}
