import type { components } from "@/lib/api/generated/openapi";

export type ScoreboardSection =
  components["schemas"]["ScoreboardPayload"]["rotation"][number];

export type ScoreboardTheme = {
  primaryColor: string;
  secondaryColor: string;
  backgroundImageUrl: string | null;
};

export type ScoreboardEdition = {
  id: string;
  competitionId: string;
  competitionSlug: string;
  competitionName: string;
  label: string;
  slug: string;
  status: components["schemas"]["Edition"]["status"];
  format: components["schemas"]["Edition"]["format"];
  timezone: string;
  publishedAt: Date | null;
  registrationWindow: {
    opensAt: Date | null;
    closesAt: Date | null;
  };
  scoreboardRotationSeconds: number;
  scoreboardModules?: ScoreboardSection[];
  scoreboardTheme: ScoreboardTheme;
};

export type ScoreboardMatchSide = {
  entryId: string | null;
  name: string;
  score: number;
};

export type ScoreboardMatch = {
  id: string;
  status: components["schemas"]["MatchStatus"];
  kickoffAt: Date;
  code?: string | null;
  groupCode?: string | null;
  home: ScoreboardMatchSide;
  away: ScoreboardMatchSide;
  highlight?: string | null;
  venueName?: string | null;
};

export type ScoreboardStanding = {
  entryId: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  fairPlayScore: number | null;
};

