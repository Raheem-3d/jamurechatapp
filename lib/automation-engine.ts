import { db } from "@/lib/db";
import { emitToUser } from "@/lib/socket-server";
import { cacheGet, cacheSet, cacheDel, pushCacheList } from "@/lib/redis";
import { produceKafkaEvent } from "@/lib/kafka";
import { AutomationRule, Task } from "@prisma/client";

// ==================== Type Definitions ====================
export type TriggerType =
  | "status_change"
  | "stage_change"
  | "priority_change"
  | "due_date_approaching"
  | "due_date_passed"
  | "task_created"
  | "task_assigned"
  | "tag_added"
  | "comment_added"
  | "file_uploaded"
  | "specific_task"
  | "time_based"
  | "completion_percentage"
  | "manual"
  | string;

export type Operator =
  | "equals"
  | "not_equals"
  | "contains"
  | "does_not_contain"
  | "greater_than"
  | "less_than"
  | "is_set"
  | "is_not_set"
  | "before"
  | "after";

export interface RuleCondition {
  field: string;
  operator: Operator | string;
  value: any;
}

export interface RuleAction {
  type: string;
  value: any;
  metadata?: Record<string, any>;
}

export interface TaskWithRelations extends Partial<Task> {
  id?: string;
  title?: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  stageId?: string | null;
  parentTaskId?: string | null;
  taskId?: string | null;
  dueDate?: Date | string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  isComplete?: boolean;
  createdBy?: string;
  tags?: any[];
  assignees?: any[];
  stage?: any;
}

export interface AutomationContext {
  previousTask: TaskWithRelations;
  currentTask: TaskWithRelations;
  changes?: Record<string, any>;
  userId?: string;
}

