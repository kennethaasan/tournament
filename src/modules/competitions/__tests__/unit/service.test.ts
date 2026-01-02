import { beforeAll, describe, expect, it } from "vitest";
import { ProblemError } from "@/lib/errors/problem";

let internal: typeof import("@/modules/competitions/service")["__internal"];

beforeAll(async () => {
  ({ __internal: internal } = await import("@/modules/competitions/service"));
});

describe("competitions service helpers", () => {
  describe("normalizeSlug", () => {
    it("normalizes slugs to lowercase kebab-case", () => {
      expect(internal.normalizeSlug(" Elite  Cup 2025 ")).toBe(
        "elite-cup-2025",
      );
    });

    it("handles single word", () => {
      expect(internal.normalizeSlug("Tournament")).toBe("tournament");
    });

    it("handles multiple spaces between words", () => {
      expect(internal.normalizeSlug("My   Super   Cup")).toBe("my-super-cup");
    });

    it("handles leading and trailing spaces", () => {
      expect(internal.normalizeSlug("   test   ")).toBe("test");
    });
  });

  describe("normalizeRotationSeconds", () => {
    it("coerces rotation seconds to integer minimum", () => {
      expect(internal.normalizeRotationSeconds(undefined)).toBe(5);
      expect(internal.normalizeRotationSeconds(7.9)).toBe(7);
    });

    it("rejects rotation seconds below threshold", () => {
      expect(() => internal.normalizeRotationSeconds(1)).toThrow(ProblemError);
    });

    it("allows exactly 2 seconds", () => {
      expect(internal.normalizeRotationSeconds(2)).toBe(2);
    });

    it("handles null as undefined", () => {
      expect(
        internal.normalizeRotationSeconds(null as unknown as undefined),
      ).toBe(5);
    });

    it("handles large values", () => {
      expect(internal.normalizeRotationSeconds(100)).toBe(100);
    });
  });

  describe("normalizeTheme", () => {
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

    it("uses default colors when none provided", () => {
      const theme = internal.normalizeTheme({});

      expect(theme.primary_color).toBe("#0B1F3A");
      expect(theme.secondary_color).toBe("#FFFFFF");
    });

    it("uses default colors when null provided", () => {
      const theme = internal.normalizeTheme({
        primaryColor: null,
        secondaryColor: null,
      });

      expect(theme.primary_color).toBe("#0B1F3A");
      expect(theme.secondary_color).toBe("#FFFFFF");
    });

    it("handles background image URL", () => {
      const theme = internal.normalizeTheme({
        primaryColor: "#000000",
        secondaryColor: "#FFFFFF",
        backgroundImageUrl: "https://example.com/image.jpg",
      });

      expect(theme.background_image_url).toBe("https://example.com/image.jpg");
    });

    it("rejects invalid color formats", () => {
      expect(() =>
        internal.normalizeTheme({
          primaryColor: "red",
          secondaryColor: "#FFFFFF",
        }),
      ).toThrow(ProblemError);
    });

    it("rejects short hex colors", () => {
      expect(() =>
        internal.normalizeTheme({
          primaryColor: "#FFF",
          secondaryColor: "#FFFFFF",
        }),
      ).toThrow(ProblemError);
    });

    it("rejects invalid background URL", () => {
      expect(() =>
        internal.normalizeTheme({
          primaryColor: "#000000",
          secondaryColor: "#FFFFFF",
          backgroundImageUrl: "not-a-url",
        }),
      ).toThrow(ProblemError);
    });
  });
});
