import { describe, expect, it } from "vitest";
import type { ScoreboardMatch } from "@/ui/components/scoreboard/scoreboard-ui-types";
import {
  compareMatchesDefault,
  computeMatchStats,
  deriveOverlayMessage,
  deriveScheduleSummary,
  deriveSeasonTheme,
  deriveVenueSummary,
  formatCountdown,
  formatMatchScore,
  generateTeamColor,
  isLiveMatch,
  parseSeasonTheme,
  parseThemeSource,
  seasonGradient,
  statusLabel,
  toLocalDateKey,
} from "@/ui/components/scoreboard/scoreboard-utils";

describe("statusLabel", () => {
  it("returns Live for in_progress", () => {
    expect(statusLabel("in_progress")).toBe("Live");
  });

  it("returns Tvist for disputed", () => {
    expect(statusLabel("disputed")).toBe("Tvist");
  });

  it("returns Ferdig for finalized", () => {
    expect(statusLabel("finalized")).toBe("Ferdig");
  });

  it("returns Planlagt for scheduled and unknown statuses", () => {
    expect(statusLabel("scheduled")).toBe("Planlagt");
    expect(statusLabel("unknown" as never)).toBe("Planlagt");
  });
});

describe("formatMatchScore", () => {
  const createMatch = (
    status: ScoreboardMatch["status"],
    homeScore: number,
    awayScore: number,
    extraTime?: { home?: number | null; away?: number | null },
    penalties?: { home?: number | null; away?: number | null },
  ): ScoreboardMatch => ({
    id: "match-1",
    status,
    kickoffAt: new Date(),
    home: {
      entryId: "e1",
      name: "Home",
      score: homeScore,
      extraTime: extraTime?.home ?? null,
      penalties: penalties?.home ?? null,
    },
    away: {
      entryId: "e2",
      name: "Away",
      score: awayScore,
      extraTime: extraTime?.away ?? null,
      penalties: penalties?.away ?? null,
    },
  });

  it("returns empty string for scheduled match with 0-0 score", () => {
    expect(formatMatchScore(createMatch("scheduled", 0, 0))).toBe("");
  });

  it("returns score for scheduled match with non-zero score", () => {
    expect(formatMatchScore(createMatch("scheduled", 1, 0))).toBe("1 – 0");
  });

  it("returns score for in_progress match", () => {
    expect(formatMatchScore(createMatch("in_progress", 2, 1))).toBe("2 – 1");
  });

  it("returns score for finalized match", () => {
    expect(formatMatchScore(createMatch("finalized", 3, 3))).toBe("3 – 3");
  });

  it("includes extra time in the score display", () => {
    const match = createMatch("finalized", 1, 1, { home: 1, away: 0 });
    expect(formatMatchScore(match)).toBe("2 – 1 (EEO)");
  });

  it("includes penalty shootout results in the score display", () => {
    const match = createMatch("finalized", 1, 1, undefined, {
      home: 4,
      away: 3,
    });
    expect(formatMatchScore(match)).toBe("1 – 1 (ESP) 4–3 str.");
  });

  it("does not show EEO or ESP when values are 0-0 in a finalized match", () => {
    const match = createMatch(
      "finalized",
      2,
      1,
      { home: null, away: null },
      { home: null, away: null },
    );
    expect(formatMatchScore(match)).toBe("2 – 1");
  });

  it("shows ESP when match has penalty score even if in_progress", () => {
    const match = createMatch("in_progress", 1, 1, undefined, {
      home: 4,
      away: 3,
    });
    expect(formatMatchScore(match)).toBe("1 – 1 (ESP) 4–3 str.");
  });

  it("shows only EEO when both extra time and penalties are set", () => {
    const match = createMatch(
      "finalized",
      1,
      1,
      { home: 1, away: 0 },
      { home: 4, away: 3 },
    );
    expect(formatMatchScore(match)).toBe("2 – 1 (EEO) 4–3 str.");
  });

  it("shows EEO when match has extra time score", () => {
    const match = createMatch("in_progress", 1, 1, { home: 1, away: 0 });
    expect(formatMatchScore(match)).toBe("2 – 1 (EEO)");
  });
});

describe("isLiveMatch", () => {
  it("returns true for in_progress", () => {
    expect(isLiveMatch("in_progress")).toBe(true);
  });

  it("returns true for disputed", () => {
    expect(isLiveMatch("disputed")).toBe(true);
  });

  it("returns false for scheduled", () => {
    expect(isLiveMatch("scheduled")).toBe(false);
  });

  it("returns false for finalized", () => {
    expect(isLiveMatch("finalized")).toBe(false);
  });
});

