export const dynamic = "force-dynamic"
export const revalidate = 0
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import ChannelHeader from "@/components/channel-header"
import RealTimeMessages from "@/components/real-time-messages"
import MessageInput from "@/components/message-input"
import DirectMessageClient from "@/components/DirectMessageClient"

import { isSuperAdmin as checkIsSuperAdmin } from "@/lib/org"
import { randomUUID } from "crypto"

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }> | { channelId: string }
}) {
  const { channelId } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const channel = await db.channel.findUnique({
    where: {
      id: channelId,
    },
    include: {
      department: true,
      members: {
        include: {
          user: true,
        },
      },
      task: true,
    },
  })

  if (!channel) {
    notFound()
  }

  // Attach channel image via raw SQL
  try {
    const rows: any[] = await db.$queryRawUnsafe(`SELECT image FROM \`channel\` WHERE id = ?`, channel.id)
    if (rows && rows[0]) {
      (channel as any).image = rows[0].image || null
    }
  } catch (e) {
    console.error("Error fetching channel image:", e)
  }

  // Check if user is a member of the channel
  const userId = (session as any)?.user?.id as string | undefined
  const userRole = (session as any)?.user?.role
  const userEmail = (session as any)?.user?.email
  const userIsSuperAdmin = Boolean((session as any)?.user?.isSuperAdmin || checkIsSuperAdmin(userEmail))

  let isMember = channel.members.some((member: any) => member.userId === userId)
  const isCreator = channel.creatorId === userId
  const isAdmin = userIsSuperAdmin || ["SUPER_ADMIN", "ORG_ADMIN", "ADMIN", "MANAGER"].includes(userRole)

  // Auto-heal membership if user is creator, admin, or channel is public
  if (!isMember && userId && (isCreator || isAdmin || channel.isPublic)) {
    try {
      await db.channelMember.upsert({
        where: {
          userId_channelId: {
            userId,
            channelId: channel.id,
          },
        },
        create: {
          id: randomUUID(),
          userId,
          channelId: channel.id,
          isAdmin: isCreator || isAdmin,
          updatedAt: new Date(),
        },
        update: {},
      })
      isMember = true
    } catch (e) {
      console.error("Auto-heal channel membership error:", e)
    }
  }

  if (!isMember && !channel.isPublic && !isAdmin) {
    // If not a member and channel is private, redirect
    redirect("/dashboard")
  }

  // Get messages
  // Always fetch fresh messages to avoid stale caches after navigation/refresh
  const messages = await db.message.findMany({
    where: {
      channelId: channel.id,
    },
    include: {
      sender: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  }) 
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 md:rounded-2xl md:border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="shrink-0 sticky top-0 z-20">
        <ChannelHeader channel={channel} />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-slate-50/50 dark:bg-slate-950/40">
        <RealTimeMessages initialMessages={messages} channelId={channel.id} />
      </div>
      <div className="shrink-0 sticky bottom-0 z-20 bg-[#f0f2f5] dark:bg-[#111b21] p-2.5 sm:p-3 border-t border-slate-200/80 dark:border-slate-800 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        <MessageInput channelId={channel.id} receiverId={undefined} />
      </div>
    </div>
  )
}
