import { expect, test } from "@playwright/test";

const SCOREBOARD_API =
  "**/api/public/competitions/trondheim-cup/editions/2025/scoreboard";

type ScoreboardPayload = {
  edition: {
    id: string;
    competition_id: string;
    label: string;
    slug: string;
    status: "draft" | "published" | "archived";
    format: string;
    registration_window: {
      opens_at: string | null;
      closes_at: string | null;
    };
    scoreboard_rotation_seconds: number;
    scoreboard_theme: {
      primary_color: string;
      secondary_color: string;
      background_image_url: string | null;
    };
    published_at: string | null;
  };
  matches: Array<{
    id: string;
    status: "scheduled" | "in_progress" | "finalized" | "disputed";
    kickoff_at: string;
    home: { entry_id: string; name: string; score: number };
    away: { entry_id: string; name: string; score: number };
    highlight: string | null;
  }>;
  standings: Array<{
    entry_id: string;
    position: number;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    points: number;
    fair_play_score: number | null;
  }>;
  top_scorers: Array<{
    person_id: string;
    entry_id: string;
    name: string;
    goals: number;
    assists: number;
    yellow_cards: number;
    red_cards: number;
  }>;
  rotation: Array<"live_matches" | "upcoming" | "standings" | "top_scorers">;
};

function buildPayload(highlight: string): ScoreboardPayload {
  const now = new Date().toISOString();
  return {
    edition: {
      id: "edition-1",
      competition_id: "competition-1",
      label: "2025",
      slug: "2025",
      status: "published",
      format: "round_robin",
      registration_window: {
        opens_at: now,
        closes_at: now,
      },
      scoreboard_rotation_seconds: 2,
      scoreboard_theme: {
        primary_color: "#0B1F3A",
        secondary_color: "#F2F4FF",
        background_image_url: null,
      },
      published_at: now,
    },
    matches: [
      {
        id: "match-1",
        status: "in_progress",
        kickoff_at: now,
        home: {
          entry_id: "entry-home",
          name: "Trondheim Nord",
          score: 2,
        },
        away: {
          entry_id: "entry-away",
          name: "Trondheim Sør",
          score: 1,
        },
        highlight,
      },
    ],
    standings: [
      {
        entry_id: "entry-home",
        position: 1,
        played: 3,
        won: 3,
        drawn: 0,
        lost: 0,
        goals_for: 8,
        goals_against: 2,
        goal_difference: 6,
        points: 9,
        fair_play_score: null,
      },
    ],
    top_scorers: [
      {
        person_id: "person-1",
        entry_id: "entry-home",
        name: "Mats Berg",
        goals: 4,
        assists: 2,
        yellow_cards: 0,
        red_cards: 0,
      },
    ],
    rotation: ["live_matches", "standings", "top_scorers"],
  };
}

test.describe("Public scoreboard", () => {
  test("renders live, upcoming and standings panels", async ({ page }) => {
    await page.goto("/competitions/trondheim-cup/2025/scoreboard");

    await expect(page.getByRole("heading", { name: /2025/i })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Live nå" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Neste kamper" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tabell" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Toppscorere" }),
    ).toBeVisible();
  });

  test("polls the scoreboard API and updates overlays", async ({ page }) => {
    const payloads = [
      buildPayload("Mål for Trondheim Nord!"),
      buildPayload("Ny høydepunkt på skjermen"),
    ];
    let callCount = 0;

    await page.route(SCOREBOARD_API, async (route) => {
      const payload = payloads[Math.min(callCount, payloads.length - 1)];
      callCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    });

    await page.goto("/competitions/trondheim-cup/2025/scoreboard");

    await page.getByRole("button", { name: /Storskjerm/i }).click();

    const overlay = page.locator('[aria-live="polite"]');
    await expect(overlay).toHaveText("Mål for Trondheim Nord!");

    await expect.poll(() => callCount).toBeGreaterThan(1);
    await expect(overlay).toHaveText("Ny høydepunkt på skjermen");
  });
});
