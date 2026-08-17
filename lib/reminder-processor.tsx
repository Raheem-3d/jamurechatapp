import { db } from "@/lib/db"
import { emitToUser } from "./socket-server"
import { sendEmail } from "./email"
import { subMinutes } from "date-fns"
import { getTaskReminderEmailHtml } from "./email-templates"

const MAX_RETRIES = 3
const LOCK_TIMEOUT_MINUTES = 5

export class ReminderProcessor {
  private static instance: ReminderProcessor
  private isProcessingBatch = false

  private constructor() {}

  static getInstance(): ReminderProcessor {
    if (!ReminderProcessor.instance) {
      ReminderProcessor.instance = new ReminderProcessor()
    }
    return ReminderProcessor.instance
  }

  // Deprecated continuous polling method maintained for backward compatibility
  start(_intervalMs = 30000) {
    console.log("ℹ️ Continuous 30-second polling is disabled. Reminders are now processed via scheduled Cron Jobs.")
  }

  stop() {
    console.log("🛑 Scheduled Reminder processor standby.")
  }

  /**
   * Scalable & Production-Ready Batch Processor:
   * 1. Query candidate due reminders (isSent: false, isMuted: false, remindAt <= now)
   * 2. Uses atomic updateMany claiming (processingAt timestamp) for multi-worker concurrency safety
   * 3. Skips DONE / CANCELLED tasks
   * 4. Retries failed email attempts up to MAX_RETRIES (3)
   * 5. Emits real-time Socket.io and In-App notifications
   */
  async processDueReminders(batchSize = 50) {
    if (this.isProcessingBatch) {
      console.log("⚠️ Batch processing already active on this process instance, skipping overlap run.")
      return { processed: 0, claimed: 0, skipped: 0, failed: 0 }
    }

    this.isProcessingBatch = true
    const now = new Date()
    const lockTimeoutCutoff = subMinutes(now, LOCK_TIMEOUT_MINUTES)

    let stats = {
      processed: 0,
      claimed: 0,
      skipped: 0,
      failed: 0,
    }

    try {
      // Find candidate due reminders
      const dueCandidates = await db.reminder.findMany({
        where: {
          remindAt: { lte: now },
          isSent: false,
          isMuted: false,
          retryCount: { lt: MAX_RETRIES },
          OR: [
            { processingAt: null },
            { processingAt: { lt: lockTimeoutCutoff } }, // Release stale locks from crashed instances
          ],
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
          assignee: {
            select: { id: true, name: true, email: true },
          },
          task: {
            select: { id: true, title: true, deadline: true, status: true },
          },
        },
        orderBy: [{ priority: "desc" }, { remindAt: "asc" }],
        take: batchSize,
      })

      if (dueCandidates.length === 0) {
        return stats
      }

      for (const reminder of dueCandidates) {
        // ATOMIC CLAIM LOCK: Prevents multiple server instances/workers from double-processing
        const claimResult = await db.reminder.updateMany({
          where: {
            id: reminder.id,
            isSent: false,
            isMuted: false,
            OR: [
              { processingAt: null },
              { processingAt: { lt: lockTimeoutCutoff } },
            ],
          },
          data: {
            processingAt: now,
          },
        })

        if (claimResult.count === 0) {
          // Another worker claimed this reminder concurrently
          continue
        }

        stats.claimed++

        try {
          // Skip & Mute reminder if the associated task is marked DONE or CANCELLED
          const taskStatus = String(reminder.task?.status || "").toUpperCase()
          if (reminder.task && ["DONE", "CANCELLED", "COMPLETED"].includes(taskStatus)) {
            await db.reminder.update({
              where: { id: reminder.id },
              data: {
                isSent: true,
                isMuted: true,
                sentAt: now,
                processingAt: null,
              },
            })
            stats.skipped++
            console.log(`🔕 Muted reminder ${reminder.id} - task "${reminder.task.title}" is ${taskStatus}`)
            continue
          }

          // Process notification and email
          await this.sendReminderNotification(reminder)

          // Mark reminder as successfully sent & release claim lock
          await db.reminder.update({
            where: { id: reminder.id },
            data: {
              isSent: true,
              sentAt: new Date(),
              processingAt: null,
              lastError: null,
            },
          })

          stats.processed++
        } catch (error: any) {
          stats.failed++
          const errorMsg = String(error?.message || error || "Unknown processing error")
          const nextRetryCount = reminder.retryCount + 1

          console.error(`❌ Failed to send reminder ${reminder.id} (Attempt ${nextRetryCount}/${MAX_RETRIES}):`, errorMsg)

          // Handle safe retry or mute if max retries exceeded
          await db.reminder.update({
            where: { id: reminder.id },
            data: {
              processingAt: null, // Release lock for safe retry on next cron cycle
              retryCount: nextRetryCount,
              lastError: errorMsg,
              isMuted: nextRetryCount >= MAX_RETRIES, // Mute if max retries exceeded
            },
          })
        }
      }
    } catch (error) {
      console.error("💥 Critical error processing due reminders batch:", error)
    } finally {
      this.isProcessingBatch = false
    }

    return stats
  }

