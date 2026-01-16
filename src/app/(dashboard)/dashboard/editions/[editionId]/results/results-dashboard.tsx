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
import { ConfirmDialog, Dialog } from "@/ui/components/dialog";
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [filterNotice, setFilterNotice] = useState<{
    matchId: string;
    matchLabel: string;
    status: MatchStatus;
  } | null>(null);
  const [filters, setFilters] = useState<ResultsFilters>({
    query: "",
    status: "all",
    roundLabel: "all",
    groupCode: "all",
    venueId: "all",
    teamId: "all",
    view: "comfortable",
  });
  const [pinnedMatchIds, setPinnedMatchIds] = useState<Set<string>>(
    () => new Set(),
  );
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
      setActionError(null);
    },
    onError: (error) => {
      setActionError(
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
      setPinnedMatchIds((current) => {
        if (!current.has(matchId)) {
          return current;
        }
        const next = new Set(current);
        next.delete(matchId);
        return next;
      });
      setActionError(null);
    },
    onError: (error) => {
      setActionError(
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

  const pinnedMatches = useMemo(
    () => sortedMatches.filter((match) => pinnedMatchIds.has(match.id)),
    [pinnedMatchIds, sortedMatches],
  );

  const filteredMatchesWithoutPinned = useMemo(
    () => filteredMatches.filter((match) => !pinnedMatchIds.has(match.id)),
    [filteredMatches, pinnedMatchIds],
  );

  const groupedMatches = useMemo(
    () => groupMatches(filteredMatchesWithoutPinned),
    [filteredMatchesWithoutPinned],
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

  useEffect(() => {
    setPinnedMatchIds((current) => {
      if (current.size === 0) {
        return current;
      }
      const availableIds = new Set(matches.map((match) => match.id));
      const next = new Set(
        Array.from(current).filter((id) => availableIds.has(id)),
      );
      return next.size === current.size ? current : next;
    });
  }, [matches]);

  async function handleSaveMatch(
    matchId: string,
    payload: components["schemas"]["UpdateMatchRequest"],
  ) {
    setActionError(null);
    try {
      const updatedMatch = await updateMutation.mutateAsync({
        matchId,
        payload,
      });
      const updatedIndex = buildMatchIndex(updatedMatch, entryMap, venueMap);
      setPinnedMatchIds((current) => {
        const next = new Set(current);
        next.add(updatedMatch.id);
        return next;
      });
      if (!doesMatchIndexPassFilters(updatedIndex, filters)) {
        setFilterNotice({
          matchId: updatedMatch.id,
          matchLabel: updatedIndex.matchLabel,
          status: updatedMatch.status,
        });
      } else {
        setFilterNotice(null);
      }
      return true;
    } catch {
      // handled in mutation callbacks
      return false;
    }
  }

  async function handleDeleteMatch(matchId: string) {
    setActionError(null);
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
        <>
          <section className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1 space-y-2">
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
                  placeholder="Lag, kode, runde eller arena"
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="min-w-[160px] space-y-2">
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">Alle</option>
                  <option value="scheduled">Planlagt</option>
                  <option value="in_progress">Pågår</option>
                  <option value="finalized">Fullført</option>
                  <option value="disputed">Tvist</option>
                </select>
              </div>
              <div className="min-w-[160px] space-y-2">
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">Alle</option>
                  {roundOptions.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[160px] space-y-2">
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">Alle</option>
                  {groupOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[160px] space-y-2">
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">Alle</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[180px] space-y-2">
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="all">Alle</option>
                  {teamOptions.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-1 flex-wrap items-center justify-between gap-3 md:justify-end">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        view: "compact",
                      }))
                    }
                    className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
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
                    className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                      filters.view === "comfortable"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/70 text-foreground hover:bg-primary/5"
                    }`}
                  >
                    Komfort
                  </button>
                </div>
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
                  className="rounded-md border border-border/70 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/5"
                >
                  Nullstill
                </button>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Viser {filteredMatches.length} av {sortedMatches.length} kamper.
            </div>
          </section>

          {filterNotice ? (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {filterNotice.matchLabel} er lagret, men filtrert bort.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {statusLabel(filterNotice.status)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPinnedMatchIds((current) => {
                        const next = new Set(current);
                        next.add(filterNotice.matchId);
                        return next;
                      });
                      setFilterNotice(null);
                    }}
                    className="rounded-md border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/70 hover:bg-primary/10"
                  >
                    Vis kampen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters((current) => ({
                        ...current,
                        status: "all",
                      }));
                      setFilterNotice(null);
                    }}
                    className="rounded-md border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-border hover:bg-primary/5"
                  >
                    Fjern statusfilter
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {filteredMatches.length === 0 && pinnedMatches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
              Ingen kamper matcher filteret.
            </div>
          ) : (
            <div className="space-y-4">
              {pinnedMatches.length > 0 ? (
                <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
                  <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Fremhevet kamp
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Festet for rask tilgang mens du oppdaterer.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPinnedMatchIds(new Set())}
                      className="rounded-md border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-border hover:bg-primary/5"
                    >
                      Fjern alle
                    </button>
                  </header>
                  <div className="mt-4 space-y-3">
                    {pinnedMatches.map((match) => renderMatchBlock(match))}
                  </div>
                </section>
              ) : null}

              {filteredMatchesWithoutPinned.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
                  Ingen kamper matcher filteret.
                </div>
              ) : (
                <>
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
                            {group.matches.map((match) =>
                              renderMatchBlock(match),
                            )}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </>
      )}

      <Dialog
        open={Boolean(activeMatch)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMatchId(null);
          }
        }}
        title={`Rediger ${activeMatchLabel}`}
        size="xl"
      >
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
              <div className="flex items-center justify-end">
                <label htmlFor={`${idBase}-home-score`} className="sr-only">
                  Hjemmelag score
                </label>
                <input
                  id={`${idBase}-home-score`}
                  type="number"
                  min={0}
                  value={homeScore}
                  onChange={(event) =>
                    handleScoreChange("home", event.target.value)
                  }
                  className="w-20 rounded border border-border px-3 py-2 text-right text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
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
              <div className="flex items-center justify-end">
                <label htmlFor={`${idBase}-away-score`} className="sr-only">
                  Bortelag score
                </label>
                <input
                  id={`${idBase}-away-score`}
                  type="number"
                  min={0}
                  value={awayScore}
                  onChange={(event) =>
                    handleScoreChange("away", event.target.value)
                  }
                  className="w-20 rounded border border-border px-3 py-2 text-right text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Ekstraomganger (EEO)
              </p>
              <span className="text-xs text-muted-foreground">Valgfritt</span>
            </div>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor={`${idBase}-home-extra`}
                  className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Hjemmelag
                </label>
                <input
                  id={`${idBase}-home-extra`}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={optionalScoreInputs.homeExtraTime}
                  onChange={(event) =>
                    handleOptionalScoreChange(
                      "homeExtraTime",
                      event.target.value,
                    )
                  }
                  className="w-full rounded border border-border px-3 py-2 text-right text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor={`${idBase}-away-extra`}
                  className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Bortelag
                </label>
                <input
                  id={`${idBase}-away-extra`}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={optionalScoreInputs.awayExtraTime}
                  onChange={(event) =>
                    handleOptionalScoreChange(
                      "awayExtraTime",
                      event.target.value,
                    )
                  }
                  className="w-full rounded border border-border px-3 py-2 text-right text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Brukes hvis kampen gikk til ekstraomganger. 0–0 betyr at det ikke
              ble scoret i ekstraomgangene.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Straffesparkkonkurranse (ESP)
              </p>
              <span className="text-xs text-muted-foreground">Valgfritt</span>
            </div>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor={`${idBase}-home-penalties`}
                  className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Hjemmelag
                </label>
                <input
                  id={`${idBase}-home-penalties`}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={optionalScoreInputs.homePenalties}
                  onChange={(event) =>
                    handleOptionalScoreChange(
                      "homePenalties",
                      event.target.value,
                    )
                  }
                  className="w-full rounded border border-border px-3 py-2 text-right text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor={`${idBase}-away-penalties`}
                  className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Bortelag
                </label>
                <input
                  id={`${idBase}-away-penalties`}
                  type="number"
                  min={0}
                  placeholder="0"
                  value={optionalScoreInputs.awayPenalties}
                  onChange={(event) =>
                    handleOptionalScoreChange(
                      "awayPenalties",
                      event.target.value,
                    )
                  }
                  className="w-full rounded border border-border px-3 py-2 text-right text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Brukes kun når kampen avgjøres på straffer. Straffer påvirker ikke
              totalmålet, men vises som ESP på scoreboardet.
            </p>
          </div>
          {optionalScoreError ? (
            <output aria-live="polite" className="text-xs text-destructive">
              {optionalScoreError}
            </output>
          ) : null}
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
            <output aria-live="polite" className="text-xs text-primary">
              {statusNotice}
            </output>
          ) : null}
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
            placeholder="Valgfritt"
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={isSaving || isDeleting}
          onClick={() => setDeleteDialogOpen(true)}
          className="rounded-md border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive transition hover:border-destructive/70 hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Slett kamp
        </button>
        <button
          type="button"
          disabled={isSaving || isDeleting}
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
                              <option value="home">Hjemme · {homeLabel}</option>
                              <option value="away">Borte · {awayLabel}</option>
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
                              placeholder="Valgfritt"
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
                              placeholder="Valgfritt"
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addGoalRow("home")}
                      className="rounded-md border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/70 hover:bg-primary/10"
                    >
                      Hjemmemål ({homeLabel})
                    </button>
                    <button
                      type="button"
                      onClick={() => addGoalRow("away")}
                      className="rounded-md border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/70 hover:bg-primary/10"
                    >
                      Bortemål ({awayLabel})
                    </button>
                    <button
                      type="button"
                      onClick={addEventRow}
                      className="rounded-md border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-border hover:bg-primary/5"
                    >
                      Legg til hendelse
                    </button>
                  </div>
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

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Slett kamp?"
        description={`Dette sletter kampen ${homeLabel} – ${awayLabel}. Alle hendelser blir også fjernet.`}
        confirmLabel="Slett kamp"
        cancelLabel="Avbryt"
        onConfirm={() => {
          void handleDeleteMatch();
        }}
        isLoading={isDeleting}
        variant="danger"
      />
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
      label: formatRosterMemberLabel(member),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "nb"));
}

function formatRosterMemberLabel(member: TeamRoster["members"][number]) {
  const name = member.person.full_name;
  const jerseyNumber = member.jersey_number;
  if (jerseyNumber == null) {
    return name;
  }
  return `#${jerseyNumber} ${name}`;
}

function createEventDraft(
  overrides: Partial<MatchEventDraft> = {},
): MatchEventDraft {
  const base: MatchEventDraft = {
    id:
      typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()),
    teamSide: "home",
    eventType: "goal",
    minute: "",
    stoppageTime: "",
    membershipId: "",
    squadMemberId: null,
  };

  return { ...base, ...overrides };
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

function parseOptionalScoreInput(value: string): {
  value: number | null;
  isValid: boolean;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, isValid: true };
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { value: null, isValid: false };
  }
  return { value: parsed, isValid: true };
}

