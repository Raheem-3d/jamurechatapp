import { addDays, addYears, isAfter } from "date-fns"

export const IST_TZ = "Asia/Kolkata"
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // UTC+05:30, no DST

// Get current time as UTC Date corresponding to now in IST
export function getIstNowUtc(): Date {
  const nowUtc = new Date()
  // Anchor to IST clock then return UTC equivalent
  const istNowClock = new Date(nowUtc.getTime() + IST_OFFSET_MS)
  return new Date(istNowClock.getTime() - IST_OFFSET_MS)
}

export function toIst(date: Date | string): Date {
  const d = date instanceof Date ? date : new Date(date)
  return new Date(d.getTime() + IST_OFFSET_MS)
}

export function fromIstToUtc(dateInIst: Date | string): Date {
  const d = dateInIst instanceof Date ? dateInIst : new Date(dateInIst)
  return new Date(d.getTime() - IST_OFFSET_MS)
}

export function computeTrialWindow(nowUtc: Date | string): { trialStartUtc: Date; trialEndUtc: Date } {
  const d = nowUtc instanceof Date ? nowUtc : new Date(nowUtc)
  const trialStartIst = new Date(d.getTime() + IST_OFFSET_MS)
  const trialEndIst = addDays(trialStartIst, 14)
  return {
    trialStartUtc: new Date(trialStartIst.getTime() - IST_OFFSET_MS),
    trialEndUtc: new Date(trialEndIst.getTime() - IST_OFFSET_MS),
  }
}

export function computeOneYearPeriodEnd(baseUtc: Date | string): Date {
  const d = baseUtc instanceof Date ? baseUtc : new Date(baseUtc)
  const istBase = new Date(d.getTime() + IST_OFFSET_MS)
  const endIst = addYears(istBase, 1)
  return new Date(endIst.getTime() - IST_OFFSET_MS)
}

// Reminder schedule relative to trial end
// Offsets (in hours): 7d, 3d, 1d, 12h before, and 0h (at expiry)
const OFFSETS_HOURS = [-7 * 24, -3 * 24, -24, -12, 0]

export function getReminderScheduleUtc(trialEndUtc: Date | string | null | undefined): Date[] {
  if (!trialEndUtc) return []
  const d = trialEndUtc instanceof Date ? trialEndUtc : new Date(trialEndUtc)
  if (isNaN(d.getTime())) return []
  const trialEndIst = new Date(d.getTime() + IST_OFFSET_MS)
  return OFFSETS_HOURS.map((h) => {
    const scheduledIst = new Date(trialEndIst.getTime() + h * 60 * 60 * 1000)
    return new Date(scheduledIst.getTime() - IST_OFFSET_MS)
  })
}

export function getNextReminderUtc(trialEndUtc: Date | string | null | undefined, nowUtc: Date | string): Date | null {
  if (!trialEndUtc) return null
  const schedule = getReminderScheduleUtc(trialEndUtc)
  const n = nowUtc instanceof Date ? nowUtc : new Date(nowUtc)
  const next = schedule.find((d) => isAfter(d, n))
  return next || null
}

export function getDaysLeft(trialEndUtc: Date | string | null | undefined, nowUtc: Date | string): number {
  if (!trialEndUtc) return 0
  const d = trialEndUtc instanceof Date ? trialEndUtc : new Date(trialEndUtc)
  const n = nowUtc instanceof Date ? nowUtc : new Date(nowUtc)
  if (isNaN(d.getTime()) || isNaN(n.getTime())) return 0
  const ms = d.getTime() - n.getTime()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}
