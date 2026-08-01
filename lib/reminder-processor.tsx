

import { db } from "@/lib/db"
import { emitToUser } from "./socket-server"
import { sendEmail } from "./email"
import { initializeReminderSystem } from "./reminder-init"

export class ReminderProcessor {
  private static instance: ReminderProcessor
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private processingReminderIds = new Set<string>()

  private constructor() {}

  static getInstance(): ReminderProcessor {
    if (!ReminderProcessor.instance) {
      ReminderProcessor.instance = new ReminderProcessor()
    }
    return ReminderProcessor.instance
  }

  start(intervalMs = 30000) {
    // Check every 30 seconds for testing
    if (this.isRunning) {
      console.log("⚠️ Reminder processor is already running")
      return
    }

    // console.log("🚀 Starting reminder processor...")
    // console.log(`⏰ Checking for reminders every ${intervalMs / 1000} seconds`)
    this.isRunning = true

    // Run immediately
    this.processDueReminders()

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.processDueReminders()
    }, intervalMs)

    // console.log("✅ Reminder processor started successfully")
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log("🛑 Reminder processor stopped")
  }

  async processDueReminders() {
    try {
      const now = new Date()
      // console.log(`🔍 Checking for due reminders at: ${now.toLocaleString()}`)

      // Find due reminders that haven't been sent and aren't muted
      const dueReminders = await db.reminder.findMany({
        where: {
          remindAt: {
            lte: now,
          },
          isSent: false,
          isMuted: false,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              deadline: true,
              status: true,
            },
          },
        },
        orderBy: [{ priority: "desc" }, { remindAt: "asc" }],
      })

      if (dueReminders.length === 0) {
        // console.log("📭 No due reminders found")
        return
      }

      for (const reminder of dueReminders) {
    if (this.processingReminderIds.has(reminder.id)) continue;
    this.processingReminderIds.add(reminder.id);

    try {
      // Skip and mute reminders if the task is marked DONE
      if (reminder.task && reminder.task.status === "DONE") {
        await db.reminder.update({
          where: { id: reminder.id },
          data: {
            isSent: true,
            isMuted: true,
            sentAt: new Date(),
          },
        });
        console.log(`🔕 Muted reminder ${reminder.id} because task "${reminder.task.title}" is DONE`);
        continue;
      }

      await this.sendReminderNotification(reminder);
      // Mark as sent
      await db.reminder.update({
        where: { id: reminder.id },
        data: {
          isSent: true,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`❌ Failed to send reminder ${reminder.id}:`, error);
    } finally {
      // Keep in processing set for 2 minutes to prevent any duplicates
      setTimeout(() => this.processingReminderIds.delete(reminder.id), 120000);
    }
  }
    } catch (error) {
      console.error("💥 Error processing due reminders:", error)
    }
  }

  private async sendReminderNotification(reminder: any) {
    // Enhanced notification with task context
 
    

    if (reminder.task) {
          // console.log(`📋 Task: ${reminder.task.title}`)
          // console.log(`📊 Task Status: ${reminder.task.status}`)
      if (reminder.task.deadline) {
        console.log(`⏳ Task Deadline: ${reminder.task.deadline.toLocaleString()}`)
      }
    }
   

    // Create a notification record in the database
    try {
      const notification = await db.notification.create({
        data: {
          type: "REMINDER",
          content: `🔔 ${reminder.title}${reminder.description ? ` - ${reminder.description}` : ""}`,
          userId: reminder.assigneeId,
          taskId: reminder.taskId,
          reminderId: reminder.id,
        },
      })

      // console.log(`💾 Notification record created with ID: ${notification.id}`)
       const notificationEmitted = emitToUser(reminder.assigneeId, "new-notification",notification)
        try {
      const priorityColors = {
        LOW: '#10B981',
        MEDIUM: '#3B82F6',
        HIGH: '#F59E0B',
        URGENT: '#EF4444'
      };

      await sendEmail({
        to: reminder.assignee.email,
        subject: `🔔 Reminder: ${reminder.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🔔 Reminder Notification</h2>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
              <h3 style="margin-top: 0; color: #111827;">${reminder.title}</h3>
              <p><strong>Description:</strong> ${reminder.description || "No description provided"}</p>
              <p><strong>Priority:</strong> <span style="color: ${priorityColors[reminder.priority] || '#6B7280'}">
                ${reminder.priority}
              </span></p>
              <p><strong>Due:</strong> ${new Date(reminder.remindAt).toLocaleString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</p>
              ${reminder.task ? `
                <p><strong>Related Task:</strong> ${reminder.task.title} (${reminder.task.status})</p>
                ${reminder.task.deadline ? `
                  <p><strong>Task Deadline:</strong> ${new Date(reminder.task.deadline).toLocaleString()}</p>
                ` : ''}
              ` : ''}
            </div>
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              This is an automated reminder from the Task Manager system.
            </p>
          </div>
        `,
      });

  
    } catch (emailError) {
      console.error("💥 Failed to send email:", emailError);
    }


      return notification
    } catch (error) {
      console.error("💥 Failed to create notification record:", error)
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
        isRunning: this.isRunning,
        upcomingReminders,
        overdueReminders,
        automaticReminders,
        taskReminders,
        totalReminders,
        lastCheck: now.toISOString(),
      }
    } catch (error) {
      console.error("Error getting processor status:", error)
      return {
        isRunning: this.isRunning,
        upcomingReminders: 0,
        overdueReminders: 0,
        automaticReminders: 0,
        taskReminders: 0,
        totalReminders: 0,
        lastCheck: now.toISOString(),
        error: error.message,
      }
    }
  }

  // Manual trigger for testing
  async triggerManualCheck() {
    // console.log("🔧 Manual reminder check triggered...")
    await this.processDueReminders()
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

