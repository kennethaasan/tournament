"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
  matchDetailQueryKey,
  updateMatch,
} from "@/lib/api/matches-client";
import {
  editionVenuesQueryKey,
  fetchEditionVenues,
  type Venue,
} from "@/lib/api/venues-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/dialog";
import { EditionHeader } from "../edition-dashboard";
import { MatchEditorCard } from "./match-editor-card";
import { MatchSummaryCard } from "./match-summary-card";
import {
  buildMatchIndex,
  doesMatchIndexPassFilters,
  groupMatches,
} from "./results-helpers";
import type { Match, MatchStatus, ResultsFilters } from "./results-types";

const EMPTY_ENTRIES: EntryReview[] = [];
const EMPTY_MATCHES: Match[] = [];
const EMPTY_VENUES: Venue[] = [];

export function ResultsDashboard({ editionId }: { editionId: string }) {
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
      setEditingMatchId(null);
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
                  className="w-full rounded border border-border bg-background px-2 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3"
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
                  className="w-full rounded border border-border bg-background px-2 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3"
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
                  className="w-full rounded border border-border bg-background px-2 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3"
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
                  className="w-full rounded border border-border bg-background px-2 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3"
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
                  className="w-full rounded border border-border bg-background px-2 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:px-3"
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
        <DialogContent size="3xl">
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
              onDelete={async () => {
                try {
                  await deleteMutation.mutateAsync(activeMatch.id);
                  return true;
                } catch {
                  return false;
                }
              }}
              onClose={() => setEditingMatchId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
