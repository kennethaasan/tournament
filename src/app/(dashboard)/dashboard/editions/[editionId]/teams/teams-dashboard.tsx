"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  type EntryReview,
  editionEntriesQueryKey,
  fetchEditionEntries,
} from "@/lib/api/entries-client";
import { Badge } from "@/ui/components/badge";

type EditionTeamsDashboardProps = {
  editionId: string;
};

type EntryStatus = EntryReview["entry"]["status"];

export function EditionTeamsDashboard({
  editionId,
}: EditionTeamsDashboardProps) {
  const entriesQuery = useQuery({
    queryKey: editionEntriesQueryKey(editionId),
    queryFn: ({ signal }) => fetchEditionEntries(editionId, { signal }),
  });

  const entries = entriesQuery.data ?? [];
  const loadError =
    entriesQuery.error instanceof Error ? entriesQuery.error.message : null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Utgave · Lag og tropp
        </p>
        <h1 className="text-3xl font-bold text-foreground">Lagoversikt</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Her finner du lagene som er påmeldt denne utgaven. Bruk «Stall» for å
          legge til eller oppdatere spillere.
        </p>
      </header>

      {entriesQuery.isLoading ? (
        <div className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          Laster lag …
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          Ingen lag er registrert for denne utgaven ennå.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((item) => {
            const entry = item.entry;
            return (
              <article
                key={entry.id}
                className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {item.team.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.team.slug}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Påmelding:{" "}
                      {entry.submitted_at
                        ? new Date(entry.submitted_at).toLocaleString("no-NB")
                        : "Ikke registrert"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(entry.status)}>
                      {statusLabel(entry.status)}
                    </Badge>
                    <Link
                      href={`/dashboard/teams/${item.team.id}/roster`}
                      className="rounded-full border border-border/70 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/10"
                    >
                      Stall
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function statusLabel(status: EntryStatus) {
  switch (status) {
    case "pending":
      return "Venter";
    case "approved":
      return "Godkjent";
    case "rejected":
      return "Avvist";
    case "withdrawn":
      return "Trukket";
    default:
      return status;
  }
}

function statusVariant(status: EntryStatus) {
  switch (status) {
    case "approved":
      return "accent";
    case "pending":
      return "outline";
    case "rejected":
    case "withdrawn":
      return "default";
    default:
      return "outline";
  }
}
