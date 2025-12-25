"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  type EntryReview,
  editionEntriesQueryKey,
  fetchEditionEntries,
} from "@/lib/api/entries-client";
import type { components } from "@/lib/api/generated/openapi";
import {
  editionMatchesQueryKey,
  fetchEditionMatches,
  fetchMatch,
  matchDetailQueryKey,
  updateMatch,
} from "@/lib/api/matches-client";
import {
  ensureEntrySquad,
  entrySquadQueryKey,
  fetchSquadMembers,
  squadMembersQueryKey,
} from "@/lib/api/squads-client";
import {
  addSquadMember,
  fetchTeamRoster,
  type TeamRoster,
  teamRosterQueryKey,
} from "@/lib/api/teams-client";
import {
  editionVenuesQueryKey,
  fetchEditionVenues,
  type Venue,
} from "@/lib/api/venues-client";

type MatchStatus = components["schemas"]["MatchStatus"];
type Match = components["schemas"]["Match"];
type MatchEventInput = components["schemas"]["MatchEventInput"];
type MatchEventSide = MatchEventInput["team_side"];
type MatchEventType = MatchEventInput["event_type"];

type MatchEventDraft = {
  id: string;
  teamSide: MatchEventSide;
  eventType: MatchEventType;
  minute: string;
  stoppageTime: string;
  membershipId: string;
  squadMemberId: string | null;
};

type ResultsDashboardProps = {
  editionId: string;
};

