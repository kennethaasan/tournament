import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";
import { createProblem } from "@/lib/errors/problem";
import {
  __internal as competitionsInternal,
  type ScoreboardThemeInput,
} from "@/modules/competitions/service";
import { db, withTransaction } from "@/server/db/client";
import {
  brackets,
  editionSettings,
  editions,
  groups,
  scoreboardHighlights,
  stages,
} from "@/server/db/schema";

type StageType = "group" | "knockout";

export type CreateStageInput = {
  editionId: string;
  name: string;
  stageType: StageType;
  groups?: Array<{
    code: string;
    name: string | null | undefined;
  }>;
};

export type StageGroupSummary = {
  id: string;
  code: string;
  name: string | null;
};

export type StageSummary = {
  id: string;
  editionId: string;
  name: string;
  stageType: StageType;
  orderIndex: number;
  publishedAt: Date | null;
  groups: StageGroupSummary[];
};

export async function createStage(
  input: CreateStageInput,
): Promise<StageSummary> {
  const normalizedName = input.name.trim();

  if (!normalizedName) {
    throw createProblem({
      type: "https://tournament.app/problems/stages/invalid-name",
      title: "Stagenavn er påkrevd",
      status: 400,
      detail: "Skriv inn et navn for det nye stadiet.",
    });
  }

  const stageType = normalizeStageType(input.stageType);

  return withTransaction(async (tx) => {
    const edition = await tx.query.editions.findFirst({
      columns: { id: true },
      where: eq(editions.id, input.editionId),
    });

    if (!edition) {
      throw createProblem({
        type: "https://tournament.app/problems/stages/edition-not-found",
        title: "Edition finnes ikke",
        status: 404,
        detail: "Vi fant ikke utgaven du prøver å oppdatere.",
      });
    }

    const lastStage = await tx
      .select({
        orderIndex: stages.orderIndex,
      })
      .from(stages)
      .where(eq(stages.editionId, input.editionId))
      .orderBy(desc(stages.orderIndex))
      .limit(1);

    const nextOrderIndex = (lastStage[0]?.orderIndex ?? 0) + 1;

    const [stageRow] = await tx
      .insert(stages)
      .values({
        editionId: edition.id,
        name: normalizedName,
        stageType,
        orderIndex: nextOrderIndex,
      })
      .returning();

    if (!stageRow) {
      throw createProblem({
        type: "https://tournament.app/problems/stages/not-created",
        title: "Kunne ikke opprette stadium",
        status: 500,
        detail: "Det skjedde en feil under lagring av stadiet. Prøv igjen.",
      });
    }

    let persistedGroups: StageGroupSummary[] = [];

    if (stageType === "group") {
      const groupsInput = input.groups ?? [];

      if (!groupsInput.length) {
        throw createProblem({
          type: "https://tournament.app/problems/stages/groups-required",
          title: "Grupper er påkrevd",
          status: 400,
          detail: "Legg til minst én gruppe i gruppespillet.",
        });
      }

      const normalizedGroups = normalizeGroups(groupsInput);

      const inserted = await tx
        .insert(groups)
        .values(
          normalizedGroups.map((item) => ({
            stageId: stageRow.id,
            code: item.code,
            name: item.name,
            roundRobinMode: "single" as const,
          })),
        )
        .returning();

      persistedGroups = inserted.map((group) => ({
        id: group.id,
        code: group.code,
        name: group.name,
      }));
    }

    if (stageType === "knockout") {
      await tx.insert(brackets).values({
        stageId: stageRow.id,
        bracketType: "single_elimination",
        thirdPlaceMatch: false,
      });
    }

    return {
      id: stageRow.id,
      editionId: stageRow.editionId,
      name: stageRow.name,
      stageType: stageRow.stageType,
      orderIndex: stageRow.orderIndex,
      publishedAt: stageRow.publishedAt,
      groups: persistedGroups,
    };
  });
}

