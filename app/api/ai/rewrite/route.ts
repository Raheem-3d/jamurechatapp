import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getAIClientForOrg } from "@/lib/perplexity-client"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userOrg = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true, organization: { select: { aiEnabled: true } } }
    })
    if (userOrg?.organization?.aiEnabled === false) {
      return NextResponse.json({ error: "AI features are disabled" }, { status: 403 })
    }

    const perplexityClient = await getAIClientForOrg(userOrg?.organizationId || session.user.organizationId)

    const { message, tone } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message text is required" },
        { status: 400 }
      )
    }

    // Default tone is 'professional' if not specified
    const selectedTone = tone || "professional"

    const toneInstructions = {
      professional: "Rewrite this message in a professional, clear, and concise tone suitable for workplace communication.",
      friendly: "Rewrite this message in a friendly, warm, and conversational tone while maintaining clarity.",
      formal: "Rewrite this message in a formal, polished tone suitable for official communication.",
      casual: "Rewrite this message in a casual, relaxed tone while keeping it appropriate.",
      concise: "Rewrite this message to be shorter and more concise while preserving the key points.",
      detailed: "Expand this message with more details and explanation while maintaining clarity."
    }

    const instruction = toneInstructions[selectedTone as keyof typeof toneInstructions] || toneInstructions.professional

    const prompt = `${instruction}

Original message: "${message}"

Provide ONLY the rewritten message without any explanations, quotes, or additional text.`

    const response = await perplexityClient.chat([
      {
        role: "system",
        content: "You are a professional writing assistant. Rewrite messages to improve clarity and tone. Return ONLY the rewritten message, nothing else."
      },
      {
        role: "user",
        content: prompt
      }
    ])

    // Clean up the response - remove quotes if present
    let rewrittenMessage = response.trim()
    if (rewrittenMessage.startsWith('"') && rewrittenMessage.endsWith('"')) {
      rewrittenMessage = rewrittenMessage.slice(1, -1)
    }

    return NextResponse.json({
      original: message,
      rewritten: rewrittenMessage,
      tone: selectedTone
    })
  } catch (error: any) {
    console.error("Error rewriting message:", error)
    
    // Provide more specific error messages
    const errorMessage = error?.message?.includes("API key") 
      ? "AI service authentication failed. Please check your API key."
      : error?.message?.includes("fetch")
      ? "Network error. Please check your internet connection."
      : "Failed to rewrite message. Please try again."
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
