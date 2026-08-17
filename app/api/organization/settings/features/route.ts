import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    const organizationId = session?.user?.organizationId
    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        aiEnabled: true,
      },
    })

    return NextResponse.json({ features: organization })
  } catch (error) {
    console.error("Error fetching feature settings:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    const role = session?.user?.role
    const organizationId = session?.user?.organizationId

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only allow Admins to edit feature flags
    if (role !== "ORG_ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { aiEnabled } = await req.json()

    const updated = await db.organization.update({
      where: { id: organizationId },
      data: {
        ...(aiEnabled !== undefined && { aiEnabled }),
      },
    })

    return NextResponse.json({ features: updated })
  } catch (error) {
    console.error("Error updating feature settings:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