function hasAnyScoreValues(
  homeScore: number,
  awayScore: number,
  optionalInputs: OptionalScoreInputs,
): boolean {
  if (homeScore !== 0 || awayScore !== 0) {
    return true;
  }
  return (
    optionalInputs.homeExtraTime.trim().length > 0 ||
    optionalInputs.awayExtraTime.trim().length > 0 ||
    optionalInputs.homePenalties.trim().length > 0 ||
    optionalInputs.awayPenalties.trim().length > 0
  );
}

function toLocalInput(value: string) {
  const date = new Date(value);
  const offsetMinutes = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offsetMinutes * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function normalizeMatchStatus(status: MatchStatus): MatchStatus {
  if (status === "extra_time" || status === "penalty_shootout") {
    return "in_progress";
  }
  return status;
}

function deriveOptionalScoreInputs(match: Match): OptionalScoreInputs {
  const homeExtraTime = match.home_score?.extra_time;
  const awayExtraTime = match.away_score?.extra_time;
  const homePenalties = match.home_score?.penalties;
  const awayPenalties = match.away_score?.penalties;
  const hasExtraTime = homeExtraTime != null || awayExtraTime != null;
  const hasPenalties = homePenalties != null || awayPenalties != null;

  return {
    homeExtraTime:
      hasExtraTime && homeExtraTime != null ? String(homeExtraTime) : "",
    awayExtraTime:
      hasExtraTime && awayExtraTime != null ? String(awayExtraTime) : "",
    homePenalties:
      hasPenalties && homePenalties != null ? String(homePenalties) : "",
    awayPenalties:
      hasPenalties && awayPenalties != null ? String(awayPenalties) : "",
  };
}

function resolveOptionalScores(inputs: OptionalScoreInputs): {
  values: OptionalScores;
  error: string | null;
} {
  const homeExtra = parseOptionalScoreInput(inputs.homeExtraTime);
  const awayExtra = parseOptionalScoreInput(inputs.awayExtraTime);
  const homePenalties = parseOptionalScoreInput(inputs.homePenalties);
  const awayPenalties = parseOptionalScoreInput(inputs.awayPenalties);

  if (
    !homeExtra.isValid ||
    !awayExtra.isValid ||
    !homePenalties.isValid ||
    !awayPenalties.isValid
  ) {
    return {
      values: {
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
      },
      error: "Oppgi gyldige tall for ekstraomganger og straffespark.",
    };
  }

  const hasExtraTime = homeExtra.value !== null || awayExtra.value !== null;
  const hasPenalties =
    homePenalties.value !== null || awayPenalties.value !== null;

  return {
    values: {
      homeExtraTime: hasExtraTime ? (homeExtra.value ?? 0) : null,
      awayExtraTime: hasExtraTime ? (awayExtra.value ?? 0) : null,
      homePenalties: hasPenalties ? (homePenalties.value ?? 0) : null,
      awayPenalties: hasPenalties ? (awayPenalties.value ?? 0) : null,
    },
    error: null,
  };
}

function statusLabel(status: MatchStatus) {
  switch (status) {
    case "scheduled":
      return "Planlagt";
    case "in_progress":
      return "Pågår";
    case "extra_time":
    case "penalty_shootout":
      return "Pågår";
    case "finalized":
      return "Fullført";
    case "disputed":
      return "Tvist";
    default:
      return status;
  }
}

function formatAdminMatchScore(match: Match): string {
  const homeRegulation = match.home_score?.regulation ?? 0;
  const awayRegulation = match.away_score?.regulation ?? 0;
  const homeExtraTime = match.home_score?.extra_time ?? 0;
  const awayExtraTime = match.away_score?.extra_time ?? 0;
  const homePenalties = match.home_score?.penalties ?? 0;
  const awayPenalties = match.away_score?.penalties ?? 0;
  const hasExtraTime =
    match.home_score?.extra_time != null ||
    match.away_score?.extra_time != null;
  const hasPenalties =
    match.home_score?.penalties != null || match.away_score?.penalties != null;
  const homeTotal = homeRegulation + homeExtraTime;
  const awayTotal = awayRegulation + awayExtraTime;

  const markers: string[] = [];
  if (hasExtraTime) {
    markers.push("EEO");
  }
  if (hasPenalties) {
    markers.push("ESP");
  }

  const markerLabel = markers.length > 0 ? ` (${markers.join(", ")})` : "";
  const penaltyLabel = hasPenalties
    ? ` ${homePenalties}–${awayPenalties} str.`
    : "";

  return `${homeTotal}–${awayTotal}${markerLabel}${penaltyLabel}`;
}

function buildMatchIndex(
  match: Match,
  entryMap: Map<string, EntryReview>,
  venueMap: Map<string, Venue>,
): MatchIndex {
  const labels = resolveMatchLabels(match, entryMap);
  const venueName =
    (match.venue_id ? venueMap.get(match.venue_id)?.name : null) ??
    match.venue_name ??
    null;
  const searchable = [
    labels.matchLabel,
    labels.homeLabel,
    labels.awayLabel,
    match.round_label,
    match.group_code,
    venueName,
    match.code,
    match.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    id: match.id,
    status: match.status,
    kickoffAt: match.kickoff_at ?? null,
    roundLabel: match.round_label ?? null,
    groupCode: match.group_code ?? null,
    venueId: match.venue_id ?? null,
    venueName,
    homeEntryId: match.home_entry_id ?? null,
    awayEntryId: match.away_entry_id ?? null,
    homeTeamId: labels.homeTeamId,
    awayTeamId: labels.awayTeamId,
    homeLabel: labels.homeLabel,
    awayLabel: labels.awayLabel,
    matchLabel: labels.matchLabel,
    searchable,
  };
}

function doesMatchIndexPassFilters(index: MatchIndex, filters: ResultsFilters) {
  if (filters.status !== "all") {
    if (filters.status === "in_progress") {
      if (
        index.status !== "in_progress" &&
        index.status !== "extra_time" &&
        index.status !== "penalty_shootout"
      ) {
        return false;
      }
    } else if (index.status !== filters.status) {
      return false;
    }
  }
  if (filters.roundLabel !== "all" && index.roundLabel !== filters.roundLabel) {
    return false;
  }
  if (filters.groupCode !== "all" && index.groupCode !== filters.groupCode) {
    return false;
  }
  if (filters.venueId !== "all" && index.venueId !== filters.venueId) {
    return false;
  }
  if (
    filters.teamId !== "all" &&
    index.homeTeamId !== filters.teamId &&
    index.awayTeamId !== filters.teamId
  ) {
    return false;
  }
  const query = filters.query.trim().toLowerCase();
  if (query.length > 0 && !index.searchable.includes(query)) {
    return false;
  }
  return true;
}

type MatchGroup = {
  key: string;
  title: string;
  subtitle: string | null;
  matches: Match[];
};

function groupMatches(matches: Match[]): MatchGroup[] {
  const groups: MatchGroup[] = [];
  const groupMap = new Map<string, MatchGroup>();

  for (const match of matches) {
    const roundLabel = match.round_label ?? "Ukjent runde";
    const subtitle = match.group_code ? `Gruppe ${match.group_code}` : null;
    const key = `${roundLabel}::${match.group_code ?? "none"}`;

    const existing = groupMap.get(key);
    if (existing) {
      existing.matches.push(match);
      continue;
    }

    const group: MatchGroup = {
      key,
      title: roundLabel,
      subtitle,
      matches: [match],
    };
    groupMap.set(key, group);
    groups.push(group);
  }

  return groups;
}

function resolveMatchLabels(match: Match, entryMap: Map<string, EntryReview>) {
  const homeEntry = match.home_entry_id
    ? (entryMap.get(match.home_entry_id) ?? null)
    : null;
  const awayEntry = match.away_entry_id
    ? (entryMap.get(match.away_entry_id) ?? null)
    : null;

  const matchLabel = match.code?.trim() || match.group_code || "Uten kode";

  return {
    matchLabel,
    homeLabel:
      homeEntry?.team.name ??
      match.home_entry_name ??
      match.home_entry_id ??
      "Ukjent",
    awayLabel:
      awayEntry?.team.name ??
      match.away_entry_name ??
      match.away_entry_id ??
      "Ukjent",
    homeTeamId: homeEntry?.team.id ?? null,
    awayTeamId: awayEntry?.team.id ?? null,
  };
}
