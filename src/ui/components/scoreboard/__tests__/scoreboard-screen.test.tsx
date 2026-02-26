import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { ScreenLayout } from "@/ui/components/scoreboard/scoreboard-screen";
import type {
  ScoreboardGroupTable,
  ScoreboardMatch,
  ScoreboardStanding,
  ScoreboardTopScorer,
} from "@/ui/components/scoreboard/scoreboard-ui-types";

afterEach(() => {
  cleanup();
});

function createMatch(
  overrides: Partial<ScoreboardMatch> = {},
): ScoreboardMatch {
  return {
    id: "match-1",
    code: "M1",
    groupCode: "A",
    status: "scheduled",
    kickoffAt: new Date("2025-01-01T10:00:00Z"),
    venueName: "Stadium A",
    home: { entryId: "team-1", name: "Home Team", score: 0 },
    away: { entryId: "team-2", name: "Away Team", score: 0 },
    highlight: null,
    ...overrides,
  };
}

function createStanding(
  overrides: Partial<ScoreboardStanding> = {},
): ScoreboardStanding {
  return {
    entryId: "team-1",
    position: 1,
    played: 3,
    won: 2,
    drawn: 1,
    lost: 0,
    goalsFor: 5,
    goalsAgainst: 2,
    goalDifference: 3,
    points: 7,
    fairPlayScore: null,
    ...overrides,
  };
}

function createScorer(
  overrides: Partial<ScoreboardTopScorer> = {},
): ScoreboardTopScorer {
  return {
    entryId: "team-1",
    personId: "person-1",
    name: "John Doe",
    goals: 5,
    assists: 2,
    yellowCards: 1,
    redCards: 0,
    ...overrides,
  };
}

