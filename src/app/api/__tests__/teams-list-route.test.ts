import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { GET as listTeams } from "@/app/api/teams/route";
import type { AuthContext } from "@/server/auth";
import { getSession } from "@/server/auth";
import { db } from "@/server/db/client";
import { competitions, editions, entries, teams } from "@/server/db/schema";
import {
  createCompetitionAdminContext,
  createTestCompetition,
  createTestEdition,
  createTestEntry,
  createTestTeam,
} from "@/test/factories";

vi.mock("@/server/auth");

const mockGetSession = vi.mocked(getSession);

beforeEach(async () => {
  await db.delete(entries);
  await db.delete(teams);
  await db.delete(editions);
  await db.delete(competitions);
});

describe("teams list route", () => {
  test("returns teams reachable through competition_admin scope", async () => {
    const competitionA = createTestCompetition();
    const competitionB = createTestCompetition();
    const editionA = createTestEdition(competitionA.id);
    const editionB = createTestEdition(competitionB.id);
    const teamA = createTestTeam({ name: "Afjord 1", slug: "afjord-1" });
    const teamB = createTestTeam({ name: "Other Team", slug: "other-team" });

    await db.insert(competitions).values([competitionA, competitionB]);
    await db.insert(editions).values([editionA, editionB]);
    await db.insert(teams).values([teamA, teamB]);
    await db
      .insert(entries)
      .values([
        createTestEntry(editionA.id, teamA.id),
        createTestEntry(editionB.id, teamB.id),
      ]);

    const auth = createCompetitionAdminContext(competitionA.id);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const request = new NextRequest("http://localhost/api/teams");
    const response = await listTeams(request, {
      params: Promise.resolve({}),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.teams).toEqual([
      {
        id: teamA.id,
        name: teamA.name,
        slug: teamA.slug,
      },
    ]);
  });

  test("applies slug filter for competition_admin visible teams", async () => {
    const competition = createTestCompetition();
    const edition = createTestEdition(competition.id);
    const teamA = createTestTeam({ name: "Afjord 1", slug: "afjord-1" });
    const teamB = createTestTeam({ name: "Afjord 2", slug: "afjord-2" });

    await db.insert(competitions).values(competition);
    await db.insert(editions).values(edition);
    await db.insert(teams).values([teamA, teamB]);
    await db
      .insert(entries)
      .values([
        createTestEntry(edition.id, teamA.id),
        createTestEntry(edition.id, teamB.id),
      ]);

    const auth = createCompetitionAdminContext(competition.id);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const request = new NextRequest(
      `http://localhost/api/teams?slug=${teamB.slug}`,
    );
    const response = await listTeams(request, {
      params: Promise.resolve({}),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.teams).toEqual([
      {
        id: teamB.id,
        name: teamB.name,
        slug: teamB.slug,
      },
    ]);
  });
});