describe("compareMatchesDefault", () => {
  const createMatch = (
    kickoffAt: Date,
    venueName: string | null = null,
    groupCode: string | null = null,
  ): ScoreboardMatch => ({
    id: "match-1",
    status: "scheduled",
    kickoffAt,
    home: { entryId: "e1", name: "Home", score: 0 },
    away: { entryId: "e2", name: "Away", score: 0 },
    venueName: venueName ?? undefined,
    groupCode: groupCode ?? undefined,
  });

  it("sorts by kickoff time first", () => {
    const earlier = createMatch(new Date("2024-01-01T10:00:00Z"));
    const later = createMatch(new Date("2024-01-01T14:00:00Z"));

    expect(compareMatchesDefault(earlier, later)).toBeLessThan(0);
    expect(compareMatchesDefault(later, earlier)).toBeGreaterThan(0);
  });

  it("sorts by venue when kickoff times are equal", () => {
    const matchA = createMatch(new Date("2024-01-01T10:00:00Z"), "Bane 1");
    const matchB = createMatch(new Date("2024-01-01T10:00:00Z"), "Bane 2");

    expect(compareMatchesDefault(matchA, matchB)).toBeLessThan(0);
  });

  it("sorts venues numerically (Bane 2 < Bane 10)", () => {
    const bane2 = createMatch(new Date("2024-01-01T10:00:00Z"), "Bane 2");
    const bane10 = createMatch(new Date("2024-01-01T10:00:00Z"), "Bane 10");

    expect(compareMatchesDefault(bane2, bane10)).toBeLessThan(0);
  });

  it("sorts by group code when time and venue are equal", () => {
    const matchA = createMatch(new Date("2024-01-01T10:00:00Z"), "Bane 1", "A");
    const matchB = createMatch(new Date("2024-01-01T10:00:00Z"), "Bane 1", "B");

    expect(compareMatchesDefault(matchA, matchB)).toBeLessThan(0);
  });

  it("handles null venues", () => {
    const withVenue = createMatch(
      new Date("2024-01-01T10:00:00Z"),
      "Bane 1",
      null,
    );
    const withoutVenue = createMatch(new Date("2024-01-01T10:00:00Z"), null);

    expect(compareMatchesDefault(withoutVenue, withVenue)).toBeLessThan(0);
  });

  it("handles different venue prefixes", () => {
    const arena1 = createMatch(new Date("2024-01-01T10:00:00Z"), "Arena 1");
    const bane1 = createMatch(new Date("2024-01-01T10:00:00Z"), "Bane 1");

    expect(compareMatchesDefault(arena1, bane1)).toBeLessThan(0);
  });
});

describe("formatCountdown", () => {
  it("returns 'Starter nå' when time has passed", () => {
    const pastDate = new Date(Date.now() - 60000);
    expect(formatCountdown(pastDate)).toBe("Starter nå");
  });

  it("returns 'Om < 1 min' for less than a minute", () => {
    const soon = new Date(Date.now() + 30000);
    expect(formatCountdown(soon)).toBe("Om < 1 min");
  });

  it("returns minutes for less than an hour", () => {
    const inMinutes = new Date(Date.now() + 15 * 60000);
    expect(formatCountdown(inMinutes)).toBe("Om 15 min");
  });

  it("returns hours and minutes for less than a day", () => {
    const inHours = new Date(Date.now() + 2 * 60 * 60000 + 30 * 60000);
    expect(formatCountdown(inHours)).toBe("Om 2t 30m");
  });

  it("returns days and hours for more than a day", () => {
    const inDays = new Date(Date.now() + 3 * 24 * 60 * 60000 + 5 * 60 * 60000);
    // Allow for 1-hour variance due to timezone/DST differences in CI
    expect(formatCountdown(inDays)).toMatch(/^Om 3d [45]t$/);
  });
});

describe("deriveScheduleSummary", () => {
  const createMatch = (kickoffAt: Date): ScoreboardMatch => ({
    id: "match-1",
    status: "scheduled",
    kickoffAt,
    home: { entryId: "e1", name: "Home", score: 0 },
    away: { entryId: "e2", name: "Away", score: 0 },
  });

  it("returns null for empty matches array", () => {
    expect(deriveScheduleSummary([])).toBeNull();
  });

  it("returns single date for same-day matches", () => {
    const matches = [
      createMatch(new Date("2024-06-15T10:00:00Z")),
      createMatch(new Date("2024-06-15T14:00:00Z")),
    ];
    const result = deriveScheduleSummary(matches);
    expect(result).toContain("15");
    expect(result).toContain("jun");
  });

  it("returns date range for multi-day tournament", () => {
    const matches = [
      createMatch(new Date("2024-06-15T10:00:00Z")),
      createMatch(new Date("2024-06-16T14:00:00Z")),
    ];
    const result = deriveScheduleSummary(matches);
    expect(result).toContain(" - ");
  });

  it("handles matches with invalid dates", () => {
    const matches = [createMatch(new Date("invalid"))];
    expect(deriveScheduleSummary(matches)).toBeNull();
  });
});

