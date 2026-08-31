// API Route: AI Action Item Extractor
// Usage: POST /api/ai/action-items
// Body: { channelId: string }

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

    // AI feature gate
    const userOrg = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true, organization: { select: { aiEnabled: true } } },
    });
    if (userOrg?.organization?.aiEnabled === false) {
      return NextResponse.json({ error: 'AI features are disabled' }, { status: 403 });
    }

    const { channelId } = await req.json();
    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    const canViewOrgData = ['ORG_ADMIN', 'ORG_MEMBER', 'MANAGER', 'SUPER_ADMIN'].includes(userRole);

    // Verify user has access to this channel
    const channel = await db.channel.findUnique({
      where: { id: channelId },
      include: {
        members: { where: { userId } },
      },
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Employees must be channel members
    if (!canViewOrgData && channel.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch last 50 messages from the channel
    const messages = await db.message.findMany({
      where: { channelId },
      include: { sender: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (messages.length === 0) {
      return NextResponse.json({ actionItems: [], message: 'No messages found in channel' });
    }

    const messagesText = messages
      .reverse()
      .filter((m: any) => m.content && m.content.trim())
      .map((m: any) => `${m.sender.name}: ${m.content}`)
      .join('\n');

    const perplexity = await getAIClientForOrg(userOrg?.organizationId || session.user.organizationId);

    const response = await perplexity.chat([
      {
        role: 'system',
        content: `You are an expert project manager assistant. Extract clear action items from team conversations.
        
For each action item identify:
- task: The specific action to be done (clear, concise title)
- assignee: Person responsible (if mentioned, else null)
- deadline: Deadline if mentioned (else null)
- priority: "high", "medium", or "low" based on urgency language

Return ONLY a valid JSON array. No markdown, no explanation. Example:
[{"task":"Update the API docs","assignee":"John","deadline":"Friday","priority":"high"}]

If no action items found, return: []`,
      },
      {
        role: 'user',
        content: `Extract all action items from this conversation:\n\n${messagesText}`,
      },
    ]);

    let actionItems: any[] = [];
    try {
      // Strip markdown code fences if present
      const cleaned = String(response).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      actionItems = JSON.parse(cleaned);
      if (!Array.isArray(actionItems)) actionItems = [];
    } catch {
      actionItems = [];
    }

    return NextResponse.json({
      success: true,
      actionItems,
      channelName: channel.name,
      messagesAnalyzed: messages.length,
    });
  } catch (error: any) {
    console.error('AI Action Items API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract action items' },
      { status: 500 }
    );
  }
}
