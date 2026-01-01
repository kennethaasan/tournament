import { describe, expect, it } from "vitest";
import {
  buildBracketRoundMap,
  derivePlaceholderName,
  parseMatchMetadata,
} from "@/modules/matches/placeholder";

describe("parseMatchMetadata", () => {
  it("returns empty object for null input", () => {
    expect(parseMatchMetadata(null)).toEqual({});
  });

  it("returns empty object for undefined input", () => {
    expect(parseMatchMetadata(undefined)).toEqual({});
  });

  it("returns empty object for non-object input", () => {
    expect(parseMatchMetadata("string")).toEqual({});
    expect(parseMatchMetadata(123)).toEqual({});
  });

  it("parses seed source correctly", () => {
    const metadata = parseMatchMetadata({
      homeSource: { type: "seed", seed: 1 },
      awaySource: { type: "seed", seed: 2, entryId: "entry-123" },
    });

    expect(metadata.homeSource).toEqual({
      type: "seed",
      seed: 1,
      entryId: null,
    });
    expect(metadata.awaySource).toEqual({
      type: "seed",
      seed: 2,
      entryId: "entry-123",
    });
  });

  it("parses winner/loser source correctly", () => {
    const metadata = parseMatchMetadata({
      homeSource: { type: "winner", matchId: "bracket-1-r1-m1" },
      awaySource: { type: "loser", matchId: "bracket-1-r1-m2" },
    });

    expect(metadata.homeSource).toEqual({
      type: "winner",
      matchId: "bracket-1-r1-m1",
    });
    expect(metadata.awaySource).toEqual({
      type: "loser",
      matchId: "bracket-1-r1-m2",
    });
  });

  it("returns null for invalid seed value", () => {
    const metadata = parseMatchMetadata({
      homeSource: { type: "seed", seed: 0 },
      awaySource: { type: "seed", seed: -1 },
    });

    expect(metadata.homeSource).toBeNull();
    expect(metadata.awaySource).toBeNull();
  });

  it("returns null for invalid seed (non-finite)", () => {
    const metadata = parseMatchMetadata({
      homeSource: { type: "seed", seed: Number.NaN },
    });

    expect(metadata.homeSource).toBeNull();
  });

  it("returns null for winner/loser with empty matchId", () => {
    const metadata = parseMatchMetadata({
      homeSource: { type: "winner", matchId: "" },
    });

    expect(metadata.homeSource).toBeNull();
  });

  it("returns null for winner/loser with non-string matchId", () => {
    const metadata = parseMatchMetadata({
      homeSource: { type: "winner", matchId: 123 },
    });

    expect(metadata.homeSource).toBeNull();
  });

  it("returns null for unknown source type", () => {
    const metadata = parseMatchMetadata({
      homeSource: { type: "unknown", matchId: "test" },
    });

    expect(metadata.homeSource).toBeNull();
  });

  it("returns null for non-object source", () => {
    const metadata = parseMatchMetadata({
      homeSource: "not-an-object",
    });

    expect(metadata.homeSource).toBeNull();
  });

  it("parses roundNumber correctly", () => {
    const metadata = parseMatchMetadata({
      roundNumber: 3,
    });

    expect(metadata.roundNumber).toBe(3);
  });

  it("returns null for invalid roundNumber (NaN)", () => {
    const metadata = parseMatchMetadata({
      roundNumber: Number.NaN,
    });

    expect(metadata.roundNumber).toBeNull();
  });

  it("returns null for non-number roundNumber", () => {
    const metadata = parseMatchMetadata({
      roundNumber: "three",
    });

    expect(metadata.roundNumber).toBeNull();
  });

  it("returns null for roundNumber <= 0", () => {
    expect(parseMatchMetadata({ roundNumber: 0 }).roundNumber).toBeNull();
    expect(parseMatchMetadata({ roundNumber: -1 }).roundNumber).toBeNull();
  });

  it("truncates decimal roundNumber", () => {
    const metadata = parseMatchMetadata({ roundNumber: 2.7 });
    expect(metadata.roundNumber).toBe(2);
  });

  it("parses homeLabel and awayLabel correctly", () => {
    const metadata = parseMatchMetadata({
      homeLabel: "Team A",
      awayLabel: "Team B",
    });

    expect(metadata.homeLabel).toBe("Team A");
    expect(metadata.awayLabel).toBe("Team B");
  });

  it("returns null for empty label strings", () => {
    const metadata = parseMatchMetadata({
      homeLabel: "",
      awayLabel: "   ",
    });

    expect(metadata.homeLabel).toBeNull();
    expect(metadata.awayLabel).toBeNull();
  });

  it("returns null for non-string labels", () => {
    const metadata = parseMatchMetadata({
      homeLabel: 123,
      awayLabel: null,
    });

    expect(metadata.homeLabel).toBeNull();
    expect(metadata.awayLabel).toBeNull();
  });

  it("trims label strings", () => {
    const metadata = parseMatchMetadata({
      homeLabel: "  Team A  ",
    });

    expect(metadata.homeLabel).toBe("Team A");
  });
});

