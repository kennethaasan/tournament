import { beforeAll, describe, expect, it } from "vitest";
import { ProblemError } from "@/lib/errors/problem";

let internal: typeof import("@/modules/competitions/service")["__internal"];

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      "postgres://postgres:postgres@localhost:5432/tournament_test";
  }

  ({ __internal: internal } = await import("@/modules/competitions/service"));
});

describe("competitions service helpers", () => {
  it("normalizes slugs to lowercase kebab-case", () => {
    expect(internal.normalizeSlug(" Elite  Cup 2025 ")).toBe("elite-cup-2025");
  });

  it("coerces rotation seconds to integer minimum", () => {
    expect(internal.normalizeRotationSeconds(undefined)).toBe(5);
    expect(internal.normalizeRotationSeconds(7.9)).toBe(7);
  });

  it("rejects rotation seconds below threshold", () => {
    expect(() => internal.normalizeRotationSeconds(1)).toThrow(ProblemError);
  });

  it("rejects scoreboard themes without sufficient contrast", () => {
    expect(() =>
      internal.normalizeTheme({
        primaryColor: "#111111",
        secondaryColor: "#141414",
      }),
    ).toThrow(ProblemError);
  });

  it("ensures scoreboard colors are uppercased hex", () => {
    const theme = internal.normalizeTheme({
      primaryColor: "#123abc",
      secondaryColor: "#ffffff",
    });

    expect(theme.primary_color).toBe("#123ABC");
    expect(theme.secondary_color).toBe("#FFFFFF");
  });
});
