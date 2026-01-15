import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";
import {
  clearScoreboardHighlight,
  createStage,
  deleteStage,
  getEditionScoreboardSummary,
  listStages,
  triggerScoreboardHighlight,
  updateEditionScoreboardSettings,
} from "@/modules/editions/service";
import { db } from "@/server/db/client";
import {
  brackets,
  competitions,
  editionSettings,
  editions,
  groups,
  matches,
  scoreboardHighlights,
  stages,
} from "@/server/db/schema";
import {
  createTestCompetition,
  createTestEdition,
  createTestEditionSettings,
} from "@/test/factories";

const COMPETITION_ID = "00000000-0000-0000-0000-000000000101";
const EDITION_ID = "00000000-0000-0000-0000-000000000102";

beforeEach(async () => {
  await db.delete(scoreboardHighlights);
  await db.delete(brackets);
  await db.delete(groups);
  await db.delete(stages);
  await db.delete(editionSettings);
  await db.delete(editions);
  await db.delete(competitions);

  const competition = createTestCompetition({
    id: COMPETITION_ID,
    name: "Trondheim Cup",
    slug: "trondheim-cup",
  });
  const edition = createTestEdition(COMPETITION_ID, {
    id: EDITION_ID,
    label: "2025",
    slug: "2025",
    status: "published",
  });
  const settings = createTestEditionSettings(EDITION_ID, {
    scoreboardRotationSeconds: 8,
    registrationRequirements: {
      scoreboard_modules: ["live_matches", "upcoming"],
      entries_locked_at: null,
    },
  });

  await db.insert(competitions).values(competition);
  await db.insert(editions).values(edition);
  await db.insert(editionSettings).values(settings);
});

describe("editions service", () => {
  test("creates group and knockout stages and lists them with groups", async () => {
    const groupStage = await createStage({
      editionId: EDITION_ID,
      name: "Group Stage",
      stageType: "group",
      groups: [
        { code: "A", name: "Alpha" },
        { code: "B", name: "Beta" },
      ],
    });

    const knockoutStage = await createStage({
      editionId: EDITION_ID,
      name: "Knockout",
      stageType: "knockout",
    });

    const groupRows = await db.query.groups.findMany({
      where: eq(groups.stageId, groupStage.id),
    });
    expect(groupRows).toHaveLength(2);

    const bracket = await db.query.brackets.findFirst({
      where: eq(brackets.stageId, knockoutStage.id),
    });
    expect(bracket).toBeDefined();

    const stagesList = await listStages(EDITION_ID);
    expect(stagesList).toHaveLength(2);
    const listedGroup = stagesList.find((stage) => stage.id === groupStage.id);
    expect(listedGroup?.groups).toHaveLength(2);
  });

  test("updates scoreboard settings and reports the summary", async () => {
    const summary = await updateEditionScoreboardSettings({
      editionId: EDITION_ID,
      scoreboardRotationSeconds: 12,
      scoreboardModules: ["standings"],
      scoreboardTheme: {
        primaryColor: "#111111",
        secondaryColor: "#EEEEEE",
        backgroundImageUrl: null,
      },
      entriesLocked: true,
    });

    expect(summary.edition.scoreboardRotationSeconds).toBe(12);
    expect(summary.edition.scoreboardModules).toEqual(["standings"]);
    expect(summary.edition.entriesLockedAt).toBeInstanceOf(Date);
    expect(summary.edition.scoreboardTheme.primaryColor).toBe("#111111");
  });

  test("triggers and clears scoreboard highlights", async () => {
    const withHighlight = await triggerScoreboardHighlight({
      editionId: EDITION_ID,
      message: "Final kickoff!",
      durationSeconds: 15,
    });

    expect(withHighlight.highlight?.message).toBe("Final kickoff!");
    expect(withHighlight.highlight?.remainingSeconds).toBeGreaterThan(0);

    const cleared = await clearScoreboardHighlight(EDITION_ID);
    expect(cleared.highlight).toBeNull();

    const summary = await getEditionScoreboardSummary(EDITION_ID);
    expect(summary.highlight).toBeNull();
  });
});

describe("deleteStage", () => {
  test("deletes stage without matches successfully", async () => {
    const stage = await createStage({
      editionId: EDITION_ID,
      name: "Preliminary Round",
      stageType: "group",
      groups: [{ code: "A", name: "Group A" }],
    });

    // Verify the stage and groups were created
    const groupsBefore = await db.query.groups.findMany({
      where: eq(groups.stageId, stage.id),
    });
    expect(groupsBefore).toHaveLength(1);

    // Delete the stage
    await deleteStage(EDITION_ID, stage.id);

    // Verify stage is deleted
    const deletedStage = await db.query.stages.findFirst({
      where: eq(stages.id, stage.id),
    });
    expect(deletedStage).toBeUndefined();

    // Verify groups are also deleted
    const groupsAfter = await db.query.groups.findMany({
      where: eq(groups.stageId, stage.id),
    });
    expect(groupsAfter).toHaveLength(0);
  });

  test("deletes knockout stage with bracket successfully", async () => {
    const knockoutStage = await createStage({
      editionId: EDITION_ID,
      name: "Knockout",
      stageType: "knockout",
    });

    // Verify bracket was created
    const bracketBefore = await db.query.brackets.findFirst({
      where: eq(brackets.stageId, knockoutStage.id),
    });
    expect(bracketBefore).toBeDefined();

    // Delete the stage
    await deleteStage(EDITION_ID, knockoutStage.id);

    // Verify stage is deleted
    const deletedStage = await db.query.stages.findFirst({
      where: eq(stages.id, knockoutStage.id),
    });
    expect(deletedStage).toBeUndefined();

    // Verify bracket is also deleted
    const bracketAfter = await db.query.brackets.findFirst({
      where: eq(brackets.stageId, knockoutStage.id),
    });
    expect(bracketAfter).toBeUndefined();
  });

  test("throws when stage has matches", async () => {
    const stage = await createStage({
      editionId: EDITION_ID,
      name: "Group Stage",
      stageType: "group",
      groups: [{ code: "A", name: "Group A" }],
    });

    // Add a match to the stage
    await db.insert(matches).values({
      id: "00000000-0000-0000-0000-000000000999",
      editionId: EDITION_ID,
      stageId: stage.id,
      status: "scheduled",
    });

    await expect(deleteStage(EDITION_ID, stage.id)).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/stages/has-matches",
      }),
    });

    // Clean up match for next tests
    await db.delete(matches).where(eq(matches.stageId, stage.id));
  });

  test("throws when stage is not found", async () => {
    const fakeStageId = "00000000-0000-0000-0000-000000000999";

    await expect(deleteStage(EDITION_ID, fakeStageId)).rejects.toMatchObject({
      problem: expect.objectContaining({
        type: "https://tournament.app/problems/stages/not-found",
      }),
    });
  });
});
