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

    // Try AI generation via organization configured client
    let generatedPlan: any = null;

    try {
      const perplexityClient = await getAIClientForOrg(currentUser.organizationId);

      const systemMessage = `You are Jamure AI, an expert Enterprise Project Management AI.
Your role is to deeply analyze the user's prompt (in Roman Urdu, Hindi, or English) and generate a COMPLETELY CUSTOMIZED, realistic project plan with DYNAMIC STAGES, DYNAMIC TASK CARDS, and INTELLIGENT ASSIGNMENTS specific to the user's domain.

CRITICAL INSTRUCTIONS:
1. DYNAMIC CUSTOM STAGES: Create 3 to 5 custom workflow stages tailored to the user's project domain (e.g. for software: "UI/UX Design", "Frontend Dev", "API Integration", "QA & Launch"; for marketing: "Asset Strategy", "Ad Design", "Campaign Launch", "Analytics"). DO NOT default to generic stages unless no specific domain is given.
2. DYNAMIC SPECIFIC TASKS: Generate 4 to 8 actionable, technical/business task items specific to the prompt. NEVER output vague generic titles like "Task 1" or "Planning & Strategy".
3. MATCH TEAM MEMBERS: If the user prompt mentions any team member names (e.g. "Rahul", "Priya", "Azhar", "Tausif", "Faisal", "Raheem"), match them to the available team member IDs. Otherwise, assign based on workload.
4. RETURN ONLY RAW VALID JSON without markdown code fences or explanatory text.`;

      const userMessage = `Admin Prompt: "${prompt}"

Available Team Members in Organization:
${JSON.stringify(membersSummary, null, 2)}

Target Type: ${target}

Generate JSON with this exact schema:
{
  "projectTitle": "Clear, domain-specific project title derived from prompt",
  "projectDescription": "Comprehensive overview of project goals based on prompt",
  "priority": "HIGH" | "MEDIUM" | "LOW" | "URGENT",
  "deadlineDays": 14,
  "stages": [
    { "name": "Dynamic Stage 1", "color": "#3b82f6" },
    { "name": "Dynamic Stage 2", "color": "#f59e0b" },
    { "name": "Dynamic Stage 3", "color": "#8b5cf6" },
    { "name": "Dynamic Stage 4", "color": "#10b981" }
  ],
  "records": [
    {
      "title": "Specific domain task title",
      "description": "Clear instructions and outcome required",
      "priority": "HIGH" | "MEDIUM" | "LOW" | "URGENT",
      "stageName": "Matching Stage Name from above list",
      "dueDateDays": 3,
      "suggestedAssigneeId": "matching_member_id_or_null",
      "suggestedAssigneeName": "Member Name or Unassigned",
      "assignmentReason": "Why this team member was assigned"
    }
  ]
}`;

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
    if (!generatedPlan || !generatedPlan.records || !Array.isArray(generatedPlan.records) || generatedPlan.records.length === 0) {
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
        description: plan.projectDescription || "Created via Jamure AI",
        priority: plan.priority || "MEDIUM",
        status: "TODO",
        deadline: deadlineDate,
        creatorId: user.id,
        organizationId: user.organizationId || undefined,
        assignments: {
          create: {
            userId: user.id,
          },
        },
      },
    });
    taskId = createdTask.id;
    
    // Emit socket event to creator immediately for real-time list update
    try {
      emitToUser(user.id, "task:assigned", { taskId, taskTitle });
    } catch {}
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
      description: `Jamure AI generated project blueprint with ${createdRecords.length} records.`,
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

