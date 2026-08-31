// API Route: Smart Reply Suggestions
// Usage: POST /api/ai/suggest-reply
// Body: { channelId?: string, receiverId?: string }

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPerplexityClient, getAIClientForOrg } from '@/lib/perplexity-client';

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userOrg = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true, organization: { select: { aiEnabled: true } } }
    });
    if (userOrg?.organization?.aiEnabled === false) {
      return NextResponse.json({ error: 'AI features are disabled' }, { status: 403 });
    }

    const body = await req.json();
    const { channelId, receiverId } = body;

    if (!channelId && !receiverId) {
      return NextResponse.json(
        { error: 'Provide channelId or receiverId' },
        { status: 400 }
      );
    }

    // Get conversation context (last 10 messages)
    let messages: any[] = [];
    if (channelId) {
      messages = await db.message.findMany({
        where: { channelId },
        include: { sender: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    } else if (receiverId) {
      messages = await db.message.findMany({
        where: {
          OR: [
            { senderId: session.user.id, receiverId },
            { senderId: receiverId, receiverId: session.user.id },
          ],
        },
        include: { sender: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    }

    if (messages.length === 0) {
      return NextResponse.json({ success: true, suggestions: ['Got it!', 'On it!', 'Thanks!'] });
    }

    messages.reverse(); // oldest first

    const lastMessage = messages[messages.length - 1];

    // Format conversation
    const conversationHistory = messages
      .slice(0, -1)
      .map((m: any) => `${m.sender.name}: ${m.content}`)
      .join('\n');

    const lastMessageContent = `${lastMessage.sender.name}: ${lastMessage.content}`;

    // Get AI suggestions
    const perplexity = await getAIClientForOrg(userOrg?.organizationId || session.user.organizationId);
    const suggestions = await perplexity.generateReplySuggestions(
      conversationHistory,
      lastMessageContent
    );

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error: any) {
    console.error('Suggest Reply API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
