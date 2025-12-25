"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { components } from "@/lib/api/generated/openapi";
import {
  editionMatchesQueryKey,
  fetchEditionMatches,
  updateMatch,
} from "@/lib/api/matches-client";
import {
  editionVenuesQueryKey,
  fetchEditionVenues,
  type Venue,
} from "@/lib/api/venues-client";

type MatchStatus = components["schemas"]["MatchStatus"];
type Match = components["schemas"]["Match"];

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
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: editionMatchesQueryKey(editionId),
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
  const venues = venuesQuery.data ?? [];
  const isLoading = matchesQuery.isLoading || venuesQuery.isLoading;
  const loadError =
    matchesQuery.error instanceof Error
      ? matchesQuery.error.message
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
  venues: Venue[];
  isSaving: boolean;
  onSave: (
    payload: components["schemas"]["UpdateMatchRequest"],
  ) => Promise<void>;
};

function MatchEditorCard({
  match,
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

  const matchLabel = match.code ?? match.group_code ?? "Uten kode";
  const homeLabel = match.home_entry_name ?? match.home_entry_id ?? "Ukjent";
  const awayLabel = match.away_entry_name ?? match.away_entry_id ?? "Ukjent";
  const idBase = `match-${match.id}`;

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

      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
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
            const payload: components["schemas"]["UpdateMatchRequest"] = {
              status,
              score: {
                home: { regulation: homeScore },
                away: { regulation: awayScore },
              },
            };
            if (kickoffAt) {
              payload.kickoff_at = new Date(kickoffAt).toISOString();
            }
            if (venueId) {
              payload.venue_id = venueId;
            }
            void onSave(payload);
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? "Lagrer …" : "Lagre resultat"}
        </button>
      </div>
    </article>
  );
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
