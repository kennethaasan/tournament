"use client";

import { useMemo } from "react";
import {
  EmptyState,
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
  ScoreboardGroupTable,
  ScoreboardMatch,
  ScoreboardStanding,
  ScoreboardTopScorer,
  ScreenLayoutProps,
} from "./scoreboard-ui-types";
import {
  SCREEN_GROUP_STANDINGS_LIMIT,
  SCREEN_GROUP_TABLES_LIMIT,
  SCREEN_STANDINGS_LIMIT,
} from "./scoreboard-ui-types";
import {
  compareMatchesDefault,
  formatKickoffTime,
  formatMatchScore,
  isLiveMatch,
} from "./scoreboard-utils";

export function ScreenLayout({
  overlayText,
  hasHighlight,
  highlightAnimating,
  matches,
  standings,
  tables,
  scorers,
  entryNames,
}: ScreenLayoutProps) {
  const orderedMatches = useMemo(
    () => [...matches].sort(compareMatchesDefault),
    [matches],
  );
  // Show all matches - no limit for screen mode
  const visibleMatches = orderedMatches;
  const visibleStandings = useMemo(
    () => standings.slice(0, SCREEN_STANDINGS_LIMIT),
    [standings],
  );
  // Show all scorers - no limit for screen mode (same as matches)
  const visibleScorers = scorers;
  const visibleTables = useMemo(
    () =>
      tables.slice(0, SCREEN_GROUP_TABLES_LIMIT).map((table) => ({
        ...table,
        standings: table.standings.slice(0, SCREEN_GROUP_STANDINGS_LIMIT),
      })),
    [tables],
  );

  // Separate live matches for prominent display
  const liveMatches = useMemo(
    () => visibleMatches.filter((m) => isLiveMatch(m.status)),
    [visibleMatches],
  );
  const scheduleMatches = visibleMatches;

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {/* Highlight Banner */}
      {hasHighlight && overlayText ? (
        <div
          aria-live="polite"
          className={`rounded-lg border border-white/40 bg-white/15 px-3 py-1.5 text-center shadow-lg backdrop-blur transition-all duration-500 ${
            highlightAnimating ? "scoreboard-animate-slide-in-down" : ""
          }`}
        >
          <p className="text-base font-bold leading-snug">{overlayText}</p>
        </div>
      ) : null}

      {/* Live Matches - Prominent Display (compact) */}
      {liveMatches.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {liveMatches.map((match) => (
            <LiveMatchCard
              key={match.id}
              match={match}
              entryNames={entryNames}
            />
          ))}
        </div>
      ) : null}

      {/* Main Layout - matches scroll, sidebars sticky */}
      <div className="flex flex-col gap-2 xl:flex-row">
        {/* Matches Table - scrolls with page */}
        <div className="min-w-0 xl:flex-[8]">
          <ScreenMatchesTable
            matches={scheduleMatches}
            entryNames={entryNames}
          />
        </div>

        {/* Standings - sticky */}
        <div className="xl:flex-[2]">
          <div className="sticky top-3 max-h-[calc(100vh-1rem)] space-y-2 overflow-auto">
            {visibleTables.length > 0 ? (
              <ScreenGroupTables
                tables={visibleTables}
                entryNames={entryNames}
              />
            ) : (
              <ScreenStandingsTable
                standings={visibleStandings}
                entryNames={entryNames}
              />
            )}
          </div>
        </div>

        {/* Top Scorers - sticky */}
        <div className="xl:flex-[2]">
          <div className="sticky top-3 max-h-[calc(100vh-1rem)] overflow-auto">
            <ScreenTopScorersTable
              scorers={visibleScorers}
              entryNames={entryNames}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type LiveMatchCardProps = {
  match: ScoreboardMatch;
  entryNames: Map<string, string>;
};

