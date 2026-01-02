import { describe, expect, it } from "vitest";
import { uniqueEmails } from "@/server/email/recipients";

describe("uniqueEmails", () => {
  it("returns unique emails from an array of strings", () => {
    const result = uniqueEmails([
      "test@example.com",
      "other@example.com",
      "test@example.com",
    ]);

    expect(result).toHaveLength(2);
    expect(result).toContain("test@example.com");
    expect(result).toContain("other@example.com");
  });

  it("trims whitespace from emails", () => {
    const result = uniqueEmails([
      "  test@example.com  ",
      "other@example.com   ",
      "   test@example.com",
    ]);

    expect(result).toHaveLength(2);
    expect(result).toContain("test@example.com");
    expect(result).toContain("other@example.com");
  });

  it("filters out null values", () => {
    const result = uniqueEmails([
      "test@example.com",
      null,
      "other@example.com",
      null,
    ]);

    expect(result).toHaveLength(2);
    expect(result).not.toContain(null);
  });

  it("filters out undefined values", () => {
    const result = uniqueEmails([
      "test@example.com",
      undefined,
      "other@example.com",
      undefined,
    ]);

    expect(result).toHaveLength(2);
    expect(result).not.toContain(undefined);
  });

  it("filters out empty strings", () => {
    const result = uniqueEmails(["test@example.com", "", "other@example.com"]);

    expect(result).toHaveLength(2);
    expect(result).not.toContain("");
  });

  it("filters out whitespace-only strings", () => {
    const result = uniqueEmails([
      "test@example.com",
      "   ",
      "other@example.com",
      "\t\n",
    ]);

    expect(result).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    const result = uniqueEmails([]);
    expect(result).toHaveLength(0);
  });

  it("returns empty array when all values are filtered out", () => {
    const result = uniqueEmails([null, undefined, "", "  "]);
    expect(result).toHaveLength(0);
  });

  it("handles mixed valid and invalid values", () => {
    const result = uniqueEmails([
      "test@example.com",
      null,
      "",
      undefined,
      "  other@example.com  ",
      "   ",
      "test@example.com",
    ]);

    expect(result).toHaveLength(2);
    expect(result).toEqual(["test@example.com", "other@example.com"]);
  });

  it("preserves order of first occurrence", () => {
    const result = uniqueEmails([
      "first@example.com",
      "second@example.com",
      "first@example.com",
      "third@example.com",
    ]);

    expect(result).toEqual([
      "first@example.com",
      "second@example.com",
      "third@example.com",
    ]);
  });

  it("handles single email", () => {
    const result = uniqueEmails(["single@example.com"]);
    expect(result).toEqual(["single@example.com"]);
  });

  it("handles case-sensitive emails", () => {
    const result = uniqueEmails([
      "Test@Example.COM",
      "test@example.com",
      "TEST@EXAMPLE.COM",
    ]);

    // Email addresses are case-sensitive in the local part, so all three should be unique
    expect(result).toHaveLength(3);
  });
});
