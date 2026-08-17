import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PerplexityClient } from "@/lib/perplexity-client";
import { emitToUser } from "@/lib/socket-server";

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        organization: { select: { aiEnabled: true } },
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (currentUser.organization?.aiEnabled === false) {
      return NextResponse.json({ error: "AI features are disabled for this organization" }, { status: 403 });
    }

    const body = await req.json();
    const {
      prompt,
      mode = "preview", // "preview" | "execute"
      target = "NEW_PROJECT", // "NEW_PROJECT" | "EXISTING_PROJECT"
      parentTaskId = null,
      autoAssign = true,
      customData = null, // Pre-reviewed data for direct execution
    } = body;

    // Fetch team members in organization for auto-assignment suggestions
    const teamMembers = await db.user.findMany({
      where: {
        organizationId: currentUser.organizationId || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        assignedTasks: {
          select: { id: true },
        },
      },
    });

    const membersSummary = teamMembers.map((m) => ({
      id: m.id,
      name: m.name || m.email,
      role: m.role,
      activeTasksCount: m.assignedTasks?.length || 0,
    }));

    // Mode: Execute directly if customData is provided
    if (mode === "execute" && customData) {
      const result = await executeProjectCreation(
        customData,
        currentUser,
        target,
        parentTaskId
      );
      return NextResponse.json(result);
    }

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "A prompt is required for AI generation" }, { status: 400 });
    }

    // Try AI generation via PerplexityClient
    let generatedPlan: any = null;

    try {
      const perplexityClient = new PerplexityClient();

      const systemMessage = `You are an expert AI Project Manager Co-Pilot for an enterprise task management platform.
Your task is to convert administrative requests into structured, actionable project plans with tasks, stages, and intelligent team assignments.
Return ONLY valid raw JSON without any markdown code fences, comments, or extra text.`;

      const userMessage = `Request from Admin: "${prompt}"

Available Team Members in Organization:
${JSON.stringify(membersSummary, null, 2)}

Target Type: ${target}

Generate a JSON object with this exact structure:
{
  "projectTitle": "Short professional project title",
  "projectDescription": "Detailed overview of the project and goals",
  "priority": "HIGH" | "MEDIUM" | "LOW" | "URGENT",
  "deadlineDays": 14,
  "stages": [
    { "name": "To Do", "color": "#3b82f6" },
    { "name": "In Progress", "color": "#f59e0b" },
    { "name": "In Review", "color": "#8b5cf6" },
    { "name": "Done", "color": "#10b981" }
  ],
  "records": [
    {
      "title": "Clear actionable task title",
      "description": "Specific instructions or outcome required",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "stageName": "To Do",
      "dueDateDays": 3,
      "suggestedAssigneeId": "member_id_from_above_or_null",
      "suggestedAssigneeName": "Member Name or Unassigned",
      "assignmentReason": "Brief explanation why this member was assigned"
    }
  ]
}

Assign tasks to team members with lower activeTasksCount where appropriate based on skills/roles. Ensure at least 3-6 records are created.`;

      const aiResponse = await perplexityClient.chat([
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ]);

      if (typeof aiResponse === "string") {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          generatedPlan = JSON.parse(jsonMatch[0]);
        } else {
          generatedPlan = JSON.parse(aiResponse);
        }
      } else if (typeof aiResponse === "object") {
        generatedPlan = aiResponse;
      }
    } catch (aiErr) {
      console.warn("AI Generation failed, using smart rule-based fallback:", aiErr);
    }

    // Fallback if AI generation failed or returned invalid format
    if (!generatedPlan || !generatedPlan.records || !Array.isArray(generatedPlan.records)) {
      generatedPlan = generateSmartFallbackPlan(prompt, membersSummary);
    }

    // Validate assignee IDs exist in organization
    const validMemberIds = new Set(teamMembers.map((m) => m.id));
    if (generatedPlan.records) {
      generatedPlan.records = generatedPlan.records.map((r: any) => {
        const isValid = r.suggestedAssigneeId && validMemberIds.has(r.suggestedAssigneeId);
        return {
          ...r,
          suggestedAssigneeId: isValid ? r.suggestedAssigneeId : null,
          suggestedAssigneeName: isValid
            ? r.suggestedAssigneeName || teamMembers.find((m) => m.id === r.suggestedAssigneeId)?.name
            : "Unassigned",
        };
      });
    }

    // If mode is execute directly with previewed plan
    if (mode === "execute") {
      const result = await executeProjectCreation(
        generatedPlan,
        currentUser,
        target,
        parentTaskId
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({
      success: true,
      plan: generatedPlan,
      teamMembers: membersSummary,
    });
  } catch (error: any) {
    console.error("Admin AI Generator Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate AI plan" },
      { status: 500 }
    );
  }
}

