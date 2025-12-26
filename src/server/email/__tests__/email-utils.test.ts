import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  formatDate,
  formatDateTime,
} from "@/server/email/email-utils";

describe("email utils", () => {
  it("escapes HTML entities", () => {
    const result = escapeHtml(`Fish & "<>'`);
    expect(result).toBe("Fish &amp; &quot;&lt;&gt;&#39;");
  });

  it("formats dates with locale and timezone overrides", () => {
    const value = new Date("2025-01-02T12:34:56Z");

    const formattedDate = formatDate(value, {
      locale: "en-US",
      timeZone: "UTC",
    });

    const formattedDateTime = formatDateTime(value, {
      locale: "en-US",
      timeZone: "UTC",
      dateStyle: "short",
      timeStyle: "short",
    });

    expect(formattedDate).toContain("2025");
    expect(formattedDateTime).toMatch(/1\/2\/25/);
    expect(formattedDateTime).toContain("12:34");
  });
});
