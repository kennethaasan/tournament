import { and, asc, desc, eq, gt, inArray, ne } from "drizzle-orm";
import { createProblem } from "@/lib/errors/problem";
import {
  __internal as competitionsInternal,
  type ScoreboardThemeInput,
} from "@/modules/competitions/service";
import { db, withTransaction } from "@/server/db/client";
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

type StageType = "group" | "knockout";
type EditionFormat = "round_robin" | "knockout" | "hybrid";
type EditionStatus = "draft" | "published" | "archived";

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

export async function reorderStages(
  editionId: string,
  stageIds: string[],
): Promise<StageSummary[]> {
  const uniqueIds = new Set(stageIds);

  if (uniqueIds.size !== stageIds.length) {
    throw createProblem({
      type: "https://tournament.app/problems/stages/invalid-order",
      title: "Ugyldig rekkefølge",
      status: 400,
      detail: "Listen over stadier inneholder duplikater.",
    });
  }

  if (stageIds.length === 0) {
    const existing = await db
      .select({ id: stages.id })
      .from(stages)
      .where(eq(stages.editionId, editionId))
      .limit(1);

    if (existing.length === 0) {
      return [];
    }

    throw createProblem({
      type: "https://tournament.app/problems/stages/invalid-order",
      title: "Ugyldig rekkefølge",
      status: 400,
      detail: "Alle stadier må være med i rekkefølgen.",
    });
  }

  await withTransaction(async (tx) => {
    const stageRows = await tx
      .select({ id: stages.id })
      .from(stages)
      .where(eq(stages.editionId, editionId));

    if (stageRows.length === 0) {
      throw createProblem({
        type: "https://tournament.app/problems/stages/not-found",
        title: "Stadier finnes ikke",
        status: 404,
        detail: "Fant ingen stadier for denne utgaven.",
      });
    }

    if (stageRows.length !== stageIds.length) {
      throw createProblem({
        type: "https://tournament.app/problems/stages/invalid-order",
        title: "Ugyldig rekkefølge",
        status: 400,
        detail: "Alle stadier må være med i rekkefølgen.",
      });
    }

    const validIds = new Set(stageRows.map((stage) => stage.id));
    for (const stageId of stageIds) {
      if (!validIds.has(stageId)) {
        throw createProblem({
          type: "https://tournament.app/problems/stages/not-found",
          title: "Stadie finnes ikke",
          status: 404,
          detail: "Fant ikke stadiet du prøver å flytte.",
        });
      }
    }

    for (const [index, stageId] of stageIds.entries()) {
      await tx
        .update(stages)
        .set({ orderIndex: -(index + 1) })
        .where(and(eq(stages.id, stageId), eq(stages.editionId, editionId)));
    }

    for (const [index, stageId] of stageIds.entries()) {
      await tx
        .update(stages)
        .set({ orderIndex: index + 1 })
        .where(and(eq(stages.id, stageId), eq(stages.editionId, editionId)));
    }
  });

  return listStages(editionId);
}

