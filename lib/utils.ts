import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseLocalDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  if (date instanceof Date) return isNaN(date.getTime()) ? null : date;

  const str = String(date).trim();
  if (!str) return null;

  // Match YYYY-MM-DD (e.g. "2026-08-25", "2026-08-25 00:00:00", "2026-08-25T00:00:00.000Z")
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);

    // If explicit time is provided and is not midnight/zero-like
    const timeMatch = str.match(/[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch && !str.includes(" 00:00:00") && !str.includes("T00:00:00")) {
      // If it ends with Z, parse via standard Date to account for UTC timezone
      if (str.endsWith("Z") || str.includes("+")) {
        const d = new Date(str);
        return isNaN(d.getTime()) ? new Date(year, month, day) : d;
      }
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      return new Date(year, month, day, hours, minutes, seconds);
    }

    return new Date(year, month, day);
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = parseLocalDate(date);
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Formats a single deadline or deadline range (e.g. "Aug 6 — Aug 7, 2026" or "Aug 6, 2026")
 */
export function formatDeadlineRange(
  deadline?: Date | string | null,
  deadlineStart?: Date | string | null,
  deadlineEnd?: Date | string | null
): string {
  const start = parseLocalDate(deadlineStart);
  const end = parseLocalDate(deadlineEnd);

  if (start && end) {
    // If start and end are on the exact same calendar day
    if (
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate()
    ) {
      return formatDate(start);
    }

    // If same year
    if (start.getFullYear() === end.getFullYear()) {
      const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${startStr} — ${endStr}`;
    }

    return `${formatDate(start)} — ${formatDate(end)}`;
  }

  if (start && !end) {
    return formatDate(start);
  }

  if (end && !start) {
    return formatDate(end);
  }

  if (deadline) {
    return formatDate(deadline);
  }

  return "";
}

export function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDurationFromHours(hours: number) {
  if (hours <= 0) return "0m";

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (hours < 24) {
    if (wholeHours > 0) {
      return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
    }
    return `${minutes}m`;
  }

  const fullDays = Math.floor(hours / 24);
  const remainderHours = Math.floor(hours % 24);
  const remainderMinutes = Math.round(
    (hours - fullDays * 24 - remainderHours) * 60,
  );

  const dayLabel = fullDays === 1 ? "day" : "days";
  let formatted = `${fullDays} ${dayLabel}`;

  if (remainderHours > 0) {
    formatted += ` ${remainderHours}h`;
  }

  if (remainderMinutes > 0) {
    formatted += ` ${remainderMinutes}m`;
  }

  return formatted;
}

export function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function getDepartmentColor(departmentName: string) {
  const colors = [
    "bg-red-100 text-red-800",
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-yellow-100 text-yellow-800",
    "bg-purple-100 text-purple-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
  ];

  // Simple hash function to get consistent color for department
  let hash = 0;
  for (let i = 0; i < departmentName.length; i++) {
    hash = departmentName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case "LOW":
      return "bg-blue-100 text-blue-800";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800";
    case "HIGH":
      return "bg-orange-100 text-orange-800";
    case "URGENT":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case "TODO":
      return "bg-gray-100 text-gray-800";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    case "DONE":
      return "bg-green-100 text-green-800";
    case "BLOCKED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
