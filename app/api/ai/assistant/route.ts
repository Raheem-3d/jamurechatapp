// API Route: AI Project Assistant (Advanced)
// Usage: POST /api/ai/assistant
// Body: { query: string, context?: { projectId?: string, organizationId?: string } }

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPerplexityClient, getAIClientForOrg } from '@/lib/perplexity-client';

export const maxDuration = 120; // 2 minutes for local AI processing

export async function POST(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userOrg = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organization: { select: { aiEnabled: true } } }
    });
    if (userOrg?.organization?.aiEnabled === false) {
      return NextResponse.json({ error: 'AI Assistant feature is disabled' }, { status: 403 });
    }

    const body = await req.json();
    const { query, context = {}, systemPromptOverride } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    const organizationId = session.user.organizationId;
    const isEmployee = userRole === 'EMPLOYEE' || userRole === 'ORG_MEMBER';

    // STRICT USER SCOPE:
    // Both Admin and Employee only see projects/tasks they created or are assigned to
    const taskFilter = {
      organizationId,
      OR: [
        { creatorId: userId },
        { assignments: { some: { userId } } },
      ],
    };

    const tasks = await db.task.findMany({
      where: taskFilter,
      include: {
        creator: { select: { name: true } },
        assignments: { include: { user: { select: { name: true } } } },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    // For messages, users only see DMs sent/received or messages in channels they are members of
    const messageFilter = {
      OR: [
        { senderId: userId },
        { receiverId: userId },
        { channel: { members: { some: { userId } } } },
      ],
    };

    const messages = await db.message.findMany({
      where: messageFilter,
      include: { sender: { select: { name: true } } },
      take: 30,
      orderBy: { createdAt: 'desc' },
    });

    // Format context for AI
    const userName = session.user.name || 'User';
    
    const tasksText = tasks.length > 0
      ? tasks
          .map((t: any) => {
            // Deduplicate unique assignee names to prevent prompt pollution and repetition loops
            const uniqueAssigneeNames = Array.from(
              new Set(
                (t.assignments || [])
                  .map((a: any) => a.user?.name || a.user?.email)
                  .filter(Boolean)
              )
            );
            const assigneeNames = uniqueAssigneeNames.slice(0, 5).join(', ') || 'Unassigned';
            const extraAssigneesCount = uniqueAssigneeNames.length > 5 ? ` +${uniqueAssigneeNames.length - 5} more` : '';
            const finalAssignees = `${assigneeNames}${extraAssigneesCount}`;
            
            const isAssignedToUser = t.assignments.some((a: any) => a.userId === userId);
            const isCreatedByUser = t.creatorId === userId;
            
            return `- Project/Task: "${t.title}" | Status: ${t.status} | Priority: ${t.priority} | Assignees: ${finalAssignees}${
              isAssignedToUser ? ' [Assigned to you]' : ''
            }${isCreatedByUser ? ' [Created by you]' : ''}`;
          })
          .join('\n')
      : 'No active projects or tasks found.';

    const messagesText = messages.length > 0
      ? messages
          .slice(0, 10)
          .map((m: any) => `${m.sender.name}: ${m.content}`)
          .join('\n')
      : 'No recent messages.';

    const scopeNotice = isEmployee
      ? "You are an AI Assistant for an EMPLOYEE. You ONLY have access to tasks they created or are assigned to."
      : "You are an AI Assistant for a PROJECT ADMIN. You ONLY have access to projects/tasks created by or assigned to this user.";

    const contextText = `
User Name: ${userName}
User Role: ${userRole}
${scopeNotice}

User's Created / Assigned Projects & Tasks (${tasks.length} total):
${tasksText}

Recent Discussions:
${messagesText}
`;

    // Get AI response
    const perplexity = await getAIClientForOrg(organizationId);
    
    const defaultSystemPrompt = isEmployee
      ? `You are an intelligent personal project assistant. Your job is to help this employee with their personal tasks, deadlines, priorities, and project descriptions.
      
CRITICAL FORMATTING & CONTENT INSTRUCTIONS:
- LANGUAGE: Answer in the user's language (English, Roman Urdu, or Hindi). If asked in Roman Urdu (e.g., "mere projects kon kon se hai.?"), reply politely in Roman Urdu or English.
- TABLE FORMAT: Whenever asked for a list of projects, tasks, or status overview, ALWAYS format them in a clean, beautiful Markdown Table like this:
| # | Project / Task Title | Status | Priority | Assignees |
|---|---|---|---|---|
| 1 | **CRM Project** | DONE | URGENT | Faisal Mohammed, Soef Shaikh |
- List each project ONCE. Do NOT output unformatted raw lines or repetitive assignee text.
- Provide a brief 1-sentence summary below the table.
- DO NOT answer team-management or organization-wide questions outside their scope.`
      : `You are an intelligent project management co-pilot. Your job is to help this admin with insights, planning, status updates, and reports for the projects they have created or are assigned to.

CRITICAL FORMATTING & CONTENT INSTRUCTIONS:
- LANGUAGE: Answer in the user's language (English, Roman Urdu, or Hindi). If asked in Roman Urdu (e.g., "mere projects kon kon se hai.?"), reply politely in Roman Urdu or English.
- TABLE FORMAT: Whenever asked for a list of projects, tasks, status overview, or reports, ALWAYS format the data in a clean, beautiful Markdown Table like this:
| # | Project / Task Title | Status | Priority | Assignees |
|---|---|---|---|---|
| 1 | **CRM Project** | DONE | URGENT | Faisal Mohammed, Soef Shaikh |
- List each project ONCE cleanly with its Title, Status, Priority, and Assignees.
- NEVER repeat assignee names or duplicate text.
- Include a brief 1-sentence summary or next steps below the table.
- ONLY reference tasks and projects created by or assigned to this admin.`;

    const systemPrompt = systemPromptOverride
      ? `${systemPromptOverride}\n\n${defaultSystemPrompt}`
      : defaultSystemPrompt;

    const response = await perplexity.chat([
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Context:\n${contextText}\n\nUser Question: ${query}`,
      },
    ]);

    return NextResponse.json({
      success: true,
      response,
      query,
    });
  } catch (error: any) {
    console.error('AI Assistant API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process query' },
      { status: 500 }
    );
  }
}