// Highly intelligent dynamic fallback generator matching exact user domain & prompt details
function generateSmartFallbackPlan(prompt: string, teamMembers: any[]) {
  const pLower = prompt.toLowerCase();
  
  // Extract project title cleanly from user prompt
  let projectTitle = prompt.trim();
  projectTitle = projectTitle.replace(/^(create|build|make|design|generate|setup)\s+(a|an|the)?\s*/i, "");
  projectTitle = projectTitle.charAt(0).toUpperCase() + projectTitle.slice(1);
  if (projectTitle.length > 60) projectTitle = projectTitle.substring(0, 60) + "...";
  if (!projectTitle) projectTitle = "New AI Project";

  const assignees = teamMembers.length > 0 ? teamMembers : [{ id: null, name: "Unassigned" }];

  // Name matching in user prompt
  const findMentionedMember = (text: string) => {
    for (const member of teamMembers) {
      if (member.name && text.toLowerCase().includes(member.name.toLowerCase())) {
        return member;
      }
    }
    return null;
  };

  let stages = [
    { name: "To Do", color: "#3b82f6" },
    { name: "In Progress", color: "#f59e0b" },
    { name: "In Review", color: "#8b5cf6" },
    { name: "Done", color: "#10b981" },
  ];

  let records: any[] = [];

  // Domain Detection
  if (pLower.includes("mobile") || pLower.includes("app") || pLower.includes("flutter") || pLower.includes("android") || pLower.includes("ios")) {
    stages = [
      { name: "UI/UX Design", color: "#3b82f6" },
      { name: "Mobile Frontend", color: "#8b5cf6" },
      { name: "API & Backend", color: "#f59e0b" },
      { name: "QA & App Store Launch", color: "#10b981" },
    ];
    records = [
      {
        title: `Mobile UI/UX Wireframes & Screen Prototype`,
        description: `Design mobile app user flows, wireframes, and interactive Figma prototype for ${projectTitle}.`,
        priority: "HIGH",
        stageName: "UI/UX Design",
        dueDateDays: 3,
        suggestedAssigneeId: findMentionedMember(prompt)?.id || assignees[0]?.id || null,
        suggestedAssigneeName: findMentionedMember(prompt)?.name || assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for UI/UX mobile design.",
      },
      {
        title: `User Authentication & Profile API Integration`,
        description: `Implement JWT/OAuth login, signup, password reset, and user profile APIs.`,
        priority: "HIGH",
        stageName: "API & Backend",
        dueDateDays: 5,
        suggestedAssigneeId: assignees[1]?.id || assignees[0]?.id || null,
        suggestedAssigneeName: assignees[1]?.name || assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for Backend API integration.",
      },
      {
        title: `Mobile Dashboard & Core App Features Layout`,
        description: `Develop mobile dashboard, navigation bar, state management, and real-time screens.`,
        priority: "HIGH",
        stageName: "Mobile Frontend",
        dueDateDays: 8,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for mobile frontend development.",
      },
      {
        title: `Push Notifications & Analytics Setup`,
        description: `Integrate Firebase push notifications, deep linking, and user event analytics.`,
        priority: "MEDIUM",
        stageName: "API & Backend",
        dueDateDays: 10,
        suggestedAssigneeId: assignees[1]?.id || assignees[0]?.id || null,
        suggestedAssigneeName: assignees[1]?.name || assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for backend notifications setup.",
      },
      {
        title: `Beta Testing & App Store / Play Store Release`,
        description: `Conduct QA regression testing, build APK/IPA release bundles, and submit to store.`,
        priority: "HIGH",
        stageName: "QA & App Store Launch",
        dueDateDays: 14,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for final QA and store release.",
      },
    ];
  } else if (pLower.includes("website") || pLower.includes("web") || pLower.includes("landing") || pLower.includes("redesign")) {
    stages = [
      { name: "Design & Mockups", color: "#3b82f6" },
      { name: "Frontend Development", color: "#8b5cf6" },
      { name: "Backend & APIs", color: "#f59e0b" },
      { name: "SEO & Production Launch", color: "#10b981" },
    ];
    records = [
      {
        title: `Website Wireframes & Layout Mockups`,
        description: `Create responsive webpage layouts and component design tokens.`,
        priority: "HIGH",
        stageName: "Design & Mockups",
        dueDateDays: 3,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for web UI design.",
      },
      {
        title: `Responsive Landing Page & Component Building`,
        description: `Develop main landing page, navigation header, hero section, and responsive CSS.`,
        priority: "HIGH",
        stageName: "Frontend Development",
        dueDateDays: 6,
        suggestedAssigneeId: assignees[1]?.id || assignees[0]?.id || null,
        suggestedAssigneeName: assignees[1]?.name || assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for frontend web development.",
      },
      {
        title: `Contact Form & Webhook Backend Integration`,
        description: `Set up contact form submission handler, database persistence, and email webhooks.`,
        priority: "MEDIUM",
        stageName: "Backend & APIs",
        dueDateDays: 9,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for backend integration.",
      },
      {
        title: `SEO Optimization, Performance Audit & Launch`,
        description: `Optimize PageSpeed score, meta tags, sitemap, SSL certificate, and production deployment.`,
        priority: "HIGH",
        stageName: "SEO & Production Launch",
        dueDateDays: 12,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for SEO and deployment.",
      },
    ];
  } else if (pLower.includes("crm") || pLower.includes("sales") || pLower.includes("lead")) {
    stages = [
      { name: "Lead Capture", color: "#3b82f6" },
      { name: "Sales Pipeline", color: "#f59e0b" },
      { name: "Integrations", color: "#8b5cf6" },
      { name: "Rollout & Training", color: "#10b981" },
    ];
    records = [
      {
        title: `Customer Database & Lead Capture Form Setup`,
        description: `Design lead management database schema, contact fields, and intake forms.`,
        priority: "HIGH",
        stageName: "Lead Capture",
        dueDateDays: 4,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for CRM database setup.",
      },
      {
        title: `Sales Funnel Stages & Pipeline Automation`,
        description: `Configure deal stages, automated email follow-ups, and status movement triggers.`,
        priority: "HIGH",
        stageName: "Sales Pipeline",
        dueDateDays: 7,
        suggestedAssigneeId: assignees[1]?.id || assignees[0]?.id || null,
        suggestedAssigneeName: assignees[1]?.name || assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for sales pipeline automation.",
      },
      {
        title: `WhatsApp & Email Notification Integration`,
        description: `Connect automated notifications for new leads, deal status changes, and reminders.`,
        priority: "MEDIUM",
        stageName: "Integrations",
        dueDateDays: 10,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for channel notifications integration.",
      },
      {
        title: `Sales Team Onboarding & CRM Workflow Documentation`,
        description: `Conduct sales team training session and publish CRM standard operating procedures.`,
        priority: "MEDIUM",
        stageName: "Rollout & Training",
        dueDateDays: 13,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for team onboarding.",
      },
    ];
  } else if (pLower.includes("bug") || pLower.includes("fix") || pLower.includes("issue") || pLower.includes("debug")) {
    stages = [
      { name: "Bug Triage", color: "#3b82f6" },
      { name: "In Fixing", color: "#f59e0b" },
      { name: "Code Review", color: "#8b5cf6" },
      { name: "Verified & Deployed", color: "#10b981" },
    ];
    records = [
      {
        title: `Reproduce Reported Errors & Log Diagnostics`,
        description: `Audit server error logs, reproduce reported bug scenarios, and document tracebacks.`,
        priority: "URGENT",
        stageName: "Bug Triage",
        dueDateDays: 1,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for error log diagnosis.",
      },
      {
        title: `Fix Critical Bug & Code Patch Implementation`,
        description: `Implement bug fix patch, resolve edge-case crashes, and update unit tests.`,
        priority: "HIGH",
        stageName: "In Fixing",
        dueDateDays: 3,
        suggestedAssigneeId: assignees[1]?.id || assignees[0]?.id || null,
        suggestedAssigneeName: assignees[1]?.name || assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for code patch execution.",
      },
      {
        title: `Peer Code Review & QA Regression Verification`,
        description: `Review pull request, verify fix across browsers/devices, and run test suite.`,
        priority: "MEDIUM",
        stageName: "Code Review",
        dueDateDays: 5,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for peer code review.",
      },
      {
        title: `Deploy Hotfix to Production & Stakeholder Sign-off`,
        description: `Deploy verified fix patch to production server and close reported bug issue.`,
        priority: "HIGH",
        stageName: "Verified & Deployed",
        dueDateDays: 6,
        suggestedAssigneeId: assignees[0]?.id || null,
        suggestedAssigneeName: assignees[0]?.name || "Unassigned",
        assignmentReason: "Assigned for production hotfix deployment.",
      },
    ];
  } else {
    // Dynamic prompt clause parser for custom titles
    const cleanPrompt = prompt.replace(/create|build|make|setup|project|with|tasks|and|assigned to|assign/gi, " ").trim();
    const clauses = cleanPrompt.split(/[,;\n\.]+/).map(c => c.trim()).filter(c => c.length > 2);

    stages = [
      { name: "Planning & Design", color: "#3b82f6" },
      { name: "Core Execution", color: "#f59e0b" },
      { name: "Review & Testing", color: "#8b5cf6" },
      { name: "Final Release", color: "#10b981" },
    ];

    if (clauses.length >= 2) {
      records = clauses.slice(0, 6).map((part, idx) => {
        const stageIdx = idx % stages.length;
        const assigneeObj = assignees[idx % assignees.length];
        const taskTitle = part.charAt(0).toUpperCase() + part.slice(1);
        return {
          title: taskTitle,
          description: `Execute ${part} as specified in project goals.`,
          priority: idx === 0 ? "HIGH" : "MEDIUM",
          stageName: stages[stageIdx].name,
          dueDateDays: (idx + 1) * 3,
          suggestedAssigneeId: assigneeObj?.id || null,
          suggestedAssigneeName: assigneeObj?.name || "Unassigned",
          assignmentReason: "Assigned based on prompt requirement.",
        };
      });
    } else {
      records = [
        {
          title: `Requirements Analysis & Architecture: ${projectTitle}`,
          description: `Define functional specifications, architectural scope, and technical roadmap for ${projectTitle}.`,
          priority: "HIGH",
          stageName: "Planning & Design",
          dueDateDays: 2,
          suggestedAssigneeId: assignees[0]?.id || null,
          suggestedAssigneeName: assignees[0]?.name || "Unassigned",
          assignmentReason: "Assigned for planning and architecture.",
        },
        {
          title: `Core Module Implementation & Asset Delivery`,
          description: `Develop primary features and deliver core components for ${projectTitle}.`,
          priority: "HIGH",
          stageName: "Core Execution",
          dueDateDays: 5,
          suggestedAssigneeId: assignees[1]?.id || assignees[0]?.id || null,
          suggestedAssigneeName: assignees[1]?.name || assignees[0]?.name || "Unassigned",
          assignmentReason: "Assigned for core development.",
        },
        {
          title: `Quality Review & Integration Audit`,
          description: `Conduct end-to-end testing, audit code quality, and verify specifications for ${projectTitle}.`,
          priority: "MEDIUM",
          stageName: "Review & Testing",
          dueDateDays: 8,
          suggestedAssigneeId: assignees[0]?.id || null,
          suggestedAssigneeName: assignees[0]?.name || "Unassigned",
          assignmentReason: "Assigned for quality review.",
        },
        {
          title: `Final Rollout & Documentation Sign-off`,
          description: `Finalize documentation, train users, and execute final release for ${projectTitle}.`,
          priority: "MEDIUM",
          stageName: "Final Release",
          dueDateDays: 12,
          suggestedAssigneeId: assignees[0]?.id || null,
          suggestedAssigneeName: assignees[0]?.name || "Unassigned",
          assignmentReason: "Assigned for final rollout.",
        },
      ];
    }
  }

  return {
    projectTitle,
    projectDescription: `Project plan generated by Jamure AI for: "${prompt}".`,
    priority: "HIGH",
    deadlineDays: 14,
    stages,
    records,
  };
}
