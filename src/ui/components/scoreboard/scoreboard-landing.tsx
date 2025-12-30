"use client";

import { useMemo, useState } from "react";
import {
  CountdownBadge,
  EmptyState,
  MatchRowSkeleton,
  SearchInput,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeadRow,
  TableRow,
} from "./scoreboard-shared";
import type {
  LandingLayoutProps,
  MatchSortOption,
  MatchStatusFilter,
  ScoreboardMatch,
  ScoreboardStanding,
  ScoreboardTopScorer,
} from "./scoreboard-ui-types";
import {
  compareMatchesDefault,
  computeMatchStats,
  formatKickoff,
  formatMatchScore,
} from "./scoreboard-utils";

type CollapsibleSectionProps = {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between border-b border-white/10 px-5 py-3 text-left transition hover:bg-white/5"
        aria-expanded={isOpen}
      >
        <h2 className="text-lg font-semibold text-white">
          {title}
          {count !== undefined ? (
            <span className="ml-2 text-sm font-normal text-white/60">
              ({count})
            </span>
          ) : null}
        </h2>
        <svg
          className={`h-5 w-5 text-white/60 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen ? (
        <div className="scoreboard-animate-slide-down">{children}</div>
      ) : null}
    </section>
  );
}

type FilterBarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: MatchStatusFilter;
  onStatusFilterChange: (filter: MatchStatusFilter) => void;
  sortOption: MatchSortOption;
  onSortOptionChange: (option: MatchSortOption) => void;
};

const isLiveMatchStatus = (status: ScoreboardMatch["status"]) =>
  status === "in_progress" || status === "disputed";

function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortOptionChange,
}: FilterBarProps) {
  const statusOptions: Array<{ value: MatchStatusFilter; label: string }> = [
    { value: "all", label: "Alle" },
    { value: "live", label: "Live" },
    { value: "scheduled", label: "Planlagt" },
    { value: "finalized", label: "Ferdig" },
  ];

  const sortOptions: Array<{ value: MatchSortOption; label: string }> = [
    { value: "time", label: "Tid" },
    { value: "venue", label: "Bane" },
    { value: "group", label: "Gruppe" },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full sm:max-w-xs">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Søk lag..."
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter */}
        <div className="flex rounded-lg border border-white/20 bg-white/5 p-0.5">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusFilterChange(option.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                statusFilter === option.value
                  ? "bg-white text-slate-900"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortOption}
          onChange={(e) =>
            onSortOptionChange(e.target.value as MatchSortOption)
          }
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Sorter etter"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              Sorter: {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function LandingLayout({
  data,
  entryNames,
  overlayText,
  hasHighlight,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortOptionChange,
  connectionStatus: _connectionStatus,
  lastUpdated: _lastUpdated,
  isLoading,
}: LandingLayoutProps) {
  // Filter and sort matches
  const filteredMatches = useMemo(() => {
    let matches = [...data.matches];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      matches = matches.filter((match) => {
        const homeName = (
          entryNames.get(match.home.entryId ?? "") ?? match.home.name
        ).toLowerCase();
        const awayName = (
          entryNames.get(match.away.entryId ?? "") ?? match.away.name
        ).toLowerCase();
        return homeName.includes(query) || awayName.includes(query);
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      matches = matches.filter((match) => {
        if (statusFilter === "live") {
          return isLiveMatchStatus(match.status);
        }
        if (statusFilter === "scheduled") {
          return (
            match.status === "scheduled" || isLiveMatchStatus(match.status)
          );
        }
        return match.status === statusFilter;
      });
    }

    // Apply sorting
    matches.sort((a, b) => {
      switch (sortOption) {
        case "venue":
          return (a.venueName ?? "").localeCompare(b.venueName ?? "");
        case "group":
          return (a.groupCode ?? "").localeCompare(b.groupCode ?? "");
        default:
          // Default: time -> venue -> group
          return compareMatchesDefault(a, b);
      }
    });

    return matches;
  }, [data.matches, entryNames, searchQuery, statusFilter, sortOption]);

  const liveMatches = useMemo(
    () =>
      data.matches.filter(
        (m) => m.status === "in_progress" || m.status === "disputed",
      ),
    [data.matches],
  );

  const upcomingMatches = useMemo(
    () =>
      data.matches
        .filter((m) => m.status === "scheduled")
        .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime())
        .slice(0, 4),
    [data.matches],
  );

  const stats = useMemo(() => computeMatchStats(data.matches), [data.matches]);

  return (
    <div className="space-y-6">
      {/* Tournament Stats Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Kamper" value={stats.totalMatches} />
        <StatCard label="Mål" value={stats.totalGoals} />
        <StatCard label="Spilt" value={stats.completedMatches} />
        <StatCard
          label="Live"
          value={stats.liveMatches}
          highlight={stats.liveMatches > 0}
        />
      </div>

      {/* Highlight Banner */}
      {hasHighlight && overlayText ? (
        <div className="rounded-xl border border-white/30 bg-white/15 px-6 py-4 text-sm text-white/90 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">
            Høydepunkt
          </p>
          <p className="text-lg font-semibold">{overlayText}</p>
        </div>
      ) : null}

      {/* Live and Upcoming Matches */}
      <div
        className={`grid gap-6 ${liveMatches.length > 0 ? "lg:grid-cols-2" : ""}`}
      >
        {liveMatches.length > 0 ? (
          <MatchSection
            title="Live nå"
            matches={liveMatches}
            entryNames={entryNames}
            emptyText="Ingen kamper pågår akkurat nå."
            showCountdown={false}
          />
        ) : null}
        <MatchSection
          title="Neste kamper"
          matches={upcomingMatches}
          entryNames={entryNames}
          emptyText="Ingen kommende kamper registrert."
          showCountdown
        />
      </div>

      {/* Full Schedule with Filters */}
      <CollapsibleSection title="Kampoversikt" count={filteredMatches.length}>
        <div className="space-y-4">
          <div className="px-5 pt-5">
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={onStatusFilterChange}
              sortOption={sortOption}
              onSortOptionChange={onSortOptionChange}
            />
          </div>
          {isLoading ? (
            <div className="space-y-0 px-5 pb-5">
              <MatchRowSkeleton />
              <MatchRowSkeleton />
              <MatchRowSkeleton />
            </div>
          ) : (
            <ScheduleTable matches={filteredMatches} entryNames={entryNames} />
          )}
        </div>
      </CollapsibleSection>

      {/* Standings */}
      {data.tables.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.tables.map((table) => (
            <CollapsibleSection
              key={table.groupId}
              title={
                table.groupName
                  ? `Gruppe ${table.groupCode} · ${table.groupName}`
                  : `Gruppe ${table.groupCode}`
              }
              count={table.standings.length}
            >
              <StandingsTableContent
                standings={table.standings}
                entryNames={entryNames}
              />
            </CollapsibleSection>
          ))}
        </div>
      ) : (
        <CollapsibleSection title="Tabell" count={data.standings.length}>
          <StandingsTableContent
            standings={data.standings}
            entryNames={entryNames}
          />
        </CollapsibleSection>
      )}

      {/* Top Scorers */}
      <CollapsibleSection title="Toppscorere" count={data.topScorers.length}>
        <TopScorersContent scorers={data.topScorers} entryNames={entryNames} />
      </CollapsibleSection>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  highlight?: boolean;
};

function StatCard({ label, value, highlight = false }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 text-center backdrop-blur ${
        highlight
          ? "border-red-500/30 bg-red-500/10"
          : "border-white/20 bg-white/5"
      }`}
    >
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs uppercase tracking-wide text-white/60">{label}</p>
    </div>
  );
}