function LiveMatchCard({ match, entryNames }: LiveMatchCardProps) {
  const homeName = match.home.entryId
    ? (entryNames.get(match.home.entryId) ?? match.home.name)
    : match.home.name;
  const awayName = match.away.entryId
    ? (entryNames.get(match.away.entryId) ?? match.away.name)
    : match.away.name;

  return (
    <article
      className="relative overflow-hidden rounded-lg border border-red-500/30 bg-gradient-to-br from-red-900/30 to-red-800/20 p-3 shadow-lg backdrop-blur"
      aria-current="true"
    >
      {/* Pulsing Live Indicator */}
      <div className="absolute right-2 top-2">
        <StatusBadge status={match.status} compact />
      </div>

      {/* Match Info */}
      <div className="mb-1 text-[0.65rem] uppercase tracking-wide text-white/60">
        {match.venueName ?? "Arena"} · {formatKickoffTime(match.kickoffAt)}
      </div>

      {/* Teams and Score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="text-right">
          <p className="text-base font-bold leading-tight">{homeName}</p>
        </div>
        <div className="rounded bg-black/30 px-3 py-1 text-center">
          <p className="text-3xl font-bold tabular-nums leading-none">
            {formatMatchScore(match) || "—"}
          </p>
        </div>
        <div className="text-left">
          <p className="text-base font-bold leading-tight">{awayName}</p>
        </div>
      </div>

      {/* Highlight */}
      {match.highlight ? (
        <p className="mt-2 text-center text-xs text-white/80">
          {match.highlight}
        </p>
      ) : null}
    </article>
  );
}

type ScreenMatchesTableProps = {
  matches: ScoreboardMatch[];
  entryNames: Map<string, string>;
};

