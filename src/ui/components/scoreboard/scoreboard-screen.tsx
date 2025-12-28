"use client";

import { useMemo } from "react";
import { EmptyState, StatusBadge } from "./scoreboard-shared";
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
  SCREEN_MATCH_LIMIT,
  SCREEN_SCORERS_LIMIT,
  SCREEN_STANDINGS_LIMIT,
} from "./scoreboard-ui-types";
import { formatKickoffTime, formatMatchScore } from "./scoreboard-utils";

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
    () =>
      [...matches].sort(
        (left, right) => left.kickoffAt.getTime() - right.kickoffAt.getTime(),
      ),
    [matches],
  );
  const visibleMatches = useMemo(
    () => orderedMatches.slice(0, SCREEN_MATCH_LIMIT),
    [orderedMatches],
  );
  const visibleStandings = useMemo(
    () => standings.slice(0, SCREEN_STANDINGS_LIMIT),
    [standings],
  );
  const visibleScorers = useMemo(
    () => scorers.slice(0, SCREEN_SCORERS_LIMIT),
    [scorers],
  );
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
    () =>
      visibleMatches.filter(
        (m) => m.status === "in_progress" || m.status === "disputed",
      ),
    [visibleMatches],
  );
  const otherMatches = useMemo(
    () =>
      visibleMatches.filter(
        (m) => m.status !== "in_progress" && m.status !== "disputed",
      ),
    [visibleMatches],
  );

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Highlight Banner */}
      {hasHighlight && overlayText ? (
        <div
          aria-live="polite"
          className={`rounded-xl border border-white/40 bg-white/15 px-6 py-3 text-center shadow-lg backdrop-blur transition-all duration-500 ${
            highlightAnimating ? "animate-slide-in-down" : ""
          }`}
        >
          <p className="text-xl font-bold leading-snug">{overlayText}</p>
        </div>
      ) : null}

      {/* Live Matches - Prominent Display */}
      {liveMatches.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {liveMatches.map((match) => (
            <LiveMatchCard
              key={match.id}
              match={match}
              entryNames={entryNames}
            />
          ))}
        </div>
      ) : null}

      {/* Main Grid */}
      <div className="grid flex-1 gap-4 xl:grid-cols-12">
        {/* Matches Table */}
        <div className="xl:col-span-7">
          <ScreenMatchesTable matches={otherMatches} entryNames={entryNames} />
        </div>

        {/* Standings */}
        <div className="space-y-4 xl:col-span-3">
          {visibleTables.length > 0 ? (
            <ScreenGroupTables tables={visibleTables} entryNames={entryNames} />
          ) : (
            <ScreenStandingsTable
              standings={visibleStandings}
              entryNames={entryNames}
            />
          )}
        </div>

        {/* Top Scorers */}
        <div className="xl:col-span-2">
          <ScreenTopScorersTable
            scorers={visibleScorers}
            entryNames={entryNames}
          />
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
      className="relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-900/30 to-red-800/20 p-4 shadow-lg backdrop-blur"
      aria-current="true"
    >
      {/* Pulsing Live Indicator */}
      <div className="absolute right-3 top-3">
        <StatusBadge status={match.status} />
      </div>

      {/* Match Info */}
      <div className="mb-2 text-xs uppercase tracking-wide text-white/60">
        {match.venueName ?? "Arena"} · {formatKickoffTime(match.kickoffAt)}
      </div>

      {/* Teams and Score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="text-right">
          <p className="text-lg font-bold leading-tight">{homeName}</p>
        </div>
        <div className="rounded-lg bg-black/30 px-4 py-2 text-center">
          <p className="text-3xl font-bold tabular-nums">
            {match.home.score} – {match.away.score}
          </p>
        </div>
        <div className="text-left">
          <p className="text-lg font-bold leading-tight">{awayName}</p>
        </div>
      </div>

      {/* Highlight */}
      {match.highlight ? (
        <p className="mt-3 text-center text-sm text-white/80">
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
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-xl backdrop-blur">
      <div className="border-b border-white/10 px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white">
          Kampoppsett
        </h2>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full table-fixed text-left">
          <thead className="sticky top-0 bg-white/5">
            <tr className="text-xs uppercase tracking-wide text-white/60">
              <th className="w-[8%] px-4 py-2">Tid</th>
              <th className="w-[8%] px-4 py-2">Kamp</th>
              <th className="w-[14%] px-4 py-2">Arena</th>
              <th className="w-[10%] px-4 py-2">Status</th>
              <th className="px-4 py-2">Hjemmelag</th>
              <th className="px-4 py-2">Bortelag</th>
              <th className="w-[10%] px-4 py-2 text-center">Resultat</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {matches.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8">
                  <EmptyState
                    icon="matches"
                    title="Ingen kamper registrert enda"
                    description="Kamper vises her når de er lagt til"
                  />
                </td>
              </tr>
            ) : (
              matches.map((match, index) => {
                const isLive =
                  match.status === "in_progress" || match.status === "disputed";
                return (
                  <tr
                    key={match.id}
                    className={`border-t border-white/5 ${
                      index % 2 === 0 ? "bg-white/[0.03]" : ""
                    } ${isLive ? "bg-red-500/10" : ""}`}
                    aria-current={isLive ? "true" : undefined}
                  >
                    <td className="px-4 py-2 text-white/70">
                      {formatKickoffTime(match.kickoffAt)}
                    </td>
                    <td className="px-4 py-2 text-white/70">
                      {match.code ?? match.groupCode ?? "—"}
                    </td>
                    <td className="truncate px-4 py-2 text-white/70">
                      {match.venueName ?? "Ikke satt"}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={match.status} compact />
                    </td>
                    <td className="truncate px-4 py-2 font-semibold">
                      {match.home.entryId
                        ? (entryNames.get(match.home.entryId) ??
                          match.home.name)
                        : match.home.name}
                    </td>
                    <td className="truncate px-4 py-2 font-semibold">
                      {match.away.entryId
                        ? (entryNames.get(match.away.entryId) ??
                          match.away.name)
                        : match.away.name}
                    </td>
                    <td className="px-4 py-2 text-center font-bold tabular-nums">
                      {formatMatchScore(match) || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type ScreenGroupTablesProps = {
  tables: ScoreboardGroupTable[];
  entryNames: Map<string, string>;
};

function ScreenGroupTables({ tables, entryNames }: ScreenGroupTablesProps) {
  return (
    <div className="space-y-3">
      {tables.map((table) => (
        <ScreenStandingsTable
          key={table.groupId}
          title={
            table.groupName
              ? `Gruppe ${table.groupCode} · ${table.groupName}`
              : `Gruppe ${table.groupCode}`
          }
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
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-xl backdrop-blur">
      <div className="border-b border-white/10 px-4 py-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-white">
          {title}
        </h2>
      </div>
      <div className="overflow-auto">
        <table className="w-full table-fixed text-left text-sm">
          <thead>
            <tr className="text-[0.65rem] uppercase tracking-wide text-white/60">
              <th className="w-[10%] px-3 py-2">#</th>
              <th className="px-3 py-2">Lag</th>
              <th className="w-[10%] px-2 py-2 text-center">K</th>
              <th className="w-[12%] px-2 py-2 text-center">+/-</th>
              <th className="w-[10%] px-2 py-2 text-center">P</th>
            </tr>
          </thead>
          <tbody>
            {standings.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-4 text-center text-sm text-white/50"
                >
                  Ingen tabell enda
                </td>
              </tr>
            ) : (
              standings.map((row, index) => (
                <tr
                  key={row.entryId}
                  className={`border-t border-white/5 ${
                    index % 2 === 0 ? "bg-white/[0.03]" : ""
                  }`}
                >
                  <td className="px-3 py-1.5 font-bold">{row.position}</td>
                  <td className="truncate px-3 py-1.5 font-semibold">
                    {entryNames.get(row.entryId) ?? row.entryId}
                  </td>
                  <td className="px-2 py-1.5 text-center text-white/70">
                    {row.played}
                  </td>
                  <td className="px-2 py-1.5 text-center text-white/70">
                    {row.goalDifference > 0
                      ? `+${row.goalDifference}`
                      : row.goalDifference}
                  </td>
                  <td className="px-2 py-1.5 text-center font-bold">
                    {row.points}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
    <section className="flex h-full flex-col overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-xl backdrop-blur">
      <div className="border-b border-white/10 px-4 py-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-white">
          Toppscorere
        </h2>
      </div>
      <div className="flex-1 overflow-auto">
        {scorers.length === 0 ? (
          <div className="py-4">
            <EmptyState icon="scorers" title="Ingen mål enda" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white/5">
              <tr className="text-[0.65rem] uppercase tracking-wide text-white/60">
                <th className="px-3 py-2">Spiller</th>
                <th className="w-[25%] px-3 py-2 text-center">Mål</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((player, index) => (
                <tr
                  key={`${player.entryId}-${player.personId}`}
                  className={`border-t border-white/5 ${
                    index % 2 === 0 ? "bg-white/[0.03]" : ""
                  }`}
                >
                  <td className="px-3 py-1.5">
                    <p className="truncate font-semibold">
                      {player.name || "Ukjent"}
                    </p>
                    <p className="truncate text-[0.65rem] text-white/50">
                      {entryNames.get(player.entryId) ?? ""}
                    </p>
                  </td>
                  <td className="px-3 py-1.5 text-center text-lg font-bold">
                    {player.goals}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