export function ResultsDashboard({ editionId }: ResultsDashboardProps) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const matchesQuery = useQuery({
    queryKey: editionMatchesQueryKey(editionId),
    queryFn: ({ signal }) => fetchEditionMatches(editionId, { signal }),
  });

  const entriesQuery = useQuery({
    queryKey: editionEntriesQueryKey(editionId),
    queryFn: ({ signal }) => fetchEditionEntries(editionId, { signal }),
  });

  const venuesQuery = useQuery({
    queryKey: editionVenuesQueryKey(editionId),
    queryFn: ({ signal }) => fetchEditionVenues(editionId, { signal }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      matchId,
      payload,
    }: {
      matchId: string;
      payload: components["schemas"]["UpdateMatchRequest"];
    }) => updateMatch(matchId, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: editionMatchesQueryKey(editionId),
      });
      void queryClient.invalidateQueries({
        queryKey: matchDetailQueryKey(variables.matchId),
      });
      setActionError(null);
    },
    onError: (error) => {
      setActionError(
        error instanceof Error ? error.message : "Kunne ikke oppdatere kampen.",
      );
    },
  });

  const matches = matchesQuery.data ?? [];
  const entries = entriesQuery.data ?? [];
  const entryMap = useMemo(
    () => new Map(entries.map((entry) => [entry.entry.id, entry])),
    [entries],
  );
  const venues = venuesQuery.data ?? [];
  const isLoading =
    matchesQuery.isLoading || venuesQuery.isLoading || entriesQuery.isLoading;
  const loadError =
    matchesQuery.error instanceof Error
      ? matchesQuery.error.message
      : entriesQuery.error instanceof Error
        ? entriesQuery.error.message
        : venuesQuery.error instanceof Error
          ? venuesQuery.error.message
          : null;

  const sortedMatches = useMemo(
    () =>
      [...matches].sort((left, right) => {
        const leftTime = left.kickoff_at
          ? new Date(left.kickoff_at).getTime()
          : 0;
        const rightTime = right.kickoff_at
          ? new Date(right.kickoff_at).getTime()
          : 0;
        return leftTime - rightTime;
      }),
    [matches],
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Utgave · Kampresultater
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Kampadministrasjon
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Oppdater status, poeng og kampdetaljer. Endringer oppdaterer
          scoreboardet fortløpende.
        </p>
      </header>

      {actionError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          Laster kamper …
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      ) : sortedMatches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          Ingen kamper registrert ennå.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMatches.map((match) => (
            <MatchEditorCard
              key={match.id}
              match={match}
              entries={entries}
              entryMap={entryMap}
              venues={venues}
              isSaving={updateMutation.isPending}
              onSave={async (payload) => {
                setActionError(null);
                try {
                  await updateMutation.mutateAsync({
                    matchId: match.id,
                    payload,
                  });
                } catch {
                  // handled in mutation callbacks
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type MatchEditorCardProps = {
  match: Match;
  entries: EntryReview[];
  entryMap: Map<string, EntryReview>;
  venues: Venue[];
  isSaving: boolean;
  onSave: (
    payload: components["schemas"]["UpdateMatchRequest"],
  ) => Promise<void>;
};

function MatchEditorCard({
  match,
  entries,
  entryMap,
  venues,
  isSaving,
  onSave,
}: MatchEditorCardProps) {
  const [homeScore, setHomeScore] = useState(match.home_score?.regulation ?? 0);
  const [awayScore, setAwayScore] = useState(match.away_score?.regulation ?? 0);
  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [kickoffAt, setKickoffAt] = useState(
    match.kickoff_at ? toLocalInput(match.kickoff_at) : "",
  );
  const [venueId, setVenueId] = useState(match.venue_id ?? "");
  const [code, setCode] = useState(match.code ?? "");
  const [homeEntryId, setHomeEntryId] = useState(match.home_entry_id ?? "");
  const [awayEntryId, setAwayEntryId] = useState(match.away_entry_id ?? "");
  const [matchError, setMatchError] = useState<string | null>(null);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventRows, setEventRows] = useState<MatchEventDraft[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [eventsDirty, setEventsDirty] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsSaving, setEventsSaving] = useState(false);

  useEffect(() => {
    setHomeScore(match.home_score?.regulation ?? 0);
    setAwayScore(match.away_score?.regulation ?? 0);
    setStatus(match.status);
    setKickoffAt(match.kickoff_at ? toLocalInput(match.kickoff_at) : "");
    setVenueId(match.venue_id ?? "");
    setCode(match.code ?? "");
    setHomeEntryId(match.home_entry_id ?? "");
    setAwayEntryId(match.away_entry_id ?? "");
    setMatchError(null);
    setEventsOpen(false);
    setEventRows([]);
    setEventsLoaded(false);
    setEventsDirty(false);
    setEventsError(null);
  }, [
    match.home_score?.regulation,
    match.away_score?.regulation,
    match.status,
    match.kickoff_at,
    match.venue_id,
    match.code,
    match.home_entry_id,
    match.away_entry_id,
  ]);

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

  useEffect(() => {
    if (!eventsOpen || eventsLoaded || !matchDetailQuery.data) {
      return;
    }
    const initialEvents = (matchDetailQuery.data.events ?? []).map((event) => {
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
    setEventRows(initialEvents);
    setEventsLoaded(true);
    setEventsDirty(false);
  }, [
    eventsOpen,
    eventsLoaded,
    matchDetailQuery.data,
    homeMembersById,
    awayMembersById,
  ]);

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
    () => buildRosterOptions(homeRoster),
    [homeRoster],
  );
  const awayRosterOptions = useMemo(
    () => buildRosterOptions(awayRoster),
    [awayRoster],
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

  function updateEventRow(id: string, patch: Partial<MatchEventDraft>) {
    setEventRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    setEventsDirty(true);
  }

  function addEventRow() {
    setEventRows((prev) => [...prev, createEventDraft()]);
    setEventsDirty(true);
  }

  function removeEventRow(id: string) {
    setEventRows((prev) => prev.filter((row) => row.id !== id));
    setEventsDirty(true);
  }

  async function handleSaveMatch() {
    setMatchError(null);
    if (!homeEntryId || !awayEntryId) {
      setMatchError("Velg hjemme- og bortelag før du lagrer.");
      return;
    }
    if (homeEntryId === awayEntryId) {
      setMatchError("Hjemmelag og bortelag kan ikke være det samme.");
      return;
    }

    const payload: components["schemas"]["UpdateMatchRequest"] = {
      status,
      score: {
        home: { regulation: homeScore },
        away: { regulation: awayScore },
      },
    };

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

    if (homeEntryId !== match.home_entry_id) {
      payload.home_entry_id = homeEntryId;
    }

    if (awayEntryId !== match.away_entry_id) {
      payload.away_entry_id = awayEntryId;
    }

    await onSave(payload);
  }

  async function handleSaveEvents() {
    setEventsError(null);
    if (!homeEntryId || !awayEntryId) {
      setEventsError("Velg hjemme- og bortelag før du registrerer hendelser.");
      return;
    }
    if (!homeSquadId || !awaySquadId) {
      setEventsError("Troppene er ikke klare enda. Prøv igjen om litt.");
      return;
    }

    setEventsSaving(true);

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
        const minute = parseMinute(row.minute);
        if (minute === null) {
          throw new Error("Oppgi et gyldig minutt for alle hendelser.");
        }

        const stoppageTime = parseMinute(row.stoppageTime);
        if (row.stoppageTime.trim() && stoppageTime === null) {
          throw new Error("Oppgi et gyldig tillegg for alle hendelser.");
        }
        const membershipId = row.membershipId.trim();
        let squadMemberId = row.squadMemberId;

        if (membershipId) {
          const memberMap =
            row.teamSide === "home" ? homeMemberMap : awayMemberMap;
          const squadId = row.teamSide === "home" ? homeSquadId : awaySquadId;
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

        if (!squadMemberId) {
          throw new Error("Velg spiller for alle hendelser.");
        }

        resolvedEvents.push({
          team_side: row.teamSide,
          event_type: row.eventType,
          minute,
          stoppage_time: stoppageTime ?? undefined,
          squad_member_id: squadMemberId,
        });
      }

      await onSave({ events: resolvedEvents });
      setEventsDirty(false);
    } catch (error) {
      setEventsError(
        error instanceof Error ? error.message : "Kunne ikke lagre hendelsene.",
      );
    } finally {
      setEventsSaving(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
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
          className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {matchError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
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
            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
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
            onChange={(event) => setHomeEntryId(event.target.value)}
            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
            onChange={(event) => setAwayEntryId(event.target.value)}
            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Velg lag</option>
            {entries.map((entry) => (
              <option key={entry.entry.id} value={entry.entry.id}>
                {entry.team.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
        <div className="space-y-2">
          <label
            htmlFor={`${idBase}-home-score`}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Hjemmelag
          </label>
          <input
            id={`${idBase}-home-score`}
            type="number"
            min={0}
            value={homeScore}
            onChange={(event) => setHomeScore(parseScore(event.target.value))}
            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`${idBase}-away-score`}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Bortelag
          </label>
          <input
            id={`${idBase}-away-score`}
            type="number"
            min={0}
            value={awayScore}
            onChange={(event) => setAwayScore(parseScore(event.target.value))}
            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
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
            onChange={(event) => setStatus(event.target.value as MatchStatus)}
            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="scheduled">Planlagt</option>
            <option value="in_progress">Pågår</option>
            <option value="finalized">Fullført</option>
            <option value="disputed">Tvist</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
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
            <option value="">Ikke satt</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => {
            void handleSaveMatch();
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? "Lagrer …" : "Lagre kamp"}
        </button>
      </div>

      <div className="mt-6 border-t border-border/60 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Hendelser
            </h3>
            <p className="text-xs text-muted-foreground">
              Registrer mål, kort og assist for å oppdatere toppscorerlisten.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEventsOpen((prev) => !prev)}
            className="rounded-md border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-primary/10"
          >
            {eventsOpen ? "Skjul" : "Vis"} hendelser
          </button>
        </div>

        {eventsOpen ? (
          <div className="mt-4 space-y-4">
            {eventsError ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {eventsError}
              </div>
            ) : null}

            {eventsLoadError ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {eventsLoadError}
              </div>
            ) : eventsLoading ? (
              <div className="rounded-md border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                Laster hendelser …
              </div>
            ) : (
              <>
                {eventRows.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                    Ingen registrerte hendelser.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eventRows.map((row) => {
                      const rosterOptions =
                        row.teamSide === "home"
                          ? homeRosterOptions
                          : awayRosterOptions;
                      return (
                        <div
                          key={row.id}
                          className="grid gap-3 rounded-xl border border-border/60 bg-card/60 p-4 md:grid-cols-[120px_160px_1fr_100px_100px_auto]"
                        >
                          <div className="space-y-1">
                            <label
                              htmlFor={`${idBase}-side-${row.id}`}
                              className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              Side
                            </label>
                            <select
                              id={`${idBase}-side-${row.id}`}
                              value={row.teamSide}
                              onChange={(event) =>
                                updateEventRow(row.id, {
                                  teamSide: event.target
                                    .value as MatchEventSide,
                                  membershipId: "",
                                  squadMemberId: null,
                                })
                              }
                              className="w-full rounded border border-border px-2 py-1 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              <option value="home">Hjemme</option>
                              <option value="away">Borte</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label
                              htmlFor={`${idBase}-type-${row.id}`}
                              className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              Type
                            </label>
                            <select
                              id={`${idBase}-type-${row.id}`}
                              value={row.eventType}
                              onChange={(event) =>
                                updateEventRow(row.id, {
                                  eventType: event.target
                                    .value as MatchEventType,
                                })
                              }
                              className="w-full rounded border border-border px-2 py-1 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              {EVENT_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label
                              htmlFor={`${idBase}-player-${row.id}`}
                              className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              Spiller
                            </label>
                            <select
                              id={`${idBase}-player-${row.id}`}
                              value={row.membershipId}
                              onChange={(event) =>
                                updateEventRow(row.id, {
                                  membershipId: event.target.value,
                                  squadMemberId: null,
                                })
                              }
                              className="w-full rounded border border-border px-2 py-1 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              <option value="">Velg spiller</option>
                              {rosterOptions.map((option) => (
                                <option
                                  key={option.membershipId}
                                  value={option.membershipId}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label
                              htmlFor={`${idBase}-minute-${row.id}`}
                              className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              Minutt
                            </label>
                            <input
                              id={`${idBase}-minute-${row.id}`}
                              value={row.minute}
                              onChange={(event) =>
                                updateEventRow(row.id, {
                                  minute: event.target.value,
                                })
                              }
                              className="w-full rounded border border-border px-2 py-1 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                          <div className="space-y-1">
                            <label
                              htmlFor={`${idBase}-stoppage-${row.id}`}
                              className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
                            >
                              Tillegg
                            </label>
                            <input
                              id={`${idBase}-stoppage-${row.id}`}
                              value={row.stoppageTime}
                              onChange={(event) =>
                                updateEventRow(row.id, {
                                  stoppageTime: event.target.value,
                                })
                              }
                              className="w-full rounded border border-border px-2 py-1 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                          <div className="flex items-end justify-end">
                            <button
                              type="button"
                              onClick={() => removeEventRow(row.id)}
                              className="rounded-md border border-destructive/30 px-3 py-1 text-xs font-semibold text-destructive transition hover:border-destructive/60 hover:bg-destructive/10"
                            >
                              Fjern
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={addEventRow}
                    className="rounded-md border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/70 hover:bg-primary/10"
                  >
                    Legg til hendelse
                  </button>
                  <button
                    type="button"
                    disabled={
                      eventsSaving || (!eventsDirty && eventRows.length === 0)
                    }
                    onClick={() => {
                      void handleSaveEvents();
                    }}
                    className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {eventsSaving ? "Lagrer …" : "Lagre hendelser"}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

type RosterOption = {
  membershipId: string;
  label: string;
};

const EVENT_TYPE_OPTIONS: Array<{ value: MatchEventType; label: string }> = [
  { value: "goal", label: "Mål" },
  { value: "penalty_goal", label: "Straffemål" },
  { value: "own_goal", label: "Selvmål" },
  { value: "assist", label: "Assist" },
  { value: "yellow_card", label: "Gult kort" },
  { value: "red_card", label: "Rødt kort" },
];

function buildRosterOptions(roster: TeamRoster | null): RosterOption[] {
  if (!roster) {
    return [];
  }

  return roster.members
    .filter((member) => member.membership_id && member.role === "player")
    .map((member) => ({
      membershipId: member.membership_id,
      label: member.person.full_name,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "nb"));
}

function createEventDraft(): MatchEventDraft {
  return {
    id:
      typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()),
    teamSide: "home",
    eventType: "goal",
    minute: "",
    stoppageTime: "",
    membershipId: "",
    squadMemberId: null,
  };
}

function parseMinute(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function parseScore(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function toLocalInput(value: string) {
  const date = new Date(value);
  const offsetMinutes = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offsetMinutes * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function statusLabel(status: MatchStatus) {
  switch (status) {
    case "scheduled":
      return "Planlagt";
    case "in_progress":
      return "Pågår";
    case "finalized":
      return "Fullført";
    case "disputed":
      return "Tvist";
    default:
      return status;
  }
}
