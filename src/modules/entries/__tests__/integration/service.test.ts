import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";
import { ProblemError } from "@/lib/errors/problem";
import {
  createEntry,
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
});
