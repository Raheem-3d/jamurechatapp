import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const role = session?.user?.role;
    if (role !== "ORG_ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { aiProvider = "OPENROUTER", aiApiKey = "", aiBaseUrl = "", aiModel = "" } = await req.json();

    let endpoint = "";
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: any = {};

    if (aiProvider === "OLLAMA") {
      const baseUrl = (aiBaseUrl || "http://localhost:11434").replace(/\/$/, "");
      endpoint = `${baseUrl}/api/chat`;
      body = {
        model: aiModel || "llama3",
        messages: [{ role: "user", content: "Ping test. Reply with OK." }],
        stream: false,
      };
    } else if (aiProvider === "OPENROUTER") {
      const baseUrl = (aiBaseUrl || "https://openrouter.ai/api/v1").replace(/\/$/, "");
      endpoint = `${baseUrl}/chat/completions`;
      headers["Authorization"] = `Bearer ${aiApiKey}`;
      headers["HTTP-Referer"] = "https://jamurechat.app";
      headers["X-Title"] = "JamureChat";
      body = {
        model: aiModel || "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: "Ping test. Reply OK." }],
        max_tokens: 20,
      };
    } else {
      // OPENAI / CUSTOM / GEMINI / PERPLEXITY
      const baseUrl = (aiBaseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
      endpoint = `${baseUrl}/chat/completions`;
      if (aiApiKey) {
        headers["Authorization"] = `Bearer ${aiApiKey}`;
      }
      body = {
        model: aiModel || "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Ping test. Reply OK." }],
        max_tokens: 20,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json({
        success: false,
        error: `Provider HTTP Error ${res.status}: ${errText.slice(0, 150) || res.statusText}`,
      }, { status: 400 });
    }

    const data = await res.json().catch(() => null);
    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.message?.content ||
      "Connection Successful!";

    return NextResponse.json({
      success: true,
      message: `Connection successful! Response: "${typeof reply === "string" ? reply.trim().slice(0, 60) : "OK"}"`,
    });
  } catch (error: any) {
    console.error("Test AI error:", error);
    return NextResponse.json({
      success: false,
      error: error?.name === "AbortError" ? "Connection timed out (12s)" : (error?.message || "Failed to connect to AI provider"),
    }, { status: 500 });
  }
}
