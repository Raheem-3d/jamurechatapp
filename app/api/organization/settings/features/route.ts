import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

async function ensureAiColumnsExist() {
  try {
    const cols = [
      "ALTER TABLE `Organization` ADD COLUMN `aiProvider` VARCHAR(191) NULL DEFAULT 'OPENROUTER'",
      "ALTER TABLE `Organization` ADD COLUMN `aiApiKey` TEXT NULL",
      "ALTER TABLE `Organization` ADD COLUMN `aiBaseUrl` TEXT NULL",
      "ALTER TABLE `Organization` ADD COLUMN `aiModel` VARCHAR(191) NULL",
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

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        aiEnabled: true,
        aiProvider: true,
        aiApiKey: true,
        aiBaseUrl: true,
        aiModel: true,
      },
    })

    return NextResponse.json({ features: organization })
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

    const dataToUpdate: any = {};
    if (aiEnabled !== undefined) dataToUpdate.aiEnabled = Boolean(aiEnabled);
    if (aiProvider !== undefined) dataToUpdate.aiProvider = aiProvider;
    if (aiApiKey !== undefined) dataToUpdate.aiApiKey = aiApiKey;
    if (aiBaseUrl !== undefined) dataToUpdate.aiBaseUrl = aiBaseUrl;
    if (aiModel !== undefined) dataToUpdate.aiModel = aiModel;

    const updated = await db.organization.update({
      where: { id: organizationId },
      data: dataToUpdate,
    })

    return NextResponse.json({ features: updated })
  } catch (error) {
    console.error("Error updating feature settings:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
