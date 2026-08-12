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

  const senderName =
    message.sender?.name?.trim() || message.sender?.email?.trim() || "Someone";

  const match = content.match(/🔔\s*\*\*(.+?)\*\*\s+sent a Buzz:\s*(.+)$/i);
  if (match) {
    return {
      isBuzz: true,
      senderName: match[1]?.trim() || senderName,
      message: match[2]?.trim() || "Buzz!",
    };
  }

  const fallbackMatch = content.match(/sent a Buzz:\s*(.+)$/i);
  if (fallbackMatch) {
    return {
      isBuzz: true,
      senderName,
      message: fallbackMatch[1]?.trim() || "Buzz!",
    };
  }

  return {
    isBuzz: true,
    senderName,
    message: content.trim() || "Buzz!",
  };
}
