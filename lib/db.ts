import mysql from "mysql2/promise";
import crypto from "crypto";

// Parse DATABASE_URL environment variable
function getPoolConfig() {
  const connectionString = process.env.DATABASE_URL || "";
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname || "195.250.31.105",
      port: Number(url.port) || 3306,
      user: decodeURIComponent(url.username || "rumzz_co1_jamurechatapp"),
      password: decodeURIComponent(url.password || ""),
      database: url.pathname.replace(/^\//, "") || "rumzz_co1_jamurechatapp",
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      connectTimeout: 30000,
      dateStrings: true,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      maxIdle: 10,
      idleTimeout: 60000,
    };
  } catch (e) {
    return {
      host: "195.250.31.105",
      port: 3306,
      user: "rumzz_co1_jamurechatapp",
      password: "lEN*GlM-40xai-B+",
      database: "rumzz_co1_jamurechatapp",
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      connectTimeout: 30000,
      dateStrings: true,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      maxIdle: 10,
      idleTimeout: 60000,
    };
  }
}

// Global connection pool singleton
const globalForDb = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};

export const pool: mysql.Pool =
  globalForDb.mysqlPool || mysql.createPool(getPoolConfig());

if (process.env.NODE_ENV !== "production") {
  globalForDb.mysqlPool = pool;
}

// Ensure task table has deadlineStart and deadlineEnd columns
let columnsChecked = false;
async function ensureDeadlineColumns() {
  if (columnsChecked) return;
  columnsChecked = true;
  try {
    await pool.query("ALTER TABLE `task` ADD COLUMN `deadlineStart` DATETIME NULL");
  } catch (e: any) {}
  try {
    await pool.query("ALTER TABLE `task` ADD COLUMN `deadlineEnd` DATETIME NULL");
  } catch (e: any) {}
}
ensureDeadlineColumns().catch(() => {});

// Helper to format values for MySQL query parameters
function formatParamValue(val: any): any {
  if (val === undefined) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 19).replace('T', ' ');
  if (typeof val === "boolean") return val ? 1 : 0;
  if (typeof val === "object" && val !== null) {
    return JSON.stringify(val);
  }
  return val;
}

