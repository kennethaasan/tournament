import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { db } from "@/server/db/client";
import {
  competitions,
  editions,
  entries,
  matches,
  stages,
  teams,
  userRoles,
  users,
  venues,
} from "@/server/db/schema";
import {
  sendEntryStatusEmails,
  sendEntrySubmittedEmails,
  sendInvitationAcceptedEmail,
  sendMatchDisputedEmails,
  sendMatchDisputeSubmittedEmails,
  sendMatchFinalizedEmails,
  sendMatchScheduleChangedEmails,
} from "@/server/email/action-emails";
import { sendEmailBestEffort } from "@/server/email/send-email";

vi.mock("@/server/email/send-email", () => ({
  sendEmailBestEffort: vi.fn(async () => ({ status: "sent" })),
}));

const COMPETITION_ID = "00000000-0000-0000-0000-000000000401";
const EDITION_ID = "00000000-0000-0000-0000-000000000402";
const STAGE_ID = "00000000-0000-0000-0000-000000000403";
const VENUE_ID = "00000000-0000-0000-0000-000000000404";
const TEAM_HOME_ID = "00000000-0000-0000-0000-000000000405";
const TEAM_AWAY_ID = "00000000-0000-0000-0000-000000000406";
const ENTRY_HOME_ID = "00000000-0000-0000-0000-000000000407";
const ENTRY_AWAY_ID = "00000000-0000-0000-0000-000000000408";
const MATCH_ID = "00000000-0000-0000-0000-000000000409";
const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000410";
const MANAGER_USER_ID = "00000000-0000-0000-0000-000000000411";

beforeEach(async () => {
  await db.execute(sql`
    TRUNCATE TABLE
      match_disputes,
      match_events,
      matches,
      entries,
      teams,
      venues,
      stages,
      editions,
      competitions,
      user_roles,
      users
    RESTART IDENTITY CASCADE;
  `);

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
    timezone: "Europe/Oslo",
  });

  await db.insert(teams).values([
    {
      id: TEAM_HOME_ID,
      name: "Vikings",
      slug: "vikings",
      contactEmail: "vikings@example.com",
    },
    {
      id: TEAM_AWAY_ID,
      name: "Ravens",
      slug: "ravens",
      contactEmail: "ravens@example.com",
    },
  ]);

  await db.insert(entries).values([
    {
      id: ENTRY_HOME_ID,
      editionId: EDITION_ID,
      teamId: TEAM_HOME_ID,
      status: "pending",
      submittedAt: new Date(),
    },
    {
      id: ENTRY_AWAY_ID,
      editionId: EDITION_ID,
      teamId: TEAM_AWAY_ID,
      status: "pending",
      submittedAt: new Date(),
    },
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
    homeScore: 1,
    awayScore: 1,
    homeExtraTime: 1,
    awayExtraTime: 0,
    homePenalties: 3,
    awayPenalties: 4,
  });

  await db.insert(users).values([
    {
      id: ADMIN_USER_ID,
      email: "admin@example.com",
      emailVerified: true,
      fullName: "Admin User",
    },
    {
      id: MANAGER_USER_ID,
      email: "manager@example.com",
      emailVerified: true,
      fullName: "Team Manager",
    },
  ]);

  await db.insert(userRoles).values([
    {
      userId: ADMIN_USER_ID,
      role: "global_admin",
      scopeType: "global",
      scopeId: null,
    },
    {
      userId: ADMIN_USER_ID,
      role: "competition_admin",
      scopeType: "competition",
      scopeId: COMPETITION_ID,
    },
    {
      userId: MANAGER_USER_ID,
      role: "team_manager",
      scopeType: "team",
      scopeId: TEAM_HOME_ID,
    },
    {
      userId: MANAGER_USER_ID,
      role: "team_manager",
      scopeType: "team",
      scopeId: TEAM_AWAY_ID,
    },
  ]);
});

