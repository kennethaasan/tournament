import { and, asc, desc, eq, gt } from "drizzle-orm";
import { createProblem } from "@/lib/errors/problem";
import { db } from "@/server/db/client";
import {
  competitions,
  editionSettings,
  editions,
  entries as entriesTable,
  matchEvents,
  matches as matchesTable,
  persons,
  scoreboardHighlights,
  squadMembers,
  squads,
  teams,
} from "@/server/db/schema";
import type {
  ScoreboardData,
  ScoreboardMatch,
  ScoreboardMatchSide,
  ScoreboardStanding,
  ScoreboardTopScorer,
} from "./scoreboard-types";
import {
  DEFAULT_ROTATION,
  parseCompositeEditionSlug,
  type ScoreboardEdition,
} from "./scoreboard-types";

const DEFAULT_THEME = {
  primary_color: "#0B1F3A",
  secondary_color: "#FFFFFF",
  background_image_url: null as string | null,
};

const MATCH_STATUS_ORDER: Record<string, number> = {
  in_progress: 0,
  disputed: 1,
  scheduled: 2,
  finalized: 3,
};

const STANDING_STATUSES = new Set(["finalized", "disputed"]);

const TOP_SCORER_EVENTS = new Set([
  "goal",
  "penalty_goal",
  "assist",
  "yellow_card",
  "red_card",
]);

export type ScoreboardSelector =
  | { competitionSlug?: string | null; editionSlug: string }
  | { compositeSlug: string };

type EditionSelector = {
  competitionSlug: string | null;
  editionSlug: string;
};

type EditionRow = {
  id: string;
  label: string;
  slug: string;
  status: string;
  format: string;
  timezone: string;
  competitionId: string;
  competitionSlug: string;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  rotationSeconds: number;
  scoreboardTheme: ThemeRecord;
  publishedAt: Date | null;
};

type ThemeRecord = {
  primary_color: string;
  secondary_color: string;
  background_image_url: string | null;
};

type EntryRow = {
  id: string;
  name: string;
};

type MatchRow = {
  id: string;
  status: string;
  kickoffAt: Date | null;
  createdAt: Date;
  homeEntryId: string | null;
  awayEntryId: string | null;
  homeScore: number;
  awayScore: number;
};

type ScorerEventRow = {
  eventType: string;
  personId: string | null;
  entryId: string | null;
  firstName: string | null;
  lastName: string | null;
};

type ScoreboardDependencies = {
  findEdition: (selector: EditionSelector) => Promise<EditionRow | null>;
  listEntries: (editionId: string) => Promise<EntryRow[]>;
  listMatches: (editionId: string) => Promise<MatchRow[]>;
  listScorerEvents: (editionId: string) => Promise<ScorerEventRow[]>;
  findActiveHighlight: (editionId: string, now: Date) => Promise<string | null>;
  now: () => Date;
};

const scoreboardDependencies: ScoreboardDependencies = {
  findEdition: (selector) => findEditionFromDatabase(selector),
  listEntries: (editionId) => listEntriesFromDatabase(editionId),
  listMatches: (editionId) => listMatchesFromDatabase(editionId),
  listScorerEvents: (editionId) => listScorerEventsFromDatabase(editionId),
  findActiveHighlight: (editionId, now) => fetchActiveHighlight(editionId, now),
  now: () => new Date(),
};