export async function listStages(editionId: string): Promise<StageSummary[]> {
  const stageRows = await db
    .select({
      id: stages.id,
      editionId: stages.editionId,
      name: stages.name,
      stageType: stages.stageType,
      orderIndex: stages.orderIndex,
      publishedAt: stages.publishedAt,
    })
    .from(stages)
    .where(eq(stages.editionId, editionId))
    .orderBy(asc(stages.orderIndex), asc(stages.createdAt));

  if (stageRows.length === 0) {
    return [];
  }

  const groupRows = await db
    .select({
      id: groups.id,
      stageId: groups.stageId,
      code: groups.code,
      name: groups.name,
    })
    .from(groups)
    .where(
      inArray(
        groups.stageId,
        stageRows.map((stage) => stage.id),
      ),
    )
    .orderBy(asc(groups.code), asc(groups.createdAt));

  const groupsByStage = new Map<string, StageGroupSummary[]>();
  for (const group of groupRows) {
    const collection = groupsByStage.get(group.stageId) ?? [];
    collection.push({
      id: group.id,
      code: group.code,
      name: group.name ?? null,
    });
    groupsByStage.set(group.stageId, collection);
  }

  return stageRows.map((stage) => ({
    id: stage.id,
    editionId: stage.editionId,
    name: stage.name,
    stageType: stage.stageType,
    orderIndex: stage.orderIndex,
    publishedAt: stage.publishedAt,
    groups: groupsByStage.get(stage.id) ?? [],
  }));
}

export type EditionScoreboardTheme = {
  primaryColor: string;
  secondaryColor: string;
  backgroundImageUrl: string | null;
};

export type ScoreboardModule =
  | "live_matches"
  | "upcoming"
  | "standings"
  | "top_scorers";

export type EditionScoreboardSummary = {
  edition: {
    id: string;
    label: string;
    status: string;
    scoreboardRotationSeconds: number;
    scoreboardModules: ScoreboardModule[];
    entriesLockedAt: Date | null;
    scoreboardTheme: EditionScoreboardTheme;
  };
  highlight: {
    message: string;
    expiresAt: Date;
    remainingSeconds: number;
  } | null;
};

type UpdateScoreboardSettingsInput = {
  editionId: string;
  scoreboardRotationSeconds?: number | null;
  scoreboardModules?: ScoreboardModule[] | null;
  scoreboardTheme?: ScoreboardThemeInput | null;
  entriesLocked?: boolean | null;
};

type TriggerHighlightInput = {
  editionId: string;
  message: string;
  durationSeconds: number;
  actorId?: string | null;
};

const MIN_HIGHLIGHT_DURATION = 5;
const MAX_HIGHLIGHT_DURATION = 600;
const MAX_HIGHLIGHT_LENGTH = 160;

export async function getEditionScoreboardSummary(
  editionId: string,
): Promise<EditionScoreboardSummary> {
  const [edition, settings] = await Promise.all([
    db.query.editions.findFirst({
      columns: {
        id: true,
        label: true,
        status: true,
      },
      where: eq(editions.id, editionId),
    }),
    db.query.editionSettings.findFirst({
      where: eq(editionSettings.editionId, editionId),
    }),
  ]);

  if (!edition || !settings) {
    throw createProblem({
      type: "https://tournament.app/problems/edition-not-found",
      title: "Utgave finnes ikke",
      status: 404,
      detail: "Fant ikke utgaven eller den mangler innstillinger.",
    });
  }

  const themeRecord = ensureScoreboardThemeRecord(settings.scoreboardTheme);
  const modules = normalizeScoreboardModules(settings.scoreboardModules);
  const highlight = await fetchActiveHighlight(editionId);
  const now = Date.now();

  return {
    edition: {
      id: edition.id,
      label: edition.label,
      status: edition.status,
      scoreboardRotationSeconds: settings.scoreboardRotationSeconds,
      scoreboardModules: modules,
      entriesLockedAt: settings.entriesLockedAt ?? null,
      scoreboardTheme: mapThemeRecordToDto(themeRecord),
    },
    highlight: highlight
      ? {
          message: highlight.message,
          expiresAt: highlight.expiresAt,
          remainingSeconds: Math.max(
            0,
            Math.ceil((highlight.expiresAt.getTime() - now) / 1000),
          ),
        }
      : null,
  };
}

