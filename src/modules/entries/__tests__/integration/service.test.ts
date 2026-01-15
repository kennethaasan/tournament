import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";
import { ProblemError } from "@/lib/errors/problem";
import {
  createEntry,
  deleteEntry,
  ensureSquad,
  reviewEntry,
  submitMatchDispute,
} from "@/modules/entries/service";
import { db } from "@/server/db/client";
import {
  competitions,
  editionSettings,
  editions,
  entries,
  matchDisputes,
  matches,
  squads,
  stages,
  teams,
} from "@/server/db/schema";
import {
  createTestCompetition,
  createTestEdition,
  createTestEditionSettings,
  createTestTeam,
} from "@/test/factories";

const COMPETITION_ID = "00000000-0000-0000-0000-000000000301";
const EDITION_ID = "00000000-0000-0000-0000-000000000302";
const STAGE_ID = "00000000-0000-0000-0000-000000000303";
const MATCH_ID = "00000000-0000-0000-0000-000000000304";
const TEAM_ID = "00000000-0000-0000-0000-000000000305";

beforeEach(async () => {
  await db.delete(matchDisputes);
  await db.delete(matches);
  await db.delete(entries);
  await db.delete(stages);
  await db.delete(teams);
  await db.delete(editionSettings);
  await db.delete(editions);
  await db.delete(competitions);

  const competition = createTestCompetition({
    id: COMPETITION_ID,
    name: "Elite Cup",
    slug: "elite-cup",
  });
  const edition = createTestEdition(COMPETITION_ID, {
    id: EDITION_ID,
    label: "2025",
    slug: "2025",
    registrationOpensAt: new Date(Date.now() - 60_000),
    registrationClosesAt: new Date(Date.now() + 60_000),
  });
  const settings = createTestEditionSettings(EDITION_ID, {
    registrationRequirements: { entries_locked_at: null },
  });
  const team = createTestTeam({
    id: TEAM_ID,
    name: "Vikings",
    slug: "vikings",
  });

  await db.insert(competitions).values(competition);
  await db.insert(editions).values(edition);
  await db.insert(editionSettings).values(settings);
  await db.insert(teams).values(team);
  await db.insert(stages).values({
    id: STAGE_ID,
    editionId: EDITION_ID,
    name: "Group Stage",
    stageType: "group",
    orderIndex: 1,
  });
});

