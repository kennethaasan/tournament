import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EntryReview } from "@/lib/api/entries-client";
import type { components } from "@/lib/api/generated/openapi";
import { fetchMatch, matchDetailQueryKey } from "@/lib/api/matches-client";
import {
  ensureEntrySquad,
  entrySquadQueryKey,
  fetchSquadMembers,
  squadMembersQueryKey,
} from "@/lib/api/squads-client";
import {
  addSquadMember,
  fetchTeamRoster,
  teamRosterQueryKey,
} from "@/lib/api/teams-client";
import type { Venue } from "@/lib/api/venues-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/components/alert-dialog";
import { Button } from "@/ui/components/button";
import {
  buildRosterOptions,
  createEventDraft,
  deriveOptionalScoreInputs,
  hasAnyScoreValues,
  normalizeMatchStatus,
  parseMinute,
  parseScore,
  resolveOptionalScores,
  statusLabel,
  toLocalInput,
} from "./results-helpers";
import type {
  Match,
  MatchEventDraft,
  MatchEventInput,
  MatchEventSide,
  MatchEventType,
  MatchStatus,
  OptionalScoreInputs,
  OptionalScores,
} from "./results-types";

type MatchEditorCardProps = {
  match: Match;
  entries: EntryReview[];
  entryMap: Map<string, EntryReview>;
  venues: Venue[];
  isSaving: boolean;
  isDeleting: boolean;
  onSave: (
    payload: components["schemas"]["UpdateMatchRequest"],
  ) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onClose?: () => void;
};

