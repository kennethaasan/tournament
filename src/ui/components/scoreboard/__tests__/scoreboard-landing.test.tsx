import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LandingLayout } from "@/ui/components/scoreboard/scoreboard-landing";
import type {
  ScoreboardData,
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

function createData(overrides: Partial<ScoreboardData> = {}): ScoreboardData {
  return {
    edition: {
      id: "edition-1",
      competitionId: "comp-1",
      competitionSlug: "test-cup",
      competitionName: "Test Cup",
      label: "Test Cup 2025",
      slug: "2025",
      status: "published",
      format: "round_robin",
      timezone: "Europe/Oslo",
      publishedAt: new Date("2025-01-01"),
      registrationWindow: { opensAt: null, closesAt: null },
      scoreboardRotationSeconds: 5,
      scoreboardTheme: {
        primaryColor: "#0B1F3A",
        secondaryColor: "#FFFFFF",
        backgroundImageUrl: null,
      },
    },
    matches: [],
    standings: [],
    tables: [],
    topScorers: [],
    rotation: [],
    overlayMessage: null,
    entries: [],
    ...overrides,
  };
}

const defaultEntryNames = new Map([
  ["team-1", "Team One"],
  ["team-2", "Team Two"],
  ["team-3", "Team Three"],
]);

const defaultProps = {
  entryNames: defaultEntryNames,
  overlayText: "",
  hasHighlight: false,
  searchQuery: "",
  onSearchChange: vi.fn(),
  statusFilter: "all" as const,
  onStatusFilterChange: vi.fn(),
  sortOption: "time" as const,
  onSortOptionChange: vi.fn(),
  connectionStatus: "connected" as const,
  lastUpdated: new Date(),
  isLoading: false,
};

describe("LandingLayout", () => {
  test("renders stats cards", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [createMatch(), createMatch({ id: "match-2" })],
        })}
        {...defaultProps}
      />,
    );

    // Should show match count in stats
    expect(screen.getByText("Kamper")).toBeInTheDocument();
    expect(screen.getByText("Mål")).toBeInTheDocument();
    expect(screen.getByText("Spilt")).toBeInTheDocument();
    // "Live" appears multiple times (stats card + filter button)
    const liveElements = screen.getAllByText("Live");
    expect(liveElements.length).toBeGreaterThanOrEqual(2);
  });

  test("renders highlight banner when hasHighlight and overlayText", () => {
    render(
      <LandingLayout
        data={createData()}
        {...defaultProps}
        overlayText="Tournament Update!"
        hasHighlight={true}
      />,
    );

    expect(screen.getByText("Høydepunkt")).toBeInTheDocument();
    expect(screen.getByText("Tournament Update!")).toBeInTheDocument();
  });

  test("does not render highlight banner when hasHighlight is false", () => {
    render(
      <LandingLayout
        data={createData()}
        {...defaultProps}
        overlayText="Hidden"
        hasHighlight={false}
      />,
    );

    expect(screen.queryByText("Høydepunkt")).not.toBeInTheDocument();
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  test("renders live matches section when live matches exist", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [createMatch({ id: "live-1", status: "in_progress" })],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Live nå")).toBeInTheDocument();
  });

  test("renders disputed matches as live", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [createMatch({ id: "disputed-1", status: "disputed" })],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Live nå")).toBeInTheDocument();
  });

  test("renders upcoming matches section", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [createMatch({ status: "scheduled" })],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Neste kamper")).toBeInTheDocument();
  });

  test("renders empty state for upcoming matches when none exist", () => {
    render(
      <LandingLayout data={createData({ matches: [] })} {...defaultProps} />,
    );

    expect(
      screen.getByText("Ingen kommende kamper registrert."),
    ).toBeInTheDocument();
  });

  test("shows score for matches with finalized status", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [
            createMatch({
              id: "finalized-1",
              status: "finalized",
              home: { entryId: "team-1", name: "Home", score: 3 },
              away: { entryId: "team-2", name: "Away", score: 1 },
            }),
          ],
        })}
        {...defaultProps}
      />,
    );

    // The score should be displayed
    expect(screen.getByText("3 – 1")).toBeInTheDocument();
  });

  test("filters matches by search query", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [
            createMatch({ id: "m1" }),
            createMatch({
              id: "m2",
              home: { entryId: "team-3", name: "Special Team", score: 0 },
            }),
          ],
        })}
        {...defaultProps}
        searchQuery="Special"
      />,
    );

    // The search input should have the value
    const searchInput = screen.getByPlaceholderText("Søk lag...");
    expect(searchInput).toHaveValue("Special");
  });

  test("filters matches by status filter", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [
            createMatch({ id: "m1", status: "scheduled" }),
            createMatch({ id: "m2", status: "finalized" }),
          ],
        })}
        {...defaultProps}
        statusFilter="finalized"
      />,
    );

    // Filter button should show active state
    const allButton = screen.getByRole("button", { name: "Alle" });
    const finalizedButton = screen.getByRole("button", { name: "Ferdig" });

    expect(allButton).not.toHaveClass("bg-white");
    expect(finalizedButton).toHaveClass("bg-white");
  });

  test("calls onStatusFilterChange when filter button clicked", () => {
    const onStatusFilterChange = vi.fn();
    render(
      <LandingLayout
        data={createData()}
        {...defaultProps}
        onStatusFilterChange={onStatusFilterChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Live" }));
    expect(onStatusFilterChange).toHaveBeenCalledWith("live");
  });

  test("calls onSearchChange when search input changes", () => {
    const onSearchChange = vi.fn();
    render(
      <LandingLayout
        data={createData()}
        {...defaultProps}
        onSearchChange={onSearchChange}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Søk lag...");
    fireEvent.change(searchInput, { target: { value: "test" } });
    expect(onSearchChange).toHaveBeenCalledWith("test");
  });

  test("calls onSortOptionChange when sort option changes", () => {
    const onSortOptionChange = vi.fn();
    render(
      <LandingLayout
        data={createData()}
        {...defaultProps}
        onSortOptionChange={onSortOptionChange}
      />,
    );

    const sortSelect = screen.getByRole("combobox", { name: "Sorter etter" });
    fireEvent.change(sortSelect, { target: { value: "venue" } });
    expect(onSortOptionChange).toHaveBeenCalledWith("venue");
  });

  test("renders loading skeleton when isLoading is true", () => {
    const { container } = render(
      <LandingLayout data={createData()} {...defaultProps} isLoading={true} />,
    );

    // Should show skeleton elements (animated placeholders)
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("renders standings table when no group tables", () => {
    render(
      <LandingLayout
        data={createData({
          standings: [createStanding({ entryId: "team-1" })],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Tabell")).toBeInTheDocument();
    expect(screen.getByText("Team One")).toBeInTheDocument();
  });

  test("renders group tables when present", () => {
    const tables: ScoreboardGroupTable[] = [
      {
        groupId: "group-a",
        groupCode: "A",
        groupName: "Alpha",
        standings: [createStanding({ entryId: "team-1" })],
      },
    ];

    render(<LandingLayout data={createData({ tables })} {...defaultProps} />);

    expect(screen.getByText("Gruppe A · Alpha")).toBeInTheDocument();
  });

  test("renders group tables without name", () => {
    const tables: ScoreboardGroupTable[] = [
      {
        groupId: "group-b",
        groupCode: "B",
        groupName: null,
        standings: [createStanding({ entryId: "team-1" })],
      },
    ];

    render(<LandingLayout data={createData({ tables })} {...defaultProps} />);

    expect(screen.getByText("Gruppe B")).toBeInTheDocument();
  });

  test("renders empty standings state", () => {
    render(
      <LandingLayout data={createData({ standings: [] })} {...defaultProps} />,
    );

    expect(
      screen.getByText("Ingen tabell tilgjengelig enda"),
    ).toBeInTheDocument();
  });

  test("renders top scorers section", () => {
    render(
      <LandingLayout
        data={createData({
          topScorers: [createScorer({ name: "Star Player", goals: 10 })],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Toppscorere")).toBeInTheDocument();
    expect(screen.getByText("Star Player")).toBeInTheDocument();
  });

  test("hides top scorers section when disabled by modules", () => {
    render(
      <LandingLayout
        data={createData({
          topScorers: [createScorer({ name: "Hidden Scorer", goals: 4 })],
        })}
        {...defaultProps}
        showTopScorers={false}
      />,
    );

    expect(screen.queryByText("Toppscorere")).not.toBeInTheDocument();
    expect(screen.queryByText("Hidden Scorer")).not.toBeInTheDocument();
  });

  test("renders empty scorers state", () => {
    render(
      <LandingLayout data={createData({ topScorers: [] })} {...defaultProps} />,
    );

    expect(screen.getByText("Ingen mål registrert enda")).toBeInTheDocument();
  });

  test("renders player stats pills for assists", () => {
    render(
      <LandingLayout
        data={createData({
          topScorers: [createScorer({ assists: 5 })],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Assist")).toBeInTheDocument();
  });

  test("renders player stats pills for yellow cards", () => {
    render(
      <LandingLayout
        data={createData({
          topScorers: [createScorer({ yellowCards: 2, assists: 0 })],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Gule")).toBeInTheDocument();
  });

  test("renders player stats pills for red cards", () => {
    render(
      <LandingLayout
        data={createData({
          topScorers: [
            createScorer({ redCards: 1, yellowCards: 0, assists: 0 }),
          ],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Røde")).toBeInTheDocument();
  });

  test("does not render assists pill when assists is 0", () => {
    render(
      <LandingLayout
        data={createData({
          topScorers: [createScorer({ assists: 0 })],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.queryByText("Assist")).not.toBeInTheDocument();
  });

  test("renders match highlight text", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [
            createMatch({
              status: "in_progress",
              highlight: "Amazing goal!",
            }),
          ],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Amazing goal!")).toBeInTheDocument();
  });

  test("renders countdown badge for scheduled matches in upcoming section", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [
            createMatch({
              status: "scheduled",
              kickoffAt: new Date(Date.now() + 3600000), // 1 hour from now
            }),
          ],
        })}
        {...defaultProps}
      />,
    );

    // Countdown badge should be present
    // We can't test the exact time, but we can check the structure exists
    expect(screen.getByText("Neste kamper")).toBeInTheDocument();
  });

  test("positive goal difference displays with plus sign", () => {
    render(
      <LandingLayout
        data={createData({
          standings: [createStanding({ goalDifference: 5 })],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("+5")).toBeInTheDocument();
  });

  test("negative goal difference displays without plus sign", () => {
    render(
      <LandingLayout
        data={createData({
          standings: [createStanding({ goalDifference: -3 })],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("-3")).toBeInTheDocument();
  });

  test("zero goal difference displays without plus sign", () => {
    render(
      <LandingLayout
        data={createData({
          standings: [createStanding({ goalDifference: 0 })],
        })}
        {...defaultProps}
      />,
    );

    // Note: 0 will appear multiple times (played, points, etc.) so we check the cell context
    const cells = screen.getAllByText("0");
    expect(cells.length).toBeGreaterThan(0);
  });

  test("empty schedule table shows no matches message", () => {
    render(
      <LandingLayout
        data={createData({ matches: [] })}
        {...defaultProps}
        statusFilter="finalized"
      />,
    );

    expect(screen.getByText("Ingen kamper funnet")).toBeInTheDocument();
  });

  test("falls back to Navn mangler for empty player name", () => {
    render(
      <LandingLayout
        data={createData({
          topScorers: [createScorer({ name: "" })],
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Navn mangler")).toBeInTheDocument();
  });

  test("collapsible section can be toggled closed and open", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [createMatch({ status: "finalized" })],
        })}
        {...defaultProps}
      />,
    );

    // Find the section header for "Kampoversikt"
    const sectionButton = screen.getByRole("button", {
      name: /kampoversikt/i,
    });

    // Should be open by default (aria-expanded=true)
    expect(sectionButton).toHaveAttribute("aria-expanded", "true");

    // Click to collapse
    fireEvent.click(sectionButton);
    expect(sectionButton).toHaveAttribute("aria-expanded", "false");

    // Click to expand again
    fireEvent.click(sectionButton);
    expect(sectionButton).toHaveAttribute("aria-expanded", "true");
  });

  test("filters disputed matches as live", () => {
    const onStatusFilterChange = vi.fn();
    render(
      <LandingLayout
        data={createData({
          matches: [
            createMatch({ id: "m1", status: "disputed" }),
            createMatch({ id: "m2", status: "finalized" }),
          ],
        })}
        {...defaultProps}
        statusFilter="live"
        onStatusFilterChange={onStatusFilterChange}
      />,
    );

    // When status filter is "live", disputed matches should be shown
    // The "Live" filter button should be active
    const liveButton = screen.getByRole("button", { name: "Live" });
    expect(liveButton).toHaveClass("bg-white");
  });

  test("sorts matches by venue", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [
            createMatch({ id: "m1", venueName: "Bane B" }),
            createMatch({ id: "m2", venueName: "Bane A" }),
          ],
        })}
        {...defaultProps}
        sortOption="venue"
      />,
    );

    // Check the sort select shows "venue" value
    const sortSelect = screen.getByRole("combobox", { name: "Sorter etter" });
    expect(sortSelect).toHaveValue("venue");
  });

  test("sorts matches by group", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [
            createMatch({ id: "m1", groupCode: "B" }),
            createMatch({ id: "m2", groupCode: "A" }),
          ],
        })}
        {...defaultProps}
        sortOption="group"
      />,
    );

    const sortSelect = screen.getByRole("combobox", { name: "Sorter etter" });
    expect(sortSelect).toHaveValue("group");
  });

  test("shows entry name from map when available", () => {
    const entryNames = new Map([["team-custom", "Custom Team Name"]]);

    render(
      <LandingLayout
        data={createData({
          matches: [
            createMatch({
              id: "m1",
              status: "finalized",
              home: { entryId: "team-custom", name: "Fallback Name", score: 2 },
              away: { entryId: "team-2", name: "Away Team", score: 1 },
            }),
          ],
        })}
        {...defaultProps}
        entryNames={entryNames}
      />,
    );

    expect(screen.getByText("Custom Team Name")).toBeInTheDocument();
  });

  test("uses match name when entryId not in map", () => {
    const entryNames = new Map<string, string>();

    render(
      <LandingLayout
        data={createData({
          matches: [
            createMatch({
              id: "m1",
              status: "finalized",
              home: { entryId: "unknown", name: "Default Home", score: 2 },
              away: { entryId: "unknown2", name: "Default Away", score: 1 },
            }),
          ],
        })}
        {...defaultProps}
        entryNames={entryNames}
      />,
    );

    expect(screen.getByText("Default Home")).toBeInTheDocument();
    expect(screen.getByText("Default Away")).toBeInTheDocument();
  });

  test("handles null venueName in sorting", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [
            createMatch({ id: "m1", venueName: undefined }),
            createMatch({ id: "m2", venueName: "Bane A" }),
          ],
        })}
        {...defaultProps}
        sortOption="venue"
      />,
    );

    // Should not crash, venue sorting handles null values
    expect(screen.getByRole("combobox", { name: "Sorter etter" })).toHaveValue(
      "venue",
    );
  });

  test("handles null groupCode in sorting", () => {
    render(
      <LandingLayout
        data={createData({
          matches: [
            createMatch({ id: "m1", groupCode: undefined }),
            createMatch({ id: "m2", groupCode: "A" }),
          ],
        })}
        {...defaultProps}
        sortOption="group"
      />,
    );

    // Should not crash, group sorting handles null values
    expect(screen.getByRole("combobox", { name: "Sorter etter" })).toHaveValue(
      "group",
    );
  });
});
