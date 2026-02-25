import { eq } from "drizzle-orm";
import { computeContrastRatio } from "@/lib/colors";
import { createProblem } from "@/lib/errors/problem";
import { type TransactionClient, withTransaction } from "@/server/db/client";
import {
  type Competition,
  competitions,
  type Edition,
  type EditionSetting,
  editionSettings,
  editions,
  userRoles,
} from "@/server/db/schema";

const SUPPORTED_FORMATS = ["round_robin", "knockout", "hybrid"] as const;
const MIN_ROTATION_SECONDS = 2;
const DEFAULT_ROTATION_SECONDS = 5;
const DEFAULT_TIMEZONE = "Europe/Oslo";
const DEFAULT_SCOREBOARD_THEME: ScoreboardThemeRecord = {
  primary_color: "#0B1F3A",
  secondary_color: "#FFFFFF",
  background_image_url: null,
};
const DEFAULT_SCOREBOARD_MODULES = [
  "live_matches",
  "upcoming",
  "standings",
  "top_scorers",
] as const;
const MIN_CONTRAST_RATIO = 4.5;

type EditionFormat = (typeof SUPPORTED_FORMATS)[number];

export type ScoreboardThemeInput = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundImageUrl?: string | null;
};

type ScoreboardThemeRecord = {
  primary_color: string;
  secondary_color: string;
  background_image_url: string | null;
};

export type RegistrationWindowInput = {
  opensAt: string | Date;
  closesAt: string | Date;
};

export type CreateEditionInput = {
  competitionId: string;
  label: string;
  slug: string;
  format: EditionFormat;
  registrationWindow: RegistrationWindowInput;
  scoreboardRotationSeconds?: number | null;
  scoreboardTheme?: ScoreboardThemeInput;
  timezone?: string | null;
};

export type CreateCompetitionInput = {
  name: string;
  slug: string;
  defaultTimezone?: string | null;
  description?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  ownerUserId?: string | null;
  defaultEdition: Omit<CreateEditionInput, "competitionId">;
};

export type CompetitionCreationResult = {
  competition: Competition;
  edition: Edition;
  editionSettings: EditionSetting;
};

export type EditionCreationResult = {
  edition: Edition;
  editionSettings: EditionSetting;
};

export type SetCompetitionArchivedStateInput = {
  competitionId: string;
  archived: boolean;
};

export async function createCompetition(
  input: CreateCompetitionInput,
): Promise<CompetitionCreationResult> {
  const normalizedName = normalizeName(input.name);
  const normalizedSlug = normalizeSlug(input.slug);
  const timezone = normalizeTimezone(input.defaultTimezone);
  const description = normalizeOptionalText(input.description);

  return withTransaction(async (tx) => {
    const existing = await tx.query.competitions.findFirst({
      columns: { id: true },
      where: (table, { eq: eqHelper }) => eqHelper(table.slug, normalizedSlug),
    });

    if (existing) {
      throw createProblem({
        type: "https://tournament.app/problems/competition-slug-conflict",
        title: "Competition slug already exists",
        status: 409,
        detail: `The slug "${normalizedSlug}" is already in use.`,
      });
    }

    const themeRecord = normalizeTheme(
      input.defaultEdition.scoreboardTheme ?? {
        primaryColor: input.primaryColor ?? undefined,
        secondaryColor: input.secondaryColor ?? undefined,
      },
    );

    const competitionRows = await tx
      .insert(competitions)
      .values({
        name: normalizedName,
        slug: normalizedSlug,
        defaultTimezone: timezone,
        description,
        primaryColor: themeRecord.primary_color,
        secondaryColor: themeRecord.secondary_color,
      })
      .returning();

    const competition = competitionRows[0];

    if (!competition) {
      throw createProblem({
        type: "https://tournament.app/problems/competition-not-created",
        title: "Unable to create competition",
        status: 500,
        detail: "The competition could not be created. Please try again.",
      });
    }

    if (input.ownerUserId) {
      await ensureCompetitionAdminRole(tx, input.ownerUserId, competition.id);
    }

    const editionResult = await createEditionWithClient(tx, {
      ...input.defaultEdition,
      competitionId: competition.id,
      timezone: input.defaultEdition.timezone ?? timezone,
      scoreboardTheme: {
        primaryColor: themeRecord.primary_color,
        secondaryColor: themeRecord.secondary_color,
        backgroundImageUrl: themeRecord.background_image_url,
      },
    });

    return {
      competition,
      edition: editionResult.edition,
      editionSettings: editionResult.editionSettings,
    };
  });
}

export async function createEdition(
  input: CreateEditionInput,
): Promise<EditionCreationResult> {
  return withTransaction((tx) => createEditionWithClient(tx, input));
}

