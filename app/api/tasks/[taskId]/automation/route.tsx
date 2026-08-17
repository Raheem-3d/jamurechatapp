import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { invalidateAutomationCache } from "@/lib/automation-engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  const session = await getServerSession(authOptions);
  const user: any = (session as any)?.user || {};
  if (!user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const taskId = resolvedParams.taskId;

  try {
    const {
      name,
      trigger,
      conditions,
      actions,
      enabled = true,
      applyToAll = false,
      stopOnFirst = false,
    } = await request.json();

    if (!name || !trigger || !conditions || !actions) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newRule = await db.automationRule.create({
      data: {
        name,
        trigger,
        conditions,
        actions,
        enabled,
        applyToAll,
        stopOnFirst,
        user: { connect: { id: user.id } },
        projectId: taskId,
      },
    });

    await invalidateAutomationCache(taskId);

    return NextResponse.json({ rule: newRule }, { status: 201 });
  } catch (error) {
    console.error("Error creating automation rule:", error);
    return NextResponse.json(
      { error: "Failed to create automation rule" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  const session = await getServerSession(authOptions);
  const user: any = (session as any)?.user || {};
  if (!user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const taskId = resolvedParams.taskId;

  try {
    const rules = await db.automationRule.findMany({
      where: {
        userId: user.id,
        OR: [{ projectId: taskId }, { applyToAll: true }],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rules }, { status: 200 });
  } catch (error) {
    console.error("Error fetching automation rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch automation rules" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  const session = await getServerSession(authOptions);
  const user: any = (session as any)?.user || {};
  if (!user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const taskId = resolvedParams?.taskId;

  try {
    const body = await request.json();
    const { id, name, trigger, conditions, actions, enabled, applyToAll, stopOnFirst } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing rule ID" },
        { status: 400 }
      );
    }

    const existingRule = await db.automationRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const updatedRule = await db.automationRule.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(trigger !== undefined && { trigger }),
        ...(conditions !== undefined && { conditions }),
        ...(actions !== undefined && { actions }),
        ...(enabled !== undefined && { enabled }),
        ...(applyToAll !== undefined && { applyToAll }),
        ...(stopOnFirst !== undefined && { stopOnFirst }),
      },
    });

    await invalidateAutomationCache(taskId);

    return NextResponse.json({ rule: updatedRule }, { status: 200 });
  } catch (error) {
    console.error("Error updating automation rule:", error);
    return NextResponse.json(
      { error: "Failed to update automation rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  const session = await getServerSession(authOptions);
  const user: any = (session as any)?.user || {};
  if (!user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const taskId = resolvedParams?.taskId;

  const { searchParams } = new URL(request.url);
  const ruleId = searchParams.get("id");

  if (!ruleId) {
    return NextResponse.json({ error: "Rule ID is required" }, { status: 400 });
  }

  try {
    await db.automationRule.delete({
      where: { id: ruleId },
    });

    await invalidateAutomationCache(taskId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting automation rule:", error);
    return NextResponse.json(
      { error: "Failed to delete automation rule" },
      { status: 500 }
    );
  }
}
