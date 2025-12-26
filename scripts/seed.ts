import "dotenv/config";

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { hashPassword } from "better-auth/crypto";
import { addDays, addHours, addMinutes } from "date-fns";
import type { InferSelectModel } from "drizzle-orm";
import { and, eq, inArray } from "drizzle-orm";
import { __internal as competitionInternal } from "@/modules/competitions/service";
import {
  type DrizzleDatabase,
  db,
  shutdown,
  type TransactionClient,
} from "@/server/db/client";
import {
  accounts,
  competitions,
  editionSettings,
  editions,
  entries,
  groups,
  matchEvents,
  matches,
  persons,
  scoreboardHighlights,
  squadMembers,
  squads,
  stages,
  teamMemberships,
  teams,
  userRoles,
  users,
  venues,
} from "@/server/db/schema";

type DatabaseExecutor = DrizzleDatabase | TransactionClient;

const envOrDefault = (value: string | undefined, fallback: string) =>
  value && value.trim().length > 0 ? value : fallback;

const SEED_USER_PASSWORD = envOrDefault(
  process.env.SEED_USER_PASSWORD,
  "Password123!",
);
const SEED_USER_EMAIL_GLOBAL_ADMIN = envOrDefault(
  process.env.SEED_USER_EMAIL_GLOBAL_ADMIN,
  "admin@example.com",
);
const SEED_USER_EMAIL_COMPETITION_ADMIN = envOrDefault(
  process.env.SEED_USER_EMAIL_COMPETITION_ADMIN,
  "edition-admin@example.com",
);
const SEED_USER_EMAIL_TEAM_MANAGER = envOrDefault(
  process.env.SEED_USER_EMAIL_TEAM_MANAGER,
  "lagleder@example.com",
);

const COMPETITION = {
  name: "Trondheim Cup",
  slug: "trondheim-cup",
  defaultTimezone: "Europe/Oslo",
  description:
    "En demonstrasjonsturnering i Trondheim med både publikumsskjermer og administrasjonspanelet aktivert.",
  primaryColor: "#0B1F3A",
  secondaryColor: "#F2F4FF",
};

const EDITIONS = [
  {
    slug: "2025",
    label: "2025",
    status: "published" as const,
    format: "round_robin",
    timezone: "Europe/Oslo",
    scoreboard: {
      rotation: 5,
      theme: {
        primary_color: "#0B1F3A",
        secondary_color: "#F2F4FF",
        background_image_url: null,
      },
    },
  },
  {
    slug: "2026",
    label: "2026 (kladde)",
    status: "draft" as const,
    format: "round_robin",
    timezone: "Europe/Oslo",
    scoreboard: {
      rotation: 6,
      theme: {
        primary_color: "#002F6C",
        secondary_color: "#F9FBFF",
        background_image_url: null,
      },
    },
  },
];

type TeamDefinition = {
  name: string;
  contactEmail: string;
  contactPhone: string;
  players: Array<{
    firstName: string;
    lastName: string;
    birthDate: Date;
    jerseyNumber: number;
    position: string;
  }>;
};

const TEAM_DEFINITIONS: TeamDefinition[] = [
  {
    name: "Trondheim Nord",
    contactEmail: "nord@example.com",
    contactPhone: "+47 900 00 001",
    players: [
      {
        firstName: "Mats",
        lastName: "Berg",
        birthDate: new Date("1996-01-12"),
        jerseyNumber: 9,
        position: "forward",
      },
      {
        firstName: "Eirik",
        lastName: "Haugen",
        birthDate: new Date("1995-04-02"),
        jerseyNumber: 4,
        position: "defender",
      },
      {
        firstName: "Jonas",
        lastName: "Lund",
        birthDate: new Date("1998-08-25"),
        jerseyNumber: 1,
        position: "keeper",
      },
    ],
  },
  {
    name: "Trondheim Sør",
    contactEmail: "sor@example.com",
    contactPhone: "+47 900 00 002",
    players: [
      {
        firstName: "Lars",
        lastName: "Haug",
        birthDate: new Date("1997-02-04"),
        jerseyNumber: 10,
        position: "forward",
      },
      {
        firstName: "Martin",
        lastName: "Solberg",
        birthDate: new Date("1994-11-30"),
        jerseyNumber: 6,
        position: "midfielder",
      },
    ],
  },
  {
    name: "Nidaros FK",
    contactEmail: "nidaros@example.com",
    contactPhone: "+47 900 00 003",
    players: [
      {
        firstName: "Even",
        lastName: "Midttun",
        birthDate: new Date("1993-07-18"),
        jerseyNumber: 11,
        position: "forward",
      },
      {
        firstName: "Kjetil",
        lastName: "Aas",
        birthDate: new Date("1992-05-22"),
        jerseyNumber: 5,
        position: "defender",
      },
    ],
  },
  {
    name: "Trondheim Lyn",
    contactEmail: "lyn@example.com",
    contactPhone: "+47 900 00 004",
    players: [
      {
        firstName: "Håkon",
        lastName: "Sunde",
        birthDate: new Date("1995-12-02"),
        jerseyNumber: 7,
        position: "forward",
      },
      {
        firstName: "Steffen",
        lastName: "Myhre",
        birthDate: new Date("1991-09-09"),
        jerseyNumber: 2,
        position: "defender",
      },
    ],
  },
];

const MATCH_PLAN = [
  {
    code: "seed-match-1",
    homeSlug: "trondheim-nord",
    awaySlug: "trondheim-s-r",
    status: "in_progress",
    kickoffOffset: -20,
    homeScore: 2,
    awayScore: 1,
  },
  {
    code: "seed-match-2",
    homeSlug: "nidaros-fk",
    awaySlug: "trondheim-lyn",
    status: "scheduled",
    kickoffOffset: 30,
    homeScore: 0,
    awayScore: 0,
  },
  {
    code: "seed-match-3",
    homeSlug: "trondheim-nord",
    awaySlug: "nidaros-fk",
    status: "finalized",
    kickoffOffset: -180,
    homeScore: 3,
    awayScore: 2,
  },
];