describe("deriveVenueSummary", () => {
  const createMatch = (venueName?: string): ScoreboardMatch => ({
    id: "match-1",
    status: "scheduled",
    kickoffAt: new Date(),
    home: { entryId: "e1", name: "Home", score: 0 },
    away: { entryId: "e2", name: "Away", score: 0 },
    venueName,
  });

  it("returns null for no matches", () => {
    expect(deriveVenueSummary([])).toBeNull();
  });

  it("returns null for matches without venues", () => {
    expect(deriveVenueSummary([createMatch()])).toBeNull();
  });

  it("returns single venue name", () => {
    expect(deriveVenueSummary([createMatch("Arena")])).toBe("Arena");
  });

  it("joins two venues with 'og'", () => {
    const matches = [createMatch("Arena"), createMatch("Stadium")];
    expect(deriveVenueSummary(matches)).toBe("Arena og Stadium");
  });

  it("shows count for more than 2 venues", () => {
    const matches = [
      createMatch("Arena"),
      createMatch("Stadium"),
      createMatch("Field"),
    ];
    expect(deriveVenueSummary(matches)).toBe("Arena + 2");
  });

  it("deduplicates venue names", () => {
    const matches = [
      createMatch("Arena"),
      createMatch("Arena"),
      createMatch("Stadium"),
    ];
    expect(deriveVenueSummary(matches)).toBe("Arena og Stadium");
  });

  it("ignores empty venue names", () => {
    const matches = [createMatch(""), createMatch("  "), createMatch("Arena")];
    expect(deriveVenueSummary(matches)).toBe("Arena");
  });
});

describe("deriveOverlayMessage", () => {
  it("returns overlayMessage when present", () => {
    const data = {
      overlayMessage: "Breaking news!",
      matches: [],
    };
    expect(deriveOverlayMessage(data as never)).toBe("Breaking news!");
  });

  it("returns first match highlight when no overlay message", () => {
    const data = {
      overlayMessage: null,
      matches: [
        { highlight: null },
        { highlight: "Goal scored!" },
        { highlight: "Another event" },
      ],
    };
    expect(deriveOverlayMessage(data as never)).toBe("Goal scored!");
  });

  it("returns empty string when no messages", () => {
    const data = {
      overlayMessage: null,
      matches: [{ highlight: null }],
    };
    expect(deriveOverlayMessage(data as never)).toBe("");
  });
});

describe("toLocalDateKey", () => {
  it("formats date as YYYY-MM-DD", () => {
    const date = new Date(2024, 5, 15);
    expect(toLocalDateKey(date)).toBe("2024-06-15");
  });

  it("pads single digit months and days", () => {
    const date = new Date(2024, 0, 5);
    expect(toLocalDateKey(date)).toBe("2024-01-05");
  });
});

describe("deriveSeasonTheme", () => {
  it("returns christmas for December", () => {
    expect(deriveSeasonTheme(new Date(2024, 11, 15))).toBe("christmas");
  });

  it("returns winter for November, January, February", () => {
    expect(deriveSeasonTheme(new Date(2024, 10, 15))).toBe("winter");
    expect(deriveSeasonTheme(new Date(2024, 0, 15))).toBe("winter");
    expect(deriveSeasonTheme(new Date(2024, 1, 15))).toBe("winter");
  });

  it("returns spring for March, April, May", () => {
    expect(deriveSeasonTheme(new Date(2024, 2, 15))).toBe("spring");
    expect(deriveSeasonTheme(new Date(2024, 3, 15))).toBe("spring");
    expect(deriveSeasonTheme(new Date(2024, 4, 15))).toBe("spring");
  });

  it("returns summer for June, July, August", () => {
    expect(deriveSeasonTheme(new Date(2024, 5, 15))).toBe("summer");
    expect(deriveSeasonTheme(new Date(2024, 6, 15))).toBe("summer");
    expect(deriveSeasonTheme(new Date(2024, 7, 15))).toBe("summer");
  });

  it("returns fall for September, October", () => {
    expect(deriveSeasonTheme(new Date(2024, 8, 15))).toBe("fall");
    expect(deriveSeasonTheme(new Date(2024, 9, 15))).toBe("fall");
  });
});

