import { type NextRequest, NextResponse } from "next/server"
import { reminderProcessor } from "@/lib/reminder-processor"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Allow 60s execution time for cron tasks if needed

async function handleCronRequest(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const { searchParams } = new URL(req.url)
    const secretQuery = searchParams.get("secret")
    const authHeader = req.headers.get("authorization")
    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null
    const customHeaderSecret = req.headers.get("x-cron-secret")

    // Security Verification: If CRON_SECRET is configured in environment, require matching secret
    if (cronSecret) {
      const providedSecret = secretQuery || bearerSecret || customHeaderSecret
      if (providedSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized: Invalid Cron Secret" }, { status: 401 })
      }
    }

    const batchSize = Math.min(Number(searchParams.get("batchSize") || 50), 200)

    // Execute atomic batch processing
    const stats = await reminderProcessor.processDueReminders(batchSize)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    })
  } catch (error: any) {
    console.error("❌ Cron job execution failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error?.message || error || "Failed to process scheduled reminders"),
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return handleCronRequest(req)
}

export async function POST(req: NextRequest) {
  return handleCronRequest(req)
}