// Build WHERE clause from Prisma-like where object with support for OR, AND, NOT, and relation subqueries
function buildWhereClause(whereObj: Record<string, any> = {}, tableName?: string): { sql: string; params: any[] } {
  if (!whereObj || Object.keys(whereObj).length === 0) {
    return { sql: "", params: [] };
  }

  const conditions: string[] = [];
  const params: any[] = [];

  for (const [key, val] of Object.entries(whereObj)) {
    if (val === undefined) continue;

    // 0. Compound unique index keys like { userId_channelId: { userId: 'x', channelId: 'y' } }
    if (
      typeof val === "object" &&
      val !== null &&
      !Array.isArray(val) &&
      !(val instanceof Date) &&
      (key.includes("_") || key.endsWith("Unique") || key.endsWith("Key")) &&
      !["OR", "AND", "NOT"].includes(key) &&
      Object.keys(val).every(
        (k) => !["some", "every", "none", "in", "notIn", "not", "gt", "gte", "lt", "lte", "contains", "startsWith", "endsWith"].includes(k)
      )
    ) {
      const compoundRes = buildWhereClause(val, tableName);
      if (compoundRes.sql) {
        const sub = compoundRes.sql.replace(/^\s*WHERE\s+/i, "");
        if (sub) {
          conditions.push(sub);
          params.push(...compoundRes.params);
        }
      }
      continue;
    }

    // 1. Logical OR array
    if (key === "OR" && Array.isArray(val)) {
      const subConditions: string[] = [];
      for (const item of val) {
        const res = buildWhereClause(item, tableName);
        if (res.sql) {
          const sub = res.sql.replace(/^\s*WHERE\s+/i, "");
          if (sub) {
            subConditions.push(`(${sub})`);
            params.push(...res.params);
          }
        }
      }
      if (subConditions.length > 0) {
        conditions.push(`(${subConditions.join(" OR ")})`);
      }
      continue;
    }

    // 2. Logical AND array
    if (key === "AND" && Array.isArray(val)) {
      const subConditions: string[] = [];
      for (const item of val) {
        const res = buildWhereClause(item, tableName);
        if (res.sql) {
          const sub = res.sql.replace(/^\s*WHERE\s+/i, "");
          if (sub) {
            subConditions.push(`(${sub})`);
            params.push(...res.params);
          }
        }
      }
      if (subConditions.length > 0) {
        conditions.push(`(${subConditions.join(" AND ")})`);
      }
      continue;
    }

    // 3. Logical NOT
    if (key === "NOT") {
      const items = Array.isArray(val) ? val : [val];
      const subConditions: string[] = [];
      for (const item of items) {
        const res = buildWhereClause(item, tableName);
        if (res.sql) {
          const sub = res.sql.replace(/^\s*WHERE\s+/i, "");
          if (sub) {
            subConditions.push(`(${sub})`);
            params.push(...res.params);
          }
        }
      }
      if (subConditions.length > 0) {
        conditions.push(`NOT (${subConditions.join(" AND ")})`);
      }
      continue;
    }

    // 4. Relation subqueries like { members: { some: { userId: 'x' } } }
    if (typeof val === "object" && val !== null && !Array.isArray(val) && ("some" in val || "every" in val || "none" in val)) {
      const relTarget = resolveRelationTableName(tableName || "", key);
      if (relTarget) {
        const relClause = val.some || val.every || val.none || {};
        const relRes = buildWhereClause(relClause, relTarget);
        const sub = buildRelationSubquery(tableName || "", key, relTarget, relRes);
        conditions.push(sub.sql);
        params.push(...sub.params);
      }
      continue;
    }

    const col = `\`${key}\``;

    if (val === null) {
      conditions.push(`${col} IS NULL`);
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        conditions.push("1=0");
      } else {
        conditions.push(`${col} IN (${val.map(() => "?").join(", ")})`);
        params.push(...val.map(formatParamValue));
      }
    } else if (typeof val === "object" && !(val instanceof Date)) {
      let handledOperator = false;

      if ("not" in val) {
        handledOperator = true;
        if (val.not === null) {
          conditions.push(`${col} IS NOT NULL`);
        } else if (Array.isArray(val.not)) {
          conditions.push(`${col} NOT IN (${val.not.map(() => "?").join(", ")})`);
          params.push(...val.not.map(formatParamValue));
        } else {
          conditions.push(`${col} != ?`);
          params.push(formatParamValue(val.not));
        }
      }
      if ("in" in val && Array.isArray(val.in)) {
        handledOperator = true;
        if (val.in.length === 0) {
          conditions.push("1=0");
        } else {
          conditions.push(`${col} IN (${val.in.map(() => "?").join(", ")})`);
          params.push(...val.in.map(formatParamValue));
        }
      }
      if ("notIn" in val && Array.isArray(val.notIn)) {
        handledOperator = true;
        conditions.push(`${col} NOT IN (${val.notIn.map(() => "?").join(", ")})`);
        params.push(...val.notIn.map(formatParamValue));
      }
      if ("gt" in val) {
        handledOperator = true;
        conditions.push(`${col} > ?`);
        params.push(formatParamValue(val.gt));
      }
      if ("gte" in val) {
        handledOperator = true;
        conditions.push(`${col} >= ?`);
        params.push(formatParamValue(val.gte));
      }
      if ("lt" in val) {
        handledOperator = true;
        conditions.push(`${col} < ?`);
        params.push(formatParamValue(val.lt));
      }
      if ("lte" in val) {
        handledOperator = true;
        conditions.push(`${col} <= ?`);
        params.push(formatParamValue(val.lte));
      }
      if ("contains" in val) {
        handledOperator = true;
        conditions.push(`${col} LIKE ?`);
        params.push(`%${val.contains}%`);
      }
      if ("startsWith" in val) {
        handledOperator = true;
        conditions.push(`${col} LIKE ?`);
        params.push(`${val.startsWith}%`);
      }
      if ("endsWith" in val) {
        handledOperator = true;
        conditions.push(`${col} LIKE ?`);
        params.push(`%${val.endsWith}`);
      }

      if (!handledOperator) {
        const relTarget = resolveRelationTableName(tableName || "", key);
        if (relTarget) {
          const relRes = buildWhereClause(val, relTarget);
          const sub = buildRelationSubquery(tableName || "", key, relTarget, relRes);
          conditions.push(sub.sql);
          params.push(...sub.params);
        }
      }
    } else {
      conditions.push(`${col} = ?`);
      params.push(formatParamValue(val));
    }
  }

  if (conditions.length === 0) {
    return { sql: "", params: [] };
  }

  return {
    sql: " WHERE " + conditions.join(" AND "),
    params,
  };
}

function isConnectionError(err: any): boolean {
  if (!err) return false;
  const code = err.code || "";
  const msg = err.message || "";
  return (
    code === "ECONNRESET" ||
    code === "PROTOCOL_CONNECTION_LOST" ||
    code === "ETIMEDOUT" ||
    code === "EPIPE" ||
    code === "ER_CON_COUNT_ERROR" ||
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR" ||
    msg.includes("Connection lost") ||
    msg.includes("closed")
  );
}