// Function to execute creation of Task Project, Stages, Records, and Assignments in DB
async function executeProjectCreation(
  plan: any,
  user: any,
  target: string,
  existingTaskId?: string | null
) {
  let taskId = existingTaskId;
  let taskTitle = plan.projectTitle || "AI Generated Project";

  // 1. Create Parent Task/Project if NEW_PROJECT
  if (target === "NEW_PROJECT" || !taskId) {
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + (plan.deadlineDays || 14));

    const createdTask = await db.task.create({
      data: {
        title: taskTitle,
        description: plan.projectDescription || "Created via AI TaskFlow Co-Pilot",
        priority: plan.priority || "MEDIUM",
        status: "TODO",
        deadline: deadlineDate,
        creatorId: user.id,
        organizationId: user.organizationId || undefined,
      },
    });
    taskId = createdTask.id;
  } else {
    const existing = await db.task.findUnique({ where: { id: taskId } });
    if (existing) {
      taskTitle = existing.title;
    }
  }

  // 2. Fetch or Create Stages for this task
  let existingStages = await db.stage.findMany({
    where: { taskId: taskId! },
  });

  const defaultStages = plan.stages || [
    { name: "To Do", color: "#3b82f6" },
    { name: "In Progress", color: "#f59e0b" },
    { name: "In Review", color: "#8b5cf6" },
    { name: "Done", color: "#10b981" },
  ];

  if (existingStages.length === 0) {
    for (let i = 0; i < defaultStages.length; i++) {
      const s = defaultStages[i];
      const stage = await db.stage.create({
        data: {
          name: s.name,
          color: s.color || "#3b82f6",
          taskId: taskId!,
          order: i,
        },
      });
      existingStages.push(stage);
    }
  }

  const stageMap = new Map<string, string>();
  existingStages.forEach((st) => {
    stageMap.set(st.name.toLowerCase().trim(), st.id);
  });
  const defaultStageId = existingStages[0]?.id;

  // 3. Create Records & Assignments
  const createdRecords = [];
  const recordsToCreate = plan.records || [];

  for (const rec of recordsToCreate) {
    let targetStageId = defaultStageId;
    if (rec.stageName && stageMap.has(rec.stageName.toLowerCase().trim())) {
      targetStageId = stageMap.get(rec.stageName.toLowerCase().trim())!;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (rec.dueDateDays || 3));

    const assigneeIds = rec.suggestedAssigneeId ? [rec.suggestedAssigneeId] : [];

    const newRecord = await db.record.create({
      data: {
        title: rec.title,
        description: rec.description || "",
        priority: rec.priority || "MEDIUM",
        status: rec.stageName || "To Do",
        stageId: targetStageId,
        parentTaskId: taskId!,
        createdBy: user.id,
        dueDate,
        assignees: assigneeIds.length > 0 ? {
          create: assigneeIds.map((uId: string) => ({
            userId: uId,
            taskId: taskId!,
          })),
        } : undefined,
      },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    createdRecords.push(newRecord);

    // Also add task level assignment if not present
    if (assigneeIds.length > 0) {
      for (const uId of assigneeIds) {
        try {
          await db.taskAssignment.create({
            data: {
              taskId: taskId!,
              userId: uId,
            },
          });
        } catch {
          // ignore duplicate task level assignment
        }

        // Notify assigned user
        try {
          const notification = await db.notification.create({
            data: {
              type: "TASK_ASSIGNED",
              content: `You were assigned to AI record "${rec.title}" in project: ${taskTitle}`,
              userId: uId,
              taskId: taskId!,
            },
          });
          emitToUser(uId, "new-notification", notification);
          emitToUser(uId, "task:assigned", { taskId, taskTitle });
        } catch (e) {
          console.error("Failed to notify user:", e);
        }
      }
    }
  }

  // Log Activity
  await db.taskActivity.create({
    data: {
      taskId: taskId!,
      userId: user.id,
      type: "ai_generation",
      description: `AI Co-Pilot generated project blueprint with ${createdRecords.length} records.`,
    },
  });

  return {
    success: true,
    taskId,
    taskTitle,
    recordsCreated: createdRecords.length,
    records: createdRecords,
  };
}

// Fallback plan generator for offline/unconfigured environments
function generateSmartFallbackPlan(prompt: string, teamMembers: any[]) {
  const title = prompt.length > 40 ? prompt.substring(0, 40) + "..." : prompt;
  const assignees = teamMembers.length > 0 ? teamMembers : [{ id: null, name: "Unassigned" }];

  return {
    projectTitle: `Project: ${title}`,
    projectDescription: `Automated project plan created for admin request: "${prompt}". Includes task breakdown, stage allocations, and team member assignments.`,
    priority: "HIGH",
    deadlineDays: 14,
    stages: [
      { name: "To Do", color: "#3b82f6" },
      { name: "In Progress", color: "#f59e0b" },
      { name: "In Review", color: "#8b5cf6" },
      { name: "Done", color: "#10b981" },
    ],
    records: [
      {
        title: `Planning & Strategy: ${title}`,
        description: `Initial planning, domain requirements, and objective alignment for ${title}.`,
        priority: "HIGH",
        stageName: "To Do",
        dueDateDays: 2,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned based on available workload capacity.",
      },
      {
        title: `Implementation & Development`,
        description: `Execute core tasks and deliver key assets for ${title}.`,
        priority: "HIGH",
        stageName: "In Progress",
        dueDateDays: 5,
        suggestedAssigneeId: assignees[1]?.id || assignees[0]?.id || null,
        suggestedAssigneeName: assignees[1]?.name || assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for development execution.",
      },
      {
        title: `Quality Assurance & Review`,
        description: `Audit, review code/work, and verify specifications for ${title}.`,
        priority: "MEDIUM",
        stageName: "In Review",
        dueDateDays: 8,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for QA and administrative sign-off.",
      },
      {
        title: `Final Deployment & Admin Sign-off`,
        description: `Finalize documentation, release assets, and notify stakeholders.`,
        priority: "MEDIUM",
        stageName: "To Do",
        dueDateDays: 12,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for final sign-off.",
      },
    ],
  };
}
