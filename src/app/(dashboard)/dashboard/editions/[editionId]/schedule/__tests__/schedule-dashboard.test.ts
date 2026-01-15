import { describe, expect, it } from "vitest";
import { buildKickoffSchedule } from "../schedule-dashboard";

describe("buildKickoffSchedule", () => {
  it("spreads kickoff times across concurrent slots", () => {
    const schedule = buildKickoffSchedule({
      startAt: "2025-01-01T10:00",
      matchDurationMinutes: 30,
      breakMinutes: 10,
      concurrentMatches: 2,
      matchCount: 5,
    });

    expect(schedule).toHaveLength(5);
    expect(schedule[0]?.getTime()).toBe(schedule[1]?.getTime());

    const slotMs = 40 * 60 * 1000;
    const firstKickoff = schedule[0]?.getTime();
    const thirdKickoff = schedule[2]?.getTime();
    const fifthKickoff = schedule[4]?.getTime();

    expect(firstKickoff).toBeDefined();
    expect(thirdKickoff).toBeDefined();
    expect(fifthKickoff).toBeDefined();

    if (
      firstKickoff !== undefined &&
      thirdKickoff !== undefined &&
      fifthKickoff !== undefined
    ) {
      expect(thirdKickoff).toBe(firstKickoff + slotMs);
      expect(fifthKickoff).toBe(firstKickoff + slotMs * 2);
    }
  });

  it("returns empty when start time is invalid", () => {
    const schedule = buildKickoffSchedule({
      startAt: "",
      matchDurationMinutes: 60,
      breakMinutes: 15,
      concurrentMatches: 1,
      matchCount: 2,
    });

    expect(schedule).toEqual([]);
  });
});
