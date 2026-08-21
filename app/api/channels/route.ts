import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getScopedDb } from "@/lib/scoped-db"
import { sendEmail } from "@/lib/email"
import { emitToUser } from "@/lib/socket-server"
import { getTenantWhereClause, getSessionUserWithPermissions } from "@/lib/org"
import { hasPermission, requirePermission } from "@/lib/permissions"

import { getSessionOrMobileUser } from "@/lib/mobile-auth"
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userFromMobile = await getSessionOrMobileUser(req as any).catch(() => null)
    const userId = (session?.user as any)?.id || userFromMobile?.id

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const channels: any[] = await db.channel.findMany({
      where: {
        OR: [
          { members: { some: { userId } } },
          { isPublic: true },
          { creatorId: userId },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        department: { select: { name: true } },
      },
    })

    // Attach image field via raw SQL to bypass Prisma select validator
    try {
      const channelImages: any[] = await db.$queryRawUnsafe(`SELECT id, image FROM \`channel\``);
      const imageMap = new Map(channelImages.map((row: any) => [row.id, row.image]));
      for (const ch of channels) {
        ch.image = imageMap.get(ch.id) || null;
      }
    } catch (e) {
      console.error("Error fetching channel images:", e);
    }

    return NextResponse.json(channels)
  } catch (error) {
    console.error("Error fetching channels:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}



export async function POST(req: Request) {
  try {
    const { getSessionOrMobileUser } = await import('@/lib/mobile-auth')
    const user = await getSessionOrMobileUser(req as any)

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { name, description, isPublic, departmentId, members, image } = await req.json()
    const orgId = user?.organizationId

    // Get user with permissions to check super admin status
    const userWithPerms = await getSessionUserWithPermissions(req as any)
    const isSuperAdmin = userWithPerms.isSuperAdmin

    // Parse user's explicit permissions from DB - handle both array and string formats
    let userPerms: any[] = []
    const rawPerms = userWithPerms.permissions
    if (Array.isArray(rawPerms)) {
      userPerms = rawPerms
    } else if (typeof rawPerms === 'string' && rawPerms) {
      try {
        userPerms = JSON.parse(rawPerms)
      } catch {
        userPerms = []
      }
    }
    
    // 🔍 DEBUG: Log permission check details
 

    // ✅ ENFORCE PERMISSION: CHANNEL_CREATE required (or CHANNEL_MANAGE as fallback)
    const canCreateChannel = hasPermission(userWithPerms.role, "CHANNEL_CREATE", isSuperAdmin, userPerms)
    const canManageChannel = hasPermission(userWithPerms.role, "CHANNEL_MANAGE", isSuperAdmin, userPerms)
    
  
    
    if (!canCreateChannel && !canManageChannel) {
      return NextResponse.json(
        { message: "Forbidden: You need CHANNEL_CREATE permission to create channels" },
        { status: 403 }
      )
    }

    // Normalize and validate departmentId
    let depId: string | null = null
    if (departmentId && typeof departmentId === 'string' && departmentId !== 'none') {
      const dept = await db.department.findUnique({ where: { id: departmentId }, select: { id: true } })
      depId = dept ? departmentId : null
    }

    // Create channel and members
    const channel = await db.channel.create({
      data: {
        id: crypto.randomUUID(),
        name,
        description,
        isPublic,
        creatorId: user.id,
        departmentId: depId,
        organizationId: orgId,
        updatedAt: new Date(),
        members: {
          create: [
            { id: crypto.randomUUID(), userId: user.id, isAdmin: true, updatedAt: new Date() },
            ...(members || []).map((memberId: string) => ({
              id: crypto.randomUUID(),
              userId: memberId,
              isAdmin: false,
              updatedAt: new Date(),
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: true, // so we get emails for sending
          },
        },
      },
    })

    if (image) {
      await db.$executeRawUnsafe(
        "UPDATE `channel` SET `image` = ? WHERE `id` = ?",
        image,
        channel.id
      ).catch((e) => console.error("Error setting image on channel create:", e));
      (channel as any).image = image;
    }

    // Send notifications and emails to members (excluding creator)
    for (const member of channel.members) {
      if (member.userId === user.id) continue

      const memberUser = member.user
      const email = memberUser.email
      const name = memberUser.name || "Team Member"

      // 🔔 Create notification
      const notification = await db.notification.create({
        data: {
          id: crypto.randomUUID(),
          type: "CHANNEL_INVITE",
          channelId:channel.id,
          userId: member.userId,
          content: `You've been added to the channel "${channel.name}"`,
          read: false,
        },
      })

  

      // 📡 Emit socket notification
      const emitted = emitToUser(member.userId, "new-notification", notification)
    

      // 📡 Emit channel-assigned event so user's sidebar refreshes immediately
      emitToUser(member.userId, "channel:assigned", {
        channelId: channel.id,
        channelName: channel.name,
        channelDescription: channel.description,
      })
    

      // 📧 Send email
      if (email) {
        try {
          await sendEmail({
            to: email,
            subject: `You've been added to a new channel: ${channel.name}`,
            html: `
              <p>Hi ${name},</p>
              <p>You've been added to a new channel: <strong>${channel.name}</strong>.</p>
              <p>Description: ${channel.description || "No description provided."}</p>
              <p>Thanks,<br/>Task Manager Team</p>
            `,
          })
     
        } catch (emailErr) {
          console.error(`❌ Failed to send email to ${email}:`, emailErr)
        }
      }
    }

    return NextResponse.json(channel, { status: 201 })
  } catch (error) {
    console.error("Error creating channel:", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

