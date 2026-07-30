import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDaysLeft, getNextReminderUtc, IST_TZ } from "@/lib/subscription-utils"
import { RazorpayButton } from "./razorpay-button"
import TrialPopupClient from "./trial-popup-client"

function formatIst(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: IST_TZ,
  }).format(date)
}

export default async function SubscriptionBanner() {
  const session = (await getServerSession(authOptions as any)) as any
  if (!session?.user?.id) return null

  // Organization-level subscription
  const orgId = session.user.organizationId || null
  const sub = orgId ? await db.subscription.findUnique({ where: { organizationId: orgId } }) : null
  if (!sub) return null

  const now = new Date()

  if (sub.status === "TRIAL") {
    const daysLeft = getDaysLeft(sub.trialEnd, now)
    return <TrialPopupClient daysLeft={daysLeft} endDateFormatted={formatIst(sub.trialEnd)} />
  }

  if (sub.status === "EXPIRED") {
    return (
      <div className="mb-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/40 p-4 text-rose-900 dark:text-rose-200 shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="font-bold text-xs">Trial Expired</p>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">Please upgrade your organization plan to continue access.</p>
        </div>
        <RazorpayButton label="Renew now" />
      </div>
    )
  }

  if (sub.status === "ACTIVE") {
    return null
  }

  return null
}