export async function setCompetitionArchivedState(
  input: SetCompetitionArchivedStateInput,
): Promise<Competition> {
  return withTransaction(async (tx) => {
    const competition = await tx.query.competitions.findFirst({
      where: (table, { eq: eqHelper }) =>
        eqHelper(table.id, input.competitionId),
    });

    if (!competition) {
      throw createProblem({
        type: "https://tournament.app/problems/competition-not-found",
        title: "Competition not found",
        status: 404,
        detail: "The specified competition does not exist.",
      });
    }

    const archivedAt = input.archived
      ? (competition.archivedAt ?? new Date())
      : null;

    const updatedRows = await tx
      .update(competitions)
      .set({
        archivedAt,
      })
      .where(eq(competitions.id, input.competitionId))
      .returning();

    const updatedCompetition = updatedRows[0];
    if (!updatedCompetition) {
      throw createProblem({
        type: "https://tournament.app/problems/competition-not-updated",
        title: "Unable to update competition",
        status: 500,
        detail: "The competition archive state could not be updated.",
      });
    }

    return updatedCompetition;
  });
}

async function createEditionWithClient(
  client: TransactionClient,
  input: CreateEditionInput,
): Promise<EditionCreationResult> {
  const competition = await client.query.competitions.findFirst({
    where: (table, { eq: eqHelper }) => eqHelper(table.id, input.competitionId),
  });

  if (!competition) {
    throw createProblem({
      type: "https://tournament.app/problems/competition-not-found",
      title: "Competition not found",
      status: 404,
      detail: "The specified competition does not exist.",
    });
  }

  const label = normalizeName(input.label);
  const slug = normalizeSlug(input.slug);
  const format = normalizeFormat(input.format);
  const registrationWindow = normalizeRegistrationWindow(
    input.registrationWindow,
  );
  const rotationSeconds = normalizeRotationSeconds(
    input.scoreboardRotationSeconds,
  );
  const themeRecord = normalizeTheme(input.scoreboardTheme);
  const timezone = normalizeTimezone(
    input.timezone ?? competition.defaultTimezone ?? DEFAULT_TIMEZONE,
  );

  const existingEdition = await client.query.editions.findFirst({
    columns: { id: true },
    where: (table, { and: andHelper, eq: eqHelper }) =>
      andHelper(
        eqHelper(table.competitionId, input.competitionId),
        eqHelper(table.slug, slug),
      ),
  });

  if (existingEdition) {
    throw createProblem({
      type: "https://tournament.app/problems/edition-slug-conflict",
      title: "Edition slug already exists",
      status: 409,
      detail: `An edition with slug "${slug}" already exists for this competition.`,
    });
  }

  const editionRows = await client
    .insert(editions)
    .values({
      competitionId: input.competitionId,
      label,
      slug,
      format,
      timezone,
      registrationOpensAt: registrationWindow.opensAt,
      registrationClosesAt: registrationWindow.closesAt,
    })
    .returning();

  const edition = editionRows[0];

  if (!edition) {
    throw createProblem({
      type: "https://tournament.app/problems/edition-not-created",
      title: "Unable to create edition",
      status: 500,
      detail: "The edition could not be created. Please try again.",
    });
  }

  const settingsRows = await client
    .insert(editionSettings)
    .values({
      editionId: edition.id,
      scoreboardTheme: themeRecord,
      scoreboardRotationSeconds: rotationSeconds,
      registrationRequirements: {
        scoreboard_modules: [...DEFAULT_SCOREBOARD_MODULES],
        entries_locked_at: null,
      },
    })
    .returning();

  const settings = settingsRows[0];

  if (!settings) {
    throw createProblem({
      type: "https://tournament.app/problems/edition-settings-not-created",
      title: "Unable to create edition settings",
      status: 500,
      detail: "Edition settings could not be persisted. Please try again.",
    });
  }

  return {
    edition,
    editionSettings: settings,
  };
}

async function ensureCompetitionAdminRole(
  client: TransactionClient,
  userId: string,
  competitionId: string,
): Promise<void> {
  const existing = await client.query.userRoles.findFirst({
    where: (table, { and, eq }) =>
      and(
        eq(table.userId, userId),
        eq(table.role, "competition_admin"),
        eq(table.scopeType, "competition"),
        eq(table.scopeId, competitionId),
      ),
  });

  if (existing) {
    return;
  }

  const inserted = await client
    .insert(userRoles)
    .values({
      userId,
      role: "competition_admin",
      scopeType: "competition",
      scopeId: competitionId,
      grantedBy: userId,
    })
    .returning();

  if (!inserted[0]) {
    throw createProblem({
      type: "https://tournament.app/problems/role-not-created",
      title: "Unable to assign competition role",
      status: 500,
      detail:
        "Competition was created but the organizer role could not be assigned.",
    });
  }
}

function normalizeName(value: string): string {
  if (!value) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-name",
      title: "Name is required",
      status: 400,
      detail: "A descriptive name must be provided.",
    });
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-name",
      title: "Name is required",
      status: 400,
      detail: "A descriptive name must be provided.",
    });
  }

  return trimmed;
}