describe("action email helpers", () => {
  test("sends entry submission and status notifications", async () => {
    const mockSend = vi.mocked(sendEmailBestEffort);
    mockSend
      .mockResolvedValueOnce({ status: "sent" })
      .mockResolvedValueOnce({ status: "skipped", reason: "disabled" })
      .mockResolvedValueOnce({ status: "failed", reason: "error" })
      .mockResolvedValue({ status: "sent" });

    const submitted = await sendEntrySubmittedEmails({
      teamId: TEAM_HOME_ID,
      editionId: EDITION_ID,
    });

    expect(submitted?.team.attempted).toBeGreaterThan(0);
    expect(submitted?.admins.attempted).toBeGreaterThan(0);

    const statusUpdate = await sendEntryStatusEmails({
      teamId: TEAM_HOME_ID,
      editionId: EDITION_ID,
      status: "approved",
      reason: "Alt i orden",
    });

    expect(statusUpdate?.attempted).toBeGreaterThan(0);
  });

  test("handles match schedule, finalized, and dispute emails", async () => {
    const match = await db.query.matches.findFirst({
      where: (table, { eq }) => eq(table.id, MATCH_ID),
    });
    if (!match) {
      throw new Error("Expected match to be seeded.");
    }

    const previousMatch = {
      ...match,
      kickoffAt: new Date(Date.now() - 60_000),
      venueId: null,
    };

    const scheduleResult = await sendMatchScheduleChangedEmails({
      previousMatch,
      updatedMatch: match,
    });
    expect(scheduleResult?.attempted).toBeGreaterThan(0);

    const finalizedResult = await sendMatchFinalizedEmails({
      updatedMatch: match,
    });
    expect(finalizedResult?.attempted).toBeGreaterThan(0);

    const disputedResult = await sendMatchDisputedEmails({
      updatedMatch: match,
    });
    expect(disputedResult?.attempted).toBeGreaterThan(0);
  });

  test("notifies disputes and accepted invitations", async () => {
    const disputeResult = await sendMatchDisputeSubmittedEmails({
      matchId: MATCH_ID,
      entryId: ENTRY_HOME_ID,
      reason: "Feil resultat",
    });

    expect(disputeResult?.teams.attempted).toBeGreaterThan(0);
    expect(disputeResult?.admins.attempted).toBeGreaterThan(0);

    const inviteResult = await sendInvitationAcceptedEmail({
      invitationId: "inv-1",
      inviterId: ADMIN_USER_ID,
      inviteeEmail: "new-admin@example.com",
      role: "competition_admin",
      scopeType: "competition",
      scopeId: COMPETITION_ID,
    });

    expect(inviteResult?.attempted).toBeGreaterThan(0);
  });

  test("returns null when schedule has no changes", async () => {
    const match = await db.query.matches.findFirst({
      where: (table, { eq }) => eq(table.id, MATCH_ID),
    });
    if (!match) {
      throw new Error("Expected match to be seeded.");
    }

    const result = await sendMatchScheduleChangedEmails({
      previousMatch: match,
      updatedMatch: match,
    });

    expect(result).toBeNull();
  });

  test("handles entry status rejected without reason", async () => {
    const statusUpdate = await sendEntryStatusEmails({
      teamId: TEAM_HOME_ID,
      editionId: EDITION_ID,
      status: "rejected",
      reason: null,
    });

    expect(statusUpdate?.attempted).toBeGreaterThan(0);
  });

  test("returns null for non-existent team", async () => {
    const result = await sendEntrySubmittedEmails({
      teamId: "00000000-0000-0000-0000-000000000999",
      editionId: EDITION_ID,
    });

    expect(result).toBeNull();
  });

  test("returns null for non-existent edition", async () => {
    const result = await sendEntrySubmittedEmails({
      teamId: TEAM_HOME_ID,
      editionId: "00000000-0000-0000-0000-000000000999",
    });

    expect(result).toBeNull();
  });

  test("returns null for non-existent match in dispute", async () => {
    const result = await sendMatchDisputeSubmittedEmails({
      matchId: "00000000-0000-0000-0000-000000000999",
      entryId: ENTRY_HOME_ID,
      reason: "Some reason",
    });

    expect(result).toBeNull();
  });

  test("returns null for non-existent inviter", async () => {
    const result = await sendInvitationAcceptedEmail({
      invitationId: "inv-1",
      inviterId: "00000000-0000-0000-0000-000000000999",
      inviteeEmail: "new@example.com",
      role: "global_admin",
      scopeType: "global",
      scopeId: null,
    });

    expect(result).toBeNull();
  });

  test("handles invitation accepted with global scope", async () => {
    const result = await sendInvitationAcceptedEmail({
      invitationId: "inv-2",
      inviterId: ADMIN_USER_ID,
      inviteeEmail: "new@example.com",
      role: "global_admin",
      scopeType: "global",
      scopeId: null,
    });

    expect(result?.attempted).toBeGreaterThan(0);
  });

  test("handles invitation accepted with team scope", async () => {
    const result = await sendInvitationAcceptedEmail({
      invitationId: "inv-3",
      inviterId: ADMIN_USER_ID,
      inviteeEmail: "new@example.com",
      role: "team_manager",
      scopeType: "team",
      scopeId: TEAM_HOME_ID,
    });

    expect(result?.attempted).toBeGreaterThan(0);
  });

  test("handles invitation accepted with edition scope", async () => {
    const result = await sendInvitationAcceptedEmail({
      invitationId: "inv-4",
      inviterId: ADMIN_USER_ID,
      inviteeEmail: "new@example.com",
      role: "competition_admin",
      scopeType: "edition",
      scopeId: EDITION_ID,
    });

    expect(result?.attempted).toBeGreaterThan(0);
  });

  test("handles invitation with unknown scope type", async () => {
    const result = await sendInvitationAcceptedEmail({
      invitationId: "inv-5",
      inviterId: ADMIN_USER_ID,
      inviteeEmail: "new@example.com",
      role: "competition_admin",
      scopeType: "unknown" as never,
      scopeId: "some-id",
    });

    expect(result?.attempted).toBeGreaterThan(0);
  });

  test("handles match schedule change with only kickoff change", async () => {
    const match = await db.query.matches.findFirst({
      where: (table, { eq }) => eq(table.id, MATCH_ID),
    });
    if (!match) {
      throw new Error("Expected match to be seeded.");
    }

    const previousMatch = {
      ...match,
      kickoffAt: new Date(Date.now() - 60_000),
    };

    const result = await sendMatchScheduleChangedEmails({
      previousMatch,
      updatedMatch: match,
    });

    expect(result?.attempted).toBeGreaterThan(0);
  });

  test("handles match schedule change with only venue change", async () => {
    const match = await db.query.matches.findFirst({
      where: (table, { eq }) => eq(table.id, MATCH_ID),
    });
    if (!match) {
      throw new Error("Expected match to be seeded.");
    }

    const previousMatch = {
      ...match,
      venueId: "00000000-0000-0000-0000-000000000999",
    };

    const result = await sendMatchScheduleChangedEmails({
      previousMatch,
      updatedMatch: match,
    });

    expect(result?.attempted).toBeGreaterThan(0);
  });

  test("handles match without kickoffAt", async () => {
    const match = await db.query.matches.findFirst({
      where: (table, { eq }) => eq(table.id, MATCH_ID),
    });
    if (!match) {
      throw new Error("Expected match to be seeded.");
    }

    const matchWithoutKickoff = { ...match, kickoffAt: null };
    const previousMatch = {
      ...match,
      kickoffAt: new Date(Date.now() - 60_000),
    };

    const result = await sendMatchScheduleChangedEmails({
      previousMatch,
      updatedMatch: matchWithoutKickoff,
    });

    expect(result?.attempted).toBeGreaterThan(0);
  });

  test("handles match without venue", async () => {
    const match = await db.query.matches.findFirst({
      where: (table, { eq }) => eq(table.id, MATCH_ID),
    });
    if (!match) {
      throw new Error("Expected match to be seeded.");
    }

    const matchWithoutVenue = { ...match, venueId: null };
    const previousMatch = {
      ...match,
      venueId: VENUE_ID,
    };

    const result = await sendMatchScheduleChangedEmails({
      previousMatch,
      updatedMatch: matchWithoutVenue,
    });

    expect(result?.attempted).toBeGreaterThan(0);
  });

  test("handles dispute submitted with away entry", async () => {
    const result = await sendMatchDisputeSubmittedEmails({
      matchId: MATCH_ID,
      entryId: ENTRY_AWAY_ID,
      reason: "Incorrect score",
    });

    expect(result?.teams.attempted).toBeGreaterThan(0);
  });

  test("handles dispute with entry not in match", async () => {
    const result = await sendMatchDisputeSubmittedEmails({
      matchId: MATCH_ID,
      entryId: "00000000-0000-0000-0000-000000000999",
      reason: "Some reason",
    });

    expect(result?.teams.attempted).toBeGreaterThan(0);
  });

  test("handles match finalized without extra time or penalties", async () => {
    await db
      .update(matches)
      .set({
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
      })
      .where(eq(matches.id, MATCH_ID));

    const match = await db.query.matches.findFirst({
      where: (table, { eq }) => eq(table.id, MATCH_ID),
    });
    if (!match) {
      throw new Error("Expected match to be seeded.");
    }

    const result = await sendMatchFinalizedEmails({
      updatedMatch: match,
    });

    expect(result?.attempted).toBeGreaterThan(0);
  });

  test("handles match finalized with only extra time", async () => {
    await db
      .update(matches)
      .set({
        homeExtraTime: 2,
        awayExtraTime: 1,
        homePenalties: null,
        awayPenalties: null,
      })
      .where(eq(matches.id, MATCH_ID));

    const match = await db.query.matches.findFirst({
      where: (table, { eq }) => eq(table.id, MATCH_ID),
    });
    if (!match) {
      throw new Error("Expected match to be seeded.");
    }

    const result = await sendMatchFinalizedEmails({
      updatedMatch: match,
    });

    expect(result?.attempted).toBeGreaterThan(0);
  });

  test("handles match finalized with only penalties", async () => {
    await db
      .update(matches)
      .set({
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: 5,
        awayPenalties: 4,
      })
      .where(eq(matches.id, MATCH_ID));

    const match = await db.query.matches.findFirst({
      where: (table, { eq }) => eq(table.id, MATCH_ID),
    });
    if (!match) {
      throw new Error("Expected match to be seeded.");
    }

    const result = await sendMatchFinalizedEmails({
      updatedMatch: match,
    });

    expect(result?.attempted).toBeGreaterThan(0);
  });
});
