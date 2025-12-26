import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";
import {
  clearScoreboardHighlight,
  createStage,
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