function normalizeSlug(value: string): string {
  if (!value) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-slug",
      title: "Slug is required",
      status: 400,
      detail: "Slug must contain at least one alphanumeric character.",
    });
  }

  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-slug",
      title: "Slug is required",
      status: 400,
      detail: "Slug must contain at least one alphanumeric character.",
    });
  }

  return slug;
}

function normalizeFormat(format: EditionFormat): EditionFormat {
  if (!SUPPORTED_FORMATS.includes(format)) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-edition-format",
      title: "Edition format not supported",
      status: 400,
      detail: `Edition format "${format}" is not supported.`,
    });
  }

  return format;
}

function normalizeRegistrationWindow(input: RegistrationWindowInput): {
  opensAt: Date;
  closesAt: Date;
} {
  const opensAt = toDate(input.opensAt);
  const closesAt = toDate(input.closesAt);

  if (opensAt >= closesAt) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-registration-window",
      title: "Registration window invalid",
      status: 400,
      detail: "Registration close date must be later than the open date.",
    });
  }

  return { opensAt, closesAt };
}

function normalizeRotationSeconds(input?: number | null): number {
  if (input === undefined || input === null) {
    return DEFAULT_ROTATION_SECONDS;
  }

  if (!Number.isFinite(input)) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-rotation-seconds",
      title: "Scoreboard rotation must be numeric",
      status: 400,
      detail: "Provide a numeric value for scoreboard rotation seconds.",
    });
  }

  const normalized = Math.floor(input);

  if (normalized < MIN_ROTATION_SECONDS) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-rotation-seconds",
      title: "Scoreboard rotation too low",
      status: 400,
      detail: `Scoreboard rotation must be at least ${MIN_ROTATION_SECONDS} seconds.`,
    });
  }

  return normalized;
}

function normalizeTheme(input?: ScoreboardThemeInput): ScoreboardThemeRecord {
  const fallback = DEFAULT_SCOREBOARD_THEME;

  const primary = normalizeHexColor(
    input?.primaryColor ?? fallback.primary_color,
  );
  const secondary = normalizeHexColor(
    input?.secondaryColor ?? fallback.secondary_color,
  );
  enforceContrast(primary, secondary);

  const backgroundImage = normalizeOptionalUrl(input?.backgroundImageUrl);

  return {
    primary_color: primary,
    secondary_color: secondary,
    background_image_url: backgroundImage,
  };
}

function normalizeHexColor(value: string | null | undefined): string {
  if (!value) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-color",
      title: "Color is required",
      status: 400,
      detail: "Primary and secondary colors must be provided.",
    });
  }

  const trimmed = value.trim();
  const hexRegex = /^#([a-f0-9]{6})$/i;

  if (!hexRegex.test(trimmed)) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-color",
      title: "Color format invalid",
      status: 400,
      detail: "Colors must be 6-digit hexadecimal values (e.g. #1A2B3C).",
    });
  }

  return `#${trimmed.slice(1).toUpperCase()}`;
}

function normalizeOptionalUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.toString();
  } catch {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-url",
      title: "Invalid background image URL",
      status: 400,
      detail: "Provide a valid absolute URL for the background image.",
    });
  }
}

function enforceContrast(primary: string, secondary: string): void {
  const ratio = computeContrastRatio(primary, secondary);
  if (ratio < MIN_CONTRAST_RATIO) {
    throw createProblem({
      type: "https://tournament.app/problems/insufficient-contrast",
      title: "Scoreboard colors lack contrast",
      status: 400,
      detail:
        "Primary and secondary colors must meet WCAG AA contrast requirements (>= 4.5:1).",
    });
  }
}

function normalizeTimezone(input?: string | null): string {
  if (!input) {
    return DEFAULT_TIMEZONE;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return DEFAULT_TIMEZONE;
  }

  const supported = getSupportedTimeZones();
  if (supported.has(trimmed)) {
    return trimmed;
  }

  // Fallback to Intl validation if the zone list is incomplete.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return trimmed;
  } catch {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-timezone",
      title: "Timezone not recognized",
      status: 400,
      detail: `Timezone "${trimmed}" is not supported.`,
    });
  }
}

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toDate(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-date",
      title: "Invalid date",
      status: 400,
      detail: "Dates must be valid ISO-8601 timestamps.",
    });
  }

  return parsed;
}

let cachedTimeZones: Set<string> | null = null;

function getSupportedTimeZones(): Set<string> {
  if (cachedTimeZones) {
    return cachedTimeZones;
  }

  const values =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [];
  cachedTimeZones = new Set(values);
  return cachedTimeZones;
}

export const __internal = {
  normalizeSlug,
  normalizeRotationSeconds,
  normalizeTheme,
  computeContrastRatio,
};
