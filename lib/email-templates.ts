/**
 * JamureChat Premium Email Design System
 * Modern, responsive, table-based HTML email templates compatible with Gmail, Outlook, Apple Mail & Mobile.
 */

interface PriorityStyle {
  bg: string
  text: string
  border: string
  label: string
}

function getPriorityBadge(priority?: string): PriorityStyle {
  const p = String(priority || "MEDIUM").toUpperCase()
  switch (p) {
    case "URGENT":
      return { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5", label: "🔥 URGENT" }
    case "HIGH":
      return { bg: "#fff7ed", text: "#c2410c", border: "#ffedd5", label: "⚡ HIGH" }
    case "LOW":
      return { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", label: "🟢 LOW" }
    case "MEDIUM":
    default:
      return { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", label: "🔷 MEDIUM" }
  }
}

function getStatusBadge(status?: string): { bg: string; text: string; label: string } {
  const s = String(status || "TODO").toUpperCase()
  switch (s) {
    case "DONE":
    case "COMPLETED":
      return { bg: "#dcfce7", text: "#166534", label: "✓ DONE" }
    case "IN_PROGRESS":
      return { bg: "#e0f2fe", text: "#0369a1", label: "⏳ IN PROGRESS" }
    case "BLOCKED":
      return { bg: "#fee2e2", text: "#991b1b", label: "🚫 BLOCKED" }
    case "TODO":
    default:
      return { bg: "#f1f5f9", text: "#475569", label: "📌 TO DO" }
  }
}

interface BaseTemplateOptions {
  categoryTitle: string
  headerIcon?: string
  title: string
  description?: string | null
  priority?: string
  status?: string
  fields?: Array<{ label: string; value: string; icon?: string }>
  ctaText?: string
  ctaUrl?: string
  footerNote?: string
}

function renderBaseEmailTemplate({
  categoryTitle,
  headerIcon = "📋",
  title,
  description,
  priority,
  status,
  fields = [],
  ctaText,
  ctaUrl,
  footerNote = "Automated notification from JamureChat Task Management",
}: BaseTemplateOptions): string {
  const pStyle = getPriorityBadge(priority)
  const sStyle = getStatusBadge(status)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Encoding" content="IE=edge">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    a { color: #2563eb; text-decoration: none; }
    .button-hover:hover { background-color: #1d4ed8 !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; width: 100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          
          <!-- Gradient Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%); padding: 32px 32px 28px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
                      ${headerIcon} ${categoryTitle}
                    </span>
                    <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 16px 0 0 0; line-height: 1.3;">
                      ${title}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              
              <!-- Badges Row -->
              ${
                priority || status
                  ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  ${
                    priority
                      ? `
                  <td style="padding-right: 8px;">
                    <span style="display: inline-block; background-color: ${pStyle.bg}; color: ${pStyle.text}; border: 1px solid ${pStyle.border}; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px;">
                      ${pStyle.label}
                    </span>
                  </td>`
                      : ""
                  }
                  ${
                    status
                      ? `
                  <td>
                    <span style="display: inline-block; background-color: ${sStyle.bg}; color: ${sStyle.text}; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px;">
                      ${sStyle.label}
                    </span>
                  </td>`
                      : ""
                  }
                </tr>
              </table>`
                  : ""
              }

              <!-- Description Box -->
              ${
                description
                  ? `
              <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 24px;">
                <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6; font-style: italic;">
                  "${description}"
                </p>
              </div>`
                  : ""
              }

              <!-- Fields Table -->
              ${
                fields.length > 0
                  ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; border: 1px solid #f1f5f9;">
                ${fields
                  .map(
                    (f) => `
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 600; width: 38%; vertical-align: top;">
                    ${f.icon ? f.icon + " " : ""}${f.label}
                  </td>
                  <td style="padding: 8px 0; color: #0f172a; font-size: 13.5px; font-weight: 600; vertical-align: top;">
                    ${f.value}
                  </td>
                </tr>`
                  )
                  .join("")}
              </table>`
                  : ""
              }

              <!-- Action Button CTA -->
              ${
                ctaText && ctaUrl
                  ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 10px; margin-bottom: 10px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" target="_blank" class="button-hover" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); text-align: center;">
                      ${ctaText} →
                    </a>
                  </td>
                </tr>
              </table>`
                  : ""
              }

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px; font-weight: 500;">
                ${footerNote}
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                © ${new Date().getFullYear()} JamureChat Workspace. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

/**
 * 🔔 Task Assignment Email Template
 */
export function getTaskAssignmentEmailHtml({
  taskTitle,
  description,
  priority,
  deadline,
  taskId,
  creatorName,
}: {
  taskTitle: string
  description?: string | null
  priority?: string
  deadline?: Date | string | null
  taskId?: string
  creatorName?: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const taskUrl = taskId ? `${appUrl}/dashboard/tasks/${taskId}/record` : `${appUrl}/dashboard`
  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No deadline specified"

  return renderBaseEmailTemplate({
    categoryTitle: "Task Assigned",
    headerIcon: "🎯",
    title: taskTitle,
    description: description || "No detailed description provided for this task.",
    priority,
    fields: [
      { label: "Assigned By", value: creatorName || "Workspace Manager", icon: "👤" },
      { label: "Target Deadline", value: formattedDeadline, icon: "📅" },
    ],
    ctaText: "Open Task in Workspace",
    ctaUrl: taskUrl,
    footerNote: "You received this email because a task was assigned to your account.",
  })
}

/**
 * ⏰ Task Deadline Reminder Email Template
 */
export function getTaskReminderEmailHtml({
  title,
  description,
  priority,
  remindAt,
  taskTitle,
  taskStatus,
  deadline,
  taskId,
}: {
  title: string
  description?: string | null
  priority?: string
  remindAt?: Date | string
  taskTitle?: string
  taskStatus?: string
  deadline?: Date | string | null
  taskId?: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const taskUrl = taskId ? `${appUrl}/dashboard/tasks/${taskId}/record` : `${appUrl}/dashboard`
  const formattedDue = remindAt
    ? new Date(remindAt).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Immediate"

  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  const fields = [
    { label: "Reminder Schedule", value: formattedDue, icon: "⏰" },
  ]

  if (taskTitle) {
    fields.push({ label: "Related Task", value: taskTitle, icon: "📌" })
  }
  if (formattedDeadline) {
    fields.push({ label: "Final Deadline", value: formattedDeadline, icon: "⏳" })
  }

  return renderBaseEmailTemplate({
    categoryTitle: "Upcoming Deadline Reminder",
    headerIcon: "🔔",
    title: title,
    description: description,
    priority: priority,
    status: taskStatus,
    fields,
    ctaText: "View & Update Task",
    ctaUrl: taskUrl,
    footerNote: "Automated deadline alert from JamureChat Reminder System",
  })
}

/**
 * 🎯 Task Collaboration Invitation Email Template
 */
export function getTaskInvitationEmailHtml({
  taskTitle,
  description,
  priority,
  deadline,
  accessLevel,
  inviteLink,
}: {
  taskTitle: string
  description?: string | null
  priority?: string
  deadline?: Date | string | null
  accessLevel?: string
  inviteLink: string
}) {
  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Flexible"

  return renderBaseEmailTemplate({
    categoryTitle: "Collaboration Invitation",
    headerIcon: "🚀",
    title: `You're invited to collaborate on: ${taskTitle}`,
    description: description || "You have been invited to participate in this task workspace.",
    priority,
    fields: [
      { label: "Task Title", value: taskTitle, icon: "📌" },
      { label: "Your Access Level", value: accessLevel || "VIEW", icon: "🔑" },
      { label: "Deadline", value: formattedDeadline, icon: "📅" },
    ],
    ctaText: "Accept Invitation & Join Task",
    ctaUrl: inviteLink,
    footerNote: "This invitation link remains valid for 7 days.",
  })
}

/**
 * 🏢 Organization Invite Email Template
 */
export function getOrgInvitationEmailHtml({
  inviteLink,
  role,
}: {
  inviteLink: string
  role?: string
}) {
  return renderBaseEmailTemplate({
    categoryTitle: "Organization Invitation",
    headerIcon: "🏢",
    title: "You've been invited to join an organization on JamureChat",
    description: "Collaborate with your team, manage tasks, projects, and track real-time updates.",
    fields: [
      { label: "Assigned Role", value: role || "EMPLOYEE", icon: "💼" },
      { label: "Expiration", value: "Valid for 7 days", icon: "⏳" },
    ],
    ctaText: "Accept Invitation & Join Team",
    ctaUrl: inviteLink,
    footerNote: "If you were not expecting this invitation, you can safely ignore this email.",
  })
}