type MatchSectionProps = {
  title: string;
  matches: ScoreboardMatch[];
  entryNames: Map<string, string>;
  emptyText: string;
  showCountdown?: boolean;
};

function MatchSection({
  title,
  matches,
  entryNames,
  emptyText,
  showCountdown = false,
}: MatchSectionProps) {
  return (
    <section className="rounded-xl border border-white/20 bg-white/5 p-5 shadow-xl backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-white">
        {title}
      </h2>

      {matches.length === 0 ? (
        <EmptyState icon="matches" title={emptyText} />
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const homeName = match.home.entryId
              ? (entryNames.get(match.home.entryId) ?? match.home.name)
              : match.home.name;
            const awayName = match.away.entryId
              ? (entryNames.get(match.away.entryId) ?? match.away.name)
              : match.away.name;
            const formattedScore = formatMatchScore(match);
            const showScore = formattedScore.length > 0;
            const isLive =
              match.status === "in_progress" || match.status === "disputed";

            return (
              <article
                key={match.id}
                className={`rounded-lg border px-4 py-3 ${
                  isLive
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-white/10 bg-white/5"
                }`}
                aria-current={isLive ? "true" : undefined}
              >
                <header className="mb-2 flex items-center justify-between gap-2">
                  <StatusBadge status={match.status} />
                  <div className="flex items-center gap-2">
                    {showCountdown && match.status === "scheduled" ? (
                      <CountdownBadge targetDate={match.kickoffAt} />
                    ) : null}
                    <time
                      dateTime={match.kickoffAt.toISOString()}
                      className="text-xs text-white/60"
                    >
                      {formatKickoff(match.kickoffAt)}
                    </time>
                  </div>
                </header>
                <div
                  className={`items-center gap-3 text-lg font-semibold ${
                    showScore
                      ? "grid grid-cols-[1fr_auto_1fr]"
                      : "grid grid-cols-2"
                  }`}
                >
                  <span className="text-left">{homeName}</span>
                  {showScore ? (
                    <span className="rounded-lg border border-white/20 bg-black/20 px-3 py-1 text-center text-xl tabular-nums">
                      {formattedScore}
                    </span>
                  ) : null}
                  <span className="text-right">{awayName}</span>
                </div>
                {match.highlight ? (
                  <p className="mt-2 text-sm text-white/80">
                    {match.highlight}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

type ScheduleTableProps = {
  matches: ScoreboardMatch[];
  entryNames: Map<string, string>;
};

function ScheduleTable({ matches, entryNames }: ScheduleTableProps) {
  if (matches.length === 0) {
    return (
      <div className="px-5 pb-5">
        <EmptyState
          icon="matches"
          title="Ingen kamper funnet"
          description="Prøv et annet søk eller filter"
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full">
        <TableHead>
          <TableHeadRow>
            <TableHeaderCell>Tidspunkt</TableHeaderCell>
            <TableHeaderCell>Kamp</TableHeaderCell>
            <TableHeaderCell>Hjemmelag</TableHeaderCell>
            <TableHeaderCell>Bortelag</TableHeaderCell>
            <TableHeaderCell>Arena</TableHeaderCell>
            <TableHeaderCell align="center">Resultat</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableHeadRow>
        </TableHead>
        <TableBody>
          {matches.map((match) => {
            const isLive =
              match.status === "in_progress" || match.status === "disputed";
            return (
              <TableRow key={match.id} highlight={isLive} current={isLive}>
                <TableCell muted className="text-xs">
                  {formatKickoff(match.kickoffAt)}
                </TableCell>
                <TableCell muted className="text-xs">
                  {match.code ?? match.groupCode ?? "—"}
                </TableCell>
                <TableCell>
                  {match.home.entryId
                    ? (entryNames.get(match.home.entryId) ?? match.home.name)
                    : match.home.name}
                </TableCell>
                <TableCell>
                  {match.away.entryId
                    ? (entryNames.get(match.away.entryId) ?? match.away.name)
                    : match.away.name}
                </TableCell>
                <TableCell muted className="text-xs">
                  {match.venueName ?? "Ikke satt"}
                </TableCell>
                <TableCell
                  align="center"
                  className="font-semibold tabular-nums"
                >
                  {formatMatchScore(match) || "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={match.status} compact />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

type StandingsTableContentProps = {
  standings: ScoreboardStanding[];
  entryNames: Map<string, string>;
};

function StandingsTableContent({
  standings,
  entryNames,
}: StandingsTableContentProps) {
  if (standings.length === 0) {
    return (
      <div className="p-5">
        <EmptyState icon="standings" title="Ingen tabell tilgjengelig enda" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHead>
          <TableHeadRow>
            <TableHeaderCell className="px-5">#</TableHeaderCell>
            <TableHeaderCell className="px-5">Lag</TableHeaderCell>
            <TableHeaderCell align="center" className="px-3">
              K
            </TableHeaderCell>
            <TableHeaderCell align="center" className="px-3">
              V
            </TableHeaderCell>
            <TableHeaderCell align="center" className="px-3">
              U
            </TableHeaderCell>
            <TableHeaderCell align="center" className="px-3">
              T
            </TableHeaderCell>
            <TableHeaderCell align="center" className="px-3">
              Mål
            </TableHeaderCell>
            <TableHeaderCell align="center" className="px-3">
              +/-
            </TableHeaderCell>
            <TableHeaderCell align="center" className="px-3">
              P
            </TableHeaderCell>
          </TableHeadRow>
        </TableHead>
        <TableBody>
          {standings.map((row, index) => (
            <TableRow key={row.entryId} index={index}>
              <TableCell className="px-5 font-semibold">
                {row.position}
              </TableCell>
              <TableCell className="px-5">
                {entryNames.get(row.entryId) ?? row.entryId}
              </TableCell>
              <TableCell align="center" className="px-3">
                {row.played}
              </TableCell>
              <TableCell align="center" className="px-3">
                {row.won}
              </TableCell>
              <TableCell align="center" className="px-3">
                {row.drawn}
              </TableCell>
              <TableCell align="center" className="px-3">
                {row.lost}
              </TableCell>
              <TableCell align="center" className="px-3">
                {row.goalsFor} – {row.goalsAgainst}
              </TableCell>
              <TableCell align="center" className="px-3">
                {row.goalDifference > 0
                  ? `+${row.goalDifference}`
                  : row.goalDifference}
              </TableCell>
              <TableCell align="center" className="px-3 font-semibold">
                {row.points}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type TopScorersContentProps = {
  scorers: ScoreboardTopScorer[];
  entryNames: Map<string, string>;
};

function TopScorersContent({ scorers, entryNames }: TopScorersContentProps) {
  // Show all scorers - no limit
  const rows = scorers;

  if (rows.length === 0) {
    return (
      <div className="p-5">
        <EmptyState
          icon="scorers"
          title="Ingen mål registrert enda"
          description="Spillere vises når kampene starter"
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/5 p-5">
      {rows.map((player, index) => (
        <li
          key={`${player.entryId}-${player.personId}`}
          className="flex items-center justify-between py-3"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
              {index + 1}
            </span>
            <div>
              <p className="font-semibold">{player.name || "Navn mangler"}</p>
              <p className="text-xs text-white/60">
                {entryNames.get(player.entryId) ?? player.entryId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <StatPill label="Mål" value={player.goals} />
            {player.assists > 0 ? (
              <StatPill label="Assist" value={player.assists} />
            ) : null}
            {player.yellowCards > 0 ? (
              <StatPill
                label="Gule"
                value={player.yellowCards}
                variant="warning"
              />
            ) : null}
            {player.redCards > 0 ? (
              <StatPill label="Røde" value={player.redCards} variant="danger" />
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

type StatPillProps = {
  label: string;
  value: number;
  variant?: "default" | "warning" | "danger";
};

function StatPill({ label, value, variant = "default" }: StatPillProps) {
  const variantClasses = {
    default: "border-white/20 bg-white/10",
    warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    danger: "border-red-500/30 bg-red-500/10 text-red-300",
  };

  return (
    <div
      className={`min-w-[3rem] rounded-lg border px-3 py-1 text-center text-xs font-semibold ${variantClasses[variant]}`}
    >
      <p className="text-white/60">{label}</p>
      <p className="text-lg">{value}</p>
    </div>
  );
}
