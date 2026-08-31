import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PerplexityClient } from "@/lib/perplexity-client";

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const role = session?.user?.role;
    if (role !== "ORG_ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { aiProvider = "OPENROUTER", aiApiKey = "", aiBaseUrl = "", aiModel = "" } = await req.json();

    const client = new PerplexityClient({
      provider: aiProvider,
      apiKey: aiApiKey,
      baseUrl: aiBaseUrl,
      model: aiModel,
    });

    const start = Date.now();
    const reply = await client.chat([
      { role: "user", content: "Ping test. Reply: OK" },
    ]);
    const latencyMs = Date.now() - start;

    const replyText = typeof reply === "string" ? reply.trim() : JSON.stringify(reply);

    return NextResponse.json({
      success: true,
      latencyMs,
      message: `Connection successful! (${latencyMs}ms) Response: "${replyText.slice(0, 80)}"`,
    });
  } catch (error: any) {
    console.error("Test AI error:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Failed to connect to AI provider",
    }, { status: 500 });
  }
}
