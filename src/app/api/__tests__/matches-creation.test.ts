import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { v7 as uuidv7 } from "uuid";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  POST as createMatch,
  GET as listMatches,
} from "@/app/api/editions/[editionId]/matches/route";
import type { AuthContext } from "@/server/auth";
import { getSession } from "@/server/auth";
import { db } from "@/server/db/client";
import {
  competitions,
  editions,
  entries,
  groups,
  matches,
  stages,
  teams,
  venues,
} from "@/server/db/schema";
import {
  createCompetitionAdminContext,
  createTestCompetitionWithEdition,
  createTestTeam,
} from "@/test/factories";

vi.mock("@/server/auth");
const mockGetSession = vi.mocked(getSession);

describe("create match endpoint", () => {
  let competitionId: string;
  let editionId: string;
  let stageId: string;
  let groupId: string;
  let homeEntryId: string;
  let awayEntryId: string;
  let venueId: string;

  beforeEach(async () => {
    // Clean db
    await db.delete(matches);
    await db.delete(entries);
    await db.delete(teams);
    await db.delete(groups);
    await db.delete(stages);
    await db.delete(venues);
    await db.delete(editions);
    await db.delete(competitions);

    // Setup basic data
    const { competition, edition } = createTestCompetitionWithEdition();
    await db.insert(competitions).values(competition);
    await db.insert(editions).values(edition);
    competitionId = competition.id;
    editionId = edition.id;

    // Create Stage
    stageId = uuidv7();
    await db.insert(stages).values({
      id: stageId,
      editionId: edition.id,
      name: "Group Stage",
      stageType: "group",
      orderIndex: 1,
      createdAt: new Date(),
    });

    // Create Group
    groupId = uuidv7();
    await db.insert(groups).values({
      id: groupId,
      stageId: stageId,
      name: "Group A",
      code: "A",
      createdAt: new Date(),
    });

    // Create Venue
    venueId = uuidv7();
    await db.insert(venues).values({
      id: venueId,
      editionId: edition.id,
      name: "Main Stadium",
      slug: "main-stadium",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create Teams
    const homeTeam = createTestTeam({ name: "Home Team" });
    const awayTeam = createTestTeam({ name: "Away Team" });
    await db.insert(teams).values([homeTeam, awayTeam]);

    // Create Entries
    homeEntryId = uuidv7();
    awayEntryId = uuidv7();
    await db.insert(entries).values([
      {
        id: homeEntryId,
        editionId: edition.id,
        teamId: homeTeam.id,
        status: "approved",
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: awayEntryId,
        editionId: edition.id,
        teamId: awayTeam.id,
        status: "approved",
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  test("creates a scheduled match with all fields", async () => {
    const auth = createCompetitionAdminContext(competitionId);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const payload = {
      stage_id: stageId,
      group_id: groupId,
      venue_id: venueId,
      home_entry_id: homeEntryId,
      away_entry_id: awayEntryId,
      kickoff_at: new Date().toISOString(),
      code: "M001",
    };

    const request = new NextRequest(
      `http://localhost/api/editions/${editionId}/matches`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    const response = await createMatch(request, {
      params: Promise.resolve({ editionId }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.home_entry_name).toBe("Home Team");
    expect(body.away_entry_name).toBe("Away Team");
    expect(body.status).toBe("scheduled");
    expect(body.code).toBe("M001");
  });

  test("creates a placeholder match (no teams)", async () => {
    const auth = createCompetitionAdminContext(competitionId);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const payload = {
      stage_id: stageId,
      kickoff_at: new Date().toISOString(),
    };

    const request = new NextRequest(
      `http://localhost/api/editions/${editionId}/matches`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    const response = await createMatch(request, {
      params: Promise.resolve({ editionId }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.home_entry_id).toBeNull();
    expect(body.away_entry_id).toBeNull();
  });

  test("returns 400 if kickoff missing", async () => {
    const auth = createCompetitionAdminContext(competitionId);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const payload = {
      stage_id: stageId,
    };

    const request = new NextRequest(
      `http://localhost/api/editions/${editionId}/matches`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    const response = await createMatch(request, {
      params: Promise.resolve({ editionId }),
    });

    expect(response.status).toBe(400);
  });

  test("returns 404 if stage not in edition", async () => {
    const auth = createCompetitionAdminContext(competitionId);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const otherStageId = uuidv7(); // Not in DB or wrong edition

    const payload = {
      stage_id: otherStageId,
      kickoff_at: new Date().toISOString(),
    };

    const request = new NextRequest(
      `http://localhost/api/editions/${editionId}/matches`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    const response = await createMatch(request, {
      params: Promise.resolve({ editionId }),
    });

    expect(response.status).toBe(404);
  });

  test("GET returns null kickoff when a match has no kickoff time", async () => {
    const auth = createCompetitionAdminContext(competitionId);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const createRequest = new NextRequest(
      `http://localhost/api/editions/${editionId}/matches`,
      {
        method: "POST",
        body: JSON.stringify({
          stage_id: stageId,
          kickoff_at: new Date().toISOString(),
        }),
      },
    );
    const createResponse = await createMatch(createRequest, {
      params: Promise.resolve({ editionId }),
    });
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();

    await db
      .update(matches)
      .set({ kickoffAt: null })
      .where(eq(matches.id, created.id as string));

    const listRequest = new NextRequest(
      `http://localhost/api/editions/${editionId}/matches`,
    );
    const listResponse = await listMatches(listRequest, {
      params: Promise.resolve({ editionId }),
    });
    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();

    const listedMatch = (
      listBody.matches as { id: string; kickoff_at: string | null }[]
    ).find((match) => match.id === created.id);
    expect(listedMatch?.kickoff_at).toBeNull();
  });
});
