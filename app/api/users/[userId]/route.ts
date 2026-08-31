import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { channel } from "diagnostics_channel"

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> | { userId: string } }) {
  try {
    const { userId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Fetch user basic info for notifications/buzz display
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        organizationId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Optional: enforce same organization check
    const currentUser = await db.user.findUnique({
      where: { id: (session as any).user?.id || "" },
      select: { organizationId: true },
    })

    if (currentUser?.organizationId && user.organizationId !== currentUser.organizationId) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
  
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> | { userId: string } }) {
  try {
    const { userId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Check if user is organization admin
    const currentUser = await db.user.findUnique({
      where: {
        id: (session as any).user?.id || "",
      },
      select: {
        role: true,
        organizationId: true,
      },
    })

    if (currentUser?.role !== "ORG_ADMIN") {
      return NextResponse.json({ message: "Only organization admins can update users" }, { status: 403 })
    }

    const { role, departmentId, managerId, online } = await req.json()

    // Enforce organization scoping: target user must be in same organization
    const target = await db.user.findUnique({ where: { id: userId }, select: { organizationId: true } })
    if (!target || (currentUser.organizationId && target.organizationId !== currentUser.organizationId)) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Validate manager exists and belongs to same organization if provided
    let validManagerId = undefined
    if (managerId !== undefined) {
      if (managerId === null) {
        validManagerId = null
      } else if (managerId) {
        const manager = await db.user.findUnique({
          where: { id: managerId },
          select: { id: true, organizationId: true }
        })
        if (!manager || manager.organizationId !== currentUser.organizationId) {
          return NextResponse.json({ message: "Manager not found or does not belong to your organization" }, { status: 400 })
        }
        validManagerId = managerId
      }
    }

    // Update user
    const user = await db.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(role && { role }),
        ...(departmentId && { departmentId }),
        ...(managerId !== undefined && { managerId: validManagerId }),
        ...(online !== undefined && { online }),
      },
      include: {
        department: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> | { userId: string } }) {
  try {
    const { userId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const currentUserId = (session as any).user?.id || ""
    const currentUser = await db.user.findUnique({
      where: { id: currentUserId },
      select: { id: true, role: true, organizationId: true },
    })

    const isAllowedAdmin =
      currentUser?.role === "ORG_ADMIN" ||
      currentUser?.role === "SUPER_ADMIN" ||
      currentUser?.role === "ADMIN"

    if (!isAllowedAdmin) {
      return NextResponse.json({ message: "Only organization admins can delete users" }, { status: 403 })
    }

    if (currentUserId === userId) {
      return NextResponse.json({ message: "You cannot delete your own account" }, { status: 400 })
    }

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, organizationId: true },
    })

    if (!target) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Scoped check for ORG_ADMIN
    if (currentUser.role !== "SUPER_ADMIN" && currentUser.organizationId && target.organizationId !== currentUser.organizationId) {
      return NextResponse.json({ message: "User not found in your organization" }, { status: 404 })
    }

    const { deleteUserWithCascade } = await import("@/lib/user-cleanup")
    await deleteUserWithCascade(userId, currentUserId)

    return NextResponse.json({ success: true, message: "User and all associated data deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ message: error.message || "Failed to delete user" }, { status: 500 })
  }
}