export type ScoreboardTopScorer = {
  personId: string;
  entryId: string;
  name: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

export type ScoreboardGroupTable = {
  groupId: string;
  groupCode: string;
  groupName: string | null;
  standings: ScoreboardStanding[];
};

export type ScoreboardData = {
  edition: ScoreboardEdition;
  matches: ScoreboardMatch[];
  standings: ScoreboardStanding[];
  tables: ScoreboardGroupTable[];
  topScorers: ScoreboardTopScorer[];
  rotation: ScoreboardSection[];
  overlayMessage: string | null;
  entries: Array<{ id: string; name: string }>;
};

export const DEFAULT_ROTATION: ScoreboardSection[] = [
  "live_matches",
  "upcoming",
  "standings",
  "top_scorers",
];

export function buildEditionSlug(
  competitionSlug: string | null | undefined,
  editionSlug: string,
): string {
  if (competitionSlug && competitionSlug.trim().length > 0) {
    return `${competitionSlug}/${editionSlug}`;
  }

  return editionSlug;
}

export function encodeEditionSlugParam(
  competitionSlug: string | null | undefined,
  editionSlug: string,
): string {
  return encodeURIComponent(buildEditionSlug(competitionSlug, editionSlug));
}

export function parseCompositeEditionSlug(value: string): {
  competitionSlug: string | null;
  editionSlug: string;
} {
  const decoded = safeDecodeURIComponent(value);
  const [first, ...rest] = decoded.split("/");

  if (rest.length === 0) {
    return {
      competitionSlug: null,
      editionSlug: first ?? "",
    };
  }

  return {
    competitionSlug: first || null,
    editionSlug: rest.join("/") || "",
  };
}

export function toApiScoreboardPayload(
  data: ScoreboardData,
): components["schemas"]["ScoreboardPayload"] {
  return {
    edition: {
      id: data.edition.id,
      competition_id: data.edition.competitionId,
      competition_slug: data.edition.competitionSlug,
      competition_name: data.edition.competitionName,
      label: data.edition.label,
      slug: data.edition.slug,
      status: data.edition.status,
      format: data.edition.format,
      registration_window: {
        opens_at:
          data.edition.registrationWindow.opensAt?.toISOString() ?? null,
        closes_at:
          data.edition.registrationWindow.closesAt?.toISOString() ?? null,
      },
      scoreboard_rotation_seconds: data.edition.scoreboardRotationSeconds,
      scoreboard_modules: data.edition.scoreboardModules,
      scoreboard_theme: {
        primary_color: data.edition.scoreboardTheme.primaryColor,
        secondary_color: data.edition.scoreboardTheme.secondaryColor,
        background_image_url: data.edition.scoreboardTheme.backgroundImageUrl,
      },
      published_at: data.edition.publishedAt?.toISOString() ?? null,
    } as components["schemas"]["Edition"],
    matches: data.matches.map((match) => ({
      id: match.id,
      status: match.status,
      kickoff_at: match.kickoffAt.toISOString(),
      code: match.code ?? null,
      group_code: match.groupCode ?? null,
      home: {
        entry_id: match.home.entryId,
        name: match.home.name,
        score: match.home.score,
      },
      away: {
        entry_id: match.away.entryId,
        name: match.away.name,
        score: match.away.score,
      },
      highlight: match.highlight ?? data.overlayMessage ?? null,
      venue_name: match.venueName ?? null,
    })),
    standings: data.standings.map((standing) => ({
      entry_id: standing.entryId,
      position: standing.position,
      played: standing.played,
      won: standing.won,
      drawn: standing.drawn,
      lost: standing.lost,
      goals_for: standing.goalsFor,
      goals_against: standing.goalsAgainst,
      goal_difference: standing.goalDifference,
      points: standing.points,
      fair_play_score: standing.fairPlayScore,
    })),
    tables: data.tables.map((table) => ({
      group_id: table.groupId,
      group_code: table.groupCode,
      group_name: table.groupName,
      standings: table.standings.map((standing) => ({
        entry_id: standing.entryId,
        position: standing.position,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goals_for: standing.goalsFor,
        goals_against: standing.goalsAgainst,
        goal_difference: standing.goalDifference,
        points: standing.points,
        fair_play_score: standing.fairPlayScore,
      })),
    })),
    top_scorers: data.topScorers.map((scorer) => ({
      person_id: scorer.personId,
      entry_id: scorer.entryId,
      name: scorer.name,
      goals: scorer.goals,
      assists: scorer.assists,
      yellow_cards: scorer.yellowCards,
      red_cards: scorer.redCards,
    })),
    rotation: data.rotation,
    // entries are server-only metadata and are intentionally omitted from the API payload
  };
}

export function fromApiScoreboardPayload(
  payload: components["schemas"]["ScoreboardPayload"],
): ScoreboardData {
  const overlayMessage =
    payload.matches.find(
      (match) => match.highlight && match.highlight.length > 0,
    )?.highlight ?? null;

  return {
    edition: {
      id: payload.edition.id,
      competitionId: payload.edition.competition_id,
      competitionSlug: payload.edition.competition_slug ?? "",
      competitionName: payload.edition.competition_name ?? "",
      label: payload.edition.label,
      slug: payload.edition.slug,
      status: payload.edition.status,
      format: payload.edition.format ?? "round_robin",
      timezone: "Europe/Oslo",
      publishedAt: payload.edition.published_at
        ? new Date(payload.edition.published_at)
        : null,
      registrationWindow: {
        opensAt: payload.edition.registration_window?.opens_at
          ? new Date(payload.edition.registration_window.opens_at)
          : null,
        closesAt: payload.edition.registration_window?.closes_at
          ? new Date(payload.edition.registration_window.closes_at)
          : null,
      },
      scoreboardRotationSeconds:
        payload.edition.scoreboard_rotation_seconds ?? 5,
      scoreboardModules: payload.edition.scoreboard_modules,
      scoreboardTheme: {
        primaryColor:
          payload.edition.scoreboard_theme?.primary_color ?? "#0B1F3A",
        secondaryColor:
          payload.edition.scoreboard_theme?.secondary_color ?? "#FFFFFF",
        backgroundImageUrl:
          payload.edition.scoreboard_theme?.background_image_url ?? null,
      },
    },
    matches: payload.matches.map((match) => ({
      id: match.id,
      status: match.status,
      kickoffAt: new Date(match.kickoff_at),
      code: match.code ?? null,
      groupCode: match.group_code ?? null,
      home: {
        entryId: match.home.entry_id ?? null,
        name: match.home.name,
        score: match.home.score,
      },
      away: {
        entryId: match.away.entry_id ?? null,
        name: match.away.name,
        score: match.away.score,
      },
      highlight: match.highlight ?? null,
      venueName: match.venue_name ?? null,
    })),
    standings: payload.standings.map((standing, index) => ({
      entryId: standing.entry_id,
      position: standing.position ?? index + 1,
      played: standing.played,
      won: standing.won,
      drawn: standing.drawn,
      lost: standing.lost,
      goalsFor: standing.goals_for,
      goalsAgainst: standing.goals_against,
      goalDifference:
        standing.goal_difference ?? standing.goals_for - standing.goals_against,
      points: standing.points,
      fairPlayScore: standing.fair_play_score ?? null,
    })),
    topScorers: payload.top_scorers.map((scorer) => ({
      personId: scorer.person_id,
      entryId: scorer.entry_id,
      name: scorer.name ?? "",
      goals: scorer.goals,
      assists: scorer.assists ?? 0,
      yellowCards: scorer.yellow_cards ?? 0,
      redCards: scorer.red_cards ?? 0,
    })),
    tables:
      payload.tables?.map((table) => ({
        groupId: table.group_id,
        groupCode: table.group_code,
        groupName: table.group_name ?? null,
        standings: table.standings.map((standing, index) => ({
          entryId: standing.entry_id,
          position: standing.position ?? index + 1,
          played: standing.played,
          won: standing.won,
          drawn: standing.drawn,
          lost: standing.lost,
          goalsFor: standing.goals_for,
          goalsAgainst: standing.goals_against,
          goalDifference:
            standing.goal_difference ??
            standing.goals_for - standing.goals_against,
          points: standing.points,
          fairPlayScore: standing.fair_play_score ?? null,
        })),
      })) ?? [],
    rotation: payload.rotation.length ? payload.rotation : DEFAULT_ROTATION,
    overlayMessage,
    entries: [],
  };
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
