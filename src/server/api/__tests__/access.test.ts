import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { ProblemError } from "@/lib/errors/problem";
import { assertTeamAccess } from "@/server/api/access";
import type { AuthContext, RoleAssignment } from "@/server/auth";
import { db } from "@/server/db/client";
import { teams } from "@/server/db/schema";

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

function makeAuth(roles: RoleAssignment[]): AuthContext {
  return {
    session: baseSession,
    user: {
      ...baseUser,
      roles,
    },
  } as AuthContext;
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
});
