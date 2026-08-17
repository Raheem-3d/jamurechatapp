import { describe, it, expect } from "vitest";
import {
  buildBuzzNotificationData,
  isBuzzMessage,
  parseBuzzDisplayData,
} from "../lib/buzz-utils";

describe("buildBuzzNotificationData", () => {
  it("includes sender name and custom message for notifications", () => {
    const result = buildBuzzNotificationData("Alicia", "Need help now");

    expect(result.senderName).toBe("Alicia");
    expect(result.message).toBe("Need help now");
    expect(result.title).toBe("Buzz from Alicia");
    expect(result.systemContent).toContain("Alicia");
    expect(result.systemContent).toContain("Need help now");
  });

  it("falls back to default values when details are missing", () => {
    const result = buildBuzzNotificationData(undefined, undefined);

    expect(result.senderName).toBe("Someone");
    expect(result.message).toBe("Buzz!");
    expect(result.systemContent).toContain("Someone");
    expect(result.systemContent).toContain("Buzz!");
  });

  it("detects Buzz messages from content and flags", () => {
    expect(
      isBuzzMessage({ content: "🔔 **Alicia** sent a Buzz: Need help now" }),
    ).toBe(true);
    expect(isBuzzMessage({ content: "Hello there" })).toBe(false);
    expect(isBuzzMessage({ isBuzz: true, content: "Something" })).toBe(true);
  });

  it("extracts the sender name and message for Buzz cards", () => {
    const data = parseBuzzDisplayData({
      content: "🔔 **Alicia** sent a Buzz: Need help now",
      sender: { name: "Alicia" },
    } as any);

    expect(data.isBuzz).toBe(true);
    expect(data.senderName).toBe("Alicia");
    expect(data.message).toBe("Need help now");
  });
});
