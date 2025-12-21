import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ScoreboardData } from "@/modules/public/scoreboard-types";
import { ScoreboardScreen } from "@/ui/components/scoreboard/scoreboard-layout";

let mockData: ScoreboardData;

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/ui/hooks/useScoreboardPoll", () => ({
  useScoreboardPoll: () => ({
    data: mockData,
    dataUpdatedAt: Date.now(),
  }),
}));

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
});

function buildScoreboardData(): ScoreboardData {
  const kickoff = new Date("2025-01-01T12:00:00Z");

  return {
    edition: {
      id: "edition-1",
      competitionId: "competition-1",
      competitionSlug: "trondheim-cup",
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
    matches: [
      {
        id: "match-1",
        status: "scheduled",
        kickoffAt: kickoff,
        home: {
          entryId: "entry-1",
          name: "Lag A",
          score: 0,
        },
        away: {
          entryId: "entry-2",
          name: "Lag B",
          score: 0,
        },
        highlight: null,
      },
    ],
    standings: [],
    topScorers: [],
    rotation: ["live_matches", "upcoming", "standings", "top_scorers"],
    overlayMessage: null,
    entries: [
      { id: "entry-1", name: "Lag A" },
      { id: "entry-2", name: "Lag B" },
    ],
  };
}