export async function getPublicScoreboard(
  selector: ScoreboardSelector,
  overrides: Partial<ScoreboardDependencies> = {},
): Promise<ScoreboardData> {
  const deps = { ...scoreboardDependencies, ...overrides };
  const normalizedSelector = normalizeSelector(selector);

  if (!normalizedSelector.editionSlug) {
    throw createProblem({
      type: "https://tournament.app/problems/scoreboard/invalid-slug",
      title: "Invalid slug",
      status: 400,
      detail: "The edition slug must be provided.",
    });
  }

  const editionRow = await deps.findEdition(normalizedSelector);

  if (!editionRow) {
    throw createProblem({
      type: "https://tournament.app/problems/scoreboard/edition-not-found",
      title: "Edition not found",
      status: 404,
      detail: "Check the scoreboard URL and try again.",
    });
  }

  const [entries, matches, scorerEvents, highlight] = await Promise.all([
    deps.listEntries(editionRow.id),
    deps.listMatches(editionRow.id),
    deps.listScorerEvents(editionRow.id),
    deps.findActiveHighlight(editionRow.id, deps.now()),
  ]);

  const entryMap = new Map(entries.map((entry) => [entry.id, entry]));

  const scoreboardMatches = buildMatches(matches, entryMap, highlight);
  const standings = buildStandings(matches, entryMap);
  const topScorers = buildTopScorers(scorerEvents, entryMap);
  const rotation = selectRotation(scoreboardMatches, standings, topScorers);
  const entryList = Array.from(entryMap.values()).map((entry) => ({
    id: entry.id,
    name: entry.name,
  }));

  return {
    edition: mapEditionRowToDto(editionRow),
    matches: scoreboardMatches,
    standings,
    topScorers,
    rotation,
    overlayMessage: highlight,
    entries: entryList,
  };
}

function normalizeSelector(selector: ScoreboardSelector): EditionSelector {
  if ("compositeSlug" in selector) {
    return parseCompositeEditionSlug(selector.compositeSlug);
  }

  return {
    competitionSlug: selector.competitionSlug ?? null,
    editionSlug: selector.editionSlug,
  };
}

async function findEditionFromDatabase(
  selector: EditionSelector,
): Promise<EditionRow | null> {
  const query = db
    .select({
      id: editions.id,
      label: editions.label,
      slug: editions.slug,
      status: editions.status,
      format: editions.format,
      timezone: editions.timezone,
      competitionId: editions.competitionId,
      competitionSlug: competitions.slug,
      registrationOpensAt: editions.registrationOpensAt,
      registrationClosesAt: editions.registrationClosesAt,
      rotationSeconds: editionSettings.scoreboardRotationSeconds,
      scoreboardTheme: editionSettings.scoreboardTheme,
      publishedAt: editions.updatedAt,
    })
    .from(editions)
    .innerJoin(competitions, eq(competitions.id, editions.competitionId))
    .leftJoin(editionSettings, eq(editionSettings.editionId, editions.id));

  const rows = selector.competitionSlug
    ? await query
        .where(
          and(
            eq(competitions.slug, selector.competitionSlug),
            eq(editions.slug, selector.editionSlug),
          ),
        )
        .limit(1)
    : await query.where(eq(editions.slug, selector.editionSlug)).limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const rotationSeconds = normalizeRotationSeconds(row.rotationSeconds);
  const theme = normalizeThemeRecord(row.scoreboardTheme);

  return {
    id: row.id,
    label: row.label,
    slug: row.slug,
    status: row.status,
    format: row.format,
    timezone: row.timezone,
    competitionId: row.competitionId,
    competitionSlug: row.competitionSlug,
    registrationOpensAt: row.registrationOpensAt,
    registrationClosesAt: row.registrationClosesAt,
    rotationSeconds,
    scoreboardTheme: theme,
    publishedAt: row.publishedAt,
  };
}

async function listEntriesFromDatabase(editionId: string) {
  return db
    .select({
      id: entriesTable.id,
      name: teams.name,
    })
    .from(entriesTable)
    .innerJoin(teams, eq(entriesTable.teamId, teams.id))
    .where(eq(entriesTable.editionId, editionId));
}

async function listMatchesFromDatabase(editionId: string) {
  return db
    .select({
      id: matchesTable.id,
      status: matchesTable.status,
      kickoffAt: matchesTable.kickoffAt,
      createdAt: matchesTable.createdAt,
      homeEntryId: matchesTable.homeEntryId,
      awayEntryId: matchesTable.awayEntryId,
      homeScore: matchesTable.homeScore,
      awayScore: matchesTable.awayScore,
    })
    .from(matchesTable)
    .where(eq(matchesTable.editionId, editionId))
    .orderBy(asc(matchesTable.kickoffAt), asc(matchesTable.createdAt));
}

