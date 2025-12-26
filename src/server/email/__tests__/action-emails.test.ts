import { sql } from "drizzle-orm";
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
});
