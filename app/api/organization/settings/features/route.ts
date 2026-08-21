import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

async function ensureAiColumnsExist() {
  try {
    const cols = [
      "ALTER TABLE `organization` ADD COLUMN `aiProvider` VARCHAR(191) NULL DEFAULT 'OPENROUTER'",
      "ALTER TABLE `organization` ADD COLUMN `aiApiKey` TEXT NULL",
      "ALTER TABLE `organization` ADD COLUMN `aiBaseUrl` TEXT NULL",
      "ALTER TABLE `organization` ADD COLUMN `aiModel` VARCHAR(191) NULL",
    ];
    for (const sql of cols) {
      try {
        await db.$executeRawUnsafe(sql);
      } catch (err) {
        // Ignore column already exists errors
      }
    }
  } catch (err) {
    // Ignore migration errors
  }
}

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    const organizationId = session?.user?.organizationId
    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await ensureAiColumnsExist();

    let features: any = {
      aiEnabled: true,
      aiProvider: "OLLAMA",
      aiApiKey: "",
      aiBaseUrl: "http://localhost:11434",
      aiModel: "qwen2.5:0.5b",
    };

    try {
      const org = await db.organization.findUnique({
        where: { id: organizationId },
        select: { aiEnabled: true },
      });
      if (org) features.aiEnabled = org.aiEnabled ?? true;
    } catch (e) {}

    try {
      const rows: any[] = await db.$queryRawUnsafe(
        "SELECT `aiEnabled`, `aiProvider`, `aiApiKey`, `aiBaseUrl`, `aiModel` FROM `organization` WHERE `id` = ?",
        organizationId
      );
      if (rows && rows[0]) {
        features = {
          ...features,
          ...rows[0],
          aiEnabled: Boolean(rows[0].aiEnabled ?? features.aiEnabled),
        };
      }
    } catch (e) {}

    return NextResponse.json({ features })
  } catch (error) {
    console.error("Error fetching feature settings:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    const role = session?.user?.role
    const organizationId = session?.user?.organizationId

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only allow Admins to edit feature flags
    if (role !== "ORG_ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await ensureAiColumnsExist();

    const body = await req.json();
    const { aiEnabled, aiProvider, aiApiKey, aiBaseUrl, aiModel } = body;

    if (aiEnabled !== undefined) {
      await db.organization.update({
        where: { id: organizationId },
        data: { aiEnabled: Boolean(aiEnabled) },
      }).catch(() => {});
    }

    try {
      await db.$executeRawUnsafe(
        "UPDATE `organization` SET `aiProvider` = ?, `aiApiKey` = ?, `aiBaseUrl` = ?, `aiModel` = ?, `aiEnabled` = ? WHERE `id` = ?",
        aiProvider ?? "OLLAMA",
        aiApiKey ?? "",
        aiBaseUrl ?? "http://localhost:11434",
        aiModel ?? "qwen2.5:0.5b",
        aiEnabled !== undefined ? (aiEnabled ? 1 : 0) : 1,
        organizationId
      );
    } catch (e) {
      console.error("Error updating AI settings via raw SQL:", e);
    }

    let updatedFeatures: any = {
      aiEnabled: aiEnabled !== undefined ? Boolean(aiEnabled) : true,
      aiProvider: aiProvider ?? "OLLAMA",
      aiApiKey: aiApiKey ?? "",
      aiBaseUrl: aiBaseUrl ?? "http://localhost:11434",
      aiModel: aiModel ?? "qwen2.5:0.5b",
    };

    return NextResponse.json({ features: updatedFeatures })
  } catch (error) {
    console.error("Error updating feature settings:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
