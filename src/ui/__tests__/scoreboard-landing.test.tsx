import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ScoreboardData,
  ScoreboardGroupTable,
  ScoreboardMatch,
  ScoreboardStanding,
  ScoreboardTopScorer,
} from "@/modules/public/scoreboard-types";
import { ScoreboardScreen } from "@/ui/components/scoreboard/scoreboard-layout";

let mockData: ScoreboardData;
let mockParams: { competitionSlug?: string; editionSlug?: string } = {};
let mockSearchParams = new URLSearchParams();
const storageMap = new Map<string, string>();
const storageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageMap.set(key, value);
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
};

vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/ui/hooks/useScoreboardPoll", () => ({
  useScoreboardPoll: () => ({
    data: mockData,
    dataUpdatedAt: Date.now(),
  }),
}));

beforeEach(() => {
  mockParams = {};
  mockSearchParams = new URLSearchParams();
  Object.defineProperty(window, "localStorage", {
    value: storageMock,
    configurable: true,
  });
  storageMock.clear();
});

afterEach(() => {
  cleanup();
});

describe("Scoreboard landing view", () => {
  it("renders landing layout by default with schedule section", () => {
    mockData = buildScoreboardData();
    render(
      <ScoreboardScreen
        initialData={mockData}
        competitionSlug="trondheim-cup"
        editionSlug="2025"
      />,
    );

    expect(screen.getByText("Publikumsvisning")).toBeInTheDocument();
    expect(screen.getByText("Kampoversikt")).toBeInTheDocument();
  });

  it("renders highlight and group tables when available", () => {
    mockData = buildScoreboardData({
      overlayMessage: "Goal of the tournament!",
      tables: [
        {
          groupId: "group-a",
          groupCode: "A",
          groupName: "Nord",
          standings: [
            {
              entryId: "entry-1",
              position: 1,
              played: 1,
              won: 1,
              drawn: 0,
              lost: 0,
              goalsFor: 2,
              goalsAgainst: 0,
              goalDifference: 2,
              points: 3,
              fairPlayScore: 0,
            },
          ],
        },
      ],
      topScorers: [
        {
          personId: "player-1",
          entryId: "entry-1",
          name: "Ida Strand",
          goals: 2,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
        },
      ],
    });

    render(
      <ScoreboardScreen
        initialData={mockData}
        competitionSlug="trondheim-cup"
        editionSlug="2025"
      />,
    );

    expect(screen.getByText("Høydepunkt")).toBeInTheDocument();
    expect(screen.getByText("Goal of the tournament!")).toBeInTheDocument();
    expect(screen.getByText("Gruppe A · Nord")).toBeInTheDocument();
    expect(screen.getByText("Toppscorere")).toBeInTheDocument();
  });

  it("renders screen layout when mode is stored as screen", async () => {
    mockSearchParams = new URLSearchParams("theme=winter");
    window.localStorage.setItem("scoreboard-mode", "screen");
    window.localStorage.setItem("scoreboard-season-theme", "christmas");

    mockData = buildScoreboardData({
      tables: [],
      standings: [
        {
          entryId: "entry-1",
          position: 1,
          played: 2,
          won: 2,
          drawn: 0,
          lost: 0,
          goalsFor: 4,
          goalsAgainst: 1,
          goalDifference: 3,
          points: 6,
          fairPlayScore: 0,
        },
      ],
      topScorers: [
        {
          personId: "player-2",
          entryId: "entry-2",
          name: "Siri Fjell",
          goals: 3,
          assists: 1,
          yellowCards: 0,
          redCards: 0,
        },
      ],
    });

    render(
      <ScoreboardScreen
        initialData={mockData}
        competitionSlug="trondheim-cup"
        editionSlug="2025"
      />,
    );

    await waitFor(() =>
      expect(screen.getByText(/Kampoppsett/)).toBeInTheDocument(),
    );
    expect(screen.getByText("Toppscorere")).toBeInTheDocument();
    expect(screen.getAllByText("Live").length).toBeGreaterThan(0);
  });

  it("renders grouped standings on the screen layout", async () => {
    window.localStorage.setItem("scoreboard-mode", "screen");

    mockData = buildScoreboardData({
      tables: [
        {
          groupId: "group-b",
          groupCode: "B",
          groupName: null,
          standings: [
            {
              entryId: "entry-2",
              position: 1,
              played: 1,
              won: 1,
              drawn: 0,
              lost: 0,
              goalsFor: 1,
              goalsAgainst: 0,
              goalDifference: 1,
              points: 3,
              fairPlayScore: 0,
            },
          ],
        },
      ],
    });

    render(
      <ScoreboardScreen
        initialData={mockData}
        competitionSlug="trondheim-cup"
        editionSlug="2025"
      />,
    );

    await waitFor(() =>
      expect(screen.getByText("Gruppe B")).toBeInTheDocument(),
    );
  });

  it("shows empty states when there are no matches", () => {
    mockData = buildScoreboardData({
      matches: [],
      topScorers: [],
      standings: [],
      tables: [],
    });

    render(
      <ScoreboardScreen
        initialData={mockData}
        competitionSlug="trondheim-cup"
        editionSlug="2025"
      />,
    );

    expect(
      screen.getByText("Ingen kommende kamper registrert."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ingen tabell tilgjengelig enda"),
    ).toBeInTheDocument();
  });
});

function buildScoreboardData(
  overrides: Partial<ScoreboardData> = {},
): ScoreboardData {
  const kickoff = new Date("2025-01-01T12:00:00Z");
  const laterKickoff = new Date("2025-01-02T14:00:00Z");

  const matches: ScoreboardMatch[] = [
    {
      id: "match-1",
      status: "in_progress",
      kickoffAt: kickoff,
      code: "A1",
      groupCode: "A",
      home: {
        entryId: "entry-1",
        name: "Lag A",
        score: 1,
      },
      away: {
        entryId: "entry-2",
        name: "Lag B",
        score: 0,
      },
      highlight: "Nydelig scoring!",
      venueName: "Main Arena",
    },
    {
      id: "match-2",
      status: "scheduled",
      kickoffAt: laterKickoff,
      code: "B1",
      groupCode: null,
      home: {
        entryId: "entry-3",
        name: "Lag C",
        score: 0,
      },
      away: {
        entryId: "entry-4",
        name: "Lag D",
        score: 0,
      },
      highlight: null,
      venueName: "Secondary Arena",
    },
  ];

  const standings: ScoreboardStanding[] = [];
  const tables: ScoreboardGroupTable[] = [];
  const topScorers: ScoreboardTopScorer[] = [];

  return {
    edition: {
      id: "edition-1",
      competitionId: "competition-1",
      competitionSlug: "trondheim-cup",
      competitionName: "Trondheim Cup",
      label: "Trondheim Cup 2025",
      slug: "2025",
      status: "published",
      format: "round_robin",
      timezone: "Europe/Oslo",
      publishedAt: kickoff,
      registrationWindow: {
        opensAt: kickoff,
        closesAt: kickoff,
      },
      scoreboardRotationSeconds: 5,
      scoreboardTheme: {
        primaryColor: "#0B1F3A",
        secondaryColor: "#FFFFFF",
        backgroundImageUrl: null,
      },
    },
    matches,
    standings,
    tables,
    topScorers,
    rotation: ["live_matches", "upcoming", "standings", "top_scorers"],
    overlayMessage: null,
    entries: [
      { id: "entry-1", name: "Lag A" },
      { id: "entry-2", name: "Lag B" },
      { id: "entry-3", name: "Lag C" },
      { id: "entry-4", name: "Lag D" },
    ],
    ...overrides,
  };
}