export async function updateEditionScoreboardSettings(
  input: UpdateScoreboardSettingsInput,
): Promise<EditionScoreboardSummary> {
  const editionId = await withTransaction(async (tx) => {
    const edition = await tx.query.editions.findFirst({
      columns: {
        id: true,
        label: true,
      },
      where: eq(editions.id, input.editionId),
    });

    if (!edition) {
      throw createProblem({
        type: "https://tournament.app/problems/edition-not-found",
        title: "Utgave finnes ikke",
        status: 404,
        detail: "Fant ikke utgaven du prøver å oppdatere.",
      });
    }

    const settings = await tx.query.editionSettings.findFirst({
      where: eq(editionSettings.editionId, input.editionId),
    });

    if (!settings) {
      throw createProblem({
        type: "https://tournament.app/problems/edition-settings-missing",
        title: "Utgave mangler innstillinger",
        status: 500,
        detail: "Denne utgaven mangler innstillinger og kan ikke oppdateres.",
      });
    }

    const rotationSeconds =
      input.scoreboardRotationSeconds === undefined ||
      input.scoreboardRotationSeconds === null
        ? settings.scoreboardRotationSeconds
        : competitionsInternal.normalizeRotationSeconds(
            input.scoreboardRotationSeconds,
          );

    const modules =
      input.scoreboardModules === undefined || input.scoreboardModules === null
        ? normalizeScoreboardModules(settings.scoreboardModules)
        : normalizeScoreboardModules(input.scoreboardModules);

    const themeRecord =
      input.scoreboardTheme === undefined || input.scoreboardTheme === null
        ? ensureScoreboardThemeRecord(settings.scoreboardTheme)
        : competitionsInternal.normalizeTheme(input.scoreboardTheme);

    const entriesLockedAt =
      input.entriesLocked === undefined || input.entriesLocked === null
        ? settings.entriesLockedAt
        : input.entriesLocked
          ? (settings.entriesLockedAt ?? new Date())
          : null;

    await tx
      .update(editionSettings)
      .set({
        scoreboardRotationSeconds: rotationSeconds,
        scoreboardModules: modules,
        scoreboardTheme: themeRecord,
        entriesLockedAt,
      })
      .where(eq(editionSettings.editionId, input.editionId));

    return edition.id;
  });

  return getEditionScoreboardSummary(editionId);
}

