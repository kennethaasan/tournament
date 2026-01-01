import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  formatDate,
  formatDateTime,
} from "@/server/email/email-utils";
import { uniqueEmails } from "@/server/email/recipients";

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

  it("uses default locale when not specified", () => {
    const value = new Date("2025-01-02T12:34:56Z");

    const formattedDate = formatDate(value);
    const formattedDateTime = formatDateTime(value);

    expect(formattedDate).toBeTruthy();
    expect(formattedDateTime).toBeTruthy();
  });

  it("handles null timezone", () => {
    const value = new Date("2025-01-02T12:34:56Z");

    const formattedDate = formatDate(value, { timeZone: null });
    const formattedDateTime = formatDateTime(value, { timeZone: null });

    expect(formattedDate).toBeTruthy();
    expect(formattedDateTime).toBeTruthy();
  });
});

describe("uniqueEmails", () => {
  it("returns empty array for empty input", () => {
    expect(uniqueEmails([])).toEqual([]);
  });

  it("filters out null and undefined values", () => {
    const result = uniqueEmails([null, undefined, "test@example.com"]);
    expect(result).toEqual(["test@example.com"]);
  });

  it("filters out empty strings", () => {
    const result = uniqueEmails(["", "test@example.com", "   "]);
    expect(result).toEqual(["test@example.com"]);
  });

  it("trims email addresses", () => {
    const result = uniqueEmails(["  test@example.com  "]);
    expect(result).toEqual(["test@example.com"]);
  });

  it("removes duplicate emails", () => {
    const result = uniqueEmails([
      "a@example.com",
      "b@example.com",
      "a@example.com",
    ]);
    expect(result).toEqual(["a@example.com", "b@example.com"]);
  });

  it("handles mixed invalid and valid values", () => {
    const result = uniqueEmails([
      null,
      "",
      "valid@example.com",
      undefined,
      "  ",
      "another@example.com",
      "valid@example.com",
    ]);
    expect(result).toEqual(["valid@example.com", "another@example.com"]);
  });
});
