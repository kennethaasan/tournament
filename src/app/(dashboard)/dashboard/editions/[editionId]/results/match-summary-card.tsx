import { formatAdminMatchScore, statusLabel } from "./results-helpers";
import type { Match, MatchIndex, ResultsView } from "./results-types";

type MatchSummaryCardProps = {
  match: Match;
  labels: MatchIndex | undefined;
  view: ResultsView;
  onEdit: () => void;
};

export function MatchSummaryCard({
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