  private async sendReminderNotification(reminder: any) {
    if (!reminder.assigneeId) return null

    try {
      // 1. In-App Notification Database Record
      const notification = await db.notification.create({
        data: {
          type: "REMINDER",
          content: `🔔 ${reminder.title}${reminder.description ? ` - ${reminder.description}` : ""}`,
          userId: reminder.assigneeId,
          taskId: reminder.taskId,
          reminderId: reminder.id,
        },
      })

      // 2. Realtime Socket.io Push Event
      emitToUser(reminder.assigneeId, "new-notification", notification)

      // 3. Email Dispatch via Nodemailer
      if (reminder.assignee?.email) {
        const emailHtml = getTaskReminderEmailHtml({
          title: reminder.title,
          description: reminder.description,
          priority: reminder.priority,
          remindAt: reminder.remindAt,
          taskTitle: reminder.task?.title,
          taskStatus: reminder.task?.status,
          deadline: reminder.task?.deadline,
          taskId: reminder.taskId || reminder.task?.id,
        })

        await sendEmail({
          to: reminder.assignee.email,
          subject: `🔔 Task Reminder: ${reminder.title}`,
          html: emailHtml,
        })
      }

      return notification
    } catch (error) {
      console.error("💥 Failed to create notification / send email:", error)
      throw error
    }
  }

  async getProcessorStatus() {
    const now = new Date()

    try {
      const [upcomingReminders, overdueReminders, automaticReminders, taskReminders, totalReminders] =
        await Promise.all([
          db.reminder.count({
            where: {
              remindAt: { gte: now },
              isSent: false,
              isMuted: false,
            },
          }),
          db.reminder.count({
            where: {
              remindAt: { lt: now },
              isSent: false,
              isMuted: false,
            },
          }),
          db.reminder.count({
            where: {
              isAutomatic: true,
              isSent: false,
            },
          }),
          db.reminder.count({
            where: {
              type: "TASK_DEADLINE",
              isSent: false,
            },
          }),
          db.reminder.count(),
        ])

      return {
        isRunning: false, // Continuous polling disabled in favor of scheduled cron
        mode: "SCHEDULED_CRON",
        upcomingReminders,
        overdueReminders,
        automaticReminders,
        taskReminders,
        totalReminders,
        lastCheck: now.toISOString(),
      }
    } catch (error: any) {
      console.error("Error getting processor status:", error)
      return {
        isRunning: false,
        mode: "SCHEDULED_CRON",
        upcomingReminders: 0,
        overdueReminders: 0,
        automaticReminders: 0,
        taskReminders: 0,
        totalReminders: 0,
        lastCheck: now.toISOString(),
        error: String(error?.message || error),
      }
    }
  }

  // Manual trigger for testing or admin panel
  async triggerManualCheck() {
    return await this.processDueReminders()
  }
}

// Export singleton instance
export const reminderProcessor = ReminderProcessor.getInstance()

export async function silenceTaskReminders(taskId: string) {
  try {
    await db.reminder.updateMany({
      where: { taskId },
      data: {
        isMuted: true,
        isSent: true,
      },
    })
    console.log(`🔕 Muted all reminders for task: ${taskId}`)
  } catch (error) {
    console.error(`Error silencing reminders for task ${taskId}:`, error)
  }
}
