import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { ProblemError } from "@/lib/errors/problem";
import {
  assertCompetitionAdminAccess,
  assertEntryAccess,
  assertTeamAccess,
  assertTeamEntryCreateAccess,
} from "@/server/api/access";
import type { AuthContext, RoleAssignment } from "@/server/auth";
import { db } from "@/server/db/client";
import {
  competitions,
  editions,
  entries,
  squads,
  teams,
} from "@/server/db/schema";

const baseSession = {
  id: "session-1",
  userId: "user-1",
  expiresAt: new Date(Date.now() + 60_000),
  token: "token-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ipAddress: "127.0.0.1",
  userAgent: "vitest",
};

const baseUser = {
  id: "user-1",
  email: "manager@example.com",
  name: "Team Manager",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const COMPETITION_ID = "00000000-0000-0000-0000-000000000701";
const EDITION_ID = "00000000-0000-0000-0000-000000000702";
const TEAM_ID = "00000000-0000-0000-0000-000000000703";
const ENTRY_ID = "00000000-0000-0000-0000-000000000704";
const SQUAD_ID = "00000000-0000-0000-0000-000000000705";

function makeAuth(roles: RoleAssignment[]): AuthContext {
  return {
    session: baseSession,
    user: {
      ...baseUser,
      roles,
    },
  } as AuthContext;
}

async function seedEntryContext() {
  await db.insert(competitions).values({
    id: COMPETITION_ID,
    name: "Access Cup",
    slug: "access-cup",
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

  await db.insert(teams).values({
    id: TEAM_ID,
    name: "Team A",
    slug: "team-a",
  });

  await db.insert(entries).values({
    id: ENTRY_ID,
    editionId: EDITION_ID,
    teamId: TEAM_ID,
    status: "pending",
    submittedAt: new Date(),
  });

  await db.insert(squads).values({
    id: SQUAD_ID,
    entryId: ENTRY_ID,
  });
}

async function resetDb() {
  await db.execute(sql`
    TRUNCATE TABLE
      squad_members,
      squads,
      entries,
      team_memberships,
      persons,
      teams,
      editions,
      competitions
    RESTART IDENTITY CASCADE;
  `);
}

describe("access control", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("allows team_manager access to its own team and denies other teams", async () => {
    const [teamA] = await db
      .insert(teams)
      .values({ name: "Team A", slug: "team-a" })
      .returning();
    const [teamB] = await db
      .insert(teams)
      .values({ name: "Team B", slug: "team-b" })
      .returning();
    if (!teamA || !teamB) {
      throw new Error("Expected teams to be created.");
    }

    const auth = makeAuth([
      {
        role: "team_manager",
        scopeType: "team",
        scopeId: teamA.id,
      },
    ]);

    await expect(assertTeamAccess(teamA.id, auth)).resolves.toBeUndefined();

    try {
      await assertTeamAccess(teamB.id, auth);
      throw new Error("expected access to be denied");
    } catch (error) {
      expect(error).toBeInstanceOf(ProblemError);
      expect((error as ProblemError).problem.status).toBe(403);
    }
  });

  it("enforces competition admin and entry access rules", async () => {
    await seedEntryContext();

    await expect(
      assertCompetitionAdminAccess(undefined, makeAuth([])),
    ).rejects.toMatchObject({ problem: { status: 400 } });

    const globalAdmin = makeAuth([
      { role: "global_admin", scopeType: "global", scopeId: null },
    ]);

    await expect(
      assertCompetitionAdminAccess(COMPETITION_ID, globalAdmin),
    ).resolves.toBeUndefined();

    await expect(
      assertEntryAccess(undefined, globalAdmin),
    ).rejects.toMatchObject({ problem: { status: 400 } });

    await expect(
      assertEntryAccess("00000000-0000-0000-0000-000000000799", globalAdmin),
    ).rejects.toMatchObject({ problem: { status: 404 } });

    const teamManager = makeAuth([
      { role: "team_manager", scopeType: "team", scopeId: TEAM_ID },
    ]);

    const context = await assertEntryAccess(ENTRY_ID, teamManager);
    expect(context).toMatchObject({
      teamId: TEAM_ID,
      competitionId: COMPETITION_ID,
    });

    await expect(
      assertEntryAccess(ENTRY_ID, makeAuth([])),
    ).rejects.toMatchObject({ problem: { status: 403 } });
  });

  it("validates entry creation access", async () => {
    await seedEntryContext();

    await expect(
      assertTeamEntryCreateAccess(undefined, EDITION_ID, makeAuth([])),
    ).rejects.toMatchObject({ problem: { status: 400 } });

    await expect(
      assertTeamEntryCreateAccess(TEAM_ID, undefined, makeAuth([])),
    ).rejects.toMatchObject({ problem: { status: 400 } });

    await expect(
      assertTeamEntryCreateAccess(
        "00000000-0000-0000-0000-000000000799",
        EDITION_ID,
        makeAuth([]),
      ),
    ).rejects.toMatchObject({ problem: { status: 404 } });

    await expect(
      assertTeamEntryCreateAccess(
        TEAM_ID,
        "00000000-0000-0000-0000-000000000798",
        makeAuth([]),
      ),
    ).rejects.toMatchObject({ problem: { status: 404 } });

    const competitionAdmin = makeAuth([
      {
        role: "competition_admin",
        scopeType: "competition",
        scopeId: COMPETITION_ID,
      },
    ]);

    await expect(
      assertTeamEntryCreateAccess(TEAM_ID, EDITION_ID, competitionAdmin),
    ).resolves.toBeUndefined();
  });
});
