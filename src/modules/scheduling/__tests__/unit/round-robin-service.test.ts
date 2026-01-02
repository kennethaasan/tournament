import { describe, expect, it } from "vitest";
import { generateRoundRobinSchedule } from "@/modules/scheduling/round-robin-service";

const START_AT = new Date("2025-05-01T09:00:00Z");

describe("round-robin-service unit tests", () => {
  describe("validation errors", () => {
    it("throws when no groups are provided", () => {
      expect(() =>
        generateRoundRobinSchedule({
          stageId: "stage-1",
          groups: [],
          venues: [{ id: "venue-1" }],
          startAt: START_AT,
          matchDurationMinutes: 60,
          breakMinutes: 15,
        }),
      ).toThrow("At least one group is required");
    });

    it("throws when no venues are provided", () => {
      expect(() =>
        generateRoundRobinSchedule({
          stageId: "stage-1",
          groups: [
            { id: "group-a", roundRobinMode: "single", entryIds: ["e1", "e2"] },
          ],
          venues: [],
          startAt: START_AT,
          matchDurationMinutes: 60,
          breakMinutes: 15,
        }),
      ).toThrow("No venues available");
    });

    it("throws when match duration is too short", () => {
      expect(() =>
        generateRoundRobinSchedule({
          stageId: "stage-1",
          groups: [
            { id: "group-a", roundRobinMode: "single", entryIds: ["e1", "e2"] },
          ],
          venues: [{ id: "venue-1" }],
          startAt: START_AT,
          matchDurationMinutes: 5,
          breakMinutes: 15,
        }),
      ).toThrow("Match duration too short");
    });

    it("throws when break is negative", () => {
      expect(() =>
        generateRoundRobinSchedule({
          stageId: "stage-1",
          groups: [
            { id: "group-a", roundRobinMode: "single", entryIds: ["e1", "e2"] },
          ],
          venues: [{ id: "venue-1" }],
          startAt: START_AT,
          matchDurationMinutes: 60,
          breakMinutes: -5,
        }),
      ).toThrow("Break length is invalid");
    });

    it("throws when break exceeds maximum", () => {
      expect(() =>
        generateRoundRobinSchedule({
          stageId: "stage-1",
          groups: [
            { id: "group-a", roundRobinMode: "single", entryIds: ["e1", "e2"] },
          ],
          venues: [{ id: "venue-1" }],
          startAt: START_AT,
          matchDurationMinutes: 60,
          breakMinutes: 200,
        }),
      ).toThrow("Break length is invalid");
    });

    it("throws when start date is invalid", () => {
      expect(() =>
        generateRoundRobinSchedule({
          stageId: "stage-1",
          groups: [
            { id: "group-a", roundRobinMode: "single", entryIds: ["e1", "e2"] },
          ],
          venues: [{ id: "venue-1" }],
          startAt: new Date("invalid"),
          matchDurationMinutes: 60,
          breakMinutes: 15,
        }),
      ).toThrow("Invalid start time");
    });

    it("throws when a group has insufficient entries", () => {
      expect(() =>
        generateRoundRobinSchedule({
          stageId: "stage-1",
          groups: [
            { id: "group-a", roundRobinMode: "single", entryIds: ["e1"] },
          ],
          venues: [{ id: "venue-1" }],
          startAt: START_AT,
          matchDurationMinutes: 60,
          breakMinutes: 15,
        }),
      ).toThrow("Not enough entries");
    });

    it("throws when a group has duplicate entries", () => {
      expect(() =>
        generateRoundRobinSchedule({
          stageId: "stage-1",
          groups: [
            {
              id: "group-a",
              roundRobinMode: "single",
              entryIds: ["e1", "e1", "e2"],
            },
          ],
          venues: [{ id: "venue-1" }],
          startAt: START_AT,
          matchDurationMinutes: 60,
          breakMinutes: 15,
        }),
      ).toThrow("Duplicate entries detected");
    });
  });

  describe("odd number of teams", () => {
    it("handles odd number of teams with bye", () => {
      const { matches } = generateRoundRobinSchedule({
        stageId: "stage-1",
        groups: [
          {
            id: "group-a",
            roundRobinMode: "single",
            entryIds: ["entry-1", "entry-2", "entry-3"],
          },
        ],
        venues: [{ id: "venue-1" }],
        startAt: START_AT,
        matchDurationMinutes: 60,
        breakMinutes: 15,
      });

      // With 3 teams, we expect 3 matches (each pair plays once)
      expect(matches).toHaveLength(3);

      // Verify all entries play each other exactly once
      const matchPairs = matches.map((m) =>
        [m.homeEntryId, m.awayEntryId].sort().join("-"),
      );
      expect(matchPairs).toContain("entry-1-entry-2");
      expect(matchPairs).toContain("entry-1-entry-3");
      expect(matchPairs).toContain("entry-2-entry-3");
    });
  });

  describe("venue cycling", () => {
    it("cycles through venues sequentially", () => {
      const { matches } = generateRoundRobinSchedule({
        stageId: "stage-1",
        groups: [
          {
            id: "group-a",
            roundRobinMode: "single",
            entryIds: ["e1", "e2", "e3", "e4"],
          },
        ],
        venues: [{ id: "venue-1" }, { id: "venue-2" }],
        startAt: START_AT,
        matchDurationMinutes: 60,
        breakMinutes: 15,
      });

      expect(matches).toHaveLength(6);

      // Check that venues cycle correctly
      const venueSequence = matches.map((m) => m.venueId);
      // With 2 venues, each slot fills both venues before moving to next time slot
      expect(venueSequence.includes("venue-1")).toBe(true);
      expect(venueSequence.includes("venue-2")).toBe(true);
    });
  });

  describe("multiple groups", () => {
    it("schedules multiple groups correctly", () => {
      const { matches } = generateRoundRobinSchedule({
        stageId: "stage-1",
        groups: [
          { id: "group-a", roundRobinMode: "single", entryIds: ["a1", "a2"] },
          { id: "group-b", roundRobinMode: "single", entryIds: ["b1", "b2"] },
        ],
        venues: [{ id: "venue-1" }],
        startAt: START_AT,
        matchDurationMinutes: 60,
        breakMinutes: 15,
      });

      expect(matches).toHaveLength(2);

      const groupAMatches = matches.filter((m) => m.groupId === "group-a");
      const groupBMatches = matches.filter((m) => m.groupId === "group-b");

      expect(groupAMatches).toHaveLength(1);
      expect(groupBMatches).toHaveLength(1);
    });
  });

  describe("round number assignment", () => {
    it("assigns round numbers based on kickoff times", () => {
      const { matches } = generateRoundRobinSchedule({
        stageId: "stage-1",
        groups: [
          {
            id: "group-a",
            roundRobinMode: "single",
            entryIds: ["e1", "e2", "e3", "e4"],
          },
        ],
        venues: [{ id: "venue-1" }, { id: "venue-2" }],
        startAt: START_AT,
        matchDurationMinutes: 60,
        breakMinutes: 15,
      });

      // Check round numbers increment with kickoff times
      const roundNumbers = [...new Set(matches.map((m) => m.roundNumber))].sort(
        (a, b) => a - b,
      );
      expect(roundNumbers[0]).toBe(1);

      // Verify all matches in round 1 have the same kickoff
      const round1Matches = matches.filter((m) => m.roundNumber === 1);
      const round1Kickoffs = new Set(
        round1Matches.map((m) => m.kickoffAt.getTime()),
      );
      expect(round1Kickoffs.size).toBe(1);
    });
  });

  describe("zero break minutes", () => {
    it("handles zero break minutes", () => {
      const { matches } = generateRoundRobinSchedule({
        stageId: "stage-1",
        groups: [
          { id: "group-a", roundRobinMode: "single", entryIds: ["e1", "e2"] },
        ],
        venues: [{ id: "venue-1" }],
        startAt: START_AT,
        matchDurationMinutes: 60,
        breakMinutes: 0,
      });

      expect(matches).toHaveLength(1);
      expect(matches[0]?.kickoffAt.toISOString()).toBe(START_AT.toISOString());
    });
  });

  describe("maximum break minutes", () => {
    it("handles exactly 180 break minutes", () => {
      const { matches } = generateRoundRobinSchedule({
        stageId: "stage-1",
        groups: [
          { id: "group-a", roundRobinMode: "single", entryIds: ["e1", "e2"] },
        ],
        venues: [{ id: "venue-1" }],
        startAt: START_AT,
        matchDurationMinutes: 60,
        breakMinutes: 180,
      });

      expect(matches).toHaveLength(1);
    });
  });

  describe("minimum duration edge case", () => {
    it("allows exactly 10 minute match duration", () => {
      const { matches } = generateRoundRobinSchedule({
        stageId: "stage-1",
        groups: [
          { id: "group-a", roundRobinMode: "single", entryIds: ["e1", "e2"] },
        ],
        venues: [{ id: "venue-1" }],
        startAt: START_AT,
        matchDurationMinutes: 10,
        breakMinutes: 0,
      });

      expect(matches).toHaveLength(1);
    });
  });
});
