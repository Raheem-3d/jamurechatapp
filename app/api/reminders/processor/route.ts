import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { reminderProcessor } from "@/lib/reminder-processor"

// GET - Get processor status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ORG_ADMIN") {
      return NextResponse.json({ error: "Organization admin access required" }, { status: 403 })
    }

    const status = await reminderProcessor.getProcessorStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error("Error getting processor status:", error)
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 })
  }
}

// POST - Control processor / manual trigger
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "ORG_ADMIN") {
      return NextResponse.json({ error: "Organization admin access required" }, { status: 403 })
    }

    const { action } = await request.json()

    if (action === "process" || action === "start" || action === "check") {
      // Manual trigger
      const stats = await reminderProcessor.processDueReminders()
      return NextResponse.json({ success: true, message: "Manual reminder processing completed", stats })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error controlling processor:", error)
    return NextResponse.json({ error: "Failed to control processor" }, { status: 500 })
  }
}