describe("buildBracketRoundMap", () => {
  it("returns empty map for empty rows", () => {
    const map = buildBracketRoundMap([]);
    expect(map.size).toBe(0);
  });

  it("skips rows without bracketId", () => {
    const map = buildBracketRoundMap([
      { bracketId: null, metadata: { roundNumber: 1 } },
    ]);
    expect(map.size).toBe(0);
  });

  it("skips rows without roundNumber in metadata", () => {
    const map = buildBracketRoundMap([
      { bracketId: "bracket-1", metadata: {} },
      { bracketId: "bracket-1", metadata: null },
    ]);
    expect(map.size).toBe(0);
  });

  it("tracks max round per bracket", () => {
    const map = buildBracketRoundMap([
      { bracketId: "bracket-1", metadata: { roundNumber: 1 } },
      { bracketId: "bracket-1", metadata: { roundNumber: 3 } },
      { bracketId: "bracket-1", metadata: { roundNumber: 2 } },
      { bracketId: "bracket-2", metadata: { roundNumber: 2 } },
    ]);

    expect(map.get("bracket-1")).toBe(3);
    expect(map.get("bracket-2")).toBe(2);
  });

  it("handles multiple brackets correctly", () => {
    const map = buildBracketRoundMap([
      { bracketId: "winners", metadata: { roundNumber: 4 } },
      { bracketId: "losers", metadata: { roundNumber: 6 } },
    ]);

    expect(map.get("winners")).toBe(4);
    expect(map.get("losers")).toBe(6);
  });
});

describe("derivePlaceholderName", () => {
  const emptyBracketRounds = new Map<string, number>();
  const bracketRounds = new Map([
    ["bracket-1", 3],
    ["bracket-2", 4],
  ]);

  it("returns null for null source", () => {
    expect(derivePlaceholderName(null, emptyBracketRounds)).toBeNull();
  });

  it("returns null for undefined source", () => {
    expect(derivePlaceholderName(undefined, emptyBracketRounds)).toBeNull();
  });

  it("returns seed name for seed source", () => {
    expect(
      derivePlaceholderName({ type: "seed", seed: 1 }, emptyBracketRounds),
    ).toBe("Seed 1");
    expect(
      derivePlaceholderName({ type: "seed", seed: 8 }, emptyBracketRounds),
    ).toBe("Seed 8");
  });

  it("returns null for unparseable winner/loser matchId", () => {
    expect(
      derivePlaceholderName(
        { type: "winner", matchId: "invalid-format" },
        emptyBracketRounds,
      ),
    ).toBeNull();
  });

  it("returns winner name with round code", () => {
    expect(
      derivePlaceholderName(
        { type: "winner", matchId: "bracket-1-r1-m1" },
        bracketRounds,
      ),
    ).toBe("Vinner av R1");
  });

  it("returns loser name with round code", () => {
    expect(
      derivePlaceholderName(
        { type: "loser", matchId: "bracket-1-r1-m1" },
        bracketRounds,
      ),
    ).toBe("Taper av R1");
  });

  it("formats final round as F", () => {
    expect(
      derivePlaceholderName(
        { type: "winner", matchId: "bracket-1-r3-m1" },
        bracketRounds,
      ),
    ).toBe("Vinner av F");
  });

  it("formats semifinal round as SF", () => {
    expect(
      derivePlaceholderName(
        { type: "winner", matchId: "bracket-1-r2-m1" },
        bracketRounds,
      ),
    ).toBe("Vinner av SF2");
  });

  it("handles bracket with 4 rounds - finals", () => {
    expect(
      derivePlaceholderName(
        { type: "winner", matchId: "bracket-2-r4-m1" },
        bracketRounds,
      ),
    ).toBe("Vinner av F");
  });

  it("handles bracket with 4 rounds - semifinals", () => {
    expect(
      derivePlaceholderName(
        { type: "winner", matchId: "bracket-2-r3-m1" },
        bracketRounds,
      ),
    ).toBe("Vinner av SF3");
  });

  it("handles bracket with 4 rounds - early round", () => {
    expect(
      derivePlaceholderName(
        { type: "winner", matchId: "bracket-2-r1-m1" },
        bracketRounds,
      ),
    ).toBe("Vinner av R1");
  });

  it("returns round code without special formatting when maxRound unknown", () => {
    expect(
      derivePlaceholderName(
        { type: "winner", matchId: "unknown-bracket-r3-m1" },
        bracketRounds,
      ),
    ).toBe("Vinner av R3");
  });

  it("handles matchId with complex bracket name", () => {
    const rounds = new Map([["my-complex-bracket-name", 2]]);
    expect(
      derivePlaceholderName(
        { type: "winner", matchId: "my-complex-bracket-name-r2-m1" },
        rounds,
      ),
    ).toBe("Vinner av F");
  });
});