describe("ScreenLayout", () => {
  const defaultEntryNames = new Map([
    ["team-1", "Team One"],
    ["team-2", "Team Two"],
    ["team-3", "Team Three"],
  ]);

  test("renders empty state when no matches", () => {
    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(
      screen.getByText("Ingen kamper registrert enda"),
    ).toBeInTheDocument();
  });

  test("renders highlight banner when hasHighlight and overlayText", () => {
    render(
      <ScreenLayout
        overlayText="Goal scored!"
        hasHighlight={true}
        highlightAnimating={false}
        matches={[]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("Goal scored!")).toBeInTheDocument();
  });

  test("applies animation class when highlightAnimating is true", () => {
    const { container } = render(
      <ScreenLayout
        overlayText="Animating!"
        hasHighlight={true}
        highlightAnimating={true}
        matches={[]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    const highlightBanner = container.querySelector("[aria-live='polite']");
    expect(highlightBanner).toHaveClass("scoreboard-animate-slide-in-down");
  });

  test("does not render highlight banner when hasHighlight is false", () => {
    render(
      <ScreenLayout
        overlayText="Hidden text"
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.queryByText("Hidden text")).not.toBeInTheDocument();
  });

  test("renders live matches separately", () => {
    const liveMatch = createMatch({
      id: "live-1",
      status: "in_progress",
      home: { entryId: "team-1", name: "Home", score: 2 },
      away: { entryId: "team-2", name: "Away", score: 1 },
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[liveMatch]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    // Live match card should show team names
    expect(screen.getAllByText("Team One").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Team Two").length).toBeGreaterThanOrEqual(1);
    // Score display
    expect(screen.getAllByText("2 – 1").length).toBeGreaterThanOrEqual(1);
  });

  test("renders disputed matches as live", () => {
    const disputedMatch = createMatch({
      id: "disputed-1",
      status: "disputed",
      home: { entryId: "team-1", name: "Home", score: 1 },
      away: { entryId: "team-2", name: "Away", score: 1 },
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[disputedMatch]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getAllByText("1 – 1").length).toBeGreaterThanOrEqual(1);
  });

  test("renders match highlight text", () => {
    const matchWithHighlight = createMatch({
      id: "highlight-1",
      status: "in_progress",
      highlight: "Amazing goal by player!",
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[matchWithHighlight]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("Amazing goal by player!")).toBeInTheDocument();
  });

  test("uses fallback name when entryId not in entryNames map", () => {
    const matchWithUnknownTeam = createMatch({
      id: "unknown-1",
      status: "in_progress",
      home: { entryId: "unknown-team", name: "Fallback Name", score: 0 },
      away: { entryId: null, name: "No Entry Team", score: 0 },
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[matchWithUnknownTeam]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getAllByText("Fallback Name").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText("No Entry Team").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  test("renders scheduled matches in table", () => {
    const scheduledMatch = createMatch({
      id: "scheduled-1",
      status: "scheduled",
      code: "S1",
      groupCode: "B",
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[scheduledMatch]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    // The match should be in the table
    expect(screen.getByText("S1")).toBeInTheDocument();
  });

  test("renders standings table when no group tables", () => {
    const standings = [
      createStanding({ entryId: "team-1", position: 1, points: 9 }),
      createStanding({ entryId: "team-2", position: 2, points: 6 }),
    ];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={standings}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("Tabell")).toBeInTheDocument();
    expect(screen.getByText("Team One")).toBeInTheDocument();
    expect(screen.getByText("Team Two")).toBeInTheDocument();
  });

  test("renders positive goal difference with plus sign", () => {
    const standings = [
      createStanding({ entryId: "team-1", goalDifference: 5 }),
    ];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={standings}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("+5")).toBeInTheDocument();
  });

  test("renders negative goal difference without plus sign", () => {
    const standings = [
      createStanding({ entryId: "team-1", goalDifference: -3 }),
    ];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={standings}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("-3")).toBeInTheDocument();
  });

  test("renders zero goal difference without plus sign", () => {
    const standings = [
      createStanding({ entryId: "team-1", goalDifference: 0 }),
    ];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={standings}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  test("renders empty standings state", () => {
    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("Ingen tabell enda")).toBeInTheDocument();
  });

  test("renders group tables instead of single standings", () => {
    const tables: ScoreboardGroupTable[] = [
      {
        groupId: "group-a",
        groupCode: "A",
        groupName: "Group Alpha",
        standings: [createStanding({ entryId: "team-1" })],
      },
    ];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={[]}
        tables={tables}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("A · Group Alpha")).toBeInTheDocument();
  });

  test("renders group table without group name", () => {
    const tables: ScoreboardGroupTable[] = [
      {
        groupId: "group-b",
        groupCode: "B",
        groupName: null,
        standings: [createStanding({ entryId: "team-1" })],
      },
    ];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={[]}
        tables={tables}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("Gruppe B")).toBeInTheDocument();
  });

  test("renders top scorers list", () => {
    const scorers = [
      createScorer({ personId: "p1", name: "Top Scorer", goals: 10 }),
    ];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={[]}
        tables={[]}
        scorers={scorers}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("Top Scorer")).toBeInTheDocument();
  });

  test("hides top scorers panel when disabled by modules", () => {
    const scorers = [
      createScorer({ personId: "p1", name: "Hidden Scorer", goals: 7 }),
    ];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        showTopScorers={false}
        matches={[]}
        standings={[]}
        tables={[]}
        scorers={scorers}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.queryByText("Hidden Scorer")).not.toBeInTheDocument();
    expect(screen.queryByText("Toppscorere")).not.toBeInTheDocument();
  });

  test("renders empty scorers state", () => {
    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("Ingen mål enda")).toBeInTheDocument();
  });

  test("renders unknown player name as Ukjent", () => {
    const scorers = [createScorer({ personId: "p1", name: "", goals: 5 })];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={[]}
        tables={[]}
        scorers={scorers}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("Ukjent")).toBeInTheDocument();
  });

  test("renders match venue name or fallback", () => {
    const matchWithVenue = createMatch({
      id: "venue-1",
      status: "in_progress",
      venueName: "Main Stadium",
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[matchWithVenue]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getAllByText(/Main Stadium/).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  test("renders Arena fallback when no venue name", () => {
    const matchWithoutVenue = createMatch({
      id: "no-venue-1",
      status: "in_progress",
      venueName: null,
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[matchWithoutVenue]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    // The live match card should show "Arena" fallback followed by time
    const arenaElements = screen.getAllByText(/Arena/);
    // We expect at least the table header and the live match card venue text
    expect(arenaElements.length).toBeGreaterThanOrEqual(2);
  });

  test("uses match code or group code in table", () => {
    const matchWithCode = createMatch({
      id: "code-1",
      code: "MC1",
      groupCode: "G1",
      status: "finalized",
    });
    const matchWithoutCode = createMatch({
      id: "code-2",
      code: null,
      groupCode: "G2",
      status: "finalized",
    });
    const matchWithNoCodeAtAll = createMatch({
      id: "code-3",
      code: null,
      groupCode: null,
      status: "finalized",
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[matchWithCode, matchWithoutCode, matchWithNoCodeAtAll]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    // First match uses code
    expect(screen.getByText("MC1")).toBeInTheDocument();
    // Second match uses groupCode
    expect(screen.getByText("G2")).toBeInTheDocument();
  });

  test("uses entry name from map for standings when available", () => {
    const standings = [createStanding({ entryId: "team-1" })];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={standings}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("Team One")).toBeInTheDocument();
  });

  test("falls back to entryId when entry name not in map", () => {
    const standings = [createStanding({ entryId: "unknown-entry-id" })];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={standings}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("unknown-entry-id")).toBeInTheDocument();
  });

  test("renders team name from entryNames when away entryId matches", () => {
    const matchWithAwayFromMap = createMatch({
      id: "away-from-map",
      status: "in_progress",
      home: { entryId: null, name: "Home Direct", score: 1 },
      away: { entryId: "team-2", name: "Away Fallback", score: 2 },
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[matchWithAwayFromMap]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    // Away team should use Team Two from map, not fallback
    expect(screen.getAllByText("Team Two").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Home Direct").length).toBeGreaterThanOrEqual(1);
  });

  test("uses fallback away name when entryId not in map", () => {
    const matchWithUnknownAway = createMatch({
      id: "unknown-away",
      status: "in_progress",
      home: { entryId: "team-1", name: "Home", score: 0 },
      away: { entryId: "not-in-map", name: "Away Fallback Name", score: 0 },
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[matchWithUnknownAway]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(
      screen.getAllByText("Away Fallback Name").length,
    ).toBeGreaterThanOrEqual(1);
  });

  test("renders dash for match without venue in table", () => {
    const matchNoVenue = createMatch({
      id: "no-venue-table",
      status: "finalized",
      venueName: null,
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[matchNoVenue]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    // There should be a dash displayed for the venue
    const dashElements = screen.getAllByText("—");
    expect(dashElements.length).toBeGreaterThanOrEqual(1);
  });

  test("renders team names in table with entryId lookups", () => {
    const tableMatch = createMatch({
      id: "table-match",
      status: "scheduled",
      home: { entryId: "team-1", name: "Home Fallback", score: 0 },
      away: { entryId: "team-2", name: "Away Fallback", score: 0 },
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[tableMatch]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    // Should use names from map
    expect(screen.getByText("Team One")).toBeInTheDocument();
    expect(screen.getByText("Team Two")).toBeInTheDocument();
  });

  test("renders fallback team names in table when not in map", () => {
    const tableMatch = createMatch({
      id: "table-match-fallback",
      status: "scheduled",
      home: { entryId: "unknown-home", name: "Home Direct Name", score: 0 },
      away: { entryId: null, name: "Away Direct Name", score: 0 },
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[tableMatch]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("Home Direct Name")).toBeInTheDocument();
    expect(screen.getByText("Away Direct Name")).toBeInTheDocument();
  });

  test("renders scorer team name from map when available", () => {
    const scorers = [
      createScorer({
        personId: "p1",
        entryId: "team-1",
        name: "Player Name",
        goals: 3,
      }),
    ];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={[]}
        tables={[]}
        scorers={scorers}
        entryNames={defaultEntryNames}
      />,
    );

    // Player name and team name should be shown
    expect(screen.getByText("Player Name")).toBeInTheDocument();
    expect(screen.getByText("Team One")).toBeInTheDocument();
  });

  test("renders empty string for scorer team when not in map", () => {
    const scorers = [
      createScorer({
        personId: "p2",
        entryId: "unknown-team-id",
        name: "Unknown Player",
        goals: 1,
      }),
    ];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={[]}
        tables={[]}
        scorers={scorers}
        entryNames={defaultEntryNames}
      />,
    );

    // Player name should be shown, but team name falls back to empty
    expect(screen.getByText("Unknown Player")).toBeInTheDocument();
  });

  test("handles multiple group tables with standings limits", () => {
    const tables: ScoreboardGroupTable[] = [
      {
        groupId: "group-a",
        groupCode: "A",
        groupName: "Alpha",
        standings: [
          createStanding({ entryId: "team-1", position: 1 }),
          createStanding({ entryId: "team-2", position: 2 }),
        ],
      },
      {
        groupId: "group-b",
        groupCode: "B",
        groupName: "Beta",
        standings: [createStanding({ entryId: "team-3", position: 1 })],
      },
    ];

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[]}
        standings={[]}
        tables={tables}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    expect(screen.getByText("A · Alpha")).toBeInTheDocument();
    expect(screen.getByText("B · Beta")).toBeInTheDocument();
  });

  test("uses match name when home entryId exists but is not in map", () => {
    const tableMatch = createMatch({
      id: "home-not-in-map",
      status: "finalized",
      home: {
        entryId: "missing-entry",
        name: "Home Team From Match",
        score: 2,
      },
      away: { entryId: "team-2", name: "Away Fallback", score: 1 },
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[tableMatch]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    // Home should fall back to match.home.name since entryId is not in map
    expect(screen.getByText("Home Team From Match")).toBeInTheDocument();
    // Away should use map lookup
    expect(screen.getByText("Team Two")).toBeInTheDocument();
  });

  test("uses match name when away entryId exists but is not in map", () => {
    const tableMatch = createMatch({
      id: "away-not-in-map",
      status: "finalized",
      home: { entryId: "team-1", name: "Home Fallback", score: 1 },
      away: {
        entryId: "missing-entry",
        name: "Away Team From Match",
        score: 0,
      },
    });

    render(
      <ScreenLayout
        overlayText=""
        hasHighlight={false}
        highlightAnimating={false}
        matches={[tableMatch]}
        standings={[]}
        tables={[]}
        scorers={[]}
        entryNames={defaultEntryNames}
      />,
    );

    // Home should use map lookup
    expect(screen.getByText("Team One")).toBeInTheDocument();
    // Away should fall back to match.away.name since entryId is not in map
    expect(screen.getByText("Away Team From Match")).toBeInTheDocument();
  });
});