describe("entries service", () => {
  test("creates entries and prevents duplicates", async () => {
    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
      notes: "  Klar for kamp ",
    });

    expect(entry.status).toBe("pending");
    expect(entry.notes).toBe("Klar for kamp");
    expect(entry.submittedAt).toBeInstanceOf(Date);

    await expect(
      createEntry({ editionId: EDITION_ID, teamId: TEAM_ID }),
    ).rejects.toBeInstanceOf(ProblemError);
  });

  test("reviews entries and preserves non-pending status", async () => {
    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
    });

    const approved = await reviewEntry({
      entryId: entry.id,
      status: "approved",
      reason: "Alle krav oppfylt",
      actorId: "user-1",
    });

    expect(approved.status).toBe("approved");
    const metadata = approved.metadata as Record<string, string | undefined>;
    expect(metadata.decision_reason).toBe("Alle krav oppfylt");

    const unchanged = await reviewEntry({
      entryId: entry.id,
      status: "rejected",
      actorId: "user-1",
    });

    expect(unchanged.status).toBe("approved");
  });

  test("reviews entry with rejection status", async () => {
    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
    });

    const rejected = await reviewEntry({
      entryId: entry.id,
      status: "rejected",
      reason: "Mangler dokumentasjon",
      actorId: "user-1",
    });

    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectedAt).toBeInstanceOf(Date);
    const metadata = rejected.metadata as Record<string, string | undefined>;
    expect(metadata.decision_reason).toBe("Mangler dokumentasjon");
  });

  test("throws when reviewing non-existent entry", async () => {
    await expect(
      reviewEntry({
        entryId: "00000000-0000-0000-0000-000000000999",
        status: "approved",
        actorId: "user-1",
      }),
    ).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/entry-not-found",
      }),
    });
  });

  test("ensures squads and records disputes", async () => {
    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
    });

    const squad = await ensureSquad(entry.id);
    const existing = await ensureSquad(entry.id);
    expect(existing.id).toBe(squad.id);

    await db.insert(matches).values({
      id: MATCH_ID,
      editionId: EDITION_ID,
      stageId: STAGE_ID,
      status: "scheduled",
    });

    await submitMatchDispute({
      matchId: MATCH_ID,
      entryId: entry.id,
      reason: "Feil resultat",
    });

    const disputes = await db.query.matchDisputes.findMany({
      where: eq(matchDisputes.matchId, MATCH_ID),
    });
    expect(disputes).toHaveLength(1);
    expect(disputes[0]?.reason).toBe("Feil resultat");
  });

  test("throws when submitting dispute for non-existent match", async () => {
    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
    });

    await expect(
      submitMatchDispute({
        matchId: "00000000-0000-0000-0000-000000000999",
        entryId: entry.id,
        reason: "Feil resultat",
      }),
    ).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/match-not-found",
      }),
    });
  });

  test("throws when submitting dispute for non-existent entry", async () => {
    await db.insert(matches).values({
      id: MATCH_ID,
      editionId: EDITION_ID,
      stageId: STAGE_ID,
      status: "scheduled",
    });

    await expect(
      submitMatchDispute({
        matchId: MATCH_ID,
        entryId: "00000000-0000-0000-0000-000000000999",
        reason: "Feil resultat",
      }),
    ).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/entry-not-found",
      }),
    });
  });

  test("throws when entry edition does not match match edition", async () => {
    // Create a second edition
    const otherEditionId = "00000000-0000-0000-0000-000000000310";
    const otherEdition = createTestEdition(COMPETITION_ID, {
      id: otherEditionId,
      label: "2026",
      slug: "2026",
      status: "draft",
    });
    await db.insert(editions).values(otherEdition);

    // Create entry in the other edition
    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
    });

    // Create match in the other edition
    const otherMatchId = "00000000-0000-0000-0000-000000000311";
    await db.insert(matches).values({
      id: otherMatchId,
      editionId: otherEditionId,
      stageId: STAGE_ID,
      status: "scheduled",
    });

    await expect(
      submitMatchDispute({
        matchId: otherMatchId,
        entryId: entry.id,
        reason: "Feil resultat",
      }),
    ).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/dispute-invalid-entry",
      }),
    });
  });

  test("throws when registration has not opened yet", async () => {
    // Update edition to have registration opens in the future
    await db
      .update(editions)
      .set({
        registrationOpensAt: new Date(Date.now() + 60_000),
        registrationClosesAt: new Date(Date.now() + 120_000),
      })
      .where(eq(editions.id, EDITION_ID));

    await expect(
      createEntry({ editionId: EDITION_ID, teamId: TEAM_ID }),
    ).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/entry/registration-not-open",
      }),
    });
  });

  test("throws when registration has closed", async () => {
    // Update edition to have registration closed in the past
    await db
      .update(editions)
      .set({
        registrationOpensAt: new Date(Date.now() - 120_000),
        registrationClosesAt: new Date(Date.now() - 60_000),
      })
      .where(eq(editions.id, EDITION_ID));

    await expect(
      createEntry({ editionId: EDITION_ID, teamId: TEAM_ID }),
    ).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/entry/registration-closed",
      }),
    });
  });

  test("throws when entries are locked", async () => {
    // Update edition settings to have entries locked
    await db
      .update(editionSettings)
      .set({
        registrationRequirements: {
          entries_locked_at: new Date(Date.now() - 60_000).toISOString(),
        },
      })
      .where(eq(editionSettings.editionId, EDITION_ID));

    await expect(
      createEntry({ editionId: EDITION_ID, teamId: TEAM_ID }),
    ).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/entry/entries-locked",
      }),
    });
  });

  test("throws when entries are locked using camelCase key", async () => {
    // Update edition settings to have entries locked using camelCase key
    await db
      .update(editionSettings)
      .set({
        registrationRequirements: {
          entriesLockedAt: new Date(Date.now() - 60_000).toISOString(),
        },
      })
      .where(eq(editionSettings.editionId, EDITION_ID));

    await expect(
      createEntry({ editionId: EDITION_ID, teamId: TEAM_ID }),
    ).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/entry/entries-locked",
      }),
    });
  });

  test("allows entry when entries_locked_at is invalid date string", async () => {
    // Update edition settings with an invalid date string - should be ignored
    await db
      .update(editionSettings)
      .set({
        registrationRequirements: {
          entries_locked_at: "not-a-date",
        },
      })
      .where(eq(editionSettings.editionId, EDITION_ID));

    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
    });

    expect(entry.status).toBe("pending");
  });

  test("allows entry when registrationRequirements is an array", async () => {
    // Update edition settings with an array (invalid type) - should be ignored
    await db
      .update(editionSettings)
      .set({
        registrationRequirements: ["some", "array"],
      })
      .where(eq(editionSettings.editionId, EDITION_ID));

    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
    });

    expect(entry.status).toBe("pending");
  });

  test("allows entry when entries_locked_at value is not a string", async () => {
    // Update edition settings with a non-string value - should be ignored
    await db
      .update(editionSettings)
      .set({
        registrationRequirements: {
          entries_locked_at: 12345,
        },
      })
      .where(eq(editionSettings.editionId, EDITION_ID));

    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
    });

    expect(entry.status).toBe("pending");
  });

  test("throws when edition is not found", async () => {
    const fakeEditionId = "00000000-0000-0000-0000-000000000999";

    await expect(
      createEntry({ editionId: fakeEditionId, teamId: TEAM_ID }),
    ).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/edition-not-found",
      }),
    });
  });
});