const MATCH_EVENTS = [
  {
    matchCode: "seed-match-1",
    playerKey: "trondheim-nord:9",
    type: "goal",
    minute: 8,
  },
  {
    matchCode: "seed-match-1",
    playerKey: "trondheim-s-r:10",
    type: "goal",
    minute: 38,
  },
  {
    matchCode: "seed-match-3",
    playerKey: "trondheim-nord:9",
    type: "goal",
    minute: 14,
  },
  {
    matchCode: "seed-match-3",
    playerKey: "trondheim-nord:9",
    type: "assist",
    minute: 60,
  },
  {
    matchCode: "seed-match-3",
    playerKey: "nidaros-fk:11",
    type: "goal",
    minute: 75,
  },
];

const DEMO_USERS = [
  {
    email: SEED_USER_EMAIL_GLOBAL_ADMIN,
    fullName: "Global Admin",
    role: "global_admin",
    scopeType: "global" as const,
    scopeSlug: null,
  },
  {
    email: SEED_USER_EMAIL_COMPETITION_ADMIN,
    fullName: "Konkurranseansvarlig",
    role: "competition_admin",
    scopeType: "competition" as const,
    scopeSlug: COMPETITION.slug,
  },
  {
    email: SEED_USER_EMAIL_TEAM_MANAGER,
    fullName: "Lagleder Trondheim Nord",
    role: "team_manager",
    scopeType: "team" as const,
    scopeSlug: "trondheim-nord",
  },
] as const;

type SeededTeam = InferSelectModel<typeof teams>;
type SeededCompetition = InferSelectModel<typeof competitions>;
type SeededEdition = InferSelectModel<typeof editions>;
type SeededEntry = InferSelectModel<typeof entries>;
type SeededSquad = InferSelectModel<typeof squads>;
type SeededMatch = InferSelectModel<typeof matches>;
type SeededVenue = InferSelectModel<typeof venues>;
type SeededGroup = InferSelectModel<typeof groups>;

type EntryDirectory = Map<string, { entry: SeededEntry; team: SeededTeam }>;
type SquadDirectory = Map<string, { squad: SeededSquad; entry: SeededEntry }>;
type PlayerDirectory = Map<
  string,
  { squadMemberId: string; entryId: string; teamSlug: string }
>;

const HISTORICAL_SEED_DIR = join(
  process.cwd(),
  "historical-tournaments",
  "seeds",
);
const HISTORICAL_SEED_TYPE = "historical-edition";

type HistoricalSeedCompetition = {
  name: string;
  slug?: string;
  defaultTimezone?: string;
  description?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

type HistoricalSeedTheme = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundImageUrl?: string | null;
};

type HistoricalSeedEdition = {
  slug: string;
  label: string;
  status: "published" | "draft";
  format: "round_robin" | "knockout" | "hybrid";
  timezone?: string | null;
  date: string;
  scoreboardRotationSeconds?: number | null;
  scoreboardTheme?: HistoricalSeedTheme | null;
  registrationWindow?: {
    opensAt?: string | null;
    closesAt?: string | null;
  };
};

type HistoricalSeedVenue = {
  name: string;
  slug?: string;
  address?: string | null;
  notes?: string | null;
  timezone?: string | null;
};

type HistoricalSeedGroup = {
  code: string;
  name?: string | null;
};

