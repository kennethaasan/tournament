import { describe, expect, test } from "vitest";
import { computeContrastRatio } from "@/lib/colors";

describe("computeContrastRatio", () => {
  test("returns 21 for black and white", () => {
    const ratio = computeContrastRatio("#000000", "#FFFFFF");
    expect(ratio).toBeCloseTo(21, 1);
  });

  test("returns 1 for identical colors", () => {
    const ratio = computeContrastRatio("#FF5733", "#FF5733");
    expect(ratio).toBeCloseTo(1, 1);
  });

  test("returns same result regardless of order", () => {
    const ratioAB = computeContrastRatio("#000000", "#FFFFFF");
    const ratioBA = computeContrastRatio("#FFFFFF", "#000000");
    expect(ratioAB).toBeCloseTo(ratioBA, 5);
  });

  test("handles hex values without hash prefix", () => {
    const ratio = computeContrastRatio("000000", "FFFFFF");
    expect(ratio).toBeCloseTo(21, 1);
  });

  test("handles lowercase hex values", () => {
    const ratio = computeContrastRatio("#aabbcc", "#112233");
    expect(ratio).toBeGreaterThan(1);
  });

  test("calculates correct ratio for mid-range colors", () => {
    // Navy blue vs white should have good contrast
    const ratio = computeContrastRatio("#0B1F3A", "#FFFFFF");
    expect(ratio).toBeGreaterThan(10);
  });

  test("calculates low contrast for similar colors", () => {
    // Two similar grays
    const ratio = computeContrastRatio("#808080", "#909090");
    expect(ratio).toBeLessThan(1.5);
  });

  test("throws for invalid hex color", () => {
    expect(() => computeContrastRatio("#ZZZZZZ", "#FFFFFF")).toThrow(
      "Invalid hex color",
    );
  });

  test("throws for too short hex value", () => {
    expect(() => computeContrastRatio("#FFF", "#FFFFFF")).toThrow(
      "Invalid hex color",
    );
  });

  test("throws for too long hex value", () => {
    expect(() => computeContrastRatio("#FFFFFFFF", "#FFFFFF")).toThrow(
      "Invalid hex color",
    );
  });

  test("uses linear RGB for accurate WCAG calculations", () => {
    // Test with colors that would differ between gamma and linear calculation
    // Pure red (#FF0000) vs black should have specific contrast
    const ratio = computeContrastRatio("#FF0000", "#000000");
    expect(ratio).toBeGreaterThan(5);
    expect(ratio).toBeLessThan(6);
  });

  test("handles sRGB values at the threshold (0.03928)", () => {
    // Dark gray where channel values are around the threshold
    // Channel value 10/255 = 0.039... > 0.03928, so should use power formula
    const ratio = computeContrastRatio("#0A0A0A", "#FFFFFF");
    expect(ratio).toBeGreaterThan(19);
  });
});
