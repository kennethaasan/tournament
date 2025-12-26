import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "@/app/api/editions/[editionId]/matches/bulk/route";
import { buildKnockoutBracket } from "@/modules/scheduling/bracket-service";
import { generateRoundRobinSchedule } from "@/modules/scheduling/round-robin-service";
import type { AuthContext } from "@/server/auth";
import { getSession } from "@/server/auth";
import { db } from "@/server/db/client";
import {
  brackets,
  competitions,
  editions,
  groups,
  matches,
  stages,
  venues,
} from "@/server/db/schema";
import { createCompetitionAdminContext } from "@/test/factories";

vi.mock("@/modules/scheduling/round-robin-service", () => ({
  generateRoundRobinSchedule: vi.fn(),
}));

vi.mock("@/modules/scheduling/bracket-service", () => ({
  buildKnockoutBracket: vi.fn(),
}));

vi.mock("@/server/email/action-emails", () => ({
  sendScheduleGeneratedEmails: vi.fn(async () => null),
}));

const mockGetSession = vi.mocked(getSession);
const mockRoundRobin = vi.mocked(generateRoundRobinSchedule);
const mockKnockout = vi.mocked(buildKnockoutBracket);

const COMPETITION_ID = "00000000-0000-0000-0000-000000000601";
const EDITION_ID = "00000000-0000-0000-0000-000000000602";
const GROUP_STAGE_ID = "00000000-0000-0000-0000-000000000603";
const KNOCKOUT_STAGE_ID = "00000000-0000-0000-0000-000000000604";
const GROUP_ID = "00000000-0000-0000-0000-000000000605";
const BRACKET_ID = "00000000-0000-0000-0000-000000000606";
const VENUE_ID = "00000000-0000-0000-0000-000000000607";
const ENTRY_ONE_ID = "00000000-0000-0000-0000-000000000608";
const ENTRY_TWO_ID = "00000000-0000-0000-0000-000000000609";

beforeEach(async () => {
  await db.delete(matches);
  await db.delete(brackets);
  await db.delete(groups);
  await db.delete(stages);
  await db.delete(venues);
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

  await db.insert(stages).values([
    {
      id: GROUP_STAGE_ID,
      editionId: EDITION_ID,
      name: "Groups",
      stageType: "group",
      orderIndex: 1,
    },
    {
      id: KNOCKOUT_STAGE_ID,
      editionId: EDITION_ID,
      name: "Knockout",
      stageType: "knockout",
      orderIndex: 2,
    },
  ]);

  await db.insert(groups).values({
    id: GROUP_ID,
    stageId: GROUP_STAGE_ID,
    code: "A",
    name: "Group A",
    roundRobinMode: "single",
  });

  await db.insert(brackets).values({
    id: BRACKET_ID,
    stageId: KNOCKOUT_STAGE_ID,
    bracketType: "single_elimination",
    thirdPlaceMatch: false,
  });

  await db.insert(venues).values({
    id: VENUE_ID,
    competitionId: COMPETITION_ID,
    editionId: EDITION_ID,
    name: "Main Arena",
    slug: "main-arena",
  });

  mockRoundRobin.mockReset();
  mockKnockout.mockReset();
});

describe("bulk match generation route", () => {
  test("generates round-robin matches for group stages", async () => {
    mockRoundRobin.mockReturnValue({
      matches: [
        {
          stageId: GROUP_STAGE_ID,
          groupId: GROUP_ID,
          homeEntryId: ENTRY_ONE_ID,
          awayEntryId: ENTRY_TWO_ID,
          kickoffAt: new Date("2025-01-01T10:00:00Z"),
          venueId: VENUE_ID,
          roundNumber: 1,
        },
      ],
    });

    const auth = createCompetitionAdminContext(COMPETITION_ID);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const payload = {
      stage_id: GROUP_STAGE_ID,
      algorithm: "round_robin_circle",
      options: {
        start_at: new Date("2025-01-01T10:00:00Z"),
        match_duration_minutes: 60,
        break_minutes: 15,
        venues: [{ venue_id: VENUE_ID }],
        groups: [
          {
            group_id: GROUP_ID,
            entry_ids: [ENTRY_ONE_ID, ENTRY_TWO_ID],
          },
        ],
      },
    };

    const request = new NextRequest(
      `http://localhost/api/editions/${EDITION_ID}/matches/bulk`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ editionId: EDITION_ID }),
    });

    expect(response.status).toBe(202);

    const generated = await db.query.matches.findMany({
      where: (table, { eq }) => eq(table.stageId, GROUP_STAGE_ID),
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]?.code).toBe("A-01");
  });

  test("generates knockout matches for knockout stages", async () => {
    mockKnockout.mockReturnValue({
      matches: [
        {
          id: "match-final-1",
          stageId: KNOCKOUT_STAGE_ID,
          bracketId: BRACKET_ID,
          roundNumber: 2,
          type: "final",
          home: { type: "seed", seed: 1, entryId: ENTRY_ONE_ID },
          away: { type: "seed", seed: 2, entryId: ENTRY_TWO_ID },
        },
      ],
    });

    const auth = createCompetitionAdminContext(COMPETITION_ID);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const payload = {
      stage_id: KNOCKOUT_STAGE_ID,
      algorithm: "knockout_seeded",
      options: {
        seeds: [
          { seed: 1, entry_id: ENTRY_ONE_ID },
          { seed: 2, entry_id: ENTRY_TWO_ID },
        ],
        third_place_match: false,
      },
    };

    const request = new NextRequest(
      `http://localhost/api/editions/${EDITION_ID}/matches/bulk`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ editionId: EDITION_ID }),
    });

    expect(response.status).toBe(202);

    const generated = await db.query.matches.findMany({
      where: (table, { eq }) => eq(table.stageId, KNOCKOUT_STAGE_ID),
    });

    expect(generated).toHaveLength(1);
    expect(generated[0]?.code).toBe("F");
  });
});
