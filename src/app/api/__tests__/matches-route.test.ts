import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET, PATCH } from "@/app/api/matches/[matchId]/route";
import type { AuthContext } from "@/server/auth";
import { getSession } from "@/server/auth";
import { db } from "@/server/db/client";
import {
  competitions,
  editions,
  entries,
  matchEvents,
  matches,
  stages,
  teams,
  venues,
} from "@/server/db/schema";
import { createCompetitionAdminContext } from "@/test/factories";

vi.mock("@/server/email/action-emails", () => ({
  sendMatchScheduleChangedEmails: vi.fn(async () => null),
  sendMatchFinalizedEmails: vi.fn(async () => null),
  sendMatchDisputedEmails: vi.fn(async () => null),
}));

const mockGetSession = vi.mocked(getSession);

const COMPETITION_ID = "00000000-0000-0000-0000-000000000501";
const EDITION_ID = "00000000-0000-0000-0000-000000000502";
const STAGE_ID = "00000000-0000-0000-0000-000000000503";
const VENUE_ID = "00000000-0000-0000-0000-000000000504";
const TEAM_HOME_ID = "00000000-0000-0000-0000-000000000505";
const TEAM_AWAY_ID = "00000000-0000-0000-0000-000000000506";
const ENTRY_HOME_ID = "00000000-0000-0000-0000-000000000507";
const ENTRY_AWAY_ID = "00000000-0000-0000-0000-000000000508";
const MATCH_ID = "00000000-0000-0000-0000-000000000509";

beforeEach(async () => {
  await db.delete(matchEvents);
  await db.delete(matches);
  await db.delete(entries);
  await db.delete(teams);
  await db.delete(venues);
  await db.delete(stages);
  await db.delete(editions);
  await db.delete(competitions);

  await db.insert(competitions).values({
    id: COMPETITION_ID,
    name: "Elite Cup",
    slug: "elite-cup",
    defaultTimezone: "Europe/Oslo",
  });

  await db.insert(editions).values({
    id: EDITION_ID,
    competitionId: COMPETITION_ID,
    label: "2025",
    slug: "2025",
    status: "published",
    format: "round_robin",
    timezone: "Europe/Oslo",
  });

  await db.insert(stages).values({
    id: STAGE_ID,
    editionId: EDITION_ID,
    name: "Group Stage",
    stageType: "group",
    orderIndex: 1,
  });

  await db.insert(venues).values({
    id: VENUE_ID,
    competitionId: COMPETITION_ID,
    editionId: EDITION_ID,
    name: "Main Arena",
    slug: "main-arena",
  });

  await db.insert(teams).values([
    { id: TEAM_HOME_ID, name: "Vikings", slug: "vikings" },
    { id: TEAM_AWAY_ID, name: "Ravens", slug: "ravens" },
  ]);

  await db.insert(entries).values([
    { id: ENTRY_HOME_ID, editionId: EDITION_ID, teamId: TEAM_HOME_ID },
    { id: ENTRY_AWAY_ID, editionId: EDITION_ID, teamId: TEAM_AWAY_ID },
  ]);

  await db.insert(matches).values({
    id: MATCH_ID,
    editionId: EDITION_ID,
    stageId: STAGE_ID,
    homeEntryId: ENTRY_HOME_ID,
    awayEntryId: ENTRY_AWAY_ID,
    venueId: VENUE_ID,
    kickoffAt: new Date(Date.now() + 60_000),
    status: "scheduled",
  });

  await db.insert(matchEvents).values({
    matchId: MATCH_ID,
    teamSide: "home",
    eventType: "goal",
    minute: 10,
    metadata: {},
  });
});

describe("matches route", () => {
  test("GET returns match details with events", async () => {
    const auth = createCompetitionAdminContext(COMPETITION_ID);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const request = new NextRequest(`http://localhost/api/matches/${MATCH_ID}`);
    const response = await GET(request, {
      params: Promise.resolve({ matchId: MATCH_ID }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.id).toBe(MATCH_ID);
    expect(body.events).toHaveLength(1);
  });

  test("PATCH updates match details and recomputes outcome", async () => {
    const auth = createCompetitionAdminContext(COMPETITION_ID);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const payload = {
      code: "M-01",
      kickoff_at: new Date(Date.now() + 120_000).toISOString(),
      venue_id: VENUE_ID,
      status: "finalized",
      home_entry_id: ENTRY_HOME_ID,
      away_entry_id: ENTRY_AWAY_ID,
      score: {
        home: { regulation: 2, extra_time: 1, penalties: 4 },
        away: { regulation: 2, extra_time: 0, penalties: 3 },
      },
      events: [
        {
          team_side: "home",
          event_type: "goal",
          minute: 12,
        },
      ],
      admin_notes: "Oppdatert",
    };

    const request = new NextRequest(
      `http://localhost/api/matches/${MATCH_ID}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ matchId: MATCH_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("finalized");
    expect(body.outcome).toBe("home_win");
    expect(body.events).toHaveLength(1);
  });

  test("PATCH recomputes outcome when score changes after finalization", async () => {
    const auth = createCompetitionAdminContext(COMPETITION_ID);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const finalizeRequest = new NextRequest(
      `http://localhost/api/matches/${MATCH_ID}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "finalized",
          score: {
            home: { regulation: 2 },
            away: { regulation: 0 },
          },
        }),
      },
    );

    const finalizeResponse = await PATCH(finalizeRequest, {
      params: Promise.resolve({ matchId: MATCH_ID }),
    });
    const finalizedBody = await finalizeResponse.json();

    expect(finalizeResponse.status).toBe(200);
    expect(finalizedBody.outcome).toBe("home_win");

    const correctionRequest = new NextRequest(
      `http://localhost/api/matches/${MATCH_ID}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          score: {
            home: { regulation: 1 },
            away: { regulation: 3 },
          },
        }),
      },
    );

    const correctionResponse = await PATCH(correctionRequest, {
      params: Promise.resolve({ matchId: MATCH_ID }),
    });
    const correctedBody = await correctionResponse.json();

    expect(correctionResponse.status).toBe(200);
    expect(correctedBody.outcome).toBe("away_win");
  });
});