export async function triggerScoreboardHighlight(
  input: TriggerHighlightInput,
): Promise<EditionScoreboardSummary> {
  const trimmedMessage = input.message.trim();
  if (!trimmedMessage) {
    throw createProblem({
      type: "https://tournament.app/problems/scoreboard/empty-highlight",
      title: "Meldingen kan ikke være tom",
      status: 400,
      detail: "Skriv inn en tekst som skal vises på storskjermen.",
    });
  }

  if (trimmedMessage.length > MAX_HIGHLIGHT_LENGTH) {
    throw createProblem({
      type: "https://tournament.app/problems/scoreboard/highlight-too-long",
      title: "Meldingen er for lang",
      status: 400,
      detail: `Highlight kan maks være ${MAX_HIGHLIGHT_LENGTH} tegn.`,
    });
  }

  const duration = Math.round(input.durationSeconds);
  if (
    !Number.isFinite(duration) ||
    duration < MIN_HIGHLIGHT_DURATION ||
    duration > MAX_HIGHLIGHT_DURATION
  ) {
    throw createProblem({
      type: "https://tournament.app/problems/scoreboard/invalid-duration",
      title: "Ugyldig varighet",
      status: 400,
      detail: `Varigheten må være mellom ${MIN_HIGHLIGHT_DURATION} og ${MAX_HIGHLIGHT_DURATION} sekunder.`,
    });
  }

  const editionId = await withTransaction(async (tx) => {
    const edition = await tx.query.editions.findFirst({
      columns: { id: true },
      where: eq(editions.id, input.editionId),
    });

    if (!edition) {
      throw createProblem({
        type: "https://tournament.app/problems/edition-not-found",
        title: "Utgave finnes ikke",
        status: 404,
        detail: "Fant ikke utgaven du prøver å oppdatere.",
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 1000);

    await tx
      .update(scoreboardHighlights)
      .set({ expiresAt: now })
      .where(
        and(
          eq(scoreboardHighlights.editionId, edition.id),
          gt(scoreboardHighlights.expiresAt, now),
        ),
      );

    await tx.insert(scoreboardHighlights).values({
      editionId: edition.id,
      message: trimmedMessage,
      durationSeconds: duration,
      expiresAt,
      createdBy: input.actorId ?? null,
    });

    return edition.id;
  });

  return getEditionScoreboardSummary(editionId);
}

export async function clearScoreboardHighlight(
  editionId: string,
): Promise<EditionScoreboardSummary> {
  await withTransaction(async (tx) => {
    const now = new Date();
    await tx
      .update(scoreboardHighlights)
      .set({ expiresAt: now })
      .where(
        and(
          eq(scoreboardHighlights.editionId, editionId),
          gt(scoreboardHighlights.expiresAt, now),
        ),
      );
  });

  return getEditionScoreboardSummary(editionId);
}

function normalizeStageType(stageType: StageType): StageType {
  if (stageType === "group" || stageType === "knockout") {
    return stageType;
  }

  throw createProblem({
    type: "https://tournament.app/problems/stages/invalid-type",
    title: "Ugyldig stadietype",
    status: 400,
    detail: "Stadietypen må være 'group' eller 'knockout'.",
  });
}

function normalizeGroups(
  groupsInput: NonNullable<CreateStageInput["groups"]>,
): Array<{ code: string; name: string | null }> {
  const seenCodes = new Set<string>();

  return groupsInput.map((group, index) => {
    const code = group.code.trim().toUpperCase();

    if (!code) {
      throw createProblem({
        type: "https://tournament.app/problems/stages/invalid-group-code",
        title: "Ugyldig gruppe",
        status: 400,
        detail: `Gruppeposisjon ${index + 1} mangler kode.`,
      });
    }

    if (seenCodes.has(code)) {
      throw createProblem({
        type: "https://tournament.app/problems/stages/duplicate-group-code",
        title: "Duplisert gruppekode",
        status: 400,
        detail: `Gruppekoden "${code}" er allerede i bruk.`,
      });
    }

    seenCodes.add(code);

    const name = group.name?.trim() ?? null;

    return {
      code,
      name: name || null,
    };
  });
}

type ScoreboardThemeRecord = {
  primary_color: string;
  secondary_color: string;
  background_image_url: string | null;
};

const SCOREBOARD_MODULES: ScoreboardModule[] = [
  "live_matches",
  "upcoming",
  "standings",
  "top_scorers",
];

function ensureScoreboardThemeRecord(input: unknown): ScoreboardThemeRecord {
  const record = (input as Record<string, unknown>) ?? {};
  const primary =
    typeof record.primary_color === "string" ? record.primary_color : "#0B1F3A";
  const secondary =
    typeof record.secondary_color === "string"
      ? record.secondary_color
      : "#FFFFFF";
  const background =
    typeof record.background_image_url === "string"
      ? record.background_image_url
      : null;

  return {
    primary_color: primary,
    secondary_color: secondary,
    background_image_url: background,
  };
}

function normalizeScoreboardModules(input: unknown): ScoreboardModule[] {
  if (!Array.isArray(input)) {
    return [...SCOREBOARD_MODULES];
  }

  const modules = input.filter((value): value is ScoreboardModule =>
    SCOREBOARD_MODULES.includes(value as ScoreboardModule),
  );

  if (!modules.length) {
    return [...SCOREBOARD_MODULES];
  }

  return Array.from(new Set(modules));
}

function mapThemeRecordToDto(
  record: ScoreboardThemeRecord,
): EditionScoreboardTheme {
  return {
    primaryColor: record.primary_color,
    secondaryColor: record.secondary_color,
    backgroundImageUrl: record.background_image_url ?? null,
  };
}

async function fetchActiveHighlight(editionId: string) {
  const now = new Date();
  const [highlight] = await db
    .select({
      message: scoreboardHighlights.message,
      expiresAt: scoreboardHighlights.expiresAt,
    })
    .from(scoreboardHighlights)
    .where(
      and(
        eq(scoreboardHighlights.editionId, editionId),
        gt(scoreboardHighlights.expiresAt, now),
      ),
    )
    .orderBy(desc(scoreboardHighlights.expiresAt))
    .limit(1);

  if (!highlight) {
    return null;
  }

  return highlight;
}
