import { db } from "@/lib/db";

let schemaEnsured = false;

export async function ensureDbSchema() {
  if (schemaEnsured) return;
  try {
    // 1. Add image column to Channel table if missing
    await db.$executeRawUnsafe(
      `ALTER TABLE \`Channel\` ADD COLUMN \`image\` TEXT NULL;`
    ).catch(() => {});
    await db.$executeRawUnsafe(
      `ALTER TABLE \`Channel\` MODIFY COLUMN \`image\` TEXT NULL;`
    ).catch(() => {});

    // 2. Add timeSpent column to Task table if missing
    await db.$executeRawUnsafe(
      `ALTER TABLE \`Task\` ADD COLUMN \`timeSpent\` INT NOT NULL DEFAULT 0;`
    ).catch(() => {});

    // 3. Create TaskTimeLog table if missing
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`TaskTimeLog\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`taskId\` VARCHAR(191) NOT NULL,
        \`userId\` VARCHAR(191) NOT NULL,
        \`duration\` INT NOT NULL DEFAULT 0,
        \`description\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        INDEX \`TaskTimeLog_taskId_idx\` (\`taskId\`),
        INDEX \`TaskTimeLog_userId_idx\` (\`userId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `).catch(() => {});

    schemaEnsured = true;
  } catch (e) {
    console.error("ensureDbSchema error:", e);
  }
}
