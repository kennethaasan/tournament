import type {
  ScoreboardData,
  ScoreboardMatch,
  SeasonTheme,
  ThemeSource,
} from "./scoreboard-ui-types";

export function isLiveMatch(status: ScoreboardMatch["status"]): boolean {
  return status === "in_progress" || status === "disputed";
}

export function statusLabel(status: ScoreboardMatch["status"]): string {
  switch (status) {
    case "in_progress":
      return "Live";
    case "disputed":
      return "Tvist";
    case "finalized":
      return "Ferdig";
    default:
      return "Planlagt";
  }
}

export function formatMatchScore(match: ScoreboardMatch): string {
  const homeExtraTime = match.home.extraTime ?? 0;
  const awayExtraTime = match.away.extraTime ?? 0;
  const homePenalties = match.home.penalties ?? 0;
  const awayPenalties = match.away.penalties ?? 0;
  const hasPenalties =
    match.home.penalties != null || match.away.penalties != null;
  const hasExtraTime =
    match.home.extraTime != null || match.away.extraTime != null;

  const homeTotal = match.home.score + homeExtraTime;
  const awayTotal = match.away.score + awayExtraTime;

  if (
    match.status === "scheduled" &&
    match.home.score === 0 &&
    match.away.score === 0 &&
    homeExtraTime === 0 &&
    awayExtraTime === 0 &&
    homePenalties === 0 &&
    awayPenalties === 0
  ) {
    return "";
  }

  const markers: string[] = [];
  if (hasExtraTime) {
    markers.push("EEO");
  } else if (hasPenalties) {
    markers.push("ESP");
  }

  const markerLabel = markers.length > 0 ? ` (${markers.join(", ")})` : "";
  const penaltyLabel = hasPenalties
    ? ` ${homePenalties}–${awayPenalties} str.`
    : "";

  return `${homeTotal} – ${awayTotal}${markerLabel}${penaltyLabel}`;
}

export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
  }).format(date);
}

export function formatKickoff(date: Date): string {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatKickoffTime(date: Date): string {
  return new Intl.DateTimeFormat("nb-NO", {
    timeStyle: "short",
  }).format(date);
}

export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

/**
 * Compare venue names for sorting, extracting numeric suffixes.
 * E.g., "Bane 1" < "Bane 2" < "Bane 10"
 */
function compareVenues(a: string | null, b: string | null): number {
  const venueA = a ?? "";
  const venueB = b ?? "";

  // Extract the numeric suffix if present
  const numMatchA = venueA.match(/(\d+)\s*$/);
  const numMatchB = venueB.match(/(\d+)\s*$/);

  if (numMatchA && numMatchB) {
    const prefixA = venueA.slice(0, numMatchA.index).trim();
    const prefixB = venueB.slice(0, numMatchB.index).trim();

    // If prefixes are the same, compare numerically
    if (prefixA === prefixB) {
      return (
        Number.parseInt(numMatchA[1] ?? "0", 10) -
        Number.parseInt(numMatchB[1] ?? "0", 10)
      );
    }
  }

  return venueA.localeCompare(venueB);
}

/**
 * Default match sorting: time -> venue (numerically) -> group code
 */
export function compareMatchesDefault(
  a: ScoreboardMatch,
  b: ScoreboardMatch,
): number {
  // Primary: kickoff time
  const timeDiff = a.kickoffAt.getTime() - b.kickoffAt.getTime();
  if (timeDiff !== 0) {
    return timeDiff;
  }

  // Secondary: venue (with numeric sorting for "Bane 1", "Bane 2", etc.)
  const venueDiff = compareVenues(a.venueName ?? null, b.venueName ?? null);
  if (venueDiff !== 0) {
    return venueDiff;
  }

  // Tertiary: group code
  return (a.groupCode ?? "").localeCompare(b.groupCode ?? "");
}

export function formatCountdown(targetDate: Date): string {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Starter nå";
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `Om ${diffDays}d ${diffHours % 24}t`;
  }
  if (diffHours > 0) {
    return `Om ${diffHours}t ${diffMins % 60}m`;
  }
  if (diffMins > 0) {
    return `Om ${diffMins} min`;
  }
  return "Om < 1 min";
}

