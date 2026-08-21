// API Route: AI Daily Briefing
// Usage: GET /api/ai/daily-briefing
// Returns personalized AI-generated daily briefing for the current user

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getPerplexityClient, getAIClientForOrg } from '@/lib/perplexity-client';

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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    // Build task filter: Only show projects/tasks created by or assigned to the current user (Admin or Employee)
    const taskFilter = {
      organizationId: session.user.organizationId,
      OR: [
        { creatorId: userId },
        { assignments: { some: { userId } } },
      ],
    };

    // Fetch tasks
    const allTasks: any[] = await db.task.findMany({
      where: taskFilter,
      include: {
        assignments: { include: { user: { select: { name: true, id: true } } } },
        creator: { select: { name: true } },
      },
      orderBy: { deadline: 'asc' },
      take: 100,
    });

    // Fetch records for these tasks via parentTaskId
    const taskIds = allTasks.map((t) => t.id).filter(Boolean);
    let allRecords: any[] = [];
    if (taskIds.length > 0) {
      try {
        allRecords = await db.record.findMany({
          where: { parentTaskId: { in: taskIds } },
          include: {
            stage: { select: { name: true } },
            assignees: { include: { user: { select: { name: true, id: true } } } },
          },
          orderBy: { dueDate: 'asc' },
        });
      } catch (e) {
        console.warn('Failed to fetch records for daily briefing:', e);
      }
    }

    // Group records by parentTaskId
    const recordsMap = new Map<string, any[]>();
    for (const r of allRecords) {
      if (r.parentTaskId) {
        const list = recordsMap.get(r.parentTaskId) || [];
        list.push(r);
        recordsMap.set(r.parentTaskId, list);
      }
    }

    allTasks.forEach((t: any) => {
      t.records = recordsMap.get(t.id) || [];
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
          const uniqueNames = Array.from(
            new Set((t.assignments || []).map((a: any) => a.user?.name).filter(Boolean))
          );
          const assignees = uniqueNames.slice(0, 3).join(', ') || 'Unassigned';
          let itemStr = `- Project: "${t.title}" [Status: ${t.status}] (Assigned: ${assignees})`;
          
          if (t.records && t.records.length > 0) {
            const recStr = t.records.slice(0, 3).map((r: any) => {
              const rStage = r.stage?.name || r.status || 'To Do';
              const rAssignees = (r.assignees || []).map((a: any) => a.user?.name).filter(Boolean).join(', ') || 'Unassigned';
              return `    └ Card/Record: "${r.title}" [Stage: ${rStage}] (Assigned: ${rAssignees})`;
            }).join('\n');
            itemStr += `\n${recStr}`;
          }
          return itemStr;
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

    let briefingData: any = {
      greeting: `Good day, ${userName}!`,
      summary: overdueTasks.length > 0 
        ? `You have ${overdueTasks.length} overdue task(s) and ${dueTodayTasks.length} task(s) due today requiring immediate focus.`
        : dueTodayTasks.length > 0
          ? `You have ${dueTodayTasks.length} task(s) due today and ${inProgressTasks.length} task(s) currently in progress.`
          : `You currently have ${allTasks.length} active project(s) in your workspace. Keep up the great work!`,
      focusItem: overdueTasks[0]?.title 
        ? `Tackle overdue task "${overdueTasks[0].title}" first before moving to new items.`
        : dueTodayTasks[0]?.title 
          ? `Prioritize task "${dueTodayTasks[0].title}" which is due today.`
          : allTasks[0]?.title
            ? `Review and update progress on project "${allTasks[0].title}".`
            : 'Review your open task list and update task statuses.',
      tip: 'Block out uninterrupted focus time for your highest priority task early in the day.',
      urgencyLevel: overdueTasks.length > 0 ? 'high' : 'medium',
    };

    // Try generating via Organization AI Client or Fallback Client
    try {
      let aiClient: any = null;
      try {
        aiClient = await getAIClientForOrg(session.user.organizationId);
      } catch {
        aiClient = getPerplexityClient();
      }

      if (aiClient) {
        const aiResponse = await aiClient.chat([
          {
            role: 'system',
            content: `You are a high-level executive assistant generating a concise, accurate daily briefing.
            
Generate a structured briefing in this EXACT JSON format:
{
  "greeting": "Short personalized morning message (1 sentence, use their name)",
  "summary": "2-3 sentence clear overview of their projects and tasks for today",
  "focusItem": "The single most critical task they should tackle first today (1 sentence)",
  "tip": "One practical, high-value productivity tip tailored to their workload (1 sentence)",
  "urgencyLevel": "low|medium|high|critical"
}

Be direct, highly practical, precise, and motivating. Base your briefing ONLY on the provided tasks created by or assigned to this user. Return ONLY the raw JSON object.`,
          },
          {
            role: 'user',
            content: `Generate my daily briefing:\n${contextSummary}`,
          },
        ]);

        let jsonStr = String(aiResponse).replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }
        jsonStr = jsonStr.replace(/,\s*([\}\]])/g, '$1');

        let parsed: any = null;
        try {
          parsed = JSON.parse(jsonStr);
        } catch (parseErr) {
          console.warn("Retrying JSON repair for AI Briefing response...");
        }

        if (parsed && typeof parsed === 'object') {
          briefingData = { ...briefingData, ...parsed };
        }
      }
    } catch (aiErr) {
      console.warn('AI Briefing generation error, using smart fallback briefingData:', aiErr);
    }

    // Sanitize urgencyLevel
    if (briefingData.urgencyLevel) {
      const normalized = String(briefingData.urgencyLevel).toLowerCase();
      briefingData.urgencyLevel = ['low', 'medium', 'high', 'critical'].includes(normalized)
        ? normalized
        : overdueTasks.length > 0 ? 'high' : 'medium';
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
        records: (t.records || []).slice(0, 3).map((r: any) => ({
          id: r.id,
          title: r.title,
          stageName: r.stage?.name || r.status || 'To Do',
          priority: r.priority,
        })),
      })),
      dueTodayTasks: dueTodayTasks.slice(0, 3).map((t: any) => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        priority: t.priority,
        records: (t.records || []).slice(0, 3).map((r: any) => ({
          id: r.id,
          title: r.title,
          stageName: r.stage?.name || r.status || 'To Do',
          priority: r.priority,
        })),
      })),
      allTasksWithRecords: allTasks.slice(0, 4).map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        records: (t.records || []).slice(0, 4).map((r: any) => ({
          id: r.id,
          title: r.title,
          stageName: r.stage?.name || r.status || 'To Do',
          priority: r.priority,
        })),
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