async function listScorerEventsFromDatabase(editionId: string) {
  return db
    .select({
      eventType: matchEvents.eventType,
      personId: persons.id,
      entryId: squads.entryId,
      firstName: persons.firstName,
      lastName: persons.lastName,
    })
    .from(matchEvents)
    .innerJoin(matchesTable, eq(matchesTable.id, matchEvents.matchId))
    .innerJoin(squadMembers, eq(squadMembers.id, matchEvents.relatedMemberId))
    .innerJoin(squads, eq(squads.id, squadMembers.squadId))
    .innerJoin(persons, eq(persons.id, squadMembers.personId))
    .where(eq(matchesTable.editionId, editionId));
}

async function fetchActiveHighlight(editionId: string, now: Date) {
  const [highlight] = await db
    .select({ message: scoreboardHighlights.message })
    .from(scoreboardHighlights)
    .where(
      and(
        eq(scoreboardHighlights.editionId, editionId),
        gt(scoreboardHighlights.expiresAt, now),
      ),
    )
    .orderBy(desc(scoreboardHighlights.expiresAt))
    .limit(1);

  return highlight?.message ?? null;
}

function buildMatches(
  rows: MatchRow[],
  entryMap: Map<string, EntryRow>,
  highlight: string | null,
): ScoreboardMatch[] {
  const matches: ScoreboardMatch[] = [];

  for (const row of rows) {
    if (!row.homeEntryId || !row.awayEntryId) {
      continue;
    }

    const kickoffAt = row.kickoffAt ?? row.createdAt;
    const home = buildMatchSide(row.homeEntryId, entryMap);
    const away = buildMatchSide(row.awayEntryId, entryMap);

    if (!home || !away) {
      continue;
    }

    matches.push({
      id: row.id,
      status: row.status as ScoreboardMatch["status"],
      kickoffAt,
      home: {
        ...home,
        score: row.homeScore ?? 0,
      },
      away: {
        ...away,
        score: row.awayScore ?? 0,
      },
      highlight,
    });
  }

  return matches.sort((left, right) => {
    const leftOrder = MATCH_STATUS_ORDER[left.status] ?? 99;
    const rightOrder = MATCH_STATUS_ORDER[right.status] ?? 99;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.kickoffAt.getTime() - right.kickoffAt.getTime();
  });
}

function buildMatchSide(
  entryId: string,
  entryMap: Map<string, EntryRow>,
): ScoreboardMatchSide | null {
  const entry = entryMap.get(entryId);
  if (!entry) {
    return null;
  }

  return {
    entryId: entry.id,
    name: entry.name,
    score: 0,
  };
}

function buildStandings(
  matches: MatchRow[],
  entryMap: Map<string, EntryRow>,
): ScoreboardStanding[] {
  const stats = new Map<string, ScoreboardStanding>();

  for (const entry of entryMap.values()) {
    stats.set(entry.id, {
      entryId: entry.id,
      position: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      fairPlayScore: null,
    });
  }

  for (const match of matches) {
    if (
      !match.homeEntryId ||
      !match.awayEntryId ||
      !STANDING_STATUSES.has(match.status)
    ) {
      continue;
    }

    const home = stats.get(match.homeEntryId);
    const away = stats.get(match.awayEntryId);
    if (!home || !away) {
      continue;
    }

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const standings = Array.from(stats.values())
    .map((row) => ({
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst,
    }))
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      if (right.goalDifference !== left.goalDifference) {
        return right.goalDifference - left.goalDifference;
      }

      if (right.goalsFor !== left.goalsFor) {
        return right.goalsFor - left.goalsFor;
      }

      return left.entryId.localeCompare(right.entryId);
    });

  return standings.map((standing, index) => ({
    ...standing,
    position: index + 1,
  }));
}

