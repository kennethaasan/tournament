import type { EntryReview } from "@/lib/api/entries-client";
import type { TeamMember, TeamRoster } from "@/lib/api/teams-client";
import type { Venue } from "@/lib/api/venues-client";
import type {
  Match,
  MatchEventDraft,
  MatchIndex,
  MatchStatus,
  OptionalScoreInputs,
  OptionalScores,
  ResultsFilters,
  RosterOption,
} from "./results-types";

export function statusLabel(status: MatchStatus) {
  if (status === "scheduled") return "Planlagt";
  if (status === "in_progress") return "Pågår";
  if (status === "finalized") return "Fullført";
  if (status === "disputed") return "Tvist";
  return status;
}

export function formatAdminMatchScore(match: Match) {
  const home = match.home_score;
  const away = match.away_score;
  if (!home || !away) return "–";

  const totalHome = (home.regulation ?? 0) + (home.extra_time ?? 0);
  const totalAway = (away.regulation ?? 0) + (away.extra_time ?? 0);

  let label = `${totalHome} – ${totalAway}`;

  if (home.extra_time != null || away.extra_time != null) {
    label += " (e.e.o)";
  }

  if (home.penalties != null || away.penalties != null) {
    label += ` (${home.penalties ?? 0} – ${away.penalties ?? 0} e.str)`;
  }

  return label;
}

export function groupMatches(matches: Match[]) {
  const groups: Map<
    string,
    { key: string; title: string; subtitle: string | null; matches: Match[] }
  > = new Map();

  for (const match of matches) {
    const kickoff = match.kickoff_at ? new Date(match.kickoff_at) : null;
    const dateKey = kickoff
      ? kickoff.toLocaleDateString("no-NB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : "Tidspunkt ikke satt";

    const groupKey = dateKey;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        title: dateKey,
        subtitle: null,
        matches: [],
      });
    }
    groups.get(groupKey)?.matches.push(match);
  }

  return Array.from(groups.values());
}

export function buildMatchIndex(
  match: Match,
  entryMap: Map<string, EntryReview>,
  venueMap: Map<string, Venue>,
): MatchIndex {
  const homeEntry = match.home_entry_id
    ? entryMap.get(match.home_entry_id)
    : null;
  const awayEntry = match.away_entry_id
    ? entryMap.get(match.away_entry_id)
    : null;
  const venue = match.venue_id ? venueMap.get(match.venue_id) : null;

  const homeLabel = homeEntry?.team.name ?? match.home_entry_name ?? "Ukjent";
  const awayLabel = awayEntry?.team.name ?? match.away_entry_name ?? "Ukjent";

  return {
    id: match.id,
    status: match.status,
    kickoffAt: match.kickoff_at ?? null,
    roundLabel: match.round_label ?? null,
    groupCode: match.group_code ?? null,
    venueId: match.venue_id ?? null,
    venueName: venue?.name ?? null,
    homeEntryId: match.home_entry_id ?? null,
    awayEntryId: match.away_entry_id ?? null,
    homeTeamId: homeEntry?.team.id ?? null,
    awayTeamId: awayEntry?.team.id ?? null,
    homeLabel,
    awayLabel,
    matchLabel: match.code ?? match.group_code ?? "Kamp",
    searchable:
      `${homeLabel} ${awayLabel} ${match.code ?? ""} ${match.group_code ?? ""} ${match.round_label ?? ""}`.toLowerCase(),
  };
}

export function doesMatchIndexPassFilters(
  index: MatchIndex,
  filters: ResultsFilters,
) {
  if (filters.status !== "all" && index.status !== filters.status) return false;
  if (filters.roundLabel !== "all" && index.roundLabel !== filters.roundLabel)
    return false;
  if (filters.groupCode !== "all" && index.groupCode !== filters.groupCode)
    return false;
  if (filters.venueId !== "all" && index.venueId !== filters.venueId)
    return false;
  if (
    filters.teamId !== "all" &&
    index.homeTeamId !== filters.teamId &&
    index.awayTeamId !== filters.teamId
  )
    return false;

  if (filters.query.trim()) {
    const q = filters.query.toLowerCase();
    if (!index.searchable.includes(q)) return false;
  }

  return true;
}

export function normalizeMatchStatus(status: MatchStatus): MatchStatus {
  return status;
}

export function deriveOptionalScoreInputs(match: Match): OptionalScoreInputs {
  return {
    homeExtraTime: match.home_score?.extra_time?.toString() ?? "",
    awayExtraTime: match.away_score?.extra_time?.toString() ?? "",
    homePenalties: match.home_score?.penalties?.toString() ?? "",
    awayPenalties: match.away_score?.penalties?.toString() ?? "",
  };
}

export function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseScore(val: string) {
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? 0 : n;
}

export function hasAnyScoreValues(
  h: number,
  a: number,
  opt: OptionalScoreInputs,
) {
  if (h > 0 || a > 0) return true;
  if (
    opt.homeExtraTime ||
    opt.awayExtraTime ||
    opt.homePenalties ||
    opt.awayPenalties
  )
    return true;
  return false;
}

export function resolveOptionalScores(opt: OptionalScoreInputs): {
  values: OptionalScores;
  error: string | null;
} {
  const parse = (s: string) => {
    if (!s.trim()) return null;
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
  };

  return {
    values: {
      homeExtraTime: parse(opt.homeExtraTime),
      awayExtraTime: parse(opt.awayExtraTime),
      homePenalties: parse(opt.homePenalties),
      awayPenalties: parse(opt.awayPenalties),
    },
    error: null,
  };
}

export function createEventDraft(
  overrides?: Partial<MatchEventDraft>,
): MatchEventDraft {
  return {
    id: Math.random().toString(36).substring(2, 9),
    teamSide: "home",
    eventType: "goal",
    minute: "0",
    stoppageTime: "",
    membershipId: "",
    squadMemberId: null,
    ...overrides,
  };
}

export function parseMinute(val: string) {
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

export function buildRosterOptions(
  roster: TeamRoster | null,
  /* biome-ignore lint/suspicious/noExplicitAny: typed schema from openapi is too deep for a simple helper */
  squadMembers: any[] = [],
): RosterOption[] {
  if (!roster) return [];

  const squadMemberMap = new Map(
    squadMembers
      .filter((sm) => sm.membership_id)
      .map((sm) => [sm.membership_id, sm]),
  );

  return roster.members.map((m: TeamMember) => {
    const name = m.person.preferred_name ?? m.person.full_name;
    const sm = squadMemberMap.get(m.membership_id);
    const jerseyNumber = sm?.jersey_number ?? null;

    return {
      value: m.membership_id,
      label: jerseyNumber ? `${name} (#${jerseyNumber})` : name,
      jerseyNumber,
      warning: !jerseyNumber
        ? "Mangler draktnummer for denne utgaven"
        : undefined,
    };
  });
}
