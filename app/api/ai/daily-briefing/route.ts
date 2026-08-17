// API Route: AI Daily Briefing
// Usage: GET /api/ai/daily-briefing
// Returns personalized AI-generated daily briefing for the current user

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPerplexityClient } from '@/lib/perplexity-client';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // AI feature gate
    const userOrg = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organization: { select: { aiEnabled: true } } },
    });
    if (userOrg?.organization?.aiEnabled === false) {
      return NextResponse.json({ error: 'AI features are disabled' }, { status: 403 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    const userName = session.user.name || 'Team Member';
    const canViewOrgData = ['ORG_ADMIN', 'ORG_MEMBER', 'MANAGER', 'SUPER_ADMIN'].includes(userRole);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    // Build task filter based on role
    const taskFilter = canViewOrgData
      ? { organizationId: session.user.organizationId }
      : {
          organizationId: session.user.organizationId,
          OR: [
            { creatorId: userId },
            { assignments: { some: { userId } } },
          ],
        };

    // Fetch tasks
    const allTasks = await db.task.findMany({
      where: taskFilter,
      include: {
        assignments: { include: { user: { select: { name: true, id: true } } } },
        creator: { select: { name: true } },
      },
      orderBy: { deadline: 'asc' },
      take: 100,
    });

    const overdueTasks = allTasks.filter(
      (t: any) => t.deadline && new Date(t.deadline) < now && t.status !== 'DONE'
    );
    const dueTodayTasks = allTasks.filter(
      (t: any) =>
        t.deadline &&
        new Date(t.deadline) >= todayStart &&
        new Date(t.deadline) < tomorrowStart &&
        t.status !== 'DONE'
    );
    const highPriorityTasks = allTasks.filter(
      (t: any) => t.priority === 'HIGH' && t.status !== 'DONE'
    );
    const inProgressTasks = allTasks.filter((t: any) => t.status === 'IN_PROGRESS');

    const formatTaskList = (tasks: any[]) =>
      tasks
        .slice(0, 5)
        .map((t) => {
          const assignees = t.assignments.map((a: any) => a.user.name).join(', ') || 'Unassigned';
          return `- ${t.title} [${t.status}] (Assigned: ${assignees})`;
        })
        .join('\n') || 'None';

    const contextSummary = `
User: ${userName}
Role: ${userRole}
Date: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Overdue Tasks (${overdueTasks.length}):
${formatTaskList(overdueTasks)}

Due Today (${dueTodayTasks.length}):
${formatTaskList(dueTodayTasks)}

High Priority Active (${highPriorityTasks.length}):
${formatTaskList(highPriorityTasks)}

Currently In Progress (${inProgressTasks.length}):
${formatTaskList(inProgressTasks)}
`;

    const perplexity = getPerplexityClient();

    const aiResponse = await perplexity.chat([
      {
        role: 'system',
        content: `You are an executive assistant generating a concise daily briefing for a team member.
        
Generate a structured briefing in this EXACT JSON format:
{
  "greeting": "Short personalized morning message (1 sentence, use their name)",
  "summary": "2-3 sentence overview of their day situation",
  "focusItem": "The single most important thing they should tackle first today (1 sentence)",
  "tip": "One actionable productivity or collaboration tip (1 sentence)",
  "urgencyLevel": "low|medium|high|critical"
}

Be direct, practical, and motivating. Return ONLY the JSON object.`,
      },
      {
        role: 'user',
        content: `Generate my daily briefing:\n${contextSummary}`,
      },
    ]);

    let briefingData: any = {
      greeting: `Good day, ${userName}!`,
      summary: 'You have tasks requiring your attention today.',
      focusItem: 'Review your highest priority tasks and ensure blockers are resolved.',
      tip: 'Consider blocking focused work time in the morning for deep work tasks.',
      urgencyLevel: overdueTasks.length > 0 ? 'high' : 'medium',
    };

    try {
      const cleaned = String(aiResponse).replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object') {
        briefingData = { ...briefingData, ...parsed };
      }
    } catch {
      // Use fallback data
    }

    return NextResponse.json({
      success: true,
      briefing: briefingData,
      stats: {
        overdueCount: overdueTasks.length,
        dueTodayCount: dueTodayTasks.length,
        highPriorityCount: highPriorityTasks.length,
        inProgressCount: inProgressTasks.length,
        totalActive: allTasks.filter((t: any) => t.status !== 'DONE').length,
      },
      overdueTasks: overdueTasks.slice(0, 3).map((t: any) => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        priority: t.priority,
      })),
      dueTodayTasks: dueTodayTasks.slice(0, 3).map((t: any) => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        priority: t.priority,
      })),
    });
  } catch (error: any) {
    console.error('AI Daily Briefing API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate briefing' },
      { status: 500 }
    );
  }
}