export async function deleteStage(
  editionId: string,
  stageId: string,
): Promise<void> {
  return withTransaction(async (tx) => {
    const stage = await tx.query.stages.findFirst({
      where: and(eq(stages.id, stageId), eq(stages.editionId, editionId)),
    });

    if (!stage) {
      throw createProblem({
        type: "https://tournament.app/problems/stages/not-found",
        title: "Stadiet finnes ikke",
        status: 404,
        detail: "Stadiet ble ikke funnet.",
      });
    }

    // Check if stage has any matches
    const matchCount = await tx
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.stageId, stageId))
      .limit(1);

    if (matchCount.length > 0) {
      throw createProblem({
        type: "https://tournament.app/problems/stages/has-matches",
        title: "Stadiet har kamper",
        status: 409,
        detail:
          "Kan ikke slette et stadie som har kamper. Slett kampene først.",
      });
    }

    // Delete brackets if knockout
    await tx.delete(brackets).where(eq(brackets.stageId, stageId));

    // Delete groups
    await tx.delete(groups).where(eq(groups.stageId, stageId));

    // Delete the stage
    await tx.delete(stages).where(eq(stages.id, stageId));
  });
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
  const modules = extractScoreboardModules(settings.registrationRequirements);
  const entriesLockedAt = extractEntriesLockedAt(
    settings.registrationRequirements,
  );
  const highlight = await fetchActiveHighlight(editionId);
  const now = Date.now();

  return {
    edition: {
      id: edition.id,
      label: edition.label,
      status: edition.status,
      scoreboardRotationSeconds: settings.scoreboardRotationSeconds,
      scoreboardModules: modules,
      entriesLockedAt,
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
        ? extractScoreboardModules(settings.registrationRequirements)
        : normalizeScoreboardModules(input.scoreboardModules);

    const themeRecord =
      input.scoreboardTheme === undefined || input.scoreboardTheme === null
        ? ensureScoreboardThemeRecord(settings.scoreboardTheme)
        : competitionsInternal.normalizeTheme(input.scoreboardTheme);

    const existingEntriesLockedAt = extractEntriesLockedAt(
      settings.registrationRequirements,
    );
    const entriesLockedAt =
      input.entriesLocked === undefined || input.entriesLocked === null
        ? existingEntriesLockedAt
        : input.entriesLocked
          ? (existingEntriesLockedAt ?? new Date())
          : null;

    const registrationRequirements = buildRegistrationRequirements(
      settings.registrationRequirements,
      modules,
      entriesLockedAt,
    );

    await tx
      .update(editionSettings)
      .set({
        scoreboardRotationSeconds: rotationSeconds,
        scoreboardTheme: themeRecord,
        registrationRequirements,
      })
      .where(eq(editionSettings.editionId, input.editionId));

    return edition.id;
  });

  return getEditionScoreboardSummary(editionId);
}