function ScreenMatchesTable({ matches, entryNames }: ScreenMatchesTableProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/20 bg-white/5 shadow-xl backdrop-blur">
      <div className="border-b border-white/10 px-3 py-1">
        <h2 className="text-xs font-bold text-white">
          Kampoppsett ({matches.length} kamper)
        </h2>
      </div>
      <div>
        <Table variant="compact" fixed>
          <TableHead sticky>
            <TableHeadRow variant="compact">
              <TableHeaderCell variant="compact" width="6%">
                Tid
              </TableHeaderCell>
              <TableHeaderCell variant="compact" width="5%">
                Kamp
              </TableHeaderCell>
              <TableHeaderCell variant="compact" width="10%">
                Arena
              </TableHeaderCell>
              <TableHeaderCell variant="compact" width="10%">
                Status
              </TableHeaderCell>
              <TableHeaderCell variant="compact">Hjemmelag</TableHeaderCell>
              <TableHeaderCell variant="compact">Bortelag</TableHeaderCell>
              <TableHeaderCell variant="compact" width="12%" align="center">
                Res.
              </TableHeaderCell>
            </TableHeadRow>
          </TableHead>
          <TableBody>
            {matches.length === 0 ? (
              <tr>
                <TableCell variant="compact" colSpan={7} className="py-8">
                  <EmptyState
                    icon="matches"
                    title="Ingen kamper registrert enda"
                    description="Kamper vises her når de er lagt til"
                  />
                </TableCell>
              </tr>
            ) : (
              matches.map((match, index) => {
                const isLive = isLiveMatch(match.status);
                return (
                  <TableRow
                    key={match.id}
                    index={index}
                    highlight={isLive}
                    current={isLive}
                  >
                    <TableCell variant="compact" muted>
                      {formatKickoffTime(match.kickoffAt)}
                    </TableCell>
                    <TableCell variant="compact" muted>
                      {match.code ?? match.groupCode ?? "—"}
                    </TableCell>
                    <TableCell variant="compact" muted truncate>
                      {match.venueName ?? "—"}
                    </TableCell>
                    <TableCell variant="compact">
                      <StatusBadge status={match.status} compact />
                    </TableCell>
                    <TableCell
                      variant="compact"
                      truncate
                      className="font-medium"
                    >
                      {match.home.entryId
                        ? (entryNames.get(match.home.entryId) ??
                          match.home.name)
                        : match.home.name}
                    </TableCell>
                    <TableCell
                      variant="compact"
                      truncate
                      className="font-medium"
                    >
                      {match.away.entryId
                        ? (entryNames.get(match.away.entryId) ??
                          match.away.name)
                        : match.away.name}
                    </TableCell>
                    <TableCell
                      variant="compact"
                      align="center"
                      bold
                      className="tabular-nums whitespace-nowrap"
                    >
                      {formatMatchScore(match) || "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

type ScreenGroupTablesProps = {
  tables: ScoreboardGroupTable[];
  entryNames: Map<string, string>;
};

function normalizeGroupLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^gruppe\s+/u, "");
}

function isPlaceholderGroupName(value: string): boolean {
  return value.trim().toLowerCase() === "ingen visningsnavn";
}

function formatGroupTitle(
  groupCode?: string | null,
  groupName?: string | null,
) {
  const code = groupCode?.trim() ?? "";
  const rawName = groupName?.trim() ?? "";
  const name = isPlaceholderGroupName(rawName) ? "" : rawName;

  if (!name) {
    return `Gruppe ${code}`;
  }

  if (normalizeGroupLabel(code) === normalizeGroupLabel(name)) {
    return `Gruppe ${code || name}`;
  }

  return `${code} · ${name}`;
}

function ScreenGroupTables({ tables, entryNames }: ScreenGroupTablesProps) {
  return (
    <div className="flex flex-col gap-2">
      {tables.map((table) => (
        <ScreenStandingsTable
          key={table.groupId}
          title={formatGroupTitle(table.groupCode, table.groupName)}
          standings={table.standings}
          entryNames={entryNames}
        />
      ))}
    </div>
  );
}

type ScreenStandingsTableProps = {
  standings: ScoreboardStanding[];
  entryNames: Map<string, string>;
  title?: string;
};

function ScreenStandingsTable({
  standings,
  entryNames,
  title = "Tabell",
}: ScreenStandingsTableProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/20 bg-white/5 shadow-xl backdrop-blur">
      <div className="border-b border-white/10 px-2 py-1">
        <h2 className="text-xs font-bold text-white">{title}</h2>
      </div>
      <div className="overflow-auto">
        <Table variant="compact" fixed>
          <TableHead sticky>
            <TableHeadRow variant="compact">
              <TableHeaderCell variant="compact" width="12%">
                #
              </TableHeaderCell>
              <TableHeaderCell variant="compact">Lag</TableHeaderCell>
              <TableHeaderCell variant="compact" width="14%" align="center">
                K
              </TableHeaderCell>
              <TableHeaderCell variant="compact" width="16%" align="center">
                +/-
              </TableHeaderCell>
              <TableHeaderCell variant="compact" width="14%" align="center">
                P
              </TableHeaderCell>
            </TableHeadRow>
          </TableHead>
          <TableBody>
            {standings.length === 0 ? (
              <tr>
                <TableCell
                  variant="compact"
                  colSpan={5}
                  align="center"
                  className="py-2 text-xs text-white/50"
                >
                  Ingen tabell enda
                </TableCell>
              </tr>
            ) : (
              standings.map((row, index) => (
                <TableRow key={row.entryId} index={index}>
                  <TableCell variant="compact" bold>
                    {row.position}
                  </TableCell>
                  <TableCell variant="compact" truncate className="font-medium">
                    {entryNames.get(row.entryId) ?? row.entryId}
                  </TableCell>
                  <TableCell variant="compact" align="center" muted>
                    {row.played}
                  </TableCell>
                  <TableCell variant="compact" align="center" muted>
                    {row.goalDifference > 0
                      ? `+${row.goalDifference}`
                      : row.goalDifference}
                  </TableCell>
                  <TableCell variant="compact" align="center" bold>
                    {row.points}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

type ScreenTopScorersTableProps = {
  scorers: ScoreboardTopScorer[];
  entryNames: Map<string, string>;
};

function ScreenTopScorersTable({
  scorers,
  entryNames,
}: ScreenTopScorersTableProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-white/20 bg-white/5 shadow-xl backdrop-blur">
      <div className="border-b border-white/10 px-2 py-1">
        <h2 className="text-xs font-bold text-white">Toppscorere</h2>
      </div>
      <div>
        {scorers.length === 0 ? (
          <div className="py-2">
            <EmptyState icon="scorers" title="Ingen mål enda" />
          </div>
        ) : (
          <Table variant="compact">
            <TableHead sticky>
              <TableHeadRow variant="compact">
                <TableHeaderCell variant="compact">Spiller</TableHeaderCell>
                <TableHeaderCell variant="compact" width="30%" align="center">
                  Mål
                </TableHeaderCell>
              </TableHeadRow>
            </TableHead>
            <TableBody>
              {scorers.map((player, index) => (
                <TableRow
                  key={`${player.entryId}-${player.personId}`}
                  index={index}
                >
                  <TableCell variant="compact">
                    <p className="truncate font-medium text-xs leading-tight">
                      {player.name || "Ukjent"}
                    </p>
                    <p className="truncate text-[0.65rem] text-white/50 leading-tight mt-0.5">
                      {entryNames.get(player.entryId) ?? ""}
                    </p>
                  </TableCell>
                  <TableCell
                    variant="compact"
                    align="center"
                    bold
                    className="text-base"
                  >
                    {player.goals}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}