function buildTopScorers(
  events: ScorerEventRow[],
  entryMap: Map<string, EntryRow>,
): ScoreboardTopScorer[] {
  const scorers = new Map<string, ScoreboardTopScorer>();

  for (const event of events) {
    if (!event.entryId || !event.personId) {
      continue;
    }

    if (!TOP_SCORER_EVENTS.has(event.eventType)) {
      continue;
    }

    const key = `${event.entryId}:${event.personId}`;
    const name = buildPersonName(event.firstName, event.lastName);

    let scorer = scorers.get(key);

    if (!scorer) {
      scorer = {
        personId: event.personId,
        entryId: event.entryId,
        name,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      } satisfies ScoreboardTopScorer;
      scorers.set(key, scorer);
    }

    switch (event.eventType) {
      case "goal":
      case "penalty_goal":
        scorer.goals += 1;
        break;
      case "assist":
        scorer.assists += 1;
        break;
      case "yellow_card":
        scorer.yellowCards += 1;
        break;
      case "red_card":
        scorer.redCards += 1;
        break;
      default:
        break;
    }
  }

  return Array.from(scorers.values())
    .sort((left, right) => {
      if (right.goals !== left.goals) {
        return right.goals - left.goals;
      }

      if (right.assists !== left.assists) {
        return right.assists - left.assists;
      }

      return left.name.localeCompare(right.name, "nb");
    })
    .slice(0, 10)
    .map((scorer) => ({
      ...scorer,
      name: scorer.name || entryMap.get(scorer.entryId)?.name || "Ukjent",
    }));
}

function mapEditionRowToDto(row: EditionRow): ScoreboardEdition {
  return {
    id: row.id,
    competitionId: row.competitionId,
    competitionSlug: row.competitionSlug,
    label: row.label,
    slug: row.slug,
    status: row.status as ScoreboardEdition["status"],
    format: row.format as ScoreboardEdition["format"],
    timezone: row.timezone,
    publishedAt: row.publishedAt,
    registrationWindow: {
      opensAt: row.registrationOpensAt,
      closesAt: row.registrationClosesAt,
    },
    scoreboardRotationSeconds: row.rotationSeconds,
    scoreboardTheme: {
      primaryColor: row.scoreboardTheme.primary_color,
      secondaryColor: row.scoreboardTheme.secondary_color,
      backgroundImageUrl: row.scoreboardTheme.background_image_url,
    },
  };
}

function normalizeThemeRecord(input: unknown): ThemeRecord {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_THEME };
  }

  const record = input as Record<string, unknown>;
  return {
    primary_color:
      typeof record.primary_color === "string"
        ? record.primary_color
        : DEFAULT_THEME.primary_color,
    secondary_color:
      typeof record.secondary_color === "string"
        ? record.secondary_color
        : DEFAULT_THEME.secondary_color,
    background_image_url:
      typeof record.background_image_url === "string"
        ? record.background_image_url
        : null,
  };
}

function normalizeRotationSeconds(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 5;
  }

  return Math.max(2, Math.floor(value));
}

function buildPersonName(first: string | null, last: string | null) {
  const parts = [first?.trim(), last?.trim()].filter(Boolean);
  return parts.join(" ");
}

function selectRotation(
  matches: ScoreboardMatch[],
  standings: ScoreboardStanding[],
  topScorers: ScoreboardTopScorer[],
) {
  const sections = new Set(DEFAULT_ROTATION);

  if (!matches.some((match) => match.status === "in_progress")) {
    sections.delete("live_matches");
  }

  if (!matches.some((match) => match.status === "scheduled")) {
    sections.delete("upcoming");
  }

  if (!standings.length) {
    sections.delete("standings");
  }

  if (!topScorers.length) {
    sections.delete("top_scorers");
  }

  if (!sections.size) {
    return DEFAULT_ROTATION;
  }

  return Array.from(sections);
}