// ==================== Logging Helper ====================
const logger = {
  info: (msg: string, data?: any) => console.log(`[AUTOMATION INFO] ${msg}`, data ? JSON.stringify(data) : ""),
  debug: (msg: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[AUTOMATION DEBUG] ${msg}`, data ? JSON.stringify(data) : "");
    }
  },
  error: (msg: string, err?: any) => console.error(`[AUTOMATION ERROR] ${msg}`, err),
};

function normalizeStatusStr(val: any): string {
  if (val === undefined || val === null) return "";
  return String(val)
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "_");
}

// ==================== Trigger Evaluator ====================
export function evaluateTrigger(
  trigger: TriggerType,
  prev: TaskWithRelations,
  curr: TaskWithRelations,
  changes?: Record<string, any>
): boolean {
  const normTrigger = String(trigger || "")
    .toLowerCase()
    .trim()
    .replace(/[\s\/-]+/g, "_");

  switch (normTrigger) {
    case "status_change":
    case "status_changes":
    case "change_status":
    case "task_status_changes": {
      if (changes?.status && prev?.status) {
        return normalizeStatusStr(prev.status) !== normalizeStatusStr(changes.status);
      }
      if (curr?.status && prev?.status) {
        return normalizeStatusStr(prev.status) !== normalizeStatusStr(curr.status);
      }
      return Boolean(changes?.status || curr?.status);
    }

    case "stage_change":
    case "stage_changed":
    case "move_stage":
    case "stage_board_moves": {
      const pStage = prev?.stageId || prev?.stage?.id;
      const cStage = curr?.stageId || curr?.stage?.id;
      if (!cStage) return false;
      if (!pStage) return true; // Newly created record entering stage (e.g. Stage 2)
      return String(pStage) !== String(cStage);
    }

    case "priority_change":
    case "priority_updated":
    case "priority_updates": {
      if (!prev || !prev.priority) return false;
      return String(prev.priority).toLowerCase() !== String(curr.priority || "").toLowerCase();
    }

    case "task_assigned":
    case "assign_user":
    case "task_assignment": {
      const extractIds = (list?: any[]) =>
        (list || [])
          .map((a: any) => String(a.userId || a.id || a))
          .sort()
          .join(",");
      const prevUsers = extractIds(prev?.assignees);
      const currUsers = extractIds(curr?.assignees);
      return currUsers.length > 0 && prevUsers !== currUsers;
    }

    case "due_date_approaching": {
      if (!curr.dueDate) return false;
      const due = new Date(curr.dueDate).getTime();
      const now = Date.now();
      const diffHours = (due - now) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 24;
    }

    case "due_date_passed": {
      if (!curr.dueDate) return false;
      return new Date(curr.dueDate).getTime() < Date.now();
    }

    case "task_created":
    case "new_task_created": {
      return changes?.isNew === true || !prev || !prev.id;
    }

    case "tag_added":
    case "add_tag": {
      const getTagIdentifier = (t: any) => {
        if (typeof t === "string") return t.toLowerCase().trim();
        return String(t?.id || t?.name || "").toLowerCase().trim();
      };
      const prevTagIds = new Set(
        (prev?.tags || []).map(getTagIdentifier).filter(Boolean)
      );
      const currTags = curr?.tags || [];
      const addedTags = currTags.filter((t: any) => {
        const id = getTagIdentifier(t);
        return id && !prevTagIds.has(id);
      });
      const changesTags = Array.isArray(changes?.tags) ? changes.tags : [];
      return (
        addedTags.length > 0 ||
        (changesTags.length > 0 &&
          changesTags.some((t: any) => !prevTagIds.has(getTagIdentifier(t))))
      );
    }

    case "specific_task":
    case "specific_record":
    case "time_based":
    case "manual":
      return true;

    default:
      return true;
  }
}

// ==================== Condition Evaluator Engine ====================
export function evaluateConditions(
  rawConditions: any,
  prev: TaskWithRelations,
  curr: TaskWithRelations,
  rule?: AutomationRule
): boolean {
  let conditions: RuleCondition[] = [];
  if (typeof rawConditions === "string") {
    try {
      conditions = JSON.parse(rawConditions);
    } catch {
      return true;
    }
  } else if (Array.isArray(rawConditions)) {
    conditions = rawConditions;
  }

  if (!conditions || conditions.length === 0) return true;

  for (const condition of conditions) {
    const { field, operator, value } = condition;

    // Ignore wildcard "any" values
    if (value === undefined || value === null || value === "" || value === "any" || String(value).toLowerCase().includes("any")) {
      continue;
    }

    const isMatch = checkSingleCondition(field, operator, value, prev, curr, rule);
    if (!isMatch) {
      logger.debug(`[Condition Failed] Rule: ${rule?.name || "unnamed"}, Field: ${field}, Op: ${operator}, Expected: ${value}`);
      return false;
    }
  }

  return true;
}

function checkSingleCondition(
  field: string,
  operator: string,
  expectedVal: any,
  prev: TaskWithRelations,
  curr: TaskWithRelations,
  rule?: AutomationRule
): boolean {
  const normField = String(field || "").toLowerCase().trim();
  const normOp = String(operator || "equals").toLowerCase().trim();

  // Extract actual field values from enriched state
  let actualVal: any = undefined;

  switch (normField) {
    case "from_status": {
      const act = normalizeStatusStr(prev?.status);
      const exp = normalizeStatusStr(expectedVal);
      if (!act) return true; // allow match if previous status was not tracked
      return normOp === "not_equals" ? act !== exp : act === exp;
    }

    case "to_status":
    case "status": {
      const act = normalizeStatusStr(curr?.status ?? prev?.status);
      const exp = normalizeStatusStr(expectedVal);
      return normOp === "not_equals" ? act !== exp : act === exp;
    }

    case "from_stage": {
      const stageId = prev?.stageId || prev?.stage?.id;
      const stageName = prev?.stage?.name;
      const exp = String(expectedVal || "").toLowerCase().trim();
      const matches =
        (stageId && String(stageId).toLowerCase().trim() === exp) ||
        (stageName && String(stageName).toLowerCase().trim() === exp);
      return normOp === "not_equals" ? !matches : matches;
    }

    case "to_stage":
    case "stage":
    case "stage_id": {
      const stageId = curr?.stageId || curr?.stage?.id || prev?.stageId || prev?.stage?.id;
      const stageName = curr?.stage?.name || prev?.stage?.name;
      const exp = String(expectedVal || "").toLowerCase().trim();
      const matches =
        (stageId && String(stageId).toLowerCase().trim() === exp) ||
        (stageName && String(stageName).toLowerCase().trim() === exp);
      return normOp === "not_equals" ? !matches : matches;
    }

    case "to_priority":
    case "priority":
      actualVal = curr?.priority ?? prev?.priority;
      break;

    case "task_id":
    case "record_id": {
      const expectedStr = String(expectedVal).trim();
      if (!expectedStr || expectedStr === "all" || expectedStr === "any") return true;
      const matches =
        String(curr?.id || "") === expectedStr ||
        String(curr?.title || "").toLowerCase().trim() === expectedStr.toLowerCase() ||
        String(curr?.parentTaskId || "") === expectedStr ||
        String(curr?.taskId || "") === expectedStr ||
        String(prev?.id || "") === expectedStr ||
        String(rule?.taskId || "") === expectedStr ||
        String(rule?.projectId || "") === expectedStr;
      return normOp === "not_equals" ? !matches : matches;
    }

    case "assigned_to": {
      const assignees = curr?.assignees || prev?.assignees || [];
      const expectedStr = String(expectedVal).trim();
      const hasUser = assignees.some(
        (a: any) =>
          String(a.userId || a.id || a) === expectedStr ||
          String(a.user?.id || "") === expectedStr
      );
      return normOp === "not_equals" ? !hasUser : hasUser;
    }

    case "has_tag":
    case "tag_added":
    case "tag": {
      const tags = curr?.tags || prev?.tags || [];
      const expectedStr = String(expectedVal).toLowerCase().trim();
      if (!expectedStr || expectedStr === "any" || expectedStr === "all") return true;

      const hasTag = tags.some((t: any) => {
        if (typeof t === "string") return t.toLowerCase().trim() === expectedStr;
        const idStr = String(t?.id || "").toLowerCase().trim();
        const nameStr = String(t?.name || "").toLowerCase().trim();
        return idStr === expectedStr || nameStr === expectedStr;
      });
      return normOp === "not_equals" ? !hasTag : hasTag;
    }

    case "days_before": {
      if (!curr?.dueDate) return false;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const due = new Date(curr.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      actualVal = diffDays;
      break;
    }

    default:
      actualVal = (curr as any)[field] ?? (prev as any)[field];
      break;
  }

  // Operator checks
  switch (normOp) {
    case "is_set":
      return actualVal !== undefined && actualVal !== null && actualVal !== "";

    case "is_not_set":
      return actualVal === undefined || actualVal === null || actualVal === "";

    case "equals":
    case "equal":
    case "==":
    case "===":
      if (actualVal === undefined || actualVal === null) return false;
      return String(actualVal).toLowerCase().trim() === String(expectedVal).toLowerCase().trim();

    case "not_equals":
    case "not_equal":
    case "!=":
    case "!==":
      if (actualVal === undefined || actualVal === null) return true;
      return String(actualVal).toLowerCase().trim() !== String(expectedVal).toLowerCase().trim();

    case "contains":
    case "includes":
      if (Array.isArray(actualVal)) {
        return actualVal.some((item) =>
          String(typeof item === "object" ? item.id || item.name : item)
            .toLowerCase()
            .includes(String(expectedVal).toLowerCase())
        );
      }
      if (actualVal === undefined || actualVal === null) return false;
      return String(actualVal).toLowerCase().includes(String(expectedVal).toLowerCase());

    case "does_not_contain":
      if (actualVal === undefined || actualVal === null) return true;
      return !String(actualVal).toLowerCase().includes(String(expectedVal).toLowerCase());

    case "greater_than":
    case ">":
      return Number(actualVal) > Number(expectedVal);

    case "less_than":
    case "<":
      return Number(actualVal) < Number(expectedVal);

    case "before":
      if (!actualVal) return false;
      return new Date(actualVal).getTime() < new Date(expectedVal).getTime();

    case "after":
      if (!actualVal) return false;
      return new Date(actualVal).getTime() > new Date(expectedVal).getTime();

    default:
      return String(actualVal).toLowerCase().trim() === String(expectedVal).toLowerCase().trim();
  }
}

// Helper to invalidate Redis rules cache
export async function invalidateAutomationCache(taskId?: string): Promise<void> {
  if (taskId) {
    await cacheDel(`automation:rules:${taskId}`);
  }
}

// ==================== Main Automation Engine Entrypoint ====================
export async function runAutomationEngine(context: AutomationContext): Promise<void> {
  const startTime = Date.now();
  const currentId = context.currentTask.id;
  const parentId = context.currentTask.parentTaskId || context.currentTask.taskId;

  if (!currentId) return;

  logger.info(`Starting automation evaluation for task: ${currentId}`);

  // 1️⃣ Try fetching active rules from Redis cache first
  const cacheKey = `automation:rules:${currentId}:${parentId || 'global'}`;
  let rules = await cacheGet<AutomationRule[]>(cacheKey);

  if (!rules) {
    rules = await db.automationRule.findMany({
      where: {
        enabled: true,
        OR: [
          { applyToAll: true },
          { projectId: { in: [currentId, parentId].filter(Boolean) as string[] } },
          { taskId: { in: [currentId, parentId].filter(Boolean) as string[] } },
        ],
      },
    });

    if (rules && rules.length > 0) {
      await cacheSet(cacheKey, rules, 300); // Cache for 5 minutes
    }
  }

  if (!rules || rules.length === 0) {
    logger.debug("No active automation rules found for task.");
    return;
  }

  logger.info(`Evaluating ${rules.length} active automation rules (Redis/DB).`);

  for (const rule of rules) {
    // 2️⃣ Trigger Match Check
    const isTriggerMatched = evaluateTrigger(
      rule.trigger,
      context.previousTask,
      context.currentTask,
      context.changes
    );

    if (!isTriggerMatched) {
      logger.debug(`[Trigger Mismatch] Rule: "${rule.name}" (Trigger: ${rule.trigger})`);
      continue;
    }

    // 3️⃣ Condition Match Check
    const isConditionMatched = evaluateConditions(
      rule.conditions,
      context.previousTask,
      context.currentTask,
      rule
    );

    if (!isConditionMatched) {
      logger.debug(`[Conditions Mismatch] Rule: "${rule.name}"`);
      continue;
    }

    // 4️⃣ Rule Matched -> Execute Actions
    logger.info(`🚀 [Rule Matched] Executing actions for rule: "${rule.name}"`);

    await executeRuleActions(context.currentTask, rule, context.userId || "system");

    // 5️⃣ Broadcast real-time Socket.io event
    try {
      const { getSocketIO } = require("@/lib/socket-server");
      const socketIO = getSocketIO();
      if (socketIO) {
        socketIO.emit("automation:executed", {
          ruleId: rule.id,
          ruleName: rule.name,
          taskId: currentId,
          parentTaskId: parentId,
          trigger: rule.trigger,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e) {
      // Non-fatal fallback
    }

    // 6️⃣ Broadcast real-time Kafka event (non-blocking)
    produceKafkaEvent("task-automation-events", {
      type: "automation_applied",
      ruleId: rule.id,
      ruleName: rule.name,
      taskId: currentId,
      parentTaskId: parentId,
      trigger: rule.trigger,
      actions: rule.actions,
      userId: context.userId || "system",
      timestamp: new Date().toISOString(),
    });

    // 6️⃣ Store execution record in Redis list history (non-blocking)
    pushCacheList(`automation:history:${currentId}`, {
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger,
      executedAt: new Date().toISOString(),
      userId: context.userId || "system",
    }, 50);

    // 7️⃣ Asynchronously update lastTriggered in DB
    void db.automationRule
      .update({
        where: { id: rule.id },
        data: { lastTriggered: new Date() },
      })
      .catch((err) => logger.error(`Failed to update lastTriggered for rule ${rule.id}`, err));

    if (rule.stopOnFirst) {
      logger.info(`Stopping rule execution chain (stopOnFirst = true) on rule: "${rule.name}"`);
      break;
    }
  }

  const duration = Date.now() - startTime;
  logger.info(`Automation evaluation finished in ${duration}ms.`);
}

// ==================== Action Execution Engine ====================
async function executeRuleActions(
  task: TaskWithRelations,
  rule: AutomationRule,
  userId: string
): Promise<void> {
  const rawActions = rule.actions;
  let actions: RuleAction[] = [];
  if (typeof rawActions === "string") {
    try {
      actions = JSON.parse(rawActions);
    } catch {
      return;
    }
  } else if (Array.isArray(rawActions)) {
    actions = rawActions as RuleAction[];
  }

  if (!actions || actions.length === 0) return;

  try {
    await db.$transaction(async (tx: any) => {
      // 🎯 Track the target record ID across sequential actions!
      // If an action creates a new task (create_subtask / create_task), we save its ID as createdRecordId.
      let lastCreatedRecordId: string | null = null;

      for (const action of actions) {
        if (!action.type) continue;

        try {
          // Determine the target ID for this action:
          // If a record was created in a previous action of this rule, actions apply to that created record!
          const targetId = lastCreatedRecordId || task.id;

          logger.info(`Applying action [${action.type}] to target ${targetId}`, { value: action.value });

          switch (action.type) {
            case "create_subtask":
            case "create_task":
              if (action.value) {
                const createdRecord = await tx.record.create({
                  data: {
                    title: String(action.value),
                    parentTaskId: task.parentTaskId || task.id!,
                    stageId: task.stageId,
                    createdBy: userId || task.createdBy || "system",
                    priority: task.priority || "MEDIUM",
                    status: "not_started",
                  },
                });
                lastCreatedRecordId = createdRecord.id;
                logger.info(`Created record ${createdRecord.id} via automation action [${action.type}]`);
              }
              break;

            case "move_stage":
              if (action.value) {
                const val = String(action.value).trim();
                let targetStage = await tx.stage.findFirst({
                  where: {
                    OR: [
                      { id: val },
                      { name: val },
                      { name: { contains: val } },
                    ],
                  },
                  select: { id: true },
                });

                const targetStageId = targetStage?.id || val;

                await tx.record.update({
                  where: { id: targetId },
                  data: { stageId: targetStageId },
                });
              }
              break;

            case "change_status":
            case "status_change":
            case "status_changes":
              if (action.value) {
                const statusVal = String(action.value);
                await tx.record.update({
                  where: { id: targetId },
                  data: {
                    status: statusVal,
                    isComplete: statusVal.toLowerCase() === "completed",
                  },
                });
              }
              break;

            case "assign_user":
            case "assign_users":
            case "user_assignment":
            case "assign":
              if (action.value) {
                await tx.taskAssignment.deleteMany({
                  where: { recordId: targetId },
                });
                const rawTokens = Array.isArray(action.value)
                  ? action.value
                  : String(action.value).split(",");

                for (const token of rawTokens) {
                  const trimmedToken = String(token).trim();
                  if (!trimmedToken) continue;

                  const userMatch = await tx.user.findFirst({
                    where: {
                      OR: [
                        { id: trimmedToken },
                        { name: trimmedToken },
                        { email: trimmedToken },
                        { name: { contains: trimmedToken } },
                      ],
                    },
                    select: { id: true },
                  });

                  const targetUserId = userMatch?.id || trimmedToken;

                  try {
                    await tx.taskAssignment.create({
                      data: {
                        recordId: targetId!,
                        taskId: task.parentTaskId || task.taskId || task.id!,
                        userId: targetUserId,
                      },
                    });
                    logger.info(`Assigned user ${targetUserId} to record ${targetId}`);
                  } catch (assignErr) {
                    logger.error(`Failed to assign user ${targetUserId}`, assignErr);
                  }
                }
              }
              break;

            case "set_due_date":
              if (action.value) {
                let targetDate: Date;
                const rawVal = String(action.value).trim();
                if (!isNaN(Number(rawVal)) && Number(rawVal) < 10000) {
                  const days = Number(rawVal);
                  targetDate = new Date();
                  targetDate.setDate(targetDate.getDate() + days);
                } else {
                  targetDate = new Date(rawVal);
                }

                if (!isNaN(targetDate.getTime())) {
                  await tx.record.update({
                    where: { id: targetId },
                    data: { dueDate: targetDate },
                  });
                  logger.info(`Set due date ${targetDate.toISOString()} for record ${targetId}`);
                }
              }
              break;

            case "extend_due_date":
              if (action.value) {
                const days = parseInt(String(action.value).replace(/[^0-9-]/g, "")) || 1;
                const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
                const newDue = new Date(baseDate);
                newDue.setDate(newDue.getDate() + days);
                await tx.record.update({
                  where: { id: targetId },
                  data: { dueDate: newDue },
                });
              }
              break;

            case "set_priority":
              if (action.value) {
                await tx.record.update({
                  where: { id: targetId },
                  data: { priority: String(action.value) },
                });
              }
              break;

            case "add_tag":
              if (action.value) {
                const tagName = String(action.value).trim();
                let tag = await tx.tag.findFirst({
                  where: { OR: [{ id: tagName }, { name: tagName }] },
                });
                if (!tag) {
                  tag = await tx.tag.create({ data: { name: tagName } });
                }
                await tx.record.update({
                  where: { id: targetId },
                  data: { tags: { connect: { id: tag.id } } },
                });
              }
              break;

            case "remove_tag":
            case "remove_all_tags":
              if (
                action.type === "remove_all_tags" ||
                String(action.value).trim() === "all" ||
                String(action.value).trim() === "ALL" ||
                String(action.value).trim() === "*"
              ) {
                await tx.record.update({
                  where: { id: targetId },
                  data: { tags: { set: [] } },
                });
                logger.info(`Removed all tags from record ${targetId}`);
              } else if (action.value) {
                const tagVal = String(action.value).trim();
                const tagToRemove = await tx.tag.findFirst({
                  where: { OR: [{ id: tagVal }, { name: tagVal }] },
                });
                if (tagToRemove) {
                  await tx.record.update({
                    where: { id: targetId },
                    data: { tags: { disconnect: { id: tagToRemove.id } } },
                  });
                }
              }
              break;

            case "send_notification":
              const notifUserId =
                typeof action.value === "object"
                  ? action.value.userId
                  : action.value || userId;
              if (notifUserId) {
                const notifMsg =
                  typeof action.value === "object"
                    ? action.value.message
                    : `Automation rule "${rule.name}" was applied`;

                emitToUser(notifUserId, "new-notification", notifMsg);

                await tx.notification.create({
                  data: {
                    type: "REMINDER",
                    content: notifMsg,
                    userId: String(notifUserId),
                    taskId: targetId,
                  },
                });
              }
              break;

            case "add_comment":
              if (action.value) {
                await tx.taskComment.create({
                  data: {
                    taskId: task.parentTaskId || task.taskId || task.id!,
                    userId: userId || task.createdBy || "system",
                    content: `[Automation] ${String(action.value)}`,
                  },
                });
              }
              break;

            case "archive_task":
              await tx.record.update({
                where: { id: targetId },
                data: { isComplete: true, status: "completed" },
              });
              break;

            default:
              logger.warn(`Unknown action type: ${action.type}`);
          }
        } catch (actionErr) {
          logger.error(`Error executing action [${action.type}] in rule "${rule.name}":`, actionErr);
          // Continue to next action in sequence even if one action fails
        }
      }

      // Log activity entry
      const logTaskId = task.parentTaskId || task.taskId || task.id!;
      if (logTaskId) {
        await tx.taskActivity.create({
          data: {
            taskId: logTaskId,
            userId: userId || "system",
            type: "automation_applied",
            description: `Automation rule "${rule.name}" was applied.`,
          },
        });
      }
    });

    logger.info(`Successfully completed automation rule execution: "${rule.name}"`);
  } catch (err) {
    logger.error(`Error executing actions for rule: "${rule.name}"`, err);
    throw err;
  }
}