describe("deleteEntry", () => {
  test("deletes rejected entry successfully", async () => {
    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
    });

    // Reject the entry first
    await reviewEntry({
      entryId: entry.id,
      status: "rejected",
      reason: "Not qualified",
      actorId: "admin-1",
    });

    // Create a squad for the entry to test cascade deletion
    await ensureSquad(entry.id);

    // Now delete should work
    await deleteEntry(entry.id);

    // Verify entry is deleted
    const deletedEntry = await db.query.entries.findFirst({
      where: eq(entries.id, entry.id),
    });
    expect(deletedEntry).toBeUndefined();

    // Verify squad is also deleted
    const deletedSquad = await db.query.squads.findFirst({
      where: eq(squads.entryId, entry.id),
    });
    expect(deletedSquad).toBeUndefined();
  });

  test("deletes withdrawn entry successfully", async () => {
    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
    });

    // Manually set the entry to withdrawn status
    await db
      .update(entries)
      .set({ status: "withdrawn" })
      .where(eq(entries.id, entry.id));

    // Now delete should work
    await deleteEntry(entry.id);

    const deletedEntry = await db.query.entries.findFirst({
      where: eq(entries.id, entry.id),
    });
    expect(deletedEntry).toBeUndefined();
  });

  test("throws when deleting pending entry", async () => {
    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
    });

    await expect(deleteEntry(entry.id)).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/entry-delete-not-allowed",
      }),
    });
  });

  test("throws when deleting approved entry", async () => {
    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: TEAM_ID,
    });

    await reviewEntry({
      entryId: entry.id,
      status: "approved",
      actorId: "admin-1",
    });

    await expect(deleteEntry(entry.id)).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/entry-delete-not-allowed",
      }),
    });
  });

  test("throws when entry is not found", async () => {
    const fakeEntryId = "00000000-0000-0000-0000-000000000999";

    await expect(deleteEntry(fakeEntryId)).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/entry-not-found",
      }),
    });
  });
});
