"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type EntryReview,
  editionEntriesQueryKey,
  fetchEditionEntries,
} from "@/lib/api/entries-client";
import type { components } from "@/lib/api/generated/openapi";
import {
  deleteMatch,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/dialog";
import { EditionHeader } from "../edition-dashboard";

type MatchStatus = components["schemas"]["MatchStatus"];
type Match = components["schemas"]["Match"];
type MatchEventInput = components["schemas"]["MatchEventInput"];
type MatchEventSide = MatchEventInput["team_side"];
type MatchEventType = MatchEventInput["event_type"];

type ResultsView = "compact" | "comfortable";

type ResultsFilters = {
  query: string;
  status: MatchStatus | "all";
  roundLabel: string | "all";
  groupCode: string | "all";
  venueId: string | "all";
  teamId: string | "all";
  view: ResultsView;
};

type MatchIndex = {
  id: string;
  status: MatchStatus;
  kickoffAt: string | null;
  roundLabel: string | null;
  groupCode: string | null;
  venueId: string | null;
  venueName: string | null;
  homeEntryId: string | null;
  awayEntryId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLabel: string;
  awayLabel: string;
  matchLabel: string;
  searchable: string;
};

type MatchEventDraft = {
  id: string;
  teamSide: MatchEventSide;
  eventType: MatchEventType;
  minute: string;
  stoppageTime: string;
  membershipId: string;
  squadMemberId: string | null;
};

type OptionalScoreInputs = {
  homeExtraTime: string;
  awayExtraTime: string;
  homePenalties: string;
  awayPenalties: string;
};

type OptionalScores = {
  homeExtraTime: number | null;
  awayExtraTime: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
};

type ResultsDashboardProps = {
  editionId: string;
};

const EMPTY_ENTRIES: EntryReview[] = [];
const EMPTY_MATCHES: Match[] = [];
const EMPTY_VENUES: Venue[] = [];

export function ResultsDashboard({ editionId }: ResultsDashboardProps) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ResultsFilters>({
    query: "",
    status: "all",
    roundLabel: "all",
    groupCode: "all",
    venueId: "all",
    teamId: "all",
    view: "comfortable",
  });
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(
    () => new Set(),
  );

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
      toast.success("Kampen er oppdatert.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Kunne ikke oppdatere kampen.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (matchId: string) => deleteMatch(matchId),
    onSuccess: (_data, matchId) => {
      void queryClient.invalidateQueries({
        queryKey: editionMatchesQueryKey(editionId),
      });
      void queryClient.invalidateQueries({
        queryKey: matchDetailQueryKey(matchId),
      });
      toast.success("Kampen er slettet.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Kunne ikke slette kampen.",
      );
    },
  });

  const matches = matchesQuery.data ?? EMPTY_MATCHES;
  const entries = entriesQuery.data ?? EMPTY_ENTRIES;
  const sortedEntries = useMemo(
    () =>
      [...entries].sort((left, right) =>
        left.team.name.localeCompare(right.team.name, "nb", {
          sensitivity: "base",
        }),
      ),
    [entries],
  );
  const entryMap = useMemo(
    () => new Map(entries.map((entry) => [entry.entry.id, entry])),
    [entries],
  );
  const venues = venuesQuery.data ?? EMPTY_VENUES;
  const venueMap = useMemo(
    () => new Map(venues.map((venue) => [venue.id, venue])),
    [venues],
  );
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
        if (leftTime !== rightTime) {
          return leftTime - rightTime;
        }
        // Stable sort by id when kickoff times are equal
        return left.id.localeCompare(right.id);
      }),
    [matches],
  );

  const matchIndexes = useMemo(
    () => matches.map((match) => buildMatchIndex(match, entryMap, venueMap)),
    [entryMap, matches, venueMap],
  );

  const matchIndexById = useMemo(
    () => new Map(matchIndexes.map((match) => [match.id, match])),
    [matchIndexes],
  );

  const roundOptions = useMemo(
    () =>
      Array.from(
        new Set(
          matchIndexes
            .map((match) => match.roundLabel)
            .filter((label): label is string => Boolean(label)),
        ),
      ).sort((left, right) => left.localeCompare(right, "nb")),
    [matchIndexes],
  );

  const groupOptions = useMemo(
    () =>
      Array.from(
        new Set(
          matchIndexes
            .map((match) => match.groupCode)
            .filter((code): code is string => Boolean(code)),
        ),
      ).sort((left, right) => left.localeCompare(right, "nb")),
    [matchIndexes],
  );

  const teamOptions = useMemo(() => {
    const uniqueTeams = new Map<string, { id: string; name: string }>();
    for (const entry of entries) {
      if (!uniqueTeams.has(entry.team.id)) {
        uniqueTeams.set(entry.team.id, {
          id: entry.team.id,
          name: entry.team.name,
        });
      }
    }
    return Array.from(uniqueTeams.values()).sort((left, right) =>
      left.name.localeCompare(right.name, "nb"),
    );
  }, [entries]);

  const filteredMatches = useMemo(() => {
    return sortedMatches.filter((match) => {
      const index = matchIndexById.get(match.id);
      if (!index) {
        return false;
      }
      return doesMatchIndexPassFilters(index, filters);
    });
  }, [filters, matchIndexById, sortedMatches]);

  const groupedMatches = useMemo(
    () => groupMatches(filteredMatches),
    [filteredMatches],
  );
  const activeMatch = editingMatchId
    ? (matches.find((match) => match.id === editingMatchId) ?? null)
    : null;
  const activeMatchLabel = activeMatch
    ? (matchIndexById.get(activeMatch.id)?.matchLabel ??
      activeMatch.code ??
      activeMatch.group_code ??
      "Kamp")
    : "Kamp";

  async function handleSaveMatch(
    matchId: string,
    payload: components["schemas"]["UpdateMatchRequest"],
  ) {
    try {
      await updateMutation.mutateAsync({
        matchId,
        payload,
      });
      return true;
    } catch {
      // handled in mutation callbacks
      return false;
    }
  }

  async function handleDeleteMatch(matchId: string) {
    try {
      await deleteMutation.mutateAsync(matchId);
      return true;
    } catch {
      return false;
    }
  }

  const renderMatchBlock = (match: Match) => {
    const labels = matchIndexById.get(match.id);
    return (
      <MatchSummaryCard
        key={match.id}
        match={match}
        labels={labels}
        view={filters.view}
        onEdit={() => setEditingMatchId(match.id)}
      />
    );
  };

  return (
    <div className="space-y-8">
      <EditionHeader
        editionId={editionId}
        pageTitle="Kamp-administrasjon"
        pageDescription="Oppdater status, poeng og kampdetaljer. Endringer oppdaterer scoreboardet fortløpende."
      />

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
        <>
          <section className="rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              <div className="col-span-2 space-y-1.5 sm:space-y-2 md:col-span-3 lg:col-span-2 xl:col-span-2">
                <label
                  htmlFor="match-search"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Søk
                </label>
                <input
                  id="match-search"
                  value={filters.query}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      query: event.target.value,
                    }))
                  }
                  placeholder="Lag, kode, runde..."
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label
                  htmlFor="match-status"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Status
                </label>
                <select
                  id="match-status"
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value as MatchStatus | "all",
                    }))
                  }
                  className="w-full rounded border border-border px-2 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3"
                >
                  <option value="all">Alle</option>
                  <option value="scheduled">Planlagt</option>
                  <option value="in_progress">Pågår</option>
                  <option value="finalized">Fullført</option>
                  <option value="disputed">Tvist</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label
                  htmlFor="match-round"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Runde
                </label>
                <select
                  id="match-round"
                  value={filters.roundLabel}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      roundLabel: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-border px-2 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3"
                >
                  <option value="all">Alle</option>
                  {roundOptions.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label
                  htmlFor="match-group"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Gruppe
                </label>
                <select
                  id="match-group"
                  value={filters.groupCode}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      groupCode: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-border px-2 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3"
                >
                  <option value="all">Alle</option>
                  {groupOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label
                  htmlFor="match-venue"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Arena
                </label>
                <select
                  id="match-venue"
                  value={filters.venueId}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      venueId: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-border px-2 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3"
                >
                  <option value="all">Alle</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label
                  htmlFor="match-team"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Lag
                </label>
                <select
                  id="match-team"
                  value={filters.teamId}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      teamId: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-border px-2 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3"
                >
                  <option value="all">Alle</option>
                  {teamOptions.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      view: "compact",
                    }))
                  }
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 sm:py-2 ${
                    filters.view === "compact"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 text-foreground hover:bg-primary/5"
                  }`}
                >
                  Kompakt
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      view: "comfortable",
                    }))
                  }
                  className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 sm:py-2 ${
                    filters.view === "comfortable"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 text-foreground hover:bg-primary/5"
                  }`}
                >
                  Komfort
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      query: "",
                      status: "all",
                      roundLabel: "all",
                      groupCode: "all",
                      venueId: "all",
                      teamId: "all",
                    }))
                  }
                  className="rounded-md border border-border/70 px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-primary/5 sm:px-3 sm:py-2"
                >
                  Nullstill
                </button>
              </div>
              <div className="text-xs text-muted-foreground">
                {filteredMatches.length} av {sortedMatches.length} kamper
              </div>
            </div>
          </section>

          {filteredMatches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
              Ingen kamper matcher filteret.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedMatches.length > 1 ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCollapsedGroupKeys(new Set())}
                    className="rounded-md border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-border hover:bg-primary/5"
                  >
                    Åpne alle grupper
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedGroupKeys(
                        new Set(groupedMatches.map((group) => group.key)),
                      )
                    }
                    className="rounded-md border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-border hover:bg-primary/5"
                  >
                    Skjul alle grupper
                  </button>
                </div>
              ) : null}

              {groupedMatches.map((group) => {
                const isCollapsed = collapsedGroupKeys.has(group.key);
                return (
                  <section
                    key={group.key}
                    className="rounded-2xl border border-border/60 bg-card/40 p-4 shadow-sm"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {group.title}
                        </h3>
                        {group.subtitle ? (
                          <p className="text-xs text-muted-foreground">
                            {group.subtitle}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {group.matches.length} kamper
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedGroupKeys((current) => {
                            const next = new Set(current);
                            if (next.has(group.key)) {
                              next.delete(group.key);
                            } else {
                              next.add(group.key);
                            }
                            return next;
                          })
                        }
                        className="rounded-md border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-border hover:bg-primary/5"
                      >
                        {isCollapsed ? "Vis" : "Skjul"}
                      </button>
                    </header>

                    {isCollapsed ? null : (
                      <div className="mt-4 space-y-3">
                        {group.matches.map((match) => renderMatchBlock(match))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog
        open={Boolean(editingMatchId)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMatchId(null);
          }
        }}
      >
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Rediger {activeMatchLabel}</DialogTitle>
          </DialogHeader>
          {activeMatch ? (
            <MatchEditorCard
              match={activeMatch}
              entries={sortedEntries}
              entryMap={entryMap}
              venues={venues}
              isSaving={updateMutation.isPending}
              isDeleting={deleteMutation.isPending}
              onSave={(payload) => handleSaveMatch(activeMatch.id, payload)}
              onDelete={() => handleDeleteMatch(activeMatch.id)}
              onClose={() => setEditingMatchId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type MatchSummaryCardProps = {
  match: Match;
  labels: MatchIndex | undefined;
  view: ResultsView;
  onEdit: () => void;
};

function MatchSummaryCard({
  match,
  labels,
  view,
  onEdit,
}: MatchSummaryCardProps) {
  const kickoffLabel = match.kickoff_at
    ? new Date(match.kickoff_at).toLocaleString("no-NB")
    : "Tidspunkt ikke satt";
  const summaryScore = formatAdminMatchScore(match);
  const summaryLabel =
    labels?.matchLabel ?? match.code ?? match.group_code ?? "Uten kode";
  const showMeta = view === "comfortable";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {summaryLabel}
        </p>
        <p className="text-sm font-semibold text-foreground">
          {labels?.homeLabel ?? match.home_entry_name ?? "Ukjent"} –{" "}
          {labels?.awayLabel ?? match.away_entry_name ?? "Ukjent"}
        </p>
        {showMeta ? (
          <>
            <p className="text-xs text-muted-foreground">{kickoffLabel}</p>
            {labels?.venueName ? (
              <p className="text-xs text-muted-foreground">
                {labels.venueName}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground">
          {statusLabel(match.status)}
        </span>
        <span className="text-sm font-semibold text-foreground">
          {summaryScore}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Rediger
        </button>
      </div>
    </div>
  );
}

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

function MatchEditorCard({
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
  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventRows, setEventRows] = useState<MatchEventDraft[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [eventsDirty, setEventsDirty] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsSaving, setEventsSaving] = useState(false);
  const [pendingEventFocusId, setPendingEventFocusId] = useState<string | null>(
    null,
  );

  useEffect(() => {
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
    setEventRows([]);
    setEventsLoaded(false);
    setEventsDirty(false);
    setEventsError(null);
    setPendingEventFocusId(null);
    setDeleteDialogOpen(false);
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
      if (status !== "finalized") {
        setStatus("finalized");
      }
      setStatusNotice(
        "Resultat registrert. Status settes automatisk til Fullført.",
      );
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
        if (status !== "finalized") {
          setStatus("finalized");
        }
        setStatusNotice(
          "Resultat registrert. Status settes automatisk til Fullført.",
        );
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
      if (!hasHomeEntry || !hasAwayEntry) {
        setMatchError("Velg hjemme- og bortelag før du lagrer.");
        return;
      }
      if (homeEntryId === awayEntryId) {
        setMatchError("Hjemmelag og bortelag kan ikke være det samme.");
        return;
      }
    }

    const optionalScores = resolveOptionalScoresForPayload();
    if (!optionalScores) {
      return;
    }

    const didSave = await onSave(buildMatchPayload(optionalScores));
    if (didSave) {
      setEventsOpen(true);
    }
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
    if (homeEntryId === awayEntryId) {
      setEventsError("Hjemmelag og bortelag kan ikke være det samme.");
      return;
    }

    const optionalScores = resolveOptionalScoresForPayload();
    if (!optionalScores) {
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
          minute: minute ?? 0,
          stoppage_time: stoppageTime ?? undefined,
          squad_member_id: squadMemberId,
        });
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
            onChange={(event) => {
              const nextValue = event.target.value;
              setAwayEntryId(nextValue);
              if (nextValue) {
                setAwayPlaceholder("");
                setAwayPlaceholderTouched(false);
              }
            }}
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

      <div className="mt-4 grid gap-4 md:grid-cols-2">
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
          <p className="text-xs text-muted-foreground">
            Brukes når hjemmelag ikke er valgt.
          </p>
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
          <p className="text-xs text-muted-foreground">
            Brukes når bortelag ikke er valgt.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Resultat
          </p>
          <p className="text-xs text-muted-foreground">
            Ordinær tid + ekstraomganger = sluttresultat. Straffespark vises
            separat og avgjør vinner når kampen ender uavgjort. Bruk Fullført
            når resultatet er endelig, og Tvist hvis resultatet bestrides.
          </p>
          <div className="space-y-2">
            <div className="grid items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 md:grid-cols-[minmax(0,1fr)_96px]">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Hjemmelag
                </p>
                <p className="text-sm font-semibold text-foreground">
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
                className="w-full rounded border border-border px-2 py-1 text-center text-lg font-bold shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3 sm:py-2 sm:text-xl"
              />
            </div>
            <div className="grid items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 md:grid-cols-[minmax(0,1fr)_96px]">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Bortelag
                </p>
                <p className="text-sm font-semibold text-foreground">
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
                className="w-full rounded border border-border px-2 py-1 text-center text-lg font-bold shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3 sm:py-2 sm:text-xl"
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
              Kampstatus
            </label>
            <select
              id={`${idBase}-status`}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as MatchStatus);
                setStatusNotice(null);
              }}
              className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
      </div>

      <div className="mt-6 border-t border-border/60 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Tilleggspoeng
          </h3>
          {optionalScoreError ? (
            <p className="text-xs font-medium text-destructive">
              {optionalScoreError}
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
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
                    handleOptionalScoreChange("homeExtraTime", e.target.value)
                  }
                  className="w-full rounded border border-border px-2 py-1.5 text-center text-sm font-semibold focus:border-primary focus:outline-none"
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
                    handleOptionalScoreChange("awayExtraTime", e.target.value)
                  }
                  className="w-full rounded border border-border px-2 py-1.5 text-center text-sm font-semibold focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
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
                    handleOptionalScoreChange("homePenalties", e.target.value)
                  }
                  className="w-full rounded border border-border px-2 py-1.5 text-center text-sm font-semibold focus:border-primary focus:outline-none"
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
                    handleOptionalScoreChange("awayPenalties", e.target.value)
                  }
                  className="w-full rounded border border-border px-2 py-1.5 text-center text-sm font-semibold focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-border/60 pt-6">
        <button
          type="button"
          onClick={() => setEventsOpen(!eventsOpen)}
          className="flex w-full items-center justify-between text-sm font-semibold text-foreground hover:text-primary"
        >
          <span>Hendelser & Målscorere</span>
          <span className="text-xs font-normal text-muted-foreground">
            {eventsOpen ? "Skjul" : "Vis"}
          </span>
        </button>

        {eventsOpen ? (
          <div className="mt-4 space-y-4">
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
                    + Mål hjemme
                  </button>
                  <button
                    type="button"
                    onClick={() => addGoalRow("away")}
                    className="rounded-md bg-emerald-600/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-600/20 dark:text-emerald-400"
                  >
                    + Mål borte
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
                    Ingen hendelser registrert for denne kampen.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/60">
                          <th className="py-2 pr-2 font-semibold text-muted-foreground uppercase tracking-wider">
                            Side
                          </th>
                          <th className="py-2 pr-2 font-semibold text-muted-foreground uppercase tracking-wider">
                            Type
                          </th>
                          <th className="py-2 pr-2 font-semibold text-muted-foreground uppercase tracking-wider">
                            Spiller
                          </th>
                          <th className="py-2 pr-2 font-semibold text-muted-foreground uppercase tracking-wider">
                            Tid
                          </th>
                          <th className="py-2 font-semibold text-muted-foreground uppercase tracking-wider text-right">
                            Fjern
                          </th>
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
                                className="rounded border border-border bg-transparent px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
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
                                className="rounded border border-border bg-transparent px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="goal">Mål</option>
                                <option value="yellow_card">Gult kort</option>
                                <option value="red_card">Rødt kort</option>
                                <option value="own_goal">Selvmål</option>
                              </select>
                            </td>
                            <td className="py-2 pr-2">
                              <select
                                id={`${idBase}-player-${row.id}`}
                                value={row.membershipId}
                                onChange={(e) =>
                                  updateEventRow(row.id, {
                                    membershipId: e.target.value,
                                    squadMemberId: null,
                                  })
                                }
                                className="max-w-[140px] rounded border border-border bg-transparent px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="">Velg spiller</option>
                                {(row.teamSide === "home"
                                  ? homeRosterOptions
                                  : awayRosterOptions
                                ).map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Min"
                                  value={row.minute}
                                  onChange={(e) =>
                                    updateEventRow(row.id, {
                                      minute: e.target.value,
                                    })
                                  }
                                  className="w-10 rounded border border-border bg-transparent px-1 py-1 text-center focus:outline-none"
                                />
                                <span className="text-muted-foreground">+</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={row.stoppageTime}
                                  onChange={(e) =>
                                    updateEventRow(row.id, {
                                      stoppageTime: e.target.value,
                                    })
                                  }
                                  className="w-8 rounded border border-border bg-transparent px-1 py-1 text-center focus:outline-none"
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
                  >
                    {eventsSaving ? "Lagrer …" : "Lagre hendelser"}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
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

function statusLabel(status: MatchStatus) {
  if (status === "scheduled") return "Planlagt";
  if (status === "in_progress") return "Pågår";
  if (status === "finalized") return "Fullført";
  if (status === "disputed") return "Tvist";
  return status;
}

function formatAdminMatchScore(match: Match) {
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

function groupMatches(matches: Match[]) {
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
    const _venueName = match.venue_id ? "Arena" : null; // Placeholder, real name comes from venueMap in parent

    const groupKey = `${dateKey}`;
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

function buildMatchIndex(
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

function doesMatchIndexPassFilters(index: MatchIndex, filters: ResultsFilters) {
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

function normalizeMatchStatus(status: MatchStatus): MatchStatus {
  return status;
}

function deriveOptionalScoreInputs(match: Match): OptionalScoreInputs {
  return {
    homeExtraTime: match.home_score?.extra_time?.toString() ?? "",
    awayExtraTime: match.away_score?.extra_time?.toString() ?? "",
    homePenalties: match.home_score?.penalties?.toString() ?? "",
    awayPenalties: match.away_score?.penalties?.toString() ?? "",
  };
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseScore(val: string) {
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? 0 : n;
}

function hasAnyScoreValues(h: number, a: number, opt: OptionalScoreInputs) {
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

function resolveOptionalScores(opt: OptionalScoreInputs): {
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

function createEventDraft(
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

function parseMinute(val: string) {
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

function buildRosterOptions(roster: TeamRoster | null) {
  if (!roster) return [];
  return roster.members.map((m: components["schemas"]["TeamMember"]) => ({
    value: m.membership_id ?? m.id,
    label: m.display_name ?? m.name,
  }));
}
