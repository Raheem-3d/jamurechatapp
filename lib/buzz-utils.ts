export type BuzzNotificationData = {
  senderName: string;
  message: string;
  title: string;
  systemContent: string;
  payload: {
    senderName: string;
    message: string;
    title: string;
  };
};

export function buildBuzzNotificationData(
  senderName?: string | null,
  message?: string | null,
): BuzzNotificationData {
  const normalizedSenderName = senderName?.trim() || "Someone";
  const normalizedMessage =
    typeof message === "string" && message.trim() ? message.trim() : "Buzz!";

  return {
    senderName: normalizedSenderName,
    message: normalizedMessage,
    title: `Buzz from ${normalizedSenderName}`,
    systemContent: `🔔 **${normalizedSenderName}** sent a Buzz: ${normalizedMessage}`,
    payload: {
      senderName: normalizedSenderName,
      message: normalizedMessage,
      title: `Buzz from ${normalizedSenderName}`,
    },
  };
}

export function isBuzzMessage(
  message?: { content?: string | null; isBuzz?: boolean | null } | null,
): boolean {
  if (!message) return false;
  if (message.isBuzz) return true;

  const content = typeof message.content === "string" ? message.content : "";
  return content.startsWith("🔔") || /sent a Buzz/i.test(content);
}

export function parseBuzzDisplayData(
  message?: {
    content?: string | null;
    isBuzz?: boolean | null;
    sender?: { name?: string | null; email?: string | null } | null;
  } | null,
) {
  if (!message) {
    return { isBuzz: false, senderName: "Someone", message: "Buzz!" };
  }

  const content = typeof message.content === "string" ? message.content : "";
  const isBuzz = isBuzzMessage(message);

  if (!isBuzz) {
    return { isBuzz: false, senderName: "Someone", message: "Buzz!" };
  }

  let extractedSender: string | null = null;
  let extractedMessage: string | null = null;

  // 1. Format: 🔔 **Name** sent a Buzz: Message
  const boldMatch = content.match(/🔔?\s*\*\*(.+?)\*\*\s+sent a Buzz:\s*(.*)$/i);
  if (boldMatch) {
    extractedSender = boldMatch[1]?.trim() || null;
    extractedMessage = boldMatch[2]?.trim() || null;
  } else {
    // 2. Format: 🔔 Name sent a Buzz: Message
    const plainMatch = content.match(/🔔?\s*(?:Buzz from\s+)?(.+?)\s+sent a Buzz:\s*(.*)$/i);
    if (plainMatch) {
      extractedSender = plainMatch[1]?.trim() || null;
      extractedMessage = plainMatch[2]?.trim() || null;
    }
  }

  const senderName =
    message.sender?.name?.trim() ||
    extractedSender ||
    message.sender?.email?.trim() ||
    "Someone";

  const messageText = extractedMessage || content.replace(/^🔔?\s*(?:\*\*.+?\*\*\s+)?(?:sent a Buzz:)?/i, "").trim() || "Buzz!";

  return {
    isBuzz: true,
    senderName,
    message: messageText || "Buzz!",
  };
}