export function deriveScheduleSummary(
  matches: ScoreboardMatch[],
): string | null {
  const dates = matches
    .map((match) => match.kickoffAt)
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  if (dates.length === 0) {
    return null;
  }

  const start = dates[0];
  const end = dates[dates.length - 1];
  if (!start || !end) {
    return null;
  }
  const startKey = toLocalDateKey(start);
  const endKey = toLocalDateKey(end);

  if (startKey === endKey) {
    return formatDateOnly(start);
  }

  return `${formatDateOnly(start)} - ${formatDateOnly(end)}`;
}

export function deriveVenueSummary(matches: ScoreboardMatch[]): string | null {
  const seen = new Set<string>();
  const venues: string[] = [];

  for (const match of matches) {
    const name = match.venueName?.trim() ?? "";
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    venues.push(name);
  }

  if (venues.length === 0) {
    return null;
  }

  // Sort venues naturally (handles "Bane 1", "Bane 2", "Bane 10" correctly)
  venues.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (venues.length === 1) {
    return venues[0] ?? null;
  }
  if (venues.length === 2) {
    return `${venues[0]} og ${venues[1]}`;
  }
  return `${venues[0]} + ${venues.length - 1}`;
}

export function deriveOverlayMessage(data: ScoreboardData): string {
  return (
    data.overlayMessage ??
    data.matches.find((match) => match.highlight)?.highlight ??
    ""
  );
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function deriveSeasonTheme(date: Date): Exclude<SeasonTheme, "auto"> {
  const month = date.getMonth();
  if (month === 11) {
    return "christmas";
  }
  if (month === 10 || month === 0 || month === 1) {
    return "winter";
  }
  if (month >= 2 && month <= 4) {
    return "spring";
  }
  if (month >= 5 && month <= 7) {
    return "summer";
  }
  return "fall";
}

export function parseSeasonTheme(value: string | null): SeasonTheme | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "jul" || normalized === "xmas") {
    return "christmas";
  }
  if (
    normalized === "auto" ||
    normalized === "christmas" ||
    normalized === "winter" ||
    normalized === "spring" ||
    normalized === "summer" ||
    normalized === "fall"
  ) {
    return normalized as SeasonTheme;
  }
  return null;
}

export function parseThemeSource(value: string | null): ThemeSource | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "competition" || normalized === "season") {
    return normalized as ThemeSource;
  }
  return null;
}

export function seasonGradient(theme: Exclude<SeasonTheme, "auto">): string {
  switch (theme) {
    case "christmas":
      return "linear-gradient(150deg, rgba(58,11,11,0.92) 0%, rgba(141,26,26,0.85) 45%, rgba(21,48,34,0.9) 100%)";
    case "winter":
      return "linear-gradient(150deg, rgba(7,22,43,0.92) 0%, rgba(18,53,84,0.84) 50%, rgba(20,42,74,0.9) 100%)";
    case "spring":
      return "linear-gradient(135deg, rgba(35,98,82,0.85) 0%, rgba(104,185,143,0.75) 48%, rgba(203,229,175,0.8) 100%)";
    case "summer":
      return "linear-gradient(135deg, rgba(20,71,120,0.78) 0%, rgba(62,158,189,0.72) 45%, rgba(255,209,120,0.7) 100%)";
    case "fall":
      return "linear-gradient(140deg, rgba(70,34,12,0.88) 0%, rgba(161,84,34,0.8) 45%, rgba(219,149,72,0.75) 100%)";
    default:
      return "linear-gradient(135deg, rgba(9,25,45,0.7) 0%, rgba(15,52,84,0.7) 100%)";
  }
}

export function generateTeamColor(name: string): string {
  // Generate a consistent color based on team name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

export function computeMatchStats(matches: ScoreboardMatch[]): {
  totalMatches: number;
  totalGoals: number;
  completedMatches: number;
  liveMatches: number;
} {
  let totalGoals = 0;
  let completedMatches = 0;
  let liveMatches = 0;

  for (const match of matches) {
    if (match.status === "finalized") {
      completedMatches++;
      totalGoals +=
        match.home.score +
        match.away.score +
        (match.home.extraTime ?? 0) +
        (match.away.extraTime ?? 0);
    } else if (isLiveMatch(match.status)) {
      liveMatches++;
      totalGoals +=
        match.home.score +
        match.away.score +
        (match.home.extraTime ?? 0) +
        (match.away.extraTime ?? 0);
    }
  }

  return {
    totalMatches: matches.length,
    totalGoals,
    completedMatches,
    liveMatches,
  };
}