type HistoricalSeedTeam = {
  name: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

type HistoricalSeedMatchStatus = SeededMatch["status"];

type HistoricalSeedSource =
  | { type: "seed"; seed: number }
  | { type: "winner" | "loser"; matchId: string };

type HistoricalSeedMatch = {
  kickoffAt: string;
  venue: string;
  groupCode?: string | null;
  code?: string | null;
  home?: string | null;
  away?: string | null;
  homeSeed?: number | null;
  awaySeed?: number | null;
  homeSource?: HistoricalSeedSource | null;
  awaySource?: HistoricalSeedSource | null;
  homeLabel?: string | null;
  awayLabel?: string | null;
  roundNumber?: number | null;
  bracketId?: string | null;
  homeScore: number;
  awayScore: number;
  status?: HistoricalSeedMatchStatus;
};

type HistoricalSeedTopScorer = {
  name: string;
  goals: number;
  team?: string | null;
};

type HistoricalSeedHighlight = {
  message: string;
  durationSeconds?: number | null;
  expiresAt?: string | null;
};

type HistoricalSeed = {
  seedType: typeof HISTORICAL_SEED_TYPE;
  competition: HistoricalSeedCompetition;
  edition: HistoricalSeedEdition;
  venues: HistoricalSeedVenue[];
  groups: HistoricalSeedGroup[];
  teams: HistoricalSeedTeam[];
  matches: HistoricalSeedMatch[];
  topScorers?: HistoricalSeedTopScorer[];
  highlight?: HistoricalSeedHighlight | null;
};

type HistoricalSeedSummary = {
  teamCount: number;
  matchCount: number;
};

async function main() {
  try {
    const summary = await db.transaction(async (tx) => seedDatabase(tx));
    process.stdout.write(
      `Seed complete: ${summary.teamCount} lag, ${summary.matchCount} kamper, ` +
        `kontoer for ${summary.userCount} demo-brukere.\n`,
    );
  } catch (error) {
    process.stderr.write(
      `Seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  } finally {
    await shutdown();
  }
}

async function seedDatabase(client: DatabaseExecutor) {
  const trondheimSummary = await seedTrondheimCup(client);
  const historicalSummary = await seedHistoricalEditions(client);

  return {
    teamCount: trondheimSummary.teamCount + historicalSummary.teamCount,
    matchCount: trondheimSummary.matchCount + historicalSummary.matchCount,
    userCount: trondheimSummary.userCount,
  };
}

async function seedTrondheimCup(client: DatabaseExecutor) {
  const competition = await upsertCompetition(client);
  const editions = await upsertEditions(client, competition.id);
  const stage = await ensureGroupStage(client, editions.published.id);

  const seededTeams = await upsertTeams(client);
  const entryDirectory = await upsertEntries(
    client,
    editions.published.id,
    seededTeams,
  );
  const squadDirectory = await ensureSquads(client, entryDirectory);
  const playerDirectory = await seedSquads(client, squadDirectory);

  const matchesSeeded = await seedMatches(
    client,
    stage.id,
    editions.published.id,
    entryDirectory,
  );
  await seedMatchEvents(client, matchesSeeded, playerDirectory);

  await seedHighlight(client, editions.published.id);
  await seedUsers(client, competition, seededTeams);

  return {
    teamCount: seededTeams.length,
    matchCount: matchesSeeded.length,
    userCount: DEMO_USERS.length,
  };
}

async function seedHistoricalEditions(
  client: DatabaseExecutor,
): Promise<HistoricalSeedSummary> {
  const seeds = loadHistoricalSeeds();
  const summary = { teamCount: 0, matchCount: 0 };

  for (const seed of seeds) {
    const result = await seedHistoricalEdition(client, seed);
    summary.teamCount += result.teamCount;
    summary.matchCount += result.matchCount;
  }

  return summary;
}

function loadHistoricalSeeds(): HistoricalSeed[] {
  try {
    const files = readdirSync(HISTORICAL_SEED_DIR, { withFileTypes: true });
    const seeds: HistoricalSeed[] = [];

    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith(".json")) {
        continue;
      }

      const raw = readFileSync(join(HISTORICAL_SEED_DIR, file.name), "utf8");
      const parsed = JSON.parse(raw) as Partial<HistoricalSeed>;

      if (parsed.seedType !== HISTORICAL_SEED_TYPE) {
        continue;
      }

      seeds.push(assertHistoricalSeed(parsed, file.name));
    }

    return seeds;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
}

function assertHistoricalSeed(
  value: Partial<HistoricalSeed>,
  source: string,
): HistoricalSeed {
  if (value.seedType !== HISTORICAL_SEED_TYPE) {
    throw new Error(`Ugyldig historisk seed: ${source}`);
  }
  if (!value.competition?.name) {
    throw new Error(`Historisk seed mangler competition.name: ${source}`);
  }
  if (!value.edition?.slug || !value.edition?.label || !value.edition?.date) {
    throw new Error(`Historisk seed mangler edition-felter: ${source}`);
  }
  if (!Array.isArray(value.venues)) {
    throw new Error(`Historisk seed mangler venues: ${source}`);
  }
  if (!Array.isArray(value.groups)) {
    throw new Error(`Historisk seed mangler groups: ${source}`);
  }
  if (!Array.isArray(value.teams)) {
    throw new Error(`Historisk seed mangler teams: ${source}`);
  }
  if (!Array.isArray(value.matches)) {
    throw new Error(`Historisk seed mangler matches: ${source}`);
  }

  return value as HistoricalSeed;
}

async function seedHistoricalEdition(
  client: DatabaseExecutor,
  seed: HistoricalSeed,
): Promise<HistoricalSeedSummary> {
  const competition = await upsertHistoricalCompetition(client, seed);
  const edition = await upsertHistoricalEdition(client, competition, seed);
  const venuesBySlug = await upsertHistoricalVenues(
    client,
    competition.id,
    edition.id,
    seed.venues,
  );
  const stage = await ensureGroupStage(client, edition.id);
  const groupsByCode = await upsertHistoricalGroups(
    client,
    stage.id,
    seed.groups,
  );
  const seededTeams = await upsertHistoricalTeams(client, seed.teams);
  const entryDirectory = await upsertEntries(client, edition.id, seededTeams);
  const squadDirectory = await ensureSquads(client, entryDirectory);

  const matchesSeeded = await seedHistoricalMatches(client, {
    editionId: edition.id,
    stageId: stage.id,
    entries: entryDirectory,
    groupsByCode,
    venuesBySlug,
    matches: seed.matches,
  });

  if (seed.topScorers && seed.topScorers.length > 0) {
    await seedHistoricalTopScorers(client, {
      editionId: edition.id,
      entries: entryDirectory,
      squads: squadDirectory,
      matches: matchesSeeded,
      topScorers: seed.topScorers,
    });
  }

  await client
    .delete(scoreboardHighlights)
    .where(eq(scoreboardHighlights.editionId, edition.id));

  if (seed.highlight) {
    await seedHistoricalHighlight(client, edition.id, seed.highlight);
  }

  return {
    teamCount: seededTeams.length,
    matchCount: matchesSeeded.length,
  };
}

async function upsertHistoricalCompetition(
  client: DatabaseExecutor,
  seed: HistoricalSeed,
) {
  const competitionSeed = seed.competition;
  const slug = competitionInternal.normalizeSlug(
    competitionSeed.slug ?? competitionSeed.name,
  );
  const themeRecord = competitionInternal.normalizeTheme(
    seed.edition.scoreboardTheme ?? {
      primaryColor: competitionSeed.primaryColor ?? undefined,
      secondaryColor: competitionSeed.secondaryColor ?? undefined,
      backgroundImageUrl: null,
    },
  );

  const [row] = await client
    .insert(competitions)
    .values({
      name: competitionSeed.name,
      slug,
      defaultTimezone: competitionSeed.defaultTimezone ?? "Europe/Oslo",
      description: competitionSeed.description ?? null,
      primaryColor: themeRecord.primary_color,
      secondaryColor: themeRecord.secondary_color,
    })
    .onConflictDoUpdate({
      target: competitions.slug,
      set: {
        name: competitionSeed.name,
        defaultTimezone: competitionSeed.defaultTimezone ?? "Europe/Oslo",
        description: competitionSeed.description ?? null,
        primaryColor: themeRecord.primary_color,
        secondaryColor: themeRecord.secondary_color,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) {
    throw new Error(`Kunne ikke opprette konkurranse ${competitionSeed.name}`);
  }

  return row;
}

async function upsertHistoricalEdition(
  client: DatabaseExecutor,
  competition: SeededCompetition,
  seed: HistoricalSeed,
) {
  const editionSeed = seed.edition;
  const label = editionSeed.label;
  const slug = competitionInternal.normalizeSlug(editionSeed.slug);
  const timezone =
    editionSeed.timezone ??
    seed.competition.defaultTimezone ??
    competition.defaultTimezone ??
    "Europe/Oslo";
  const registration = resolveRegistrationWindow(editionSeed);
  const rotationSeconds = competitionInternal.normalizeRotationSeconds(
    editionSeed.scoreboardRotationSeconds ?? undefined,
  );
  const themeRecord = competitionInternal.normalizeTheme(
    editionSeed.scoreboardTheme ?? {
      primaryColor: seed.competition.primaryColor ?? undefined,
      secondaryColor: seed.competition.secondaryColor ?? undefined,
      backgroundImageUrl: null,
    },
  );

  const [edition] = await client
    .insert(editions)
    .values({
      competitionId: competition.id,
      label,
      slug,
      format: editionSeed.format,
      timezone,
      status: editionSeed.status,
      registrationOpensAt: registration.opensAt,
      registrationClosesAt: registration.closesAt,
    })
    .onConflictDoUpdate({
      target: [editions.competitionId, editions.slug],
      set: {
        label,
        format: editionSeed.format,
        timezone,
        status: editionSeed.status,
        registrationOpensAt: registration.opensAt,
        registrationClosesAt: registration.closesAt,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!edition) {
    throw new Error(`Kunne ikke opprette utgave ${label}`);
  }

  await client
    .insert(editionSettings)
    .values({
      editionId: edition.id,
      scoreboardRotationSeconds: rotationSeconds,
      scoreboardTheme: themeRecord,
    })
    .onConflictDoUpdate({
      target: editionSettings.editionId,
      set: {
        scoreboardRotationSeconds: rotationSeconds,
        scoreboardTheme: themeRecord,
        updatedAt: new Date(),
      },
    });

  return edition;
}

async function upsertHistoricalVenues(
  client: DatabaseExecutor,
  competitionId: string,
  editionId: string,
  seedVenues: HistoricalSeedVenue[],
) {
  const directory = new Map<string, SeededVenue>();

  for (const venue of seedVenues) {
    const slug = competitionInternal.normalizeSlug(venue.slug ?? venue.name);
    const [row] = await client
      .insert(venues)
      .values({
        competitionId,
        editionId,
        name: venue.name,
        slug,
        address: venue.address ?? null,
        notes: venue.notes ?? null,
        timezone: venue.timezone ?? null,
      })
      .onConflictDoUpdate({
        target: [venues.competitionId, venues.editionId, venues.slug],
        set: {
          name: venue.name,
          address: venue.address ?? null,
          notes: venue.notes ?? null,
          timezone: venue.timezone ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!row) {
      throw new Error(`Kunne ikke opprette bane ${venue.name}`);
    }

    directory.set(slug, row);
  }

  return directory;
}

async function upsertHistoricalGroups(
  client: DatabaseExecutor,
  stageId: string,
  seedGroups: HistoricalSeedGroup[],
) {
  const directory = new Map<string, SeededGroup>();

  for (const group of seedGroups) {
    const [row] = await client
      .insert(groups)
      .values({
        stageId,
        code: group.code,
        name: group.name ?? null,
      })
      .onConflictDoUpdate({
        target: [groups.stageId, groups.code],
        set: {
          name: group.name ?? null,
        },
      })
      .returning();

    if (!row) {
      throw new Error(`Kunne ikke opprette gruppe ${group.code}`);
    }

    directory.set(group.code, row);
  }

  return directory;
}

async function upsertHistoricalTeams(
  client: DatabaseExecutor,
  teamsSeeded: HistoricalSeedTeam[],
) {
  const seeded: SeededTeam[] = [];
  const seenSlugs = new Set<string>();

  for (const definition of teamsSeeded) {
    const slug = competitionInternal.normalizeSlug(definition.name);
    if (seenSlugs.has(slug)) {
      continue;
    }
    seenSlugs.add(slug);

    const [team] = await client
      .insert(teams)
      .values({
        name: definition.name,
        slug,
        contactEmail: definition.contactEmail ?? null,
        contactPhone: definition.contactPhone ?? null,
      })
      .onConflictDoUpdate({
        target: teams.slug,
        set: {
          name: definition.name,
          contactEmail: definition.contactEmail ?? null,
          contactPhone: definition.contactPhone ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!team) {
      throw new Error(`Kunne ikke opprette laget ${definition.name}`);
    }

    seeded.push(team);
  }

  return seeded;
}

async function seedHistoricalMatches(
  client: DatabaseExecutor,
  options: {
    editionId: string;
    stageId: string;
    entries: EntryDirectory;
    groupsByCode: Map<string, SeededGroup>;
    venuesBySlug: Map<string, SeededVenue>;
    matches: HistoricalSeedMatch[];
  },
) {
  const matchesSeeded: SeededMatch[] = [];

  await client.delete(matches).where(eq(matches.editionId, options.editionId));

  for (const matchSeed of options.matches) {
    const homeName = matchSeed.home?.trim() ?? null;
    const awayName = matchSeed.away?.trim() ?? null;
    const homeSlug = homeName
      ? competitionInternal.normalizeSlug(homeName)
      : null;
    const awaySlug = awayName
      ? competitionInternal.normalizeSlug(awayName)
      : null;
    const home = homeSlug ? options.entries.get(homeSlug) : null;
    const away = awaySlug ? options.entries.get(awaySlug) : null;

    if (homeName && !home) {
      throw new Error(`Mangler deltaker for ${homeName}`);
    }
    if (awayName && !away) {
      throw new Error(`Mangler deltaker for ${awayName}`);
    }

    const groupCode = matchSeed.groupCode?.trim() ?? null;
    const groupId = groupCode
      ? options.groupsByCode.get(groupCode)?.id ?? null
      : null;

    if (groupCode && !groupId) {
      throw new Error(`Fant ikke gruppe ${groupCode}`);
    }

    const venueSlug = competitionInternal.normalizeSlug(matchSeed.venue);
    const venue = options.venuesBySlug.get(venueSlug);

    if (!venue) {
      throw new Error(`Fant ikke bane ${matchSeed.venue}`);
    }

    const kickoffLabel =
      matchSeed.home ?? matchSeed.away ?? matchSeed.code ?? matchSeed.kickoffAt;
    const kickoffAt = parseSeedDate(matchSeed.kickoffAt, kickoffLabel);
    const homeSeed =
      typeof matchSeed.homeSeed === "number" &&
      Number.isFinite(matchSeed.homeSeed) &&
      matchSeed.homeSeed > 0
        ? Math.trunc(matchSeed.homeSeed)
        : null;
    const awaySeed =
      typeof matchSeed.awaySeed === "number" &&
      Number.isFinite(matchSeed.awaySeed) &&
      matchSeed.awaySeed > 0
        ? Math.trunc(matchSeed.awaySeed)
        : null;
    const homeSource =
      matchSeed.homeSource ??
      (homeSeed ? { type: "seed" as const, seed: homeSeed } : null);
    const awaySource =
      matchSeed.awaySource ??
      (awaySeed ? { type: "seed" as const, seed: awaySeed } : null);
    const homeLabel = matchSeed.homeLabel?.trim() ?? null;
    const awayLabel = matchSeed.awayLabel?.trim() ?? null;
    const metadata: Record<string, unknown> = {};

    if (homeSource) {
      metadata.homeSource = homeSource;
    }
    if (awaySource) {
      metadata.awaySource = awaySource;
    }
    if (homeLabel) {
      metadata.homeLabel = homeLabel;
    }
    if (awayLabel) {
      metadata.awayLabel = awayLabel;
    }
    if (typeof matchSeed.roundNumber === "number") {
      metadata.roundNumber = matchSeed.roundNumber;
    }

    const homeEntryId = home?.entry.id ?? null;
    const awayEntryId = away?.entry.id ?? null;

    if (!homeEntryId && !homeSource) {
      throw new Error(
        `Mangler hjemmelag eller seed for kamp ${matchSeed.code ?? matchSeed.kickoffAt}`,
      );
    }
    if (!awayEntryId && !awaySource) {
      throw new Error(
        `Mangler bortelag eller seed for kamp ${matchSeed.code ?? matchSeed.kickoffAt}`,
      );
    }

    const [match] = await client
      .insert(matches)
      .values({
        editionId: options.editionId,
        stageId: options.stageId,
        groupId,
        homeEntryId,
        awayEntryId,
        venueId: venue.id,
        bracketId: matchSeed.bracketId ?? null,
        code: matchSeed.code ?? null,
        kickoffAt,
        status: matchSeed.status ?? "finalized",
        homeScore: matchSeed.homeScore,
        awayScore: matchSeed.awayScore,
        metadata,
      })
      .returning();

    if (!match) {
      throw new Error(
        `Kunne ikke opprette kamp ${matchSeed.home ?? "TBD"} - ${matchSeed.away ?? "TBD"}`,
      );
    }

    matchesSeeded.push(match);
  }

  return matchesSeeded;
}

async function seedHistoricalTopScorers(
  client: DatabaseExecutor,
  options: {
    editionId: string;
    entries: EntryDirectory;
    squads: SquadDirectory;
    matches: SeededMatch[];
    topScorers: HistoricalSeedTopScorer[];
  },
) {
  const matchIds = options.matches.map((match) => match.id);
  if (matchIds.length > 0) {
    await client
      .delete(matchEvents)
      .where(inArray(matchEvents.matchId, matchIds));
  }

  const matchesByEntryId = new Map<string, SeededMatch[]>();
  for (const match of options.matches) {
    if (match.homeEntryId) {
      const list = matchesByEntryId.get(match.homeEntryId) ?? [];
      list.push(match);
      matchesByEntryId.set(match.homeEntryId, list);
    }
    if (match.awayEntryId) {
      const list = matchesByEntryId.get(match.awayEntryId) ?? [];
      list.push(match);
      matchesByEntryId.set(match.awayEntryId, list);
    }
  }

  const sortedTeamSlugs = Array.from(options.entries.keys()).sort((a, b) =>
    a.localeCompare(b, "nb"),
  );

  for (const [index, scorer] of options.topScorers.entries()) {
    const teamSlug = scorer.team
      ? competitionInternal.normalizeSlug(scorer.team)
      : sortedTeamSlugs[index % sortedTeamSlugs.length];
    const entryRecord = options.entries.get(teamSlug);
    const squadRecord = options.squads.get(teamSlug);

    if (!entryRecord || !squadRecord) {
      throw new Error(`Fant ikke lag for toppscorer ${scorer.name}`);
    }

    const { firstName, lastName } = splitPersonName(scorer.name);
    const birthDate = deriveBirthDateFromName(scorer.name);
    const person = await upsertHistoricalPerson(client, {
      firstName,
      lastName,
      birthDate,
    });
    const membership = await upsertMembership(
      client,
      person.id,
      entryRecord.team.id,
    );

    await client
      .delete(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, squadRecord.squad.id),
          eq(squadMembers.personId, person.id),
        ),
      );

    const [member] = await client
      .insert(squadMembers)
      .values({
        squadId: squadRecord.squad.id,
        personId: person.id,
        membershipId: membership.id,
      })
      .returning();

    if (!member) {
      throw new Error(`Kunne ikke opprette spiller ${scorer.name}`);
    }

    const entryMatches = matchesByEntryId.get(entryRecord.entry.id) ?? [];
    if (!entryMatches.length) {
      throw new Error(`Mangler kamper for toppscorer ${scorer.name}`);
    }

    const match = entryMatches[index % entryMatches.length];
    const teamSide =
      match.homeEntryId === entryRecord.entry.id ? "home" : "away";

    for (let goalIndex = 0; goalIndex < scorer.goals; goalIndex += 1) {
      await client.insert(matchEvents).values({
        matchId: match.id,
        relatedMemberId: member.id,
        teamSide,
        eventType: "goal",
        minute: goalIndex + 1,
      });
    }
  }
}

async function upsertHistoricalPerson(
  client: DatabaseExecutor,
  input: {
    firstName: string;
    lastName: string;
    birthDate: Date;
  },
) {
  const [created] = await client
    .insert(persons)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      preferredName: null,
      birthDate: input.birthDate,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  const existing = await client.query.persons.findFirst({
    where: (table, { and: andFn, eq: equals }) =>
      andFn(
        equals(table.firstName, input.firstName),
        equals(table.lastName, input.lastName),
        equals(table.birthDate, input.birthDate),
      ),
  });

  if (!existing) {
    throw new Error(
      `Kunne ikke finne spiller ${input.firstName} ${input.lastName}`,
    );
  }

  return existing;
}

function splitPersonName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { firstName: "Ukjent", lastName: "" };
  }

  const parts = trimmed.split(/\s+/u);
  if (parts.length === 1) {
    return { firstName: parts[0] ?? trimmed, lastName: "" };
  }

  return {
    firstName: parts[0] ?? trimmed,
    lastName: parts.slice(1).join(" "),
  };
}

function deriveBirthDateFromName(name: string) {
  let hash = 0;
  for (const char of name) {
    const code = char.codePointAt(0) ?? 0;
    hash = (hash * 31 + code) >>> 0;
  }

  const year = 1980 + (hash % 25);
  const month = (hash >>> 8) % 12;
  const day = 1 + ((hash >>> 16) % 28);
  const monthValue = String(month + 1).padStart(2, "0");
  const dayValue = String(day).padStart(2, "0");
  return new Date(`${year}-${monthValue}-${dayValue}`);
}

async function seedHistoricalHighlight(
  client: DatabaseExecutor,
  editionId: string,
  highlight: HistoricalSeedHighlight,
) {
  const expiresAt = highlight.expiresAt
    ? parseSeedDate(highlight.expiresAt, highlight.message)
    : addMinutes(new Date(), 15);

  await client.insert(scoreboardHighlights).values({
    editionId,
    message: highlight.message,
    durationSeconds: highlight.durationSeconds ?? 120,
    expiresAt,
  });
}

function resolveRegistrationWindow(editionSeed: HistoricalSeedEdition) {
  if (
    editionSeed.registrationWindow?.opensAt ||
    editionSeed.registrationWindow?.closesAt
  ) {
    return {
      opensAt: editionSeed.registrationWindow?.opensAt
        ? parseSeedDate(editionSeed.registrationWindow.opensAt, editionSeed.slug)
        : null,
      closesAt: editionSeed.registrationWindow?.closesAt
        ? parseSeedDate(editionSeed.registrationWindow.closesAt, editionSeed.slug)
        : null,
    };
  }

  const baseDate = parseSeedDate(editionSeed.date, editionSeed.slug);
  return {
    opensAt: addDays(baseDate, -60),
    closesAt: addDays(baseDate, 1),
  };
}

function parseSeedDate(value: string, label: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Ugyldig dato (${label}): ${value}`);
  }
  return parsed;
}

async function upsertCompetition(client: DatabaseExecutor) {
  const [row] = await client
    .insert(competitions)
    .values({
      name: COMPETITION.name,
      slug: COMPETITION.slug,
      defaultTimezone: COMPETITION.defaultTimezone,
      description: COMPETITION.description,
      primaryColor: COMPETITION.primaryColor,
      secondaryColor: COMPETITION.secondaryColor,
    })
    .onConflictDoUpdate({
      target: competitions.slug,
      set: {
        name: COMPETITION.name,
        defaultTimezone: COMPETITION.defaultTimezone,
        description: COMPETITION.description,
        primaryColor: COMPETITION.primaryColor,
        secondaryColor: COMPETITION.secondaryColor,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) {
    throw new Error("Kunne ikke opprette konkurranse");
  }

  return row;
}

async function upsertEditions(client: DatabaseExecutor, competitionId: string) {
  const now = new Date();
  const results: Partial<Record<"published" | "draft", SeededEdition>> = {};

  for (const editionConfig of EDITIONS) {
    const [edition] = await client
      .insert(editions)
      .values({
        competitionId,
        label: editionConfig.label,
        slug: editionConfig.slug,
        format: editionConfig.format,
        timezone: editionConfig.timezone,
        status: editionConfig.status,
        registrationOpensAt: addHours(now, -96),
        registrationClosesAt: addHours(now, 96),
      })
      .onConflictDoUpdate({
        target: [editions.competitionId, editions.slug],
        set: {
          label: editionConfig.label,
          format: editionConfig.format,
          timezone: editionConfig.timezone,
          status: editionConfig.status,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!edition) {
      throw new Error(`Kunne ikke opprette utgave ${editionConfig.slug}`);
    }

    await client
      .insert(editionSettings)
      .values({
        editionId: edition.id,
        scoreboardRotationSeconds: editionConfig.scoreboard.rotation,
        scoreboardTheme: editionConfig.scoreboard.theme,
      })
      .onConflictDoUpdate({
        target: editionSettings.editionId,
        set: {
          scoreboardRotationSeconds: editionConfig.scoreboard.rotation,
          scoreboardTheme: editionConfig.scoreboard.theme,
          updatedAt: new Date(),
        },
      });

    if (editionConfig.status === "published") {
      results.published = edition;
    } else {
      results.draft = edition;
    }
  }

  if (!results.published || !results.draft) {
    throw new Error("Utgaver mangler etter seeding");
  }

  return {
    published: results.published,
    draft: results.draft,
  };
}

async function ensureGroupStage(client: DatabaseExecutor, editionId: string) {
  const existing = await client.query.stages.findFirst({
    where: (table, { and: andFn, eq: equals }) =>
      andFn(equals(table.editionId, editionId), equals(table.orderIndex, 1)),
  });

  if (existing) {
    return existing;
  }

  const [stage] = await client
    .insert(stages)
    .values({
      editionId,
      name: "Gruppespill",
      stageType: "group",
      orderIndex: 1,
    })
    .returning();

  if (!stage) {
    throw new Error("Kunne ikke opprette gruppespill");
  }

  return stage;
}

async function upsertTeams(client: DatabaseExecutor) {
  const seeded: SeededTeam[] = [];

  for (const definition of TEAM_DEFINITIONS) {
    const slug = competitionInternal.normalizeSlug(definition.name);
    const [team] = await client
      .insert(teams)
      .values({
        name: definition.name,
        slug,
        contactEmail: definition.contactEmail,
        contactPhone: definition.contactPhone,
      })
      .onConflictDoUpdate({
        target: teams.slug,
        set: {
          name: definition.name,
          contactEmail: definition.contactEmail,
          contactPhone: definition.contactPhone,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!team) {
      throw new Error(`Kunne ikke opprette laget ${definition.name}`);
    }

    seeded.push(team);
  }

  return seeded;
}

async function upsertEntries(
  client: DatabaseExecutor,
  editionId: string,
  teamsSeeded: SeededTeam[],
) {
  const directory: EntryDirectory = new Map();

  for (const team of teamsSeeded) {
    const [entry] = await client
      .insert(entries)
      .values({
        editionId,
        teamId: team.id,
        status: "approved",
        submittedAt: new Date(),
        approvedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [entries.editionId, entries.teamId],
        set: {
          status: "approved",
          submittedAt: new Date(),
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!entry) {
      throw new Error(`Kunne ikke opprette deltaker for ${team.name}`);
    }

    directory.set(team.slug, { entry, team });
  }

  return directory;
}

async function ensureSquads(client: DatabaseExecutor, entries: EntryDirectory) {
  const squadsDirectory: SquadDirectory = new Map();

  for (const [teamSlug, record] of entries.entries()) {
    const [squad] = await client
      .insert(squads)
      .values({
        entryId: record.entry.id,
      })
      .onConflictDoUpdate({
        target: squads.entryId,
        set: {
          updatedAt: new Date(),
        },
      })
      .returning();

    const squadRecord =
      squad ??
      (await client.query.squads.findFirst({
        where: (table, { eq: equals }) =>
          equals(table.entryId, record.entry.id),
      }));

    if (!squadRecord) {
      throw new Error(`Kunne ikke opprette tropp for ${teamSlug}`);
    }

    squadsDirectory.set(teamSlug, { squad: squadRecord, entry: record.entry });
    await client
      .delete(squadMembers)
      .where(eq(squadMembers.squadId, squadRecord.id));
  }

  return squadsDirectory;
}

async function seedSquads(
  client: DatabaseExecutor,
  squadsDirectory: SquadDirectory,
) {
  const directory: PlayerDirectory = new Map();

  for (const definition of TEAM_DEFINITIONS) {
    const slug = competitionInternal.normalizeSlug(definition.name);
    const squadRecord = squadsDirectory.get(slug);
    if (!squadRecord) {
      continue;
    }

    for (const player of definition.players) {
      const person = await upsertPerson(client, player);
      const membership = await upsertMembership(
        client,
        person.id,
        squadRecord.entry.teamId,
      );

      const [member] = await client
        .insert(squadMembers)
        .values({
          squadId: squadRecord.squad.id,
          personId: person.id,
          membershipId: membership.id,
          jerseyNumber: player.jerseyNumber,
          position: player.position,
        })
        .returning();

      if (!member) {
        throw new Error(
          `Kunne ikke legge til ${player.firstName} ${player.lastName}`,
        );
      }

      const key = `${slug}:${player.jerseyNumber}`;
      directory.set(key, {
        squadMemberId: member.id,
        entryId: squadRecord.entry.id,
        teamSlug: slug,
      });
    }
  }

  return directory;
}

async function upsertPerson(
  client: DatabaseExecutor,
  player: TeamDefinition["players"][number],
) {
  const [created] = await client
    .insert(persons)
    .values({
      firstName: player.firstName,
      lastName: player.lastName,
      preferredName: null,
      birthDate: player.birthDate,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  const existing = await client.query.persons.findFirst({
    where: (table, { and: andFn, eq: equals }) =>
      andFn(
        equals(table.firstName, player.firstName),
        equals(table.lastName, player.lastName),
        equals(table.birthDate, player.birthDate),
      ),
  });

  if (!existing) {
    throw new Error(
      `Kunne ikke finne spiller ${player.firstName} ${player.lastName}`,
    );
  }

  return existing;
}

async function upsertMembership(
  client: DatabaseExecutor,
  personId: string,
  teamId: string,
) {
  await client
    .delete(teamMemberships)
    .where(
      and(
        eq(teamMemberships.teamId, teamId),
        eq(teamMemberships.personId, personId),
      ),
    );

  const [membership] = await client
    .insert(teamMemberships)
    .values({
      teamId,
      personId,
      role: "player",
      status: "active",
      joinedAt: new Date(),
    })
    .returning();

  if (!membership) {
    throw new Error("Kunne ikke opprette medlem");
  }

  return membership;
}

async function seedMatches(
  client: DatabaseExecutor,
  stageId: string,
  editionId: string,
  entries: EntryDirectory,
) {
  const now = new Date();
  const matchesSeeded: SeededMatch[] = [];

  for (const plan of MATCH_PLAN) {
    const home = entries.get(plan.homeSlug);
    const away = entries.get(plan.awaySlug);

    if (!home || !away) {
      throw new Error(
        `Mangler deltaker for ${plan.homeSlug} eller ${plan.awaySlug}`,
      );
    }

    await client.delete(matches).where(eq(matches.code, plan.code));

    const [match] = await client
      .insert(matches)
      .values({
        editionId,
        stageId,
        homeEntryId: home.entry.id,
        awayEntryId: away.entry.id,
        code: plan.code,
        kickoffAt: addMinutes(now, plan.kickoffOffset),
        status: plan.status as SeededMatch["status"],
        homeScore: plan.homeScore,
        awayScore: plan.awayScore,
      })
      .returning();

    if (!match) {
      throw new Error(`Kunne ikke opprette kamp ${plan.code}`);
    }

    matchesSeeded.push(match);
  }

  return matchesSeeded;
}

async function seedMatchEvents(
  client: DatabaseExecutor,
  matchesSeeded: SeededMatch[],
  players: PlayerDirectory,
) {
  const matchByCode = new Map(
    matchesSeeded.map((match) => [match.code ?? "", match]),
  );
  const matchIds = matchesSeeded.map((match) => match.id);

  if (matchIds.length) {
    await client
      .delete(matchEvents)
      .where(inArray(matchEvents.matchId, matchIds));
  }

  for (const plan of MATCH_EVENTS) {
    const match = matchByCode.get(plan.matchCode);
    const player = players.get(plan.playerKey);

    if (!match || !player) {
      continue;
    }

    await client.insert(matchEvents).values({
      matchId: match.id,
      relatedMemberId: player.squadMemberId,
      teamSide:
        match.homeEntryId === player.entryId
          ? "home"
          : match.awayEntryId === player.entryId
            ? "away"
            : "home",
      eventType: plan.type as InferSelectModel<typeof matchEvents>["eventType"],
      minute: plan.minute,
    });
  }
}

async function seedHighlight(client: DatabaseExecutor, editionId: string) {
  await client
    .delete(scoreboardHighlights)
    .where(eq(scoreboardHighlights.editionId, editionId));

  await client.insert(scoreboardHighlights).values({
    editionId,
    message: "Finaleavgjørelse pågår – følg med på storskjermen!",
    durationSeconds: 120,
    expiresAt: addMinutes(new Date(), 15),
  });
}

async function seedUsers(
  client: DatabaseExecutor,
  competition: SeededCompetition,
  teamsSeeded: SeededTeam[],
) {
  const passwordHash = await hashPassword(SEED_USER_PASSWORD);
  const teamBySlug = new Map(teamsSeeded.map((team) => [team.slug, team]));

  for (const userDefinition of DEMO_USERS) {
    const [created] = await client
      .insert(users)
      .values({
        email: userDefinition.email,
        fullName: userDefinition.fullName,
        hashedPassword: passwordHash,
        locale: "nb-NO",
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          fullName: userDefinition.fullName,
          hashedPassword: passwordHash,
          updatedAt: new Date(),
        },
      })
      .returning();

    const user =
      created ??
      (await client.query.users.findFirst({
        where: (table, { eq: equals }) =>
          equals(table.email, userDefinition.email),
      }));

    if (!user) {
      throw new Error(`Kunne ikke opprette bruker ${userDefinition.email}`);
    }

    // Create/update account entry for better-auth credential provider
    // Delete existing accounts for this user first (no unique constraint on provider_id, account_id)
    await client.delete(accounts).where(eq(accounts.userId, user.id));
    await client.insert(accounts).values({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: passwordHash,
    });

    await client.delete(userRoles).where(eq(userRoles.userId, user.id));
    await client.insert(userRoles).values({
      userId: user.id,
      role: userDefinition.role,
      scopeType: userDefinition.scopeType,
      scopeId: resolveScopeId(userDefinition, competition, teamBySlug),
    });
  }
}

function resolveScopeId(
  userDefinition: (typeof DEMO_USERS)[number],
  competition: SeededCompetition,
  teamBySlug: Map<string, SeededTeam>,
) {
  if (userDefinition.scopeType === "global") {
    return null;
  }

  if (userDefinition.scopeType === "competition") {
    return competition.id;
  }

  if (userDefinition.scopeType === "team" && userDefinition.scopeSlug) {
    const team = teamBySlug.get(userDefinition.scopeSlug);
    if (!team) {
      throw new Error(`Fant ikke lag for ${userDefinition.scopeSlug}`);
    }
    return team.id;
  }

  return null;
}

void main();