// Low-level query functions with connection retry
export async function rawQuery<T = any>(sql: string, params: any[] = [], retries = 3): Promise<T[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows as T[];
    } catch (err: any) {
      if (isConnectionError(err) && attempt < retries) {
        const delay = (attempt + 1) * 200;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  return [];
}

export async function rawQueryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await rawQuery<T>(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

export async function rawExecute(sql: string, params: any[] = [], retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const [result] = await pool.execute(sql, params);
      return result;
    } catch (err: any) {
      if (isConnectionError(err) && attempt < retries) {
        const delay = (attempt + 1) * 200;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

// Helper to auto-deserialize JSON columns and normalize boolean fields on rows
function deserializeJsonFields(tableName: string, rows: any[]) {
  if (!rows || rows.length === 0) return;
  const tbl = tableName.toLowerCase();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;

    // Normalize MySQL tinyint(1) boolean values (0/1 -> false/true)
    for (const [col, val] of Object.entries(row)) {
      if (
        typeof val === "number" &&
        (val === 0 || val === 1) &&
        (col.startsWith("is") || col.endsWith("Admin") || col === "archived" || col === "completed" || col === "muted" || col === "sent")
      ) {
        row[col] = Boolean(val);
      }
    }

    if (tbl === "message") {
      if (typeof row.attachments === "string") {
        try { row.attachments = JSON.parse(row.attachments); } catch { row.attachments = []; }
      }
      if (typeof row.reactions === "string") {
        try { row.reactions = JSON.parse(row.reactions); } catch { row.reactions = {}; }
      }
      if (typeof row.readBy === "string") {
        try { row.readBy = JSON.parse(row.readBy); } catch { row.readBy = []; }
      }
      if (typeof row.deliveredTo === "string") {
        try { row.deliveredTo = JSON.parse(row.deliveredTo); } catch { row.deliveredTo = []; }
      }
    } else if (tbl === "activitylog" || tbl === "automationlog") {
      if (typeof row.details === "string") {
        try { row.details = JSON.parse(row.details); } catch {}
      }
    } else if (tbl === "record" || tbl === "task") {
      if (typeof row.customFields === "string") {
        try { row.customFields = JSON.parse(row.customFields); } catch {}
      }
    } else if (tbl === "automationrule") {
      if (typeof row.conditions === "string") {
        try { row.conditions = JSON.parse(row.conditions); } catch { row.conditions = []; }
      }
      if (typeof row.actions === "string") {
        try { row.actions = JSON.parse(row.actions); } catch { row.actions = []; }
      }
      if (typeof row.triggerConfig === "string") {
        try { row.triggerConfig = JSON.parse(row.triggerConfig); } catch {}
      }
      if (typeof row.actionConfig === "string") {
        try { row.actionConfig = JSON.parse(row.actionConfig); } catch {}
      }
    }
  }
}

// Helper to strip non-column virtual and relation field names from cleanData
function stripVirtualAndRelationFields(tableName: string, data: Record<string, any>) {
  if (!data || typeof data !== "object") return;
  delete data.isBuzz;
  delete data.select;
  delete data.include;
  const tbl = (tableName || "").toLowerCase();
  if (tbl === "record" || tbl === "task") {
    delete data.tags;
    delete data.assignees;
    delete data.assignments;
    delete data.comments;
    delete data.stage;
    delete data.parentTask;
  } else if (tbl === "channel") {
    delete data.members;
    delete data.department;
    delete data.task;
  } else if (tbl === "taskassignment") {
    delete data.user;
    delete data.task;
    delete data.record;
  }
}

// Model Delegate Builder creating Prisma-like interface backed by direct SQL
function createModelDelegate(tableName: string) {
  return {
    tableName,

    async findUnique(args: { where: Record<string, any>; select?: Record<string, boolean>; include?: Record<string, any> }) {
      const { sql: whereSql, params } = buildWhereClause(args.where, tableName);
      const sql = `SELECT * FROM \`${tableName}\`${whereSql} LIMIT 1`;
      const row = await rawQueryOne(sql, params);
      if (!row) return null;
      deserializeJsonFields(tableName, [row]);
      if (args.include) {
        await hydrateRelations(tableName, [row], args.include);
      }
      return row;
    },

    async findFirst(args: { where?: Record<string, any>; orderBy?: any; select?: Record<string, boolean>; include?: Record<string, any> } = {}) {
      const { sql: whereSql, params } = buildWhereClause(args.where || {}, tableName);
      let orderSql = "";
      if (args.orderBy) {
        orderSql = buildOrderByClause(args.orderBy);
      }
      const sql = `SELECT * FROM \`${tableName}\`${whereSql}${orderSql} LIMIT 1`;
      const row = await rawQueryOne(sql, params);
      if (!row) return null;
      deserializeJsonFields(tableName, [row]);
      if (args.include) {
        await hydrateRelations(tableName, [row], args.include);
      }
      return row;
    },

    async findMany(args: {
      where?: Record<string, any>;
      orderBy?: any;
      take?: number;
      skip?: number;
      select?: Record<string, boolean>;
      include?: Record<string, any>;
    } = {}) {
      const { sql: whereSql, params } = buildWhereClause(args.where || {}, tableName);
      let orderSql = "";
      if (args.orderBy) {
        orderSql = buildOrderByClause(args.orderBy);
      }
      let limitSql = "";
      if (args.take !== undefined) {
        limitSql = ` LIMIT ${Number(args.take)}`;
        if (args.skip !== undefined) {
          limitSql += ` OFFSET ${Number(args.skip)}`;
        }
      }

      const sql = `SELECT * FROM \`${tableName}\`${whereSql}${orderSql}${limitSql}`;
      const rows = await rawQuery(sql, params);
      deserializeJsonFields(tableName, rows);
      if (rows.length > 0 && args.include) {
        await hydrateRelations(tableName, rows, args.include);
      }
      return rows;
    },

    async create(args: { data: Record<string, any>; select?: Record<string, boolean>; include?: Record<string, any> }) {
      const data = { ...args.data };
      
      // Auto-generate cuid/uuid id if not provided
      if (!data.id) {
        data.id = crypto.randomUUID();
      }
      if (!data.createdAt && hasCreatedAtField(tableName)) {
        data.createdAt = new Date();
      }
      if (!data.updatedAt && hasUpdatedAtField(tableName)) {
        data.updatedAt = new Date();
      }

      // Handle nested relation creation if present (e.g., members: { create: [...] })
      const nestedOps: { field: string; op: any }[] = [];
      const cleanData: Record<string, any> = {};

      for (const [key, val] of Object.entries(data)) {
        if (val === undefined) continue;
        if (val && typeof val === "object" && !(val instanceof Date) && !Array.isArray(val)) {
          if ("connect" in val && val.connect && typeof val.connect === "object") {
            if (val.connect.id !== undefined) {
              const fkField = `${key}Id`;
              cleanData[fkField] = val.connect.id;
            }
            continue;
          }
          if ("set" in val && Array.isArray(val.set)) {
            nestedOps.push({ field: key, op: val });
            continue;
          }
          if ("create" in val) {
            nestedOps.push({ field: key, op: val });
            continue;
          }
        }
        cleanData[key] = val;
      }

      // Strip non-column virtual and relation fields
      stripVirtualAndRelationFields(tableName, cleanData);

      const keys = Object.keys(cleanData).map((k) => `\`${k}\``);
      const values = Object.values(cleanData).map(formatParamValue);
      const placeholders = keys.map(() => "?");

      const sql = `INSERT INTO \`${tableName}\` (${keys.join(", ")}) VALUES (${placeholders.join(", ")})`;
      await rawExecute(sql, values);

      const createdRow = await this.findUnique({ where: { id: cleanData.id }, include: args.include });

      // Execute nested creation operations
      for (const nested of nestedOps) {
        if (nested.op.create) {
          const createItems = Array.isArray(nested.op.create) ? nested.op.create : [nested.op.create];
          const targetTable = resolveRelationTableName(tableName, nested.field);
          if (targetTable) {
            for (const item of createItems) {
              const itemData = {
                ...item,
                id: item.id || crypto.randomUUID(),
                [getForeignKeyName(tableName, targetTable)]: cleanData.id,
              };
              await getModelDelegate(targetTable).create({ data: itemData });
            }
          }
        } else if (nested.op.set && Array.isArray(nested.op.set)) {
          const relKey = nested.field.toLowerCase();
          if (relKey === "tags" || tableName === "record") {
            const tagIds = nested.op.set.map((item: any) => item?.id).filter(Boolean);
            for (const tid of tagIds) {
              await rawExecute(`INSERT IGNORE INTO \`_recordtags\` (\`A\`, \`B\`) VALUES (?, ?)`, [cleanData.id, tid]);
            }
          }
        }
      }

      return createdRow || cleanData;
    },

    async createMany(args: { data: Record<string, any>[]; skipDuplicates?: boolean }) {
      if (!args.data || args.data.length === 0) return { count: 0 };

      let count = 0;
      for (const item of args.data) {
        const data = { ...item };
        if (!data.id) data.id = crypto.randomUUID();
        if (!data.createdAt && hasCreatedAtField(tableName)) data.createdAt = new Date();
        if (!data.updatedAt && hasUpdatedAtField(tableName)) data.updatedAt = new Date();

        // Strip non-column virtual fields and map connect relations
        stripVirtualAndRelationFields(tableName, data);
        for (const [k, v] of Object.entries(data)) {
          if (v === undefined) {
            delete data[k];
          } else if (v && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v) && "connect" in v && (v as any).connect?.id !== undefined) {
            data[`${k}Id`] = (v as any).connect.id;
            delete data[k];
          }
        }

        const keys = Object.keys(data).map((k) => `\`${k}\``);
        const values = Object.values(data).map(formatParamValue);
        const placeholders = keys.map(() => "?");

        const ignoreClause = args.skipDuplicates ? "IGNORE " : "";
        const sql = `INSERT ${ignoreClause}INTO \`${tableName}\` (${keys.join(", ")}) VALUES (${placeholders.join(", ")})`;
        await rawExecute(sql, values).catch((err) => {
          if (!args.skipDuplicates) throw err;
        });
        count++;
      }
      return { count };
    },

    async update(args: { where: Record<string, any>; data: Record<string, any>; select?: Record<string, boolean>; include?: Record<string, any> }) {
      const data = { ...args.data };
      if (hasUpdatedAtField(tableName) && data.updatedAt === undefined) {
        data.updatedAt = new Date();
      }

      // Filter out nested relation objects, undefined values, and virtual properties from UPDATE statement
      const cleanData: Record<string, any> = {};
      for (const [key, val] of Object.entries(data)) {
        if (val === undefined) continue;
        if (val && typeof val === "object" && !(val instanceof Date) && !Array.isArray(val)) {
          if ("connect" in val && val.connect && typeof val.connect === "object") {
            if (val.connect.id !== undefined) {
              cleanData[`${key}Id`] = val.connect.id;
            }
            continue;
          }
          if ("disconnect" in val && val.disconnect) {
            cleanData[`${key}Id`] = null;
            continue;
          }
          if ("set" in val && Array.isArray(val.set)) {
            const relKey = key.toLowerCase();
            if (relKey === "tags" || tableName === "record") {
              const targetId = args?.where?.id;
              if (targetId) {
                await rawExecute(`DELETE FROM \`_recordtags\` WHERE \`A\` = ?`, [targetId]);
                const tagIds = val.set.map((item: any) => item?.id).filter(Boolean);
                for (const tid of tagIds) {
                  await rawExecute(`INSERT IGNORE INTO \`_recordtags\` (\`A\`, \`B\`) VALUES (?, ?)`, [targetId, tid]);
                }
              }
            }
            continue;
          }
          if ("deleteMany" in val) {
            const targetTable = resolveRelationTableName(tableName, key);
            if (targetTable) {
              const fkName = getForeignKeyName(tableName, targetTable);
              await rawExecute(`DELETE FROM \`${targetTable}\` WHERE \`${fkName}\` = ?`, [args.where.id]);
            }
            continue;
          }
          if ("create" in val) {
            continue;
          }
        }
        cleanData[key] = val;
      }

      // Strip non-column virtual and relation fields
      stripVirtualAndRelationFields(tableName, cleanData);

      if (Object.keys(cleanData).length > 0) {
        const setClauses: string[] = [];
        const params: any[] = [];

        for (const [key, val] of Object.entries(cleanData)) {
          setClauses.push(`\`${key}\` = ?`);
          params.push(formatParamValue(val));
        }

        const { sql: whereSql, params: whereParams } = buildWhereClause(args.where, tableName);
        const sql = `UPDATE \`${tableName}\` SET ${setClauses.join(", ")}${whereSql}`;
        await rawExecute(sql, [...params, ...whereParams]);
      }

      return this.findUnique({ where: args.where, include: args.include });
    },

    async updateMany(args: { where?: Record<string, any>; data: Record<string, any> }) {
      const data = { ...args.data };
      if (hasUpdatedAtField(tableName) && data.updatedAt === undefined) {
        data.updatedAt = new Date();
      }

      delete data.isBuzz;
      delete data.select;
      delete data.include;

      const setClauses: string[] = [];
      const params: any[] = [];

      for (const [key, val] of Object.entries(data)) {
        if (val === undefined) continue;
        setClauses.push(`\`${key}\` = ?`);
        params.push(formatParamValue(val));
      }

      if (setClauses.length === 0) return { count: 0 };

      const { sql: whereSql, params: whereParams } = buildWhereClause(args.where || {}, tableName);
      const sql = `UPDATE \`${tableName}\` SET ${setClauses.join(", ")}${whereSql}`;
      const res = await rawExecute(sql, [...params, ...whereParams]);
      return { count: res.affectedRows || 0 };
    },

    async delete(args: { where: Record<string, any> }) {
      const existing = await this.findUnique({ where: args.where });
      const { sql: whereSql, params } = buildWhereClause(args.where, tableName);
      const sql = `DELETE FROM \`${tableName}\`${whereSql}`;
      await rawExecute(sql, params);
      return existing;
    },

    async deleteMany(args: { where?: Record<string, any> } = {}) {
      const { sql: whereSql, params } = buildWhereClause(args.where || {}, tableName);
      const sql = `DELETE FROM \`${tableName}\`${whereSql}`;
      const res = await rawExecute(sql, params);
      return { count: res.affectedRows || 0 };
    },

    async count(args: { where?: Record<string, any> } = {}): Promise<number> {
      const { sql: whereSql, params } = buildWhereClause(args.where || {}, tableName);
      const sql = `SELECT COUNT(*) as cnt FROM \`${tableName}\`${whereSql}`;
      const row = await rawQueryOne<{ cnt: number }>(sql, params);
      return row ? Number(row.cnt) : 0;
    },

    async groupBy(args: { by: string[]; where?: Record<string, any>; _count?: Record<string, boolean> }) {
      const byCols = args.by.map((col) => `\`${col}\``).join(", ");
      const { sql: whereSql, params } = buildWhereClause(args.where || {}, tableName);
      const sql = `SELECT ${byCols}, COUNT(*) as _count_all FROM \`${tableName}\`${whereSql} GROUP BY ${byCols}`;
      const rows = await rawQuery(sql, params);
      return rows.map((r) => {
        const result: any = { _count: { _all: Number(r._count_all) } };
        args.by.forEach((b) => {
          result[b] = r[b];
          result._count[b] = Number(r._count_all);
        });
        return result;
      });
    },

    async upsert(args: { where: Record<string, any>; create: Record<string, any>; update: Record<string, any> }) {
      const existing = await this.findUnique({ where: args.where });
      if (existing) {
        return this.update({ where: args.where, data: args.update });
      } else {
        return this.create({ data: args.create });
      }
    },
  };
}

function buildOrderByClause(orderBy: any): string {
  if (!orderBy) return "";
  if (Array.isArray(orderBy)) {
    const parts = orderBy.map((o) => {
      const [col, dir] = Object.entries(o)[0] || [];
      return col ? `\`${col}\` ${String(dir).toUpperCase()}` : "";
    }).filter(Boolean);
    return parts.length > 0 ? " ORDER BY " + parts.join(", ") : "";
  }
  if (typeof orderBy === "object") {
    const parts = Object.entries(orderBy).map(([col, dir]) => `\`${col}\` ${String(dir).toUpperCase()}`);
    return parts.length > 0 ? " ORDER BY " + parts.join(", ") : "";
  }
  return "";
}

const TABLES_WITH_CREATED_AT = new Set([
  "tasktimelog", "activitylog", "announcement", "announcementdismissal",
  "automationlog", "automationrule", "channel", "channelmember", "department",
  "emaillog", "invitationtoken", "message", "notification", "organization",
  "orginvite", "payment", "record", "reminder", "stage", "subscription",
  "task", "taskassignment", "taskclient", "taskcomment", "taskinvitation", "user"
]);

const TABLES_WITH_UPDATED_AT = new Set([
  "tasktimelog", "automationrule", "channel", "channelmember", "department",
  "message", "organization", "payment", "record", "reminder", "stage",
  "subscription", "task", "taskassignment", "taskclient", "taskcomment",
  "taskinvitation", "user"
]);

function hasCreatedAtField(tableName: string): boolean {
  return TABLES_WITH_CREATED_AT.has((tableName || "").toLowerCase());
}

function hasUpdatedAtField(tableName: string): boolean {
  return TABLES_WITH_UPDATED_AT.has((tableName || "").toLowerCase());
}

function resolveRelationTableName(sourceTable: string, fieldName: string): string | null {
  const map: Record<string, string> = {
    members: "channelmember",
    channelmember: "channelmember",
    assignments: "taskassignment",
    assignees: "taskassignment",
    taskassignment: "taskassignment",
    comments: "taskcomment",
    taskcomment: "taskcomment",
    creator: "user",
    user: "user",
    users: "user",
    sender: "user",
    receiver: "user",
    organization: "organization",
    department: "department",
    channel: "channel",
    task: "task",
    record: "record",
    records: "record",
    rule: "automationrule",
    automationrule: "automationrule",
    automationlog: "automationlog",
    tasktimelog: "tasktimelog",
    messages: "message",
    notification: "notification",
    reminder: "reminder",
    subscription: "subscription",
  };
  return map[fieldName] || map[fieldName.toLowerCase()] || fieldName.toLowerCase();
}

function getForeignKeyName(sourceTable: string, targetTable: string): string {
  if (targetTable === "channelmember") return "channelId";
  if (targetTable === "taskassignment" || targetTable === "taskcomment") {
    if (sourceTable === "record") return "recordId";
    return "taskId";
  }
  return `${sourceTable}Id`;
}

function buildRelationSubquery(rawTableName: string, relKey: string, relTarget: string, relRes: { sql: string; params: any[] }): { sql: string; params: any[] } {
  const srcTable = rawTableName.toLowerCase();
  const tgtTable = relTarget.toLowerCase();
  const key = relKey.toLowerCase();
  const subSql = relRes.sql.replace(/^\s*WHERE\s+/i, "");
  const whereSub = subSql ? ` AND ${subSql}` : "";

  // 1. Many-to-many tag <-> record via _recordtags
  if ((srcTable === "tag" && tgtTable === "record") || (srcTable === "record" && tgtTable === "tag")) {
    const targetCol = srcTable === "tag" ? "B" : "A";
    const srcCol = srcTable === "tag" ? "A" : "B";
    return {
      sql: `\`id\` IN (SELECT \`${targetCol}\` FROM \`_recordtags\` WHERE \`${srcCol}\` IN (SELECT \`id\` FROM \`${tgtTable}\` WHERE 1=1${whereSub}))`,
      params: relRes.params,
    };
  }

  // 2. Child table filtering by Parent table (child has parentId foreign key)
  if (srcTable === "message" && (tgtTable === "channel" || key === "channel")) {
    return {
      sql: `\`channelId\` IN (SELECT \`id\` FROM \`channel\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }
  if (srcTable === "message" && (tgtTable === "user" || key === "sender")) {
    return {
      sql: `\`senderId\` IN (SELECT \`id\` FROM \`user\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }
  if (srcTable === "message" && key === "receiver") {
    return {
      sql: `\`receiverId\` IN (SELECT \`id\` FROM \`user\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }
  if (srcTable === "record" && (tgtTable === "stage" || key === "stage")) {
    return {
      sql: `\`stageId\` IN (SELECT \`id\` FROM \`stage\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }
  if (srcTable === "record" && (tgtTable === "task" || key === "parenttask" || key === "task")) {
    return {
      sql: `\`parentTaskId\` IN (SELECT \`id\` FROM \`task\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }
  if (srcTable === "channelmember" && (tgtTable === "channel" || key === "channel")) {
    return {
      sql: `\`channelId\` IN (SELECT \`id\` FROM \`channel\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }
  if (srcTable === "channelmember" && (tgtTable === "user" || key === "user")) {
    return {
      sql: `\`userId\` IN (SELECT \`id\` FROM \`user\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }
  if (srcTable === "taskactivity" && (tgtTable === "record" || key === "record")) {
    return {
      sql: `\`recordId\` IN (SELECT \`id\` FROM \`record\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }
  if ((srcTable === "taskactivity" || srcTable === "tasktimelog" || srcTable === "automationlog" || srcTable === "reminder") && (tgtTable === "task" || key === "task")) {
    return {
      sql: `\`taskId\` IN (SELECT \`id\` FROM \`task\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }
  if (srcTable === "automationlog" && (tgtTable === "automationrule" || key === "rule")) {
    return {
      sql: `\`ruleId\` IN (SELECT \`id\` FROM \`automationrule\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }
  if ((srcTable === "task" || srcTable === "channel" || srcTable === "message" || srcTable === "user") && (tgtTable === "organization" || key === "organization")) {
    return {
      sql: `\`organizationId\` IN (SELECT \`id\` FROM \`organization\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }

  // 3. Parent table filtering by Child table
  if (srcTable === "record" && (tgtTable === "taskassignment" || key === "assignees" || key === "assignments")) {
    return {
      sql: `\`id\` IN (SELECT \`recordId\` FROM \`taskassignment\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }
  if (srcTable === "task" && (tgtTable === "taskassignment" || key === "assignments" || key === "taskassignment")) {
    return {
      sql: `\`id\` IN (SELECT \`taskId\` FROM \`taskassignment\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }
  if (srcTable === "channel" && (tgtTable === "channelmember" || key === "members" || key === "channelmember")) {
    return {
      sql: `\`id\` IN (SELECT \`channelId\` FROM \`channelmember\` WHERE 1=1${whereSub})`,
      params: relRes.params,
    };
  }

  // Default fallback
  const fk = getForeignKeyName(srcTable, tgtTable);
  return {
    sql: `\`id\` IN (SELECT \`${fk}\` FROM \`${tgtTable}\` WHERE 1=1${whereSub})`,
    params: relRes.params,
  };
}

// Hydrate relation objects for include: { user: true, members: true, ... }
async function hydrateRelations(tableName: string, rows: any[], includeObj: Record<string, any>) {
  if (!rows || rows.length === 0 || !includeObj) return;

  for (const [relKey, relConfig] of Object.entries(includeObj)) {
    if (!relConfig) continue;

    const subInclude = typeof relConfig === "object" && relConfig.include ? relConfig.include : undefined;
    const subOrderBy = typeof relConfig === "object" && relConfig.orderBy ? relConfig.orderBy : undefined;

    if (relKey === "creator") {
      const creatorIds = Array.from(new Set(rows.map((r) => r.creatorId).filter(Boolean)));
      if (creatorIds.length > 0) {
        const users = await getModelDelegate("user").findMany({ where: { id: creatorIds } });
        const userMap = new Map(users.map((u: any) => [u.id, u]));
        rows.forEach((r) => {
          r.creator = userMap.get(r.creatorId) || null;
        });
      }
    } else if (relKey === "user") {
      const userIds = Array.from(new Set(rows.map((r) => r.userId).filter(Boolean)));
      if (userIds.length > 0) {
        const users = await getModelDelegate("user").findMany({ where: { id: userIds } });
        const userMap = new Map(users.map((u: any) => [u.id, u]));
        rows.forEach((r) => {
          r.user = userMap.get(r.userId) || null;
        });
      }
    } else if (tableName === "task" && (relKey === "assignments" || relKey === "taskassignment")) {
      const taskIds = rows.map((r) => r.id);
      const assignments = await getModelDelegate("taskassignment").findMany({ where: { taskId: taskIds }, include: subInclude || { user: true } });
      const assignMap = new Map<string, any[]>();
      assignments.forEach((a: any) => {
        if (!assignMap.has(a.taskId)) assignMap.set(a.taskId, []);
        assignMap.get(a.taskId)!.push(a);
      });
      rows.forEach((r) => {
        r.assignments = assignMap.get(r.id) || [];
        r.taskassignment = r.assignments;
      });
    } else if (tableName === "record" && (relKey === "assignees" || relKey === "taskassignment" || relKey === "assignments")) {
      const recordIds = rows.map((r) => r.id);
      const assignments = await getModelDelegate("taskassignment").findMany({ where: { recordId: recordIds }, include: subInclude || { user: true } });
      const assignMap = new Map<string, any[]>();
      assignments.forEach((a: any) => {
        if (!assignMap.has(a.recordId)) assignMap.set(a.recordId, []);
        assignMap.get(a.recordId)!.push(a);
      });
      rows.forEach((r) => {
        r.assignees = assignMap.get(r.id) || [];
        r.taskassignment = r.assignees;
        r.assignments = r.assignees;
      });
    } else if (tableName === "task" && (relKey === "taskcomment" || relKey === "comments")) {
      const taskIds = rows.map((r) => r.id);
      const comments = await getModelDelegate("taskcomment").findMany({ where: { taskId: taskIds }, orderBy: subOrderBy || { createdAt: "desc" }, include: subInclude || { user: true } });
      const commentMap = new Map<string, any[]>();
      comments.forEach((c: any) => {
        if (!commentMap.has(c.taskId)) commentMap.set(c.taskId, []);
        commentMap.get(c.taskId)!.push(c);
      });
      rows.forEach((r) => {
        r.taskcomment = commentMap.get(r.id) || [];
        r.comments = r.taskcomment;
      });
    } else if (tableName === "channel" && relKey === "members") {
      const channelIds = rows.map((r) => r.id);
      const members = await getModelDelegate("channelmember").findMany({ where: { channelId: channelIds }, include: subInclude || { user: true } });
      const memberMap = new Map<string, any[]>();
      members.forEach((m: any) => {
        if (!memberMap.has(m.channelId)) memberMap.set(m.channelId, []);
        memberMap.get(m.channelId)!.push(m);
      });
      rows.forEach((r) => {
        r.members = memberMap.get(r.id) || [];
      });
    } else if (relKey === "sender") {
      const senderIds = Array.from(new Set(rows.map((r) => r.senderId).filter(Boolean)));
      if (senderIds.length > 0) {
        const users = await getModelDelegate("user").findMany({ where: { id: senderIds } });
        const userMap = new Map(users.map((u: any) => [u.id, u]));
        rows.forEach((r) => {
          r.sender = userMap.get(r.senderId) || null;
        });
      }
    } else if (relKey === "receiver") {
      const receiverIds = Array.from(new Set(rows.map((r) => r.receiverId).filter(Boolean)));
      if (receiverIds.length > 0) {
        const users = await getModelDelegate("user").findMany({ where: { id: receiverIds } });
        const userMap = new Map(users.map((u: any) => [u.id, u]));
        rows.forEach((r) => {
          r.receiver = userMap.get(r.receiverId) || null;
        });
      }
    } else if (relKey === "organization") {
      const orgIds = Array.from(new Set(rows.map((r) => r.organizationId).filter(Boolean)));
      if (orgIds.length > 0) {
        const orgs = await getModelDelegate("organization").findMany({ where: { id: orgIds }, include: subInclude });
        const orgMap = new Map(orgs.map((o: any) => [o.id, o]));
        rows.forEach((r) => {
          r.organization = orgMap.get(r.organizationId) || null;
        });
      }
    } else if (relKey === "department") {
      const deptIds = Array.from(new Set(rows.map((r) => r.departmentId).filter(Boolean)));
      if (deptIds.length > 0) {
        const depts = await getModelDelegate("department").findMany({ where: { id: deptIds } });
        const deptMap = new Map(depts.map((d: any) => [d.id, d]));
        rows.forEach((r) => {
          r.department = deptMap.get(r.departmentId) || null;
        });
      }
    } else if (relKey === "stage") {
      const stageIds = Array.from(new Set(rows.map((r) => r.stageId).filter(Boolean)));
      if (stageIds.length > 0) {
        const stages = await getModelDelegate("stage").findMany({ where: { id: stageIds }, include: subInclude });
        const stageMap = new Map(stages.map((s: any) => [s.id, s]));
        rows.forEach((r) => {
          r.stage = stageMap.get(r.stageId) || null;
        });
      }
    } else if (relKey === "tags") {
      const recordIds = rows.map((r) => r.id);
      if (recordIds.length > 0) {
        const placeholders = recordIds.map(() => "?").join(", ");
        const links = await rawQuery<{ A: string; B: string }>(
          `SELECT \`A\`, \`B\` FROM \`_recordtags\` WHERE \`A\` IN (${placeholders})`,
          recordIds
        );
        const tagIds = Array.from(new Set(links.map((l) => l.B).filter(Boolean)));
        let tagMap = new Map<string, any>();
        if (tagIds.length > 0) {
          const tags = await getModelDelegate("tag").findMany({ where: { id: tagIds }, include: subInclude });
          tagMap = new Map(tags.map((t: any) => [t.id, t]));
        }

        const recordTagsMap = new Map<string, any[]>();
        links.forEach((l) => {
          const tagObj = tagMap.get(l.B);
          if (tagObj) {
            if (!recordTagsMap.has(l.A)) recordTagsMap.set(l.A, []);
            recordTagsMap.get(l.A)!.push(tagObj);
          }
        });

        rows.forEach((r) => {
          r.tags = recordTagsMap.get(r.id) || [];
        });
      }
    } else if (relKey === "subscription") {
      const orgIds = rows.map((r) => r.id);
      const subs = await getModelDelegate("subscription").findMany({ where: { organizationId: orgIds } });
      const subMap = new Map(subs.map((s: any) => [s.organizationId, s]));
      rows.forEach((r) => {
        r.subscription = subMap.get(r.id) || null;
      });
    }
  }
}

// Map of created model delegates
const modelDelegatesCache: Record<string, ReturnType<typeof createModelDelegate>> = {};

function getModelDelegate(tableName: string) {
  const lower = tableName.toLowerCase();
  if (!modelDelegatesCache[lower]) {
    modelDelegatesCache[lower] = createModelDelegate(lower);
  }
  return modelDelegatesCache[lower];
}

// Proxy export for db to dynamically resolve db.<modelName>
export const db: any = new Proxy(
  {
    pool,
    $queryRawUnsafe: async (sql: string, ...args: any[]) => {
      return rawQuery(sql, args);
    },
    $executeRawUnsafe: async (sql: string, ...args: any[]) => {
      return rawExecute(sql, args);
    },
    $transaction: async (arg: any) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === "function") {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
          const result = await arg(db);
          await connection.commit();
          return result;
        } catch (err) {
          await connection.rollback();
          throw err;
        } finally {
          connection.release();
        }
      }
      return null;
    },
  },
  {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      if (typeof prop === "string") {
        return getModelDelegate(prop);
      }
      return undefined;
    },
  }
);

export default db;