describe("parseSeasonTheme", () => {
  it("returns null for null/empty input", () => {
    expect(parseSeasonTheme(null)).toBeNull();
    expect(parseSeasonTheme("")).toBeNull();
  });

  it("parses jul/xmas as christmas", () => {
    expect(parseSeasonTheme("jul")).toBe("christmas");
    expect(parseSeasonTheme("xmas")).toBe("christmas");
    expect(parseSeasonTheme("JUL")).toBe("christmas");
  });

  it("parses valid theme names", () => {
    expect(parseSeasonTheme("auto")).toBe("auto");
    expect(parseSeasonTheme("christmas")).toBe("christmas");
    expect(parseSeasonTheme("winter")).toBe("winter");
    expect(parseSeasonTheme("spring")).toBe("spring");
    expect(parseSeasonTheme("summer")).toBe("summer");
    expect(parseSeasonTheme("fall")).toBe("fall");
  });

  it("returns null for invalid theme names", () => {
    expect(parseSeasonTheme("invalid")).toBeNull();
    expect(parseSeasonTheme("autumn")).toBeNull();
  });

  it("trims and lowercases input", () => {
    expect(parseSeasonTheme("  WINTER  ")).toBe("winter");
  });
});

describe("parseThemeSource", () => {
  it("returns null for null/empty input", () => {
    expect(parseThemeSource(null)).toBeNull();
    expect(parseThemeSource("")).toBeNull();
  });

  it("parses valid source names", () => {
    expect(parseThemeSource("competition")).toBe("competition");
    expect(parseThemeSource("season")).toBe("season");
  });

  it("returns null for invalid source names", () => {
    expect(parseThemeSource("invalid")).toBeNull();
    expect(parseThemeSource("custom")).toBeNull();
  });

  it("trims and lowercases input", () => {
    expect(parseThemeSource("  COMPETITION  ")).toBe("competition");
  });
});

describe("seasonGradient", () => {
  it("returns gradient for christmas", () => {
    expect(seasonGradient("christmas")).toContain("linear-gradient");
  });

  it("returns gradient for winter", () => {
    expect(seasonGradient("winter")).toContain("linear-gradient");
  });

  it("returns gradient for spring", () => {
    expect(seasonGradient("spring")).toContain("linear-gradient");
  });

  it("returns gradient for summer", () => {
    expect(seasonGradient("summer")).toContain("linear-gradient");
  });

  it("returns gradient for fall", () => {
    expect(seasonGradient("fall")).toContain("linear-gradient");
  });

  it("returns default gradient for unknown theme", () => {
    // Test the default case by passing an unknown value (type coercion for coverage)
    const result = seasonGradient("unknown" as never);
    expect(result).toContain("linear-gradient");
  });
});

describe("generateTeamColor", () => {
  it("returns consistent color for same team name", () => {
    const color1 = generateTeamColor("Team A");
    const color2 = generateTeamColor("Team A");
    expect(color1).toBe(color2);
  });

  it("returns different colors for different team names", () => {
    const colorA = generateTeamColor("Team A");
    const colorB = generateTeamColor("Team B");
    expect(colorA).not.toBe(colorB);
  });

  it("returns hsl color format", () => {
    const color = generateTeamColor("Team X");
    expect(color).toMatch(/^hsl\(\d+, 70%, 50%\)$/);
  });
});

describe("computeMatchStats", () => {
  const createMatch = (
    status: ScoreboardMatch["status"],
    homeScore = 0,
    awayScore = 0,
    extraTime?: { home?: number | null; away?: number | null },
  ): ScoreboardMatch => ({
    id: "match-1",
    status,
    kickoffAt: new Date(),
    home: {
      entryId: "e1",
      name: "Home",
      score: homeScore,
      extraTime: extraTime?.home ?? null,
    },
    away: {
      entryId: "e2",
      name: "Away",
      score: awayScore,
      extraTime: extraTime?.away ?? null,
    },
  });

  it("returns zeros for empty array", () => {
    const stats = computeMatchStats([]);
    expect(stats).toEqual({
      totalMatches: 0,
      totalGoals: 0,
      completedMatches: 0,
      liveMatches: 0,
    });
  });

  it("counts finalized matches and their goals", () => {
    const matches = [
      createMatch("finalized", 2, 1),
      createMatch("finalized", 0, 0, { home: 1, away: 0 }),
    ];
    const stats = computeMatchStats(matches);
    expect(stats.completedMatches).toBe(2);
    expect(stats.totalGoals).toBe(4);
  });

  it("counts live matches (in_progress and disputed)", () => {
    const matches = [
      createMatch("in_progress", 1, 0),
      createMatch("disputed", 1, 1),
    ];
    const stats = computeMatchStats(matches);
    expect(stats.liveMatches).toBe(2);
    expect(stats.totalGoals).toBe(3);
  });

  it("does not count scheduled matches in goals", () => {
    const matches = [
      createMatch("scheduled", 0, 0),
      createMatch("finalized", 2, 1),
    ];
    const stats = computeMatchStats(matches);
    expect(stats.totalMatches).toBe(2);
    expect(stats.completedMatches).toBe(1);
    expect(stats.totalGoals).toBe(3);
  });
});