export function MatchEditorCard({
  match,
  entries,
  entryMap,
  venues,
  isSaving,
  isDeleting,
  onSave,
  onDelete,
  onClose,
}: MatchEditorCardProps) {
  const lastMatchIdRef = useRef<string | null>(null);
  const [homeScore, setHomeScore] = useState(match.home_score?.regulation ?? 0);
  const [awayScore, setAwayScore] = useState(match.away_score?.regulation ?? 0);
  const [status, setStatus] = useState<MatchStatus>(
    normalizeMatchStatus(match.status),
  );
  const [optionalScoreInputs, setOptionalScoreInputs] =
    useState<OptionalScoreInputs>(() => deriveOptionalScoreInputs(match));
  const [kickoffAt, setKickoffAt] = useState(
    match.kickoff_at ? toLocalInput(match.kickoff_at) : "",
  );
  const [venueId, setVenueId] = useState(match.venue_id ?? "");
  const [code, setCode] = useState(match.code ?? "");
  const [homeEntryId, setHomeEntryId] = useState(match.home_entry_id ?? "");
  const [awayEntryId, setAwayEntryId] = useState(match.away_entry_id ?? "");
  const [homePlaceholder, setHomePlaceholder] = useState(
    match.home_entry_id ? "" : (match.home_entry_name ?? ""),
  );
  const [awayPlaceholder, setAwayPlaceholder] = useState(
    match.away_entry_id ? "" : (match.away_entry_name ?? ""),
  );
  const [homePlaceholderTouched, setHomePlaceholderTouched] = useState(false);
  const [awayPlaceholderTouched, setAwayPlaceholderTouched] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [optionalScoreError, setOptionalScoreError] = useState<string | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventsOpen, _setEventsOpen] = useState(true);
  const [eventRows, setEventRows] = useState<MatchEventDraft[]>([]);
  const [eventsDirty, setEventsDirty] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsSaving, setEventsSaving] = useState(false);
  const [pendingEventFocusId, setPendingEventFocusId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const isSameMatch = lastMatchIdRef.current === match.id;
    lastMatchIdRef.current = match.id;

    setHomeScore(match.home_score?.regulation ?? 0);
    setAwayScore(match.away_score?.regulation ?? 0);
    setStatus(normalizeMatchStatus(match.status));
    setOptionalScoreInputs(deriveOptionalScoreInputs(match));
    setKickoffAt(match.kickoff_at ? toLocalInput(match.kickoff_at) : "");
    setVenueId(match.venue_id ?? "");
    setCode(match.code ?? "");
    setHomeEntryId(match.home_entry_id ?? "");
    setAwayEntryId(match.away_entry_id ?? "");
    setHomePlaceholder(
      match.home_entry_id ? "" : (match.home_entry_name ?? ""),
    );
    setAwayPlaceholder(
      match.away_entry_id ? "" : (match.away_entry_name ?? ""),
    );
    setHomePlaceholderTouched(false);
    setAwayPlaceholderTouched(false);
    setMatchError(null);
    setStatusNotice(null);
    setOptionalScoreError(null);
    if (!isSameMatch) {
      setEventRows([]);
      setEventsDirty(false);
      setEventsError(null);
      setPendingEventFocusId(null);
      setDeleteDialogOpen(false);
    }
  }, [match]);

  const homeEntry = homeEntryId ? entryMap.get(homeEntryId) : null;
  const awayEntry = awayEntryId ? entryMap.get(awayEntryId) : null;
  const homeTeamId = homeEntry?.team.id ?? null;
  const awayTeamId = awayEntry?.team.id ?? null;

  const matchLabel = code.trim() || match.group_code || "Uten kode";
  const homeLabel =
    homeEntry?.team.name ??
    match.home_entry_name ??
    match.home_entry_id ??
    "Ukjent";
  const awayLabel =
    awayEntry?.team.name ??
    match.away_entry_name ??
    match.away_entry_id ??
    "Ukjent";
  const idBase = `match-${match.id}`;

  const matchDetailQuery = useQuery({
    queryKey: matchDetailQueryKey(match.id),
    queryFn: ({ signal }) => fetchMatch(match.id, { signal }),
    enabled: eventsOpen,
  });

  const homeRosterQuery = useQuery({
    queryKey: homeTeamId ? teamRosterQueryKey(homeTeamId) : ["team", "none"],
    queryFn: ({ signal }) =>
      homeTeamId ? fetchTeamRoster(homeTeamId, { signal }) : Promise.reject(),
    enabled: eventsOpen && Boolean(homeTeamId),
  });

  const awayRosterQuery = useQuery({
    queryKey: awayTeamId ? teamRosterQueryKey(awayTeamId) : ["team", "none"],
    queryFn: ({ signal }) =>
      awayTeamId ? fetchTeamRoster(awayTeamId, { signal }) : Promise.reject(),
    enabled: eventsOpen && Boolean(awayTeamId),
  });

  const homeSquadQuery = useQuery({
    queryKey: homeEntryId ? entrySquadQueryKey(homeEntryId) : ["entry", "none"],
    queryFn: ({ signal }) =>
      homeEntryId
        ? ensureEntrySquad(homeEntryId, { signal })
        : Promise.reject(),
    enabled: eventsOpen && Boolean(homeEntryId),
  });

  const awaySquadQuery = useQuery({
    queryKey: awayEntryId ? entrySquadQueryKey(awayEntryId) : ["entry", "none"],
    queryFn: ({ signal }) =>
      awayEntryId
        ? ensureEntrySquad(awayEntryId, { signal })
        : Promise.reject(),
    enabled: eventsOpen && Boolean(awayEntryId),
  });

  const homeSquadId = homeSquadQuery.data?.id ?? null;
  const awaySquadId = awaySquadQuery.data?.id ?? null;

  const homeSquadMembersQuery = useQuery({
    queryKey: homeSquadId
      ? squadMembersQueryKey(homeSquadId)
      : ["squad", "none"],
    queryFn: ({ signal }) =>
      homeSquadId
        ? fetchSquadMembers(homeSquadId, { signal })
        : Promise.reject(),
    enabled: eventsOpen && Boolean(homeSquadId),
  });

  const awaySquadMembersQuery = useQuery({
    queryKey: awaySquadId
      ? squadMembersQueryKey(awaySquadId)
      : ["squad", "none"],
    queryFn: ({ signal }) =>
      awaySquadId
        ? fetchSquadMembers(awaySquadId, { signal })
        : Promise.reject(),
    enabled: eventsOpen && Boolean(awaySquadId),
  });

  const homeRoster = homeRosterQuery.data ?? null;
  const awayRoster = awayRosterQuery.data ?? null;
  const homeSquadMembers = homeSquadMembersQuery.data ?? [];
  const awaySquadMembers = awaySquadMembersQuery.data ?? [];

  const homeMembersById = useMemo(
    () => new Map(homeSquadMembers.map((member) => [member.id, member])),
    [homeSquadMembers],
  );
  const awayMembersById = useMemo(
    () => new Map(awaySquadMembers.map((member) => [member.id, member])),
    [awaySquadMembers],
  );

  const matchEventDrafts = useMemo(() => {
    if (!matchDetailQuery.data) {
      return null;
    }
    return (matchDetailQuery.data.events ?? []).map((event) => {
      const memberMap =
        event.team_side === "home" ? homeMembersById : awayMembersById;
      const member = event.squad_member_id
        ? (memberMap.get(event.squad_member_id) ?? null)
        : null;
      return {
        id: event.id,
        teamSide: event.team_side,
        eventType: event.event_type,
        minute: String(event.minute ?? 0),
        stoppageTime: event.stoppage_time?.toString() ?? "",
        membershipId: member?.membership_id ?? "",
        squadMemberId: event.squad_member_id ?? null,
      } satisfies MatchEventDraft;
    });
  }, [awayMembersById, homeMembersById, matchDetailQuery.data]);

  useEffect(() => {
    if (!eventsOpen || eventsDirty || !matchEventDrafts) {
      return;
    }
    setEventRows(matchEventDrafts);
    setEventsDirty(false);
  }, [eventsOpen, eventsDirty, matchEventDrafts]);

  useEffect(() => {
    if (!eventsOpen || eventRows.length === 0) {
      return;
    }
    setEventRows((prev) =>
      prev.map((row) => {
        if (row.membershipId || !row.squadMemberId) {
          return row;
        }
        const memberMap =
          row.teamSide === "home" ? homeMembersById : awayMembersById;
        const member = memberMap.get(row.squadMemberId);
        if (!member?.membership_id) {
          return row;
        }
        return { ...row, membershipId: member.membership_id };
      }),
    );
  }, [eventsOpen, eventRows.length, homeMembersById, awayMembersById]);

  const homeRosterOptions = useMemo(
    () => buildRosterOptions(homeRoster, homeSquadMembers),
    [homeRoster, homeSquadMembers],
  );
  const awayRosterOptions = useMemo(
    () => buildRosterOptions(awayRoster, awaySquadMembers),
    [awayRoster, awaySquadMembers],
  );

  const eventsLoading =
    eventsOpen &&
    (matchDetailQuery.isLoading ||
      homeRosterQuery.isLoading ||
      awayRosterQuery.isLoading ||
      homeSquadQuery.isLoading ||
      awaySquadQuery.isLoading ||
      homeSquadMembersQuery.isLoading ||
      awaySquadMembersQuery.isLoading);

  const eventsLoadError =
    matchDetailQuery.error instanceof Error
      ? matchDetailQuery.error.message
      : homeRosterQuery.error instanceof Error
        ? homeRosterQuery.error.message
        : awayRosterQuery.error instanceof Error
          ? awayRosterQuery.error.message
          : homeSquadMembersQuery.error instanceof Error
            ? homeSquadMembersQuery.error.message
            : awaySquadMembersQuery.error instanceof Error
              ? awaySquadMembersQuery.error.message
              : null;

  useEffect(() => {
    if (!pendingEventFocusId) {
      return;
    }
    const element = document.getElementById(
      `${idBase}-player-${pendingEventFocusId}`,
    );
    if (element instanceof HTMLSelectElement) {
      element.focus();
      setPendingEventFocusId(null);
    }
  }, [idBase, pendingEventFocusId]);

  function handleScoreChange(side: "home" | "away", value: string) {
    const nextScore = parseScore(value);
    const nextHomeScore = side === "home" ? nextScore : homeScore;
    const nextAwayScore = side === "away" ? nextScore : awayScore;

    if (side === "home") {
      setHomeScore(nextScore);
    } else {
      setAwayScore(nextScore);
    }

    if (hasAnyScoreValues(nextHomeScore, nextAwayScore, optionalScoreInputs)) {
      if (status !== "finalized" && status !== "in_progress") {
        setStatus("finalized");
        setStatusNotice(
          "Resultat registrert. Status settes automatisk til Fullført.",
        );
      }
    } else {
      setStatusNotice(null);
    }
  }

  function handleOptionalScoreChange(
    field: keyof OptionalScoreInputs,
    value: string,
  ) {
    setOptionalScoreInputs((prev) => {
      const next = { ...prev, [field]: value };
      if (hasAnyScoreValues(homeScore, awayScore, next)) {
        if (status !== "finalized" && status !== "in_progress") {
          setStatus("finalized");
          setStatusNotice(
            "Resultat registrert. Status settes automatisk til Fullført.",
          );
        }
      } else {
        setStatusNotice(null);
      }

      const resolved = resolveOptionalScores(next);
      setOptionalScoreError(resolved.error);
      return next;
    });
  }

  function resolveOptionalScoresForPayload(): {
    values: OptionalScores;
    includeExtraTime: boolean;
    includePenalties: boolean;
  } | null {
    const resolved = resolveOptionalScores(optionalScoreInputs);
    if (resolved.error) {
      setMatchError(resolved.error);
      return null;
    }
    const hasExtraTimeInput =
      optionalScoreInputs.homeExtraTime.trim().length > 0 ||
      optionalScoreInputs.awayExtraTime.trim().length > 0;
    const hasPenaltiesInput =
      optionalScoreInputs.homePenalties.trim().length > 0 ||
      optionalScoreInputs.awayPenalties.trim().length > 0;
    const includeExtraTime =
      hasExtraTimeInput ||
      match.home_score?.extra_time != null ||
      match.away_score?.extra_time != null;
    const includePenalties =
      hasPenaltiesInput ||
      match.home_score?.penalties != null ||
      match.away_score?.penalties != null;

    return {
      values: resolved.values,
      includeExtraTime,
      includePenalties,
    };
  }

  function updateEventRow(id: string, patch: Partial<MatchEventDraft>) {
    setEventRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    setEventsDirty(true);
  }

  function buildMatchPayload(optionalScores?: {
    values: OptionalScores;
    includeExtraTime: boolean;
    includePenalties: boolean;
  }): components["schemas"]["UpdateMatchRequest"] {
    const score: {
      home: components["schemas"]["ScoreBreakdown"];
      away: components["schemas"]["ScoreBreakdown"];
    } = {
      home: { regulation: homeScore },
      away: { regulation: awayScore },
    };

    const payload: components["schemas"]["UpdateMatchRequest"] = {
      status,
      score,
    };

    if (optionalScores?.includeExtraTime) {
      score.home.extra_time = optionalScores.values.homeExtraTime ?? null;
      score.away.extra_time = optionalScores.values.awayExtraTime ?? null;
    }

    if (optionalScores?.includePenalties) {
      score.home.penalties = optionalScores.values.homePenalties ?? null;
      score.away.penalties = optionalScores.values.awayPenalties ?? null;
    }

    if (kickoffAt) {
      payload.kickoff_at = new Date(kickoffAt).toISOString();
    } else if (match.kickoff_at) {
      payload.kickoff_at = null;
    }

    if (venueId) {
      payload.venue_id = venueId;
    } else if (match.venue_id) {
      payload.venue_id = null;
    }

    const trimmedCode = code.trim();
    if (trimmedCode !== (match.code ?? "")) {
      payload.code = trimmedCode.length > 0 ? trimmedCode : null;
    }

    if (homeEntryId !== (match.home_entry_id ?? "")) {
      payload.home_entry_id = homeEntryId;
    }

    if (awayEntryId !== (match.away_entry_id ?? "")) {
      payload.away_entry_id = awayEntryId;
    }

    if (!homeEntryId && homePlaceholderTouched) {
      const trimmedHomeLabel = homePlaceholder.trim();
      payload.home_label = trimmedHomeLabel.length > 0 ? trimmedHomeLabel : "";
    }

    if (!awayEntryId && awayPlaceholderTouched) {
      const trimmedAwayLabel = awayPlaceholder.trim();
      payload.away_label = trimmedAwayLabel.length > 0 ? trimmedAwayLabel : "";
    }

    return payload;
  }

  function addEventRow() {
    const draft = createEventDraft();
    setEventRows((prev) => [...prev, draft]);
    setEventsDirty(true);
  }

  function addGoalRow(side: MatchEventSide) {
    const draft = createEventDraft({ teamSide: side, eventType: "goal" });
    setEventRows((prev) => [...prev, draft]);
    setEventsDirty(true);
    setPendingEventFocusId(draft.id);
  }

  function removeEventRow(id: string) {
    setEventRows((prev) => prev.filter((row) => row.id !== id));
    setEventsDirty(true);
  }

  async function handleSaveMatch() {
    setMatchError(null);
    const hasHomeEntry = homeEntryId.trim().length > 0;
    const hasAwayEntry = awayEntryId.trim().length > 0;
    const teamsChanged =
      homeEntryId !== (match.home_entry_id ?? "") ||
      awayEntryId !== (match.away_entry_id ?? "");
    if (teamsChanged) {
      if (
        !hasHomeEntry &&
        !hasAwayEntry &&
        !homePlaceholder.trim() &&
        !awayPlaceholder.trim()
      ) {
        setMatchError(
          "Legg inn minst ett lag eller visningsnavn før du lagrer.",
        );
        return;
      }
      if (hasHomeEntry && hasAwayEntry && homeEntryId === awayEntryId) {
        setMatchError("Hjemmelag og bortelag kan ikke være det samme.");
        return;
      }
    }

    const optionalScores = resolveOptionalScoresForPayload();
    if (!optionalScores) {
      return;
    }

    const shouldSaveEvents = eventsDirty;
    let resolvedEvents: MatchEventInput[] | null = null;

    try {
      if (shouldSaveEvents) {
        setEventsSaving(true);
        resolvedEvents = await resolveEventInputs();
        if (!resolvedEvents) {
          return;
        }
      }

      const payload = buildMatchPayload(optionalScores);
      if (resolvedEvents) {
        payload.events = resolvedEvents;
      }

      const didSave = await onSave(payload);
      if (didSave && resolvedEvents) {
        setEventsDirty(false);
      }
    } finally {
      if (shouldSaveEvents) {
        setEventsSaving(false);
      }
    }
  }

  async function resolveEventInputs(): Promise<MatchEventInput[] | null> {
    setEventsError(null);
    if (!homeEntryId || !awayEntryId) {
      setEventsError("Velg hjemme- og bortelag før du registrerer hendelser.");
      return null;
    }
    if (!homeSquadId || !awaySquadId) {
      setEventsError("Troppene er ikke klare enda. Prøv igjen om litt.");
      return null;
    }
    if (homeEntryId === awayEntryId) {
      setEventsError("Hjemmelag og bortelag kan ikke være det samme.");
      return null;
    }

    try {
      const homeMemberMap = new Map(
        homeSquadMembers
          .filter((member) => member.membership_id)
          .map((member) => [member.membership_id as string, member.id]),
      );
      const awayMemberMap = new Map(
        awaySquadMembers
          .filter((member) => member.membership_id)
          .map((member) => [member.membership_id as string, member.id]),
      );

      const resolvedEvents: MatchEventInput[] = [];

      for (const row of eventRows) {
        const minuteInput = row.minute.trim();
        const minute = minuteInput ? parseMinute(row.minute) : null;
        if (minuteInput && minute === null) {
          throw new Error("Oppgi et gyldig minutt når det er fylt inn.");
        }

        const stoppageTime = parseMinute(row.stoppageTime);
        if (row.stoppageTime.trim() && stoppageTime === null) {
          throw new Error("Oppgi et gyldig tillegg for alle hendelser.");
        }
        const membershipId = row.membershipId.trim();
        let squadMemberId = row.squadMemberId;

        if (membershipId) {
          const isOpponent = row.eventType === "own_goal";
          const effectiveSide = isOpponent
            ? row.teamSide === "home"
              ? "away"
              : "home"
            : row.teamSide;

          const memberMap =
            effectiveSide === "home" ? homeMemberMap : awayMemberMap;
          const squadId = effectiveSide === "home" ? homeSquadId : awaySquadId;
          const existing = memberMap.get(membershipId);
          if (existing) {
            squadMemberId = existing;
          } else {
            const created = await addSquadMember(squadId, {
              membership_id: membershipId,
            });
            memberMap.set(membershipId, created.id);
            squadMemberId = created.id;
          }
        }

        resolvedEvents.push({
          team_side: row.teamSide,
          event_type: row.eventType,
          minute: minute ?? 0,
          stoppage_time: stoppageTime ?? undefined,
          squad_member_id: squadMemberId ?? undefined,
        });
      }

      return resolvedEvents;
    } catch (error) {
      setEventsError(
        error instanceof Error ? error.message : "Kunne ikke lagre hendelsene.",
      );
      return null;
    }
  }

  async function handleSaveEvents() {
    const optionalScores = resolveOptionalScoresForPayload();
    if (!optionalScores) {
      return;
    }

    setEventsSaving(true);

    try {
      const resolvedEvents = await resolveEventInputs();
      if (!resolvedEvents) {
        return;
      }

      const payload = buildMatchPayload(optionalScores);
      payload.events = resolvedEvents;

      const didSave = await onSave(payload);
      if (!didSave) {
        throw new Error("Kunne ikke lagre hendelsene.");
      }
      setEventsDirty(false);
    } catch (error) {
      setEventsError(
        error instanceof Error ? error.message : "Kunne ikke lagre hendelsene.",
      );
    } finally {
      setEventsSaving(false);
    }
  }

  async function handleDeleteMatch() {
    const didDelete = await onDelete();
    if (didDelete) {
      setDeleteDialogOpen(false);
      onClose?.();
    }
  }

  return (
    <article className="max-h-full space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {matchLabel}
          </p>
          <h2 className="text-lg font-semibold text-foreground">
            {homeLabel} – {awayLabel}
          </h2>
          <p className="text-xs text-muted-foreground">
            {match.kickoff_at
              ? new Date(match.kickoff_at).toLocaleString("no-NB")
              : "Tidspunkt ikke satt"}
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground">
          {statusLabel(status)}
        </span>
      </header>

      {matchError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {matchError}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label
                htmlFor={`${idBase}-home-entry`}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Hjemmelag
              </label>
              <select
                id={`${idBase}-home-entry`}
                value={homeEntryId}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setHomeEntryId(nextValue);
                  if (nextValue) {
                    setHomePlaceholder("");
                    setHomePlaceholderTouched(false);
                  }
                }}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Velg lag</option>
                {entries.map((entry) => (
                  <option key={entry.entry.id} value={entry.entry.id}>
                    {entry.team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor={`${idBase}-away-entry`}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Bortelag
              </label>
              <select
                id={`${idBase}-away-entry`}
                value={awayEntryId}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setAwayEntryId(nextValue);
                  if (nextValue) {
                    setAwayPlaceholder("");
                    setAwayPlaceholderTouched(false);
                  }
                }}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Velg lag</option>
                {entries.map((entry) => (
                  <option key={entry.entry.id} value={entry.entry.id}>
                    {entry.team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor={`${idBase}-code`}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Kampkode
              </label>
              <input
                id={`${idBase}-code`}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Valgfritt"
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor={`${idBase}-home-placeholder`}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Hjemmelag visningsnavn
              </label>
              <input
                id={`${idBase}-home-placeholder`}
                value={homePlaceholder}
                onChange={(event) => {
                  setHomePlaceholder(event.target.value);
                  setHomePlaceholderTouched(true);
                }}
                placeholder="Vises når lag ikke er satt"
                disabled={Boolean(homeEntryId)}
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor={`${idBase}-away-placeholder`}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Bortelag visningsnavn
              </label>
              <input
                id={`${idBase}-away-placeholder`}
                value={awayPlaceholder}
                onChange={(event) => {
                  setAwayPlaceholder(event.target.value);
                  setAwayPlaceholderTouched(true);
                }}
                placeholder="Vises når lag ikke er satt"
                disabled={Boolean(awayEntryId)}
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-70"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resultat
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 md:grid-cols-[minmax(0,1fr)_64px]">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Hjemme
                    </p>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {homeLabel}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={homeScore}
                    onChange={(event) =>
                      handleScoreChange("home", event.target.value)
                    }
                    className="w-full rounded border border-border px-2 py-1 text-center text-lg font-bold shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3 sm:py-2"
                  />
                </div>
                <div className="grid items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 md:grid-cols-[minmax(0,1fr)_64px]">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Borte
                    </p>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {awayLabel}
                    </p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={awayScore}
                    onChange={(event) =>
                      handleScoreChange("away", event.target.value)
                    }
                    className="w-full rounded border border-border px-2 py-1 text-center text-lg font-bold shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3 sm:py-2"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <label
                  htmlFor={`${idBase}-status`}
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Status
                </label>
                <select
                  id={`${idBase}-status`}
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as MatchStatus);
                    setStatusNotice(null);
                  }}
                  className="w-full rounded border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="scheduled">Planlagt</option>
                  <option value="in_progress">Pågår</option>
                  <option value="finalized">Fullført</option>
                  <option value="disputed">Tvist</option>
                </select>
                {statusNotice ? (
                  <p className="text-[0.65rem] font-medium text-emerald-600 dark:text-emerald-400">
                    {statusNotice}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor={`${idBase}-kickoff`}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Tidspunkt
              </label>
              <input
                id={`${idBase}-kickoff`}
                type="datetime-local"
                value={kickoffAt}
                onChange={(event) => setKickoffAt(event.target.value)}
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor={`${idBase}-venue`}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Arena
              </label>
              <select
                id={`${idBase}-venue`}
                value={venueId}
                onChange={(event) => setVenueId(event.target.value)}
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Ingen arena</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-border/60 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Tilleggspoeng
              </h3>
              {optionalScoreError ? (
                <p className="text-xs font-medium text-destructive">
                  {optionalScoreError}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                  Ekstraomganger
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      htmlFor={`${idBase}-home-et`}
                      className="text-[0.6rem] font-semibold text-muted-foreground"
                    >
                      Hjemme
                    </label>
                    <input
                      id={`${idBase}-home-et`}
                      type="number"
                      min="0"
                      placeholder="—"
                      value={optionalScoreInputs.homeExtraTime}
                      onChange={(e) =>
                        handleOptionalScoreChange(
                          "homeExtraTime",
                          e.target.value,
                        )
                      }
                      className="w-full rounded border border-border px-2 py-1 text-center text-xs font-semibold focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor={`${idBase}-away-et`}
                      className="text-[0.6rem] font-semibold text-muted-foreground"
                    >
                      Borte
                    </label>
                    <input
                      id={`${idBase}-away-et`}
                      type="number"
                      min="0"
                      placeholder="—"
                      value={optionalScoreInputs.awayExtraTime}
                      onChange={(e) =>
                        handleOptionalScoreChange(
                          "awayExtraTime",
                          e.target.value,
                        )
                      }
                      className="w-full rounded border border-border px-2 py-1 text-center text-xs font-semibold focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
                  Straffespark
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label
                      htmlFor={`${idBase}-home-p`}
                      className="text-[0.6rem] font-semibold text-muted-foreground"
                    >
                      Hjemme
                    </label>
                    <input
                      id={`${idBase}-home-p`}
                      type="number"
                      min="0"
                      placeholder="—"
                      value={optionalScoreInputs.homePenalties}
                      onChange={(e) =>
                        handleOptionalScoreChange(
                          "homePenalties",
                          e.target.value,
                        )
                      }
                      className="w-full rounded border border-border px-2 py-1 text-center text-xs font-semibold focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor={`${idBase}-away-p`}
                      className="text-[0.6rem] font-semibold text-muted-foreground"
                    >
                      Borte
                    </label>
                    <input
                      id={`${idBase}-away-p`}
                      type="number"
                      min="0"
                      placeholder="—"
                      value={optionalScoreInputs.awayPenalties}
                      onChange={(e) =>
                        handleOptionalScoreChange(
                          "awayPenalties",
                          e.target.value,
                        )
                      }
                      className="w-full rounded border border-border px-2 py-1 text-center text-xs font-semibold focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:border-l lg:border-border/60 lg:pl-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Hendelser & Målscorere
            </h3>
          </div>

          <div className="space-y-4">
            {eventsLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground italic">
                Laster tropper og hendelser …
              </p>
            ) : eventsLoadError ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {eventsLoadError}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => addGoalRow("home")}
                    className="rounded-md bg-emerald-600/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-600/20 dark:text-emerald-400"
                  >
                    + Mål {homeLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => addGoalRow("away")}
                    className="rounded-md bg-emerald-600/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-600/20 dark:text-emerald-400"
                  >
                    + Mål {awayLabel}
                  </button>
                  <button
                    type="button"
                    onClick={addEventRow}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                  >
                    Annen hendelse
                  </button>
                </div>

                {eventRows.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground italic">
                    Ingen hendelser registrert.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground uppercase tracking-tight">
                          <th className="py-2 pr-2 font-bold">Side</th>
                          <th className="py-2 pr-2 font-bold">Type</th>
                          <th className="py-2 pr-2 font-bold">Spiller</th>
                          <th className="py-2 pr-2 font-bold">Tid</th>
                          <th className="py-2 font-bold text-right">Fjern</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventRows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-border/40"
                          >
                            <td className="py-2 pr-2">
                              <select
                                value={row.teamSide}
                                onChange={(e) =>
                                  updateEventRow(row.id, {
                                    teamSide: e.target.value as MatchEventSide,
                                    membershipId: "",
                                    squadMemberId: null,
                                  })
                                }
                                className="rounded border border-border bg-background px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                              >
                                <option value="home">Hjemme</option>
                                <option value="away">Borte</option>
                              </select>
                            </td>
                            <td className="py-2 pr-2">
                              <select
                                value={row.eventType}
                                onChange={(e) =>
                                  updateEventRow(row.id, {
                                    eventType: e.target.value as MatchEventType,
                                  })
                                }
                                className="rounded border border-border bg-background px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                              >
                                <option value="goal">Mål</option>
                                <option value="yellow_card">Gult</option>
                                <option value="red_card">Rødt</option>
                                <option value="own_goal">Selvmål</option>
                              </select>
                            </td>
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-1.5">
                                <select
                                  id={`${idBase}-player-${row.id}`}
                                  value={row.membershipId}
                                  onChange={(e) =>
                                    updateEventRow(row.id, {
                                      membershipId: e.target.value,
                                      squadMemberId: null,
                                    })
                                  }
                                  className="max-w-[180px] flex-1 rounded border border-border bg-background px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="">
                                    Velg spiller (valgfritt)
                                  </option>
                                  {(row.eventType === "own_goal"
                                    ? row.teamSide === "home"
                                      ? awayRosterOptions
                                      : homeRosterOptions
                                    : row.teamSide === "home"
                                      ? homeRosterOptions
                                      : awayRosterOptions
                                  ).map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                {row.membershipId &&
                                  (() => {
                                    const options =
                                      row.eventType === "own_goal"
                                        ? row.teamSide === "home"
                                          ? awayRosterOptions
                                          : homeRosterOptions
                                        : row.teamSide === "home"
                                          ? homeRosterOptions
                                          : awayRosterOptions;
                                    const selected = options.find(
                                      (o) => o.value === row.membershipId,
                                    );
                                    return selected?.warning ? (
                                      <div
                                        title={selected.warning}
                                        className="text-amber-500"
                                      >
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                      </div>
                                    ) : null;
                                  })()}
                              </div>
                            </td>
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={row.minute}
                                  onChange={(e) =>
                                    updateEventRow(row.id, {
                                      minute: e.target.value,
                                    })
                                  }
                                  className="w-10 rounded border border-border bg-background px-1 py-1 text-center focus:outline-none text-xs"
                                />
                                <span className="text-muted-foreground">+</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={row.stoppageTime}
                                  onChange={(e) =>
                                    updateEventRow(row.id, {
                                      stoppageTime: e.target.value,
                                    })
                                  }
                                  className="w-8 rounded border border-border bg-background px-1 py-1 text-center focus:outline-none text-xs"
                                />
                              </div>
                            </td>
                            <td className="py-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeEventRow(row.id)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                Slett
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border/40 pt-4">
                  {eventsError ? (
                    <p className="text-xs font-medium text-destructive">
                      {eventsError}
                    </p>
                  ) : (
                    <div />
                  )}
                  <Button
                    onClick={handleSaveEvents}
                    disabled={!eventsDirty || eventsSaving}
                    size="sm"
                    variant="accent"
                    className="w-full sm:w-auto"
                  >
                    {eventsSaving ? "Lagrer …" : "Lagre hendelser"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6">
        <div className="flex gap-3">
          <Button
            onClick={handleSaveMatch}
            disabled={isSaving || isDeleting}
            size="sm"
          >
            {isSaving ? "Lagrer …" : "Lagre kamp"}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            size="sm"
          >
            Lukk
          </Button>
        </div>
        <Button
          variant="destructive"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={isSaving || isDeleting}
          size="sm"
        >
          Slett kamp
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett kamp?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette kampen mellom{" "}
              <span className="font-semibold">{homeLabel}</span> og{" "}
              <span className="font-semibold">{awayLabel}</span>? Denne
              handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteMatch}
            >
              Slett kamp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
