export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export default async function TaskChannelRedirectPage({
  params,
}: {
  params: Promise<{ taskId: string }> | { taskId: string };
}) {
  const { taskId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  // 1. Look for existing channel associated with this task
  const existingChannel = await db.channel.findFirst({
    where: {
      OR: [
        { taskId: taskId },
        { taskReferenceId: taskId },
      ],
    },
  });

  if (existingChannel?.id) {
    // Ensure the current user is a member of this channel
    try {
      await db.channelMember.upsert({
        where: {
          userId_channelId: {
            userId,
            channelId: existingChannel.id,
          },
        },
        create: {
          id: randomUUID(),
          userId,
          channelId: existingChannel.id,
          isAdmin: false,
          updatedAt: new Date(),
        },
        update: {},
      });
    } catch (e) {
      console.error("Error auto-adding member to task channel:", e);
    }
    redirect(`/dashboard/channels/${existingChannel.id}`);
  }

  // 2. If channel doesn't exist yet, fetch task to create channel
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignments: true,
      creator: true,
    },
  });

  if (!task) {
    redirect("/dashboard/tasks");
  }

  // Check if channel was linked directly in task.channelId
  if (task.channelId) {
    redirect(`/dashboard/channels/${task.channelId}`);
  }

  // 3. Create discussion channel for this project on-demand
  try {
    const newChannelId = randomUUID();
    const newChannel = await db.channel.create({
      data: {
        id: newChannelId,
        name: `Task-${task.title.slice(0, 30)}`,
        description: `Project discussion channel for: ${task.title}`,
        isPublic: false,
        isTaskThread: true,
        taskId: task.id,
        taskReferenceId: task.id,
        creatorId: userId,
        organizationId: (task as any).organizationId || (session.user as any).organizationId || undefined,
        members: {
          create: [
            {
              userId: userId,
              isAdmin: true,
            },
            ...(task.assignments || [])
              .filter((a: any) => a.userId !== userId)
              .map((a: any) => ({
                userId: a.userId,
                isAdmin: false,
              })),
          ],
        },
      },
    });

    redirect(`/dashboard/channels/${newChannel.id}`);
  } catch (err) {
    console.error("Error creating channel for task on-demand:", err);
    redirect(`/dashboard/channels`);
  }
}