export type UpdateEditionInput = {
  editionId: string;
  label?: string | null;
  slug?: string | null;
  status?: EditionStatus | null;
  format?: EditionFormat | null;
  timezone?: string | null;
  registrationOpensAt?: Date | null;
  registrationClosesAt?: Date | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type EditionDetail = {
  id: string;
  competitionId: string;
  competitionName: string;
  competitionSlug: string;
  label: string;
  slug: string;
  format: string;
  timezone: string;
  status: string;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getEditionDetail(
  editionId: string,
): Promise<EditionDetail> {
  const [edition] = await db
    .select({
      id: editions.id,
      competitionId: editions.competitionId,
      competitionName: competitions.name,
      competitionSlug: competitions.slug,
      label: editions.label,
      slug: editions.slug,
      format: editions.format,
      timezone: editions.timezone,
      status: editions.status,
      registrationOpensAt: editions.registrationOpensAt,
      registrationClosesAt: editions.registrationClosesAt,
      contactEmail: editions.contactEmail,
      contactPhone: editions.contactPhone,
      createdAt: editions.createdAt,
      updatedAt: editions.updatedAt,
    })
    .from(editions)
    .innerJoin(competitions, eq(competitions.id, editions.competitionId))
    .where(eq(editions.id, editionId));

  if (!edition) {
    throw createProblem({
      type: "https://tournament.app/problems/edition-not-found",
      title: "Utgave finnes ikke",
      status: 404,
      detail: "Fant ikke utgaven.",
    });
  }

  return {
    id: edition.id,
    competitionId: edition.competitionId,
    competitionName: edition.competitionName,
    competitionSlug: edition.competitionSlug,
    label: edition.label,
    slug: edition.slug,
    format: edition.format,
    timezone: edition.timezone,
    status: edition.status,
    registrationOpensAt: edition.registrationOpensAt,
    registrationClosesAt: edition.registrationClosesAt,
    contactEmail: edition.contactEmail,
    contactPhone: edition.contactPhone,
    createdAt: edition.createdAt,
    updatedAt: edition.updatedAt,
  };
}

export async function updateEdition(
  input: UpdateEditionInput,
): Promise<EditionDetail> {
  return withTransaction(async (tx) => {
    const edition = await tx.query.editions.findFirst({
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

    const updates: Partial<typeof editions.$inferInsert> = {};

    if (input.label !== undefined && input.label !== null) {
      const trimmed = input.label.trim();
      if (!trimmed) {
        throw createProblem({
          type: "https://tournament.app/problems/edition/invalid-label",
          title: "Ugyldig utgavenavn",
          status: 400,
          detail: "Utgavenavn kan ikke være tomt.",
        });
      }
      updates.label = trimmed;
    }

    if (input.slug !== undefined && input.slug !== null) {
      const normalizedSlug = competitionsInternal.normalizeSlug(input.slug);
      const existingEdition = await tx.query.editions.findFirst({
        columns: { id: true },
        where: and(
          eq(editions.competitionId, edition.competitionId),
          eq(editions.slug, normalizedSlug),
          ne(editions.id, input.editionId),
        ),
      });

      if (existingEdition) {
        throw createProblem({
          type: "https://tournament.app/problems/edition-slug-conflict",
          title: "Utgave-slug er allerede i bruk",
          status: 409,
          detail: `En annen utgave i konkurransen bruker slugen "${normalizedSlug}".`,
        });
      }

      updates.slug = normalizedSlug;
    }

    if (input.status !== undefined && input.status !== null) {
      if (!["draft", "published", "archived"].includes(input.status)) {
        throw createProblem({
          type: "https://tournament.app/problems/edition/invalid-status",
          title: "Ugyldig status",
          status: 400,
          detail: "Status må være draft, published eller archived.",
        });
      }
      updates.status = input.status;
    }

    if (input.format !== undefined && input.format !== null) {
      if (!["round_robin", "knockout", "hybrid"].includes(input.format)) {
        throw createProblem({
          type: "https://tournament.app/problems/edition/invalid-format",
          title: "Ugyldig format",
          status: 400,
          detail: "Format må være round_robin, knockout eller hybrid.",
        });
      }
      updates.format = input.format;
    }

    if (input.timezone !== undefined && input.timezone !== null) {
      updates.timezone = input.timezone;
    }

    if (input.registrationOpensAt !== undefined) {
      updates.registrationOpensAt = input.registrationOpensAt;
    }

    if (input.registrationClosesAt !== undefined) {
      updates.registrationClosesAt = input.registrationClosesAt;
    }

    if (input.contactEmail !== undefined) {
      updates.contactEmail = input.contactEmail;
    }

    if (input.contactPhone !== undefined) {
      updates.contactPhone = input.contactPhone;
    }

    if (Object.keys(updates).length > 0) {
      await tx
        .update(editions)
        .set(updates)
        .where(eq(editions.id, input.editionId));
    }

    const [updated] = await tx
      .select({
        id: editions.id,
        competitionId: editions.competitionId,
        competitionName: competitions.name,
        competitionSlug: competitions.slug,
        label: editions.label,
        slug: editions.slug,
        format: editions.format,
        timezone: editions.timezone,
        status: editions.status,
        registrationOpensAt: editions.registrationOpensAt,
        registrationClosesAt: editions.registrationClosesAt,
        contactEmail: editions.contactEmail,
        contactPhone: editions.contactPhone,
        createdAt: editions.createdAt,
        updatedAt: editions.updatedAt,
      })
      .from(editions)
      .innerJoin(competitions, eq(competitions.id, editions.competitionId))
      .where(eq(editions.id, input.editionId));

    if (!updated) {
      throw createProblem({
        type: "https://tournament.app/problems/edition-not-found",
        title: "Utgave finnes ikke",
        status: 404,
        detail: "Fant ikke utgaven etter oppdatering.",
      });
    }

    return {
      id: updated.id,
      competitionId: updated.competitionId,
      competitionName: updated.competitionName,
      competitionSlug: updated.competitionSlug,
      label: updated.label,
      slug: updated.slug,
      format: updated.format,
      timezone: updated.timezone,
      status: updated.status,
      registrationOpensAt: updated.registrationOpensAt,
      registrationClosesAt: updated.registrationClosesAt,
      contactEmail: updated.contactEmail,
      contactPhone: updated.contactPhone,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  });
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

function normalizeRegistrationRequirements(
  input: unknown,
): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  return input as Record<string, unknown>;
}

function extractScoreboardModules(input: unknown): ScoreboardModule[] {
  const requirements = normalizeRegistrationRequirements(input);

  return normalizeScoreboardModules(
    requirements.scoreboard_modules ?? requirements.scoreboardModules,
  );
}

function extractEntriesLockedAt(input: unknown): Date | null {
  const requirements = normalizeRegistrationRequirements(input);
  const value =
    requirements.entries_locked_at ?? requirements.entriesLockedAt ?? null;

  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildRegistrationRequirements(
  existing: unknown,
  modules: ScoreboardModule[],
  entriesLockedAt: Date | null,
): Record<string, unknown> {
  return {
    ...normalizeRegistrationRequirements(existing),
    scoreboard_modules: modules,
    entries_locked_at: entriesLockedAt ? entriesLockedAt.toISOString() : null,
  };
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
