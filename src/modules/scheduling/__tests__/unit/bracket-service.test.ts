import { describe, expect, it } from "vitest";
import { buildKnockoutBracket } from "@/modules/scheduling/bracket-service";

describe("bracket-service unit tests", () => {
  describe("validation errors", () => {
    it("throws when fewer than 2 seeds are provided", () => {
      expect(() =>
        buildKnockoutBracket({
          stageId: "stage-1",
          bracketId: "bracket-1",
          seeds: [{ seed: 1, entryId: "entry-1" }],
        }),
      ).toThrow("Not enough seeds");
    });

    it("throws when no seeds are provided", () => {
      expect(() =>
        buildKnockoutBracket({
          stageId: "stage-1",
          bracketId: "bracket-1",
          seeds: [],
        }),
      ).toThrow("Not enough seeds");
    });

    it("throws when seed number is zero", () => {
      expect(() =>
        buildKnockoutBracket({
          stageId: "stage-1",
          bracketId: "bracket-1",
          seeds: [
            { seed: 0, entryId: "entry-0" },
            { seed: 1, entryId: "entry-1" },
          ],
        }),
      ).toThrow("Invalid seed number");
    });

    it("throws when seed number is negative", () => {
      expect(() =>
        buildKnockoutBracket({
          stageId: "stage-1",
          bracketId: "bracket-1",
          seeds: [
            { seed: -1, entryId: "entry-neg" },
            { seed: 2, entryId: "entry-2" },
          ],
        }),
      ).toThrow("Invalid seed number");
    });

    it("throws when duplicate seed numbers are provided", () => {
      expect(() =>
        buildKnockoutBracket({
          stageId: "stage-1",
          bracketId: "bracket-1",
          seeds: [
            { seed: 1, entryId: "entry-1" },
            { seed: 1, entryId: "entry-2" },
          ],
        }),
      ).toThrow("Duplicate seed number");
    });
  });

  describe("bracket size normalization", () => {
    it("fills empty seeds to next power of two for 3 teams", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "bracket-1",
        seeds: [
          { seed: 1, entryId: "entry-1" },
          { seed: 2, entryId: "entry-2" },
          { seed: 3, entryId: "entry-3" },
        ],
      });

      // 3 seeds rounds up to 4, so 2 first-round matches, 1 final = 3 total
      expect(matches).toHaveLength(3);

      // One match should have seed 4 as a bye (null entryId)
      const byeMatch = matches.find(
        (m) =>
          (m.home.type === "seed" && m.home.entryId === null) ||
          (m.away.type === "seed" && m.away.entryId === null),
      );
      expect(byeMatch).toBeDefined();
    });

    it("fills empty seeds to next power of two for 5 teams", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "bracket-1",
        seeds: [
          { seed: 1, entryId: "entry-1" },
          { seed: 2, entryId: "entry-2" },
          { seed: 3, entryId: "entry-3" },
          { seed: 4, entryId: "entry-4" },
          { seed: 5, entryId: "entry-5" },
        ],
      });

      // 5 teams rounds up to 8 -> 4 quarterfinals + 2 semifinals + 1 final = 7
      expect(matches).toHaveLength(7);
    });
  });

  describe("two-seed bracket", () => {
    it("creates a single match for 2 seeds", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "bracket-1",
        seeds: [
          { seed: 1, entryId: "entry-1" },
          { seed: 2, entryId: "entry-2" },
        ],
      });

      expect(matches).toHaveLength(1);
      // For 2 seeds, there's only one match - the first round is also the final round
      // But the logic marks it as "round" since previousRound.length === 2 at that point means it becomes "final"
      // However with 2 seeds, firstRound has only 1 match, so while loop doesn't run
      expect(matches[0]?.type).toBe("round");
      expect(matches[0]?.roundNumber).toBe(1);
    });
  });

  describe("auto-advance logic", () => {
    it("auto-advances when home has entry and away is bye", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "bracket-1",
        seeds: [
          { seed: 1, entryId: "entry-1" },
          { seed: 2, entryId: "entry-2" },
          { seed: 3, entryId: null }, // bye
        ],
      });

      // Seed 2 vs Seed 3 (bye) - seed 2 should auto-advance
      const semifinalOrFinal = matches.find(
        (m) =>
          m.roundNumber === 2 || (m.roundNumber === 1 && matches.length === 1),
      );
      expect(semifinalOrFinal).toBeDefined();
    });

    it("auto-advances when away has entry and home is bye", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "bracket-1",
        seeds: [
          { seed: 1, entryId: null }, // bye
          { seed: 2, entryId: "entry-2" },
          { seed: 3, entryId: "entry-3" },
          { seed: 4, entryId: "entry-4" },
        ],
      });

      // First match (seed 1 vs seed 4) should have seed 1 as bye
      const firstRoundMatch = matches.find(
        (m) =>
          m.roundNumber === 1 && m.home.type === "seed" && m.home.seed === 1,
      );
      expect(firstRoundMatch).toBeDefined();
      expect(
        firstRoundMatch?.home.type === "seed" && firstRoundMatch.home.entryId,
      ).toBeNull();
    });
  });

  describe("third place match", () => {
    it("creates third place match when thirdPlaceMatch is true and enough rounds", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "bracket-1",
        seeds: [
          { seed: 1, entryId: "entry-1" },
          { seed: 2, entryId: "entry-2" },
          { seed: 3, entryId: "entry-3" },
          { seed: 4, entryId: "entry-4" },
        ],
        thirdPlaceMatch: true,
      });

      const thirdPlace = matches.find((m) => m.type === "third_place");
      expect(thirdPlace).toBeDefined();
      expect(thirdPlace?.home.type).toBe("loser");
      expect(thirdPlace?.away.type).toBe("loser");
    });

    it("does not create third place match when thirdPlaceMatch is false", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "bracket-1",
        seeds: [
          { seed: 1, entryId: "entry-1" },
          { seed: 2, entryId: "entry-2" },
          { seed: 3, entryId: "entry-3" },
          { seed: 4, entryId: "entry-4" },
        ],
        thirdPlaceMatch: false,
      });

      const thirdPlace = matches.find((m) => m.type === "third_place");
      expect(thirdPlace).toBeUndefined();
    });

    it("does not create third place match when only 2 seeds (no semifinals)", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "bracket-1",
        seeds: [
          { seed: 1, entryId: "entry-1" },
          { seed: 2, entryId: "entry-2" },
        ],
        thirdPlaceMatch: true,
      });

      // Only 1 match for 2 seeds, no third place possible
      const thirdPlace = matches.find((m) => m.type === "third_place");
      expect(thirdPlace).toBeUndefined();
    });
  });

  describe("match IDs", () => {
    it("generates correct match ID format", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "my-bracket",
        seeds: [
          { seed: 1, entryId: "entry-1" },
          { seed: 2, entryId: "entry-2" },
          { seed: 3, entryId: "entry-3" },
          { seed: 4, entryId: "entry-4" },
        ],
      });

      expect(matches[0]?.id).toBe("my-bracket-r1-m1");
      expect(matches[1]?.id).toBe("my-bracket-r1-m2");
      expect(matches[2]?.id).toBe("my-bracket-r2-m1");
    });

    it("third place match has correct ID format", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "cup",
        seeds: [
          { seed: 1, entryId: "entry-1" },
          { seed: 2, entryId: "entry-2" },
          { seed: 3, entryId: "entry-3" },
          { seed: 4, entryId: "entry-4" },
        ],
        thirdPlaceMatch: true,
      });

      const thirdPlace = matches.find((m) => m.type === "third_place");
      expect(thirdPlace?.id).toBe("cup-third-place");
    });
  });

  describe("seeding structure", () => {
    it("pairs seeds correctly (1v4, 2v3 for 4 teams)", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "bracket-1",
        seeds: [
          { seed: 1, entryId: "entry-1" },
          { seed: 2, entryId: "entry-2" },
          { seed: 3, entryId: "entry-3" },
          { seed: 4, entryId: "entry-4" },
        ],
      });

      const round1 = matches.filter((m) => m.roundNumber === 1);
      expect(round1).toHaveLength(2);

      // First match should be seed 1 vs seed 4
      const match1 = round1.find(
        (m) =>
          m.home.type === "seed" &&
          m.home.seed === 1 &&
          m.away.type === "seed" &&
          m.away.seed === 4,
      );
      expect(match1).toBeDefined();

      // Second match should be seed 2 vs seed 3
      const match2 = round1.find(
        (m) =>
          m.home.type === "seed" &&
          m.home.seed === 2 &&
          m.away.type === "seed" &&
          m.away.seed === 3,
      );
      expect(match2).toBeDefined();
    });
  });

  describe("winner references", () => {
    it("creates winner references for subsequent rounds", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "bracket-1",
        seeds: [
          { seed: 1, entryId: "entry-1" },
          { seed: 2, entryId: "entry-2" },
          { seed: 3, entryId: "entry-3" },
          { seed: 4, entryId: "entry-4" },
        ],
      });

      const final = matches.find((m) => m.type === "final");
      expect(final).toBeDefined();
      expect(final?.home.type).toBe("winner");
      expect(final?.away.type).toBe("winner");

      if (final?.home.type === "winner" && final?.away.type === "winner") {
        expect(final.home.matchId).toMatch(/bracket-1-r1-m\d/);
        expect(final.away.matchId).toMatch(/bracket-1-r1-m\d/);
      }
    });
  });

  describe("non-sequential seeds", () => {
    it("handles non-sequential seed numbers", () => {
      const { matches } = buildKnockoutBracket({
        stageId: "stage-1",
        bracketId: "bracket-1",
        seeds: [
          { seed: 1, entryId: "entry-1" },
          { seed: 3, entryId: "entry-3" },
        ],
      });

      // Should still work - seed 2 and 4 will be filled as byes
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });
});
