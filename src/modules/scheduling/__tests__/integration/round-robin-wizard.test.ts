import { describe, expect, it } from "vitest";
import { generateRoundRobinSchedule } from "@/modules/scheduling/round-robin-service";

const START_AT = new Date("2025-05-01T09:00:00Z");

describe("Scheduling › round-robin wizard", () => {
  it("generates balanced rounds with sequential slots for a single round robin", () => {
    const { matches } = generateRoundRobinSchedule({
      stageId: "stage-1",
      groups: [
        {
          id: "group-a",
          roundRobinMode: "single",
          entryIds: ["entry-1", "entry-2", "entry-3", "entry-4"],
        },
      ],
      venues: [{ id: "venue-1" }, { id: "venue-2" }],
      startAt: START_AT,
      matchDurationMinutes: 60,
      breakMinutes: 15,
    });

    expect(matches).toHaveLength(6);

    const kickoffTimes = matches.map((match) => match.kickoffAt.toISOString());
    expect(new Set(kickoffTimes).size).toBe(3);

    const rounds = new Map<number, typeof matches>();
    for (const match of matches) {
      const existing = rounds.get(match.roundNumber) ?? [];
      existing.push(match);
      rounds.set(match.roundNumber, existing);
    }

    expect([...rounds.keys()]).toEqual([1, 2, 3]);
    for (const roundMatches of rounds.values()) {
      expect(roundMatches).toHaveLength(2);

      const participants = roundMatches.flatMap((match) => [
        match.homeEntryId,
        match.awayEntryId,
      ]);
      expect(new Set(participants).size).toBe(4);
    }

    const firstRoundMatches = rounds.get(1);
    expect(firstRoundMatches).toBeDefined();
    if (!firstRoundMatches) {
      throw new Error("Expected first round matches to be defined");
    }

    const firstKickoff = firstRoundMatches[0]?.kickoffAt;
    expect(firstKickoff?.toISOString()).toBe(START_AT.toISOString());
  });

  it("creates mirrored return legs for double round robin play", () => {
    const { matches } = generateRoundRobinSchedule({
      stageId: "stage-1",
      groups: [
        {
          id: "group-b",
          roundRobinMode: "double",
          entryIds: ["entry-1", "entry-2", "entry-3"],
        },
      ],
      venues: [{ id: "arena-1" }],
      startAt: START_AT,
      matchDurationMinutes: 50,
      breakMinutes: 10,
    });

    expect(matches).toHaveLength(6);

    const firstLeg = matches.slice(0, matches.length / 2);
    const secondLeg = matches.slice(matches.length / 2);

    const firstLegPairs = firstLeg.map((match) => [
      match.homeEntryId,
      match.awayEntryId,
    ]);
    const secondLegPairs = secondLeg.map((match) => [
      match.awayEntryId,
      match.homeEntryId,
    ]);

    expect(secondLegPairs).toEqual(firstLegPairs);

    const kickoffTimes = matches.map((match) => match.kickoffAt.getTime());
    expect(kickoffTimes).toStrictEqual([...kickoffTimes].sort((a, b) => a - b));
  });
});
