import { beforeEach, describe, expect, test } from "vitest";
import { ProblemError } from "@/lib/errors/problem";
import {
  acceptInvitation,
  createInvitation,
  grantRole,
} from "@/modules/identity/service";
import { db } from "@/server/db/client";
import {
  competitions,
  roleInvitations,
  teams,
  userRoles,
  users,
} from "@/server/db/schema";
import {
  createTestCompetition,
  createTestTeam,
  createTestUser,
} from "@/test/factories";

const INVITER_ID = "00000000-0000-0000-0000-000000000201";
const INVITEE_ID = "00000000-0000-0000-0000-000000000202";
const COMPETITION_ID = "00000000-0000-0000-0000-000000000203";
const TEAM_ID = "00000000-0000-0000-0000-000000000204";

beforeEach(async () => {
  await db.delete(roleInvitations);
  await db.delete(userRoles);
  await db.delete(teams);
  await db.delete(competitions);
  await db.delete(users);

  const inviter = createTestUser({
    id: INVITER_ID,
    email: "inviter@example.com",
    fullName: "Inviter",
  });
  const invitee = createTestUser({
    id: INVITEE_ID,
    email: "invitee@example.com",
    fullName: "Invitee",
  });
  const competition = createTestCompetition({ id: COMPETITION_ID });
  const team = createTestTeam({ id: TEAM_ID });

  await db.insert(users).values([inviter, invitee]);
  await db.insert(competitions).values(competition);
  await db.insert(teams).values(team);
});

describe("identity service", () => {
  test("creates and accepts invitations for scoped roles", async () => {
    const invitation = await createInvitation({
      email: "invitee@example.com",
      role: "competition_admin",
      scope: { type: "competition", id: COMPETITION_ID },
      invitedByUserId: INVITER_ID,
    });

    expect(invitation.email).toBe("invitee@example.com");
    expect(invitation.scopeType).toBe("competition");
    expect(invitation.scopeId).toBe(COMPETITION_ID);

    const result = await acceptInvitation({
      token: invitation.token,
      userId: INVITEE_ID,
    });

    expect(result.invitation.acceptedAt).toBeInstanceOf(Date);
    expect(result.role.scopeType).toBe("competition");
    expect(result.role.scopeId).toBe(COMPETITION_ID);

    const roleRecord = await db.query.userRoles.findFirst({
      where: (table, { eq }) => eq(table.userId, INVITEE_ID),
    });
    expect(roleRecord).toBeDefined();
  });

  test("rejects expired invitations", async () => {
    const expired = await db
      .insert(roleInvitations)
      .values({
        email: "expired@example.com",
        role: "team_manager",
        scopeType: "team",
        scopeId: TEAM_ID,
        invitedBy: INVITER_ID,
        token: "expired-token",
        expiresAt: new Date(Date.now() - 60_000),
      })
      .returning();

    const invitation = expired[0];
    if (!invitation) {
      throw new Error("Expected invitation to be created.");
    }

    await expect(
      acceptInvitation({ token: invitation.token, userId: INVITEE_ID }),
    ).rejects.toBeInstanceOf(ProblemError);
  });

  test("grants roles directly", async () => {
    const role = await grantRole({
      userId: INVITEE_ID,
      role: "team_manager",
      scope: { type: "team", id: TEAM_ID },
      grantedByUserId: INVITER_ID,
    });

    expect(role.role).toBe("team_manager");
    expect(role.scopeId).toBe(TEAM_ID);
  });
});
