"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  DEFAULT_ROTATION,
  type ScoreboardData,
  type ScoreboardMatch,
  type ScoreboardStanding,
  type ScoreboardTopScorer,
} from "@/modules/public/scoreboard-types";
import { useScoreboardPoll } from "@/ui/hooks/useScoreboardPoll";

type ProvidersProps = {
  children: React.ReactNode;
};

type ScoreboardScreenProps = {
  initialData: ScoreboardData;
  competitionSlug: string;
  editionSlug: string;
};

export function ScoreboardProviders({ children }: ProvidersProps) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function ScoreboardScreen({
  initialData,
  competitionSlug,
  editionSlug,
}: ScoreboardScreenProps) {
  const query = useScoreboardPoll({
    competitionSlug,
    editionSlug,
    initialData,
  });

  const data = query.data ?? initialData;
  const theme = data.edition.scoreboardTheme;
  const entryNames = useMemo(
    () => new Map(data.entries.map((entry) => [entry.id, entry.name])),
    [data.entries],
  );
  const liveMatches = data.matches.filter(
    (match) => match.status === "in_progress" || match.status === "disputed",
  );
  const upcomingMatches = data.matches.filter(
    (match) => match.status === "scheduled",
  );
  const completedMatches = data.matches.filter(
    (match) => match.status === "finalized",
  );

  const rotation = data.rotation.length ? data.rotation : DEFAULT_ROTATION;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)`,
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-10 text-white sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-white/20 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-white/70">
              Public scoreboard
            </p>
            <h1 className="text-3xl font-semibold">
              {data.edition.label} · {data.edition.slug}
            </h1>
            <p className="text-sm text-white/80">
              Updates every {data.edition.scoreboardRotationSeconds} seconds
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/70">
            {rotation.map((section) => (
              <span
                key={section}
                className="rounded-full border border-white/30 px-3 py-1"
              >
                {sectionLabel(section)}
              </span>
            ))}
          </div>
        </header>

        {data.overlayMessage ? (
          <div
            aria-live="polite"
            className="mb-8 rounded-2xl border border-white/40 bg-white/10 px-6 py-4 text-center text-lg font-semibold shadow-lg backdrop-blur"
          >
            {data.overlayMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <MatchSection
            title="Live now"
            matches={liveMatches}
            emptyText="No games are live right now."
          />
          <MatchSection
            title="Coming up"
            matches={upcomingMatches}
            fallbackMatches={completedMatches}
            emptyText="No upcoming games found."
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <StandingsTable standings={data.standings} entryNames={entryNames} />
          <TopScorersList scorers={data.topScorers} entryNames={entryNames} />
        </div>
      </div>
    </div>
  );
}

type MatchSectionProps = {
  title: string;
  matches: ScoreboardMatch[];
  fallbackMatches?: ScoreboardMatch[];
  emptyText: string;
};

function MatchSection({
  title,
  matches,
  fallbackMatches = [],
  emptyText,
}: MatchSectionProps) {
  const rows = matches.length ? matches : fallbackMatches.slice(0, 3);

  return (
    <section className="rounded-3xl border border-white/20 bg-white/5 p-5 shadow-xl backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-white">
        {title}
      </h2>

      {rows.length === 0 ? (
        <p className="text-sm text-white/70">{emptyText}</p>
      ) : (
        <div className="space-y-4">
          {rows.map((match) => (
            <article
              key={match.id}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <header className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
                <span>{statusLabel(match.status)}</span>
                <time dateTime={match.kickoffAt.toISOString()}>
                  {formatKickoff(match.kickoffAt)}
                </time>
              </header>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-lg font-semibold">
                <span className="text-left">{match.home.name}</span>
                <span className="rounded-2xl border border-white/20 px-3 py-1 text-center text-xl">
                  {match.home.score} – {match.away.score}
                </span>
                <span className="text-right">{match.away.name}</span>
              </div>
              {match.highlight ? (
                <p className="mt-2 text-sm text-white/80">{match.highlight}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type StandingsProps = {
  standings: ScoreboardStanding[];
  entryNames: Map<string, string>;
};

function StandingsTable({ standings, entryNames }: StandingsProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/20 bg-white/5 shadow-xl backdrop-blur">
      <header className="border-b border-white/10 px-5 py-3 text-lg font-semibold uppercase tracking-wide text-white">
        Standings
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-white/90">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-white/60">
              <th className="px-5 py-2">#</th>
              <th className="px-5 py-2">Team</th>
              <th className="px-3 py-2 text-center">P</th>
              <th className="px-3 py-2 text-center">W</th>
              <th className="px-3 py-2 text-center">D</th>
              <th className="px-3 py-2 text-center">L</th>
              <th className="px-3 py-2 text-center">Goals</th>
              <th className="px-3 py-2 text-center">+/-</th>
              <th className="px-3 py-2 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.length === 0 ? (
              <tr>
                <td className="px-5 py-4 text-center text-white/70" colSpan={9}>
                  No standings available yet.
                </td>
              </tr>
            ) : (
              standings.slice(0, 8).map((row) => (
                <tr key={row.entryId} className="border-t border-white/5">
                  <td className="px-5 py-2 font-semibold">{row.position}</td>
                  <td className="px-5 py-2">
                    {entryNames.get(row.entryId) ?? row.entryId}
                  </td>
                  <td className="px-3 py-2 text-center">{row.played}</td>
                  <td className="px-3 py-2 text-center">{row.won}</td>
                  <td className="px-3 py-2 text-center">{row.drawn}</td>
                  <td className="px-3 py-2 text-center">{row.lost}</td>
                  <td className="px-3 py-2 text-center">
                    {row.goalsFor} – {row.goalsAgainst}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {row.goalDifference}
                  </td>
                  <td className="px-3 py-2 text-center font-semibold">
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

type TopScorersProps = {
  scorers: ScoreboardTopScorer[];
  entryNames: Map<string, string>;
};

function TopScorersList({ scorers, entryNames }: TopScorersProps) {
  const rows = useMemo(() => scorers.slice(0, 8), [scorers]);

  return (
    <section className="rounded-3xl border border-white/20 bg-white/5 p-5 shadow-xl backdrop-blur">
      <header className="mb-4 text-lg font-semibold uppercase tracking-wide text-white">
        Top scorers
      </header>
      {rows.length === 0 ? (
        <p className="text-sm text-white/70">
          No scorers have been recorded yet. Once matches begin, players will
          show up here.
        </p>
      ) : (
        <ul className="space-y-3 text-sm">
          {rows.map((player) => (
            <li
              key={`${player.entryId}-${player.personId}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-base font-semibold">
                  {player.name || "Name unavailable"}
                </p>
                <p className="text-xs text-white/70">
                  {entryNames.get(player.entryId) ?? player.entryId}
                </p>
              </div>
              <div className="flex items-center gap-4 text-right">
                <StatPill label="Goals" value={player.goals} />
                <StatPill label="Assists" value={player.assists} />
                <StatPill label="Yellow" value={player.yellowCards} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type StatPillProps = {
  label: string;
  value: number;
};

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="min-w-[3rem] rounded-2xl border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
      <p className="text-white/70">{label}</p>
      <p className="text-lg text-white">{value}</p>
    </div>
  );
}

function statusLabel(status: ScoreboardMatch["status"]): string {
  switch (status) {
    case "in_progress":
      return "Live";
    case "disputed":
      return "Disputed";
    case "finalized":
      return "Final";
    default:
      return "Scheduled";
  }
}

function sectionLabel(section: string): string {
  switch (section) {
    case "live_matches":
      return "Live";
    case "upcoming":
      return "Upcoming";
    case "standings":
      return "Standings";
    case "top_scorers":
      return "Top scorers";
    default:
      return section;
  }
}

function formatKickoff(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
