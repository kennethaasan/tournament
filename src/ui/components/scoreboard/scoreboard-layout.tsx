"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ScoreboardData,
  ScoreboardGroupTable,
  ScoreboardMatch,
  ScoreboardStanding,
  ScoreboardTopScorer,
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

type ScoreboardMode = "landing" | "screen";
type SeasonTheme =
  | "auto"
  | "christmas"
  | "winter"
  | "spring"
  | "summer"
  | "fall";
type ThemeSource = "competition" | "season";

const FULL_HD_WIDTH = 1920;
const FULL_HD_HEIGHT = 1080;
const SEASON_THEME_STORAGE_KEY = "scoreboard-season-theme";
const THEME_SOURCE_STORAGE_KEY = "scoreboard-theme-source";
const SCREEN_MATCH_LIMIT = 60;
const SCREEN_STANDINGS_LIMIT = 8;
const SCREEN_GROUP_TABLES_LIMIT = 6;
const SCREEN_GROUP_STANDINGS_LIMIT = 5;
const SCREEN_SCORERS_LIMIT = 30;

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
  const params = useParams<{
    competitionSlug?: string;
    editionSlug?: string;
  }>();
  const searchParams = useSearchParams();
  const resolvedCompetitionSlug =
    params?.competitionSlug ??
    competitionSlug ??
    initialData.edition.competitionSlug ??
    null;
  const resolvedEditionSlug =
    params?.editionSlug ?? editionSlug ?? initialData.edition.slug;

  const query = useScoreboardPoll({
    competitionSlug: resolvedCompetitionSlug ?? undefined,
    editionSlug: resolvedEditionSlug,
    initialData,
  });

  const data = query.data ?? initialData;
  const [overlayText, setOverlayText] = useState<string>(() =>
    deriveOverlayMessage(data),
  );
  const [mode, setMode] = useState<ScoreboardMode>("landing");
  const theme = data.edition.scoreboardTheme;
  const entryNames = useMemo(
    () => new Map(data.entries.map((entry) => [entry.id, entry.name])),
    [data.entries],
  );
  const scheduleSummary = useMemo(
    () => deriveScheduleSummary(data.matches),
    [data.matches],
  );
  const venueSummary = useMemo(
    () => deriveVenueSummary(data.matches),
    [data.matches],
  );
  const headerMeta = useMemo(() => {
    const parts: string[] = [];
    if (scheduleSummary) {
      parts.push(`Dato: ${scheduleSummary}`);
    }
    if (venueSummary) {
      parts.push(`Arena: ${venueSummary}`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [scheduleSummary, venueSummary]);

  const lastUpdated = query.dataUpdatedAt
    ? new Date(query.dataUpdatedAt)
    : null;
  const themeOverrideParam = searchParams?.get("theme") ?? null;
  const [themePreference, setThemePreference] = useState<SeasonTheme>("auto");
  const [themeSource, setThemeSource] = useState<ThemeSource>("season");
  const seasonFromPreference =
    themePreference === "auto"
      ? deriveSeasonTheme(new Date())
      : themePreference;
  const useSeasonTheme = themeSource === "season";
  const isSnowing =
    useSeasonTheme &&
    (seasonFromPreference === "winter" || seasonFromPreference === "christmas");
  const isChristmasTheme =
    useSeasonTheme && seasonFromPreference === "christmas";

  useEffect(() => {
    setOverlayText(deriveOverlayMessage(data));
  }, [data]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return;
    }
    const override = parseSeasonTheme(themeOverrideParam);
    const stored = parseSeasonTheme(storage.getItem(SEASON_THEME_STORAGE_KEY));
    setThemePreference(override ?? stored ?? "auto");
  }, [themeOverrideParam]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return;
    }
    const stored = parseThemeSource(storage.getItem(THEME_SOURCE_STORAGE_KEY));
    setThemeSource(stored ?? "season");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return;
    }
    const stored = storage.getItem("scoreboard-mode");
    if (stored === "landing" || stored === "screen") {
      setMode(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }
    storage.setItem("scoreboard-mode", mode);
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }
    storage.setItem(SEASON_THEME_STORAGE_KEY, themePreference);
  }, [themePreference]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }
    storage.setItem(THEME_SOURCE_STORAGE_KEY, themeSource);
  }, [themeSource]);

  const hasHighlight = Boolean(
    data.overlayMessage || data.matches.find((match) => match.highlight),
  );

  const content = (
    <div
      className={`mx-auto text-white ${
        mode === "screen"
          ? "w-full max-w-[1920px] px-6 py-5 2xl:px-8 2xl:py-6"
          : "max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8 2xl:max-w-[1680px]"
      }`}
    >
      <header
        className={`grid gap-2 border-b border-white/20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center ${
          mode === "screen" ? "mb-3 pb-2" : "mb-8 pb-4"
        }`}
      >
        <div className={mode === "screen" ? "space-y-0.5" : "space-y-2"}>
          <p
            className={
              mode === "screen"
                ? "text-[0.65rem] uppercase tracking-[0.2em] text-white/70"
                : "text-sm uppercase tracking-[0.2em] text-white/70"
            }
          >
            Offentlig visning
          </p>
          <h1
            className={
              mode === "screen"
                ? "text-xl font-semibold leading-tight"
                : "text-3xl font-semibold"
            }
          >
            {data.edition.label}
          </h1>
          {mode === "screen" ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
              <span className="font-medium">
                {data.edition.slug}
                {data.edition.competitionSlug
                  ? ` · ${data.edition.competitionSlug}`
                  : ""}
              </span>
              {headerMeta ? (
                <span className="text-white/70">{headerMeta}</span>
              ) : null}
              <span className="text-white/70">
                Oppdateres hvert {data.edition.scoreboardRotationSeconds}{" "}
                sekunder
              </span>
              {lastUpdated ? (
                <span className="text-white/60">
                  Sist oppdatert {formatTimestamp(lastUpdated)}
                </span>
              ) : null}
            </div>
          ) : (
            <>
              <p className="text-lg font-medium text-white/80">
                {data.edition.slug}
                {data.edition.competitionSlug
                  ? ` · ${data.edition.competitionSlug}`
                  : ""}
              </p>
              {headerMeta ? (
                <p className="text-sm text-white/80">{headerMeta}</p>
              ) : null}
              <p className="text-sm text-white/80">
                Oppdateres hvert {data.edition.scoreboardRotationSeconds}{" "}
                sekunder
              </p>
              {lastUpdated ? (
                <p className="text-xs text-white/60">
                  Sist oppdatert {formatTimestamp(lastUpdated)}
                </p>
              ) : null}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModeToggle mode={mode} onChange={setMode} />
          <ThemeControls
            source={themeSource}
            onSourceChange={setThemeSource}
            season={themePreference}
            onSeasonChange={setThemePreference}
            showSeason={useSeasonTheme}
          />
          {mode === "screen" ? null : null}
        </div>
      </header>

      {mode === "screen" ? (
        <ScreenLayout
          overlayText={overlayText}
          hasHighlight={hasHighlight}
          matches={data.matches}
          standings={data.standings}
          tables={data.tables}
          scorers={data.topScorers}
          entryNames={entryNames}
        />
      ) : (
        <LandingLayout
          data={data}
          entryNames={entryNames}
          hasHighlight={hasHighlight}
          overlayText={overlayText}
        />
      )}
    </div>
  );

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundImage: useSeasonTheme
          ? `${seasonGradient(seasonFromPreference)}, linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)`
          : `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)`,
      }}
    >
      {theme.backgroundImageUrl ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${theme.backgroundImageUrl})` }}
        />
      ) : null}
      {isSnowing ? (
        <SnowBackdrop
          variant={
            seasonFromPreference === "christmas" ? "christmas" : "winter"
          }
        />
      ) : null}
      {isChristmasTheme ? <HolidayGlow /> : null}
      {mode === "screen" ? <FullHdFrame>{content}</FullHdFrame> : content}
    </div>
  );
}

type ModeToggleProps = {
  mode: ScoreboardMode;
  onChange: (mode: ScoreboardMode) => void;
};

function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 p-1 text-xs font-semibold">
      <button
        type="button"
        onClick={() => onChange("landing")}
        aria-pressed={mode === "landing"}
        className={`rounded-lg px-3 py-1 transition ${
          mode === "landing"
            ? "bg-white text-slate-900"
            : "text-white/80 hover:text-white"
        }`}
      >
        Publikumsvisning
      </button>
      <button
        type="button"
        onClick={() => onChange("screen")}
        aria-pressed={mode === "screen"}
        className={`rounded-lg px-3 py-1 transition ${
          mode === "screen"
            ? "bg-white text-slate-900"
            : "text-white/80 hover:text-white"
        }`}
      >
        Storskjerm
      </button>
    </div>
  );
}

type SeasonToggleProps = {
  value: SeasonTheme;
  onChange: (value: SeasonTheme) => void;
};

type ThemeSourceSelectProps = {
  value: ThemeSource;
  onChange: (value: ThemeSource) => void;
};

type ThemeControlsProps = {
  source: ThemeSource;
  onSourceChange: (value: ThemeSource) => void;
  season: SeasonTheme;
  onSeasonChange: (value: SeasonTheme) => void;
  showSeason: boolean;
};

function ThemeControls({
  source,
  onSourceChange,
  season,
  onSeasonChange,
  showSeason,
}: ThemeControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold">
      <ThemeSourceSelect value={source} onChange={onSourceChange} />
      {showSeason ? (
        <SeasonSelect value={season} onChange={onSeasonChange} />
      ) : null}
    </div>
  );
}

function ThemeSourceSelect({ value, onChange }: ThemeSourceSelectProps) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[0.65rem] uppercase tracking-wide text-white/70">
        Tema
      </span>
      <select
        aria-label="Velg temakilde"
        value={value}
        onChange={(event) => onChange(event.target.value as ThemeSource)}
        className="rounded-lg border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white outline-none"
      >
        <option value="season">Sesong</option>
        <option value="competition">Konkurranse</option>
      </select>
    </label>
  );
}

function SeasonSelect({ value, onChange }: SeasonToggleProps) {
  const options: Array<{ value: SeasonTheme; label: string }> = [
    { value: "auto", label: "Standard" },
    { value: "christmas", label: "Jul" },
    { value: "winter", label: "Vinter" },
    { value: "spring", label: "Vår" },
    { value: "summer", label: "Sommer" },
    { value: "fall", label: "Høst" },
  ];

  return (
    <label className="flex items-center gap-2">
      <span className="text-[0.65rem] uppercase tracking-wide text-white/70">
        Sesong
      </span>
      <select
        aria-label="Velg sesongtema"
        value={value}
        onChange={(event) => onChange(event.target.value as SeasonTheme)}
        className="rounded-lg border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type SnowBackdropProps = {
  variant: "winter" | "christmas";
};

function SnowBackdrop({ variant }: SnowBackdropProps) {
  return (
    <>
      <style>
        {`
          @keyframes scoreboard-snow {
            0% { background-position: 0 0, 0 0, 0 0; }
            100% { background-position: 400px 900px, 240px 500px, 120px 300px; }
          }
        `}
      </style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80 mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.9) 55%, transparent 60%), radial-gradient(1.5px 1.5px at 120px 80px, rgba(255,255,255,0.8) 55%, transparent 60%), radial-gradient(2px 2px at 60px 140px, rgba(255,255,255,0.6) 55%, transparent 60%)",
          backgroundSize: "180px 180px, 260px 260px, 340px 340px",
          animation:
            variant === "christmas"
              ? "scoreboard-snow 16s linear infinite"
              : "scoreboard-snow 20s linear infinite",
        }}
      />
    </>
  );
}

function HolidayGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 55%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.15), transparent 45%), radial-gradient(circle at 50% 90%, rgba(255,200,200,0.15), transparent 50%)",
      }}
    />
  );
}

type FullHdFrameProps = {
  children: React.ReactNode;
};

function FullHdFrame({ children }: FullHdFrameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      return;
    }

    const updateScale = () => {
      const availableWidth = Math.min(container.clientWidth, FULL_HD_WIDTH);
      const availableHeight = Math.min(container.clientHeight, FULL_HD_HEIGHT);
      const contentWidth = Math.max(content.scrollWidth, FULL_HD_WIDTH);
      const contentHeight = Math.max(content.scrollHeight, FULL_HD_HEIGHT);
      const widthScale = availableWidth / contentWidth;
      const heightScale = availableHeight / contentHeight;
      const nextScale = Math.min(1, widthScale, heightScale);

      setScale((previous) =>
        Math.abs(previous - nextScale) > 0.001 ? nextScale : previous,
      );
    };

    updateScale();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateScale);
    resizeObserver?.observe(container);
    resizeObserver?.observe(content);
    window.addEventListener("resize", updateScale);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen w-full items-start justify-center overflow-hidden"
    >
      <div className="origin-top" style={{ transform: `scale(${scale})` }}>
        <div ref={contentRef} className="w-[1920px]">
          {children}
        </div>
      </div>
    </div>
  );
}

type ScreenLayoutProps = {
  overlayText: string;
  hasHighlight: boolean;
  matches: ScoreboardMatch[];
  standings: ScoreboardStanding[];
  tables: ScoreboardGroupTable[];
  scorers: ScoreboardTopScorer[];
  entryNames: Map<string, string>;
};

function ScreenLayout({
  overlayText,
  hasHighlight,
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

  return (
    <>
      {hasHighlight ? (
        <div
          aria-live="polite"
          className="mb-2 rounded-lg border border-white/40 bg-white/10 px-5 py-1.5 text-center text-sm font-semibold leading-snug shadow-lg backdrop-blur"
        >
          {overlayText}
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <ScreenMatchesTable
            matches={visibleMatches}
            entryNames={entryNames}
          />
        </div>
        <div className="xl:col-span-3 space-y-3">
          {visibleTables.length > 0 ? (
            <ScreenGroupTables tables={visibleTables} entryNames={entryNames} />
          ) : (
            <ScreenStandingsTable
              standings={visibleStandings}
              entryNames={entryNames}
            />
          )}
        </div>
        <div className="xl:col-span-2">
          <ScreenTopScorersTable scorers={visibleScorers} />
        </div>
      </div>
    </>
  );
}

type ScreenGroupTablesProps = {
  tables: ScoreboardGroupTable[];
  entryNames: Map<string, string>;
};

function ScreenGroupTables({ tables, entryNames }: ScreenGroupTablesProps) {
  return (
    <div className="space-y-2">
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

type LandingLayoutProps = {
  data: ScoreboardData;
  entryNames: Map<string, string>;
  overlayText: string;
  hasHighlight: boolean;
};

function LandingLayout({
  data,
  entryNames,
  overlayText,
  hasHighlight,
}: LandingLayoutProps) {
  const matches = [...data.matches].sort(
    (left, right) => left.kickoffAt.getTime() - right.kickoffAt.getTime(),
  );

  const liveMatches = data.matches.filter(
    (match) => match.status === "in_progress" || match.status === "disputed",
  );
  const upcomingMatches = matches.filter(
    (match) => match.status === "scheduled",
  );
  const nextMatches = upcomingMatches.slice(0, 4);

  return (
    <div className="space-y-8">
      {hasHighlight ? (
        <div className="rounded-lg border border-white/30 bg-white/15 px-6 py-4 text-sm text-white/90 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">
            Høydepunkt
          </p>
          <p className="text-lg font-semibold">{overlayText}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <MatchSection
          title="Live nå"
          matches={liveMatches}
          emptyText="Ingen kamper pågår akkurat nå."
        />
        <MatchSection
          title="Neste kamper"
          matches={nextMatches}
          emptyText="Ingen kommende kamper registrert."
        />
      </div>

      <ScheduleTable matches={matches} entryNames={entryNames} />

      {data.tables.length > 0 ? (
        <div className="space-y-6">
          <GroupTablesGrid tables={data.tables} entryNames={entryNames} />
          <TopScorersList scorers={data.topScorers} entryNames={entryNames} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <StandingsTable standings={data.standings} entryNames={entryNames} />
          <TopScorersList scorers={data.topScorers} entryNames={entryNames} />
        </div>
      )}
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
    <section className="rounded-xl border border-white/20 bg-white/5 p-5 shadow-xl backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-white">
        {title}
      </h2>

      {rows.length === 0 ? (
        <p className="text-sm text-white/70">{emptyText}</p>
      ) : (
        <div className="space-y-4">
          {rows.map((match) => {
            const formattedScore = formatMatchScore(match);
            const showScore = formattedScore.length > 0;

            return (
              <article
                key={match.id}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <header className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
                  <span>{statusLabel(match.status)}</span>
                  <time dateTime={match.kickoffAt.toISOString()}>
                    {formatKickoff(match.kickoffAt)}
                  </time>
                </header>
                <div
                  className={`items-center gap-3 text-lg font-semibold ${
                    showScore
                      ? "grid grid-cols-[1fr_auto_1fr]"
                      : "grid grid-cols-2"
                  }`}
                >
                  <span className="text-left">{match.home.name}</span>
                  {showScore ? (
                    <span className="rounded-lg border border-white/20 px-3 py-1 text-center text-xl">
                      {formattedScore}
                    </span>
                  ) : null}
                  <span className="text-right">{match.away.name}</span>
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

type ScreenMatchesTableProps = {
  matches: ScoreboardMatch[];
  entryNames: Map<string, string>;
};

function ScreenMatchesTable({ matches, entryNames }: ScreenMatchesTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-xl backdrop-blur">
      <div className="border-b border-white/10 px-4 py-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white">
          Kampoppsett
        </h2>
      </div>
      <div>
        <table className="w-full table-fixed text-left text-[0.68rem] text-white/90 leading-tight">
          <thead>
            <tr className="text-[0.55rem] uppercase tracking-wide text-white/60">
              <th className="w-[10%] px-3 py-1.5">Tid</th>
              <th className="w-[10%] px-3 py-1.5">Kamp</th>
              <th className="w-[16%] px-3 py-1.5">Arena</th>
              <th className="w-[12%] px-3 py-1.5">Status</th>
              <th className="px-3 py-1.5">Hjemmelag</th>
              <th className="px-3 py-1.5">Bortelag</th>
              <th className="w-[10%] px-3 py-1.5 text-center">Res</th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-center text-white/70" colSpan={7}>
                  Ingen kamper registrert enda.
                </td>
              </tr>
            ) : (
              matches.map((match, index) => (
                <tr
                  key={match.id}
                  className={`border-t border-white/5 ${
                    index % 2 === 0 ? "bg-white/5" : "bg-transparent"
                  }`}
                >
                  <td className="px-3 py-0.5 text-[0.64rem] text-white/70">
                    {formatKickoffTime(match.kickoffAt)}
                  </td>
                  <td className="px-3 py-0.5 text-[0.64rem] text-white/70">
                    {match.code ?? match.groupCode ?? "—"}
                  </td>
                  <td className="px-3 py-0.5 text-[0.64rem] text-white/70">
                    {match.venueName ?? "Ikke satt"}
                  </td>
                  <td className="px-3 py-0.5 text-[0.64rem] text-white/70">
                    {statusLabel(match.status)}
                  </td>
                  <td className="px-3 py-0.5 text-[0.78rem] font-semibold">
                    {match.home.entryId
                      ? (entryNames.get(match.home.entryId) ?? match.home.name)
                      : match.home.name}
                  </td>
                  <td className="px-3 py-0.5 text-[0.78rem] font-semibold">
                    {match.away.entryId
                      ? (entryNames.get(match.away.entryId) ?? match.away.name)
                      : match.away.name}
                  </td>
                  <td className="px-3 py-0.5 text-center text-[0.78rem] font-semibold">
                    {formatMatchScore(match)}
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

type ScheduleTableProps = {
  matches: ScoreboardMatch[];
  entryNames: Map<string, string>;
};

function ScheduleTable({ matches, entryNames }: ScheduleTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-xl backdrop-blur">
      <div className="border-b border-white/10 px-5 py-3">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-white">
          Kampoversikt
        </h2>
        <p className="text-xs text-white/70">
          Alle kamper, med status og resultat.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-white/90">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-white/60">
              <th className="px-5 py-3">Tidspunkt</th>
              <th className="px-5 py-3">Kamp</th>
              <th className="px-5 py-3">Hjemmelag</th>
              <th className="px-5 py-3">Bortelag</th>
              <th className="px-5 py-3">Arena</th>
              <th className="px-5 py-3 text-center">Resultat</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td className="px-5 py-4 text-center text-white/70" colSpan={7}>
                  Ingen kamper registrert enda.
                </td>
              </tr>
            ) : (
              matches.map((match) => (
                <tr key={match.id} className="border-t border-white/5">
                  <td className="px-5 py-3 text-xs text-white/70">
                    {formatKickoff(match.kickoffAt)}
                  </td>
                  <td className="px-5 py-3 text-xs text-white/70">
                    {match.code ?? match.groupCode ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    {match.home.entryId
                      ? (entryNames.get(match.home.entryId) ?? match.home.name)
                      : match.home.name}
                  </td>
                  <td className="px-5 py-3">
                    {match.away.entryId
                      ? (entryNames.get(match.away.entryId) ?? match.away.name)
                      : match.away.name}
                  </td>
                  <td className="px-5 py-3 text-xs text-white/70">
                    {match.venueName ?? "Ikke satt"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {formatMatchScore(match)}
                  </td>
                  <td className="px-5 py-3 text-xs text-white/70">
                    {statusLabel(match.status)}
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

type StandingsProps = {
  standings: ScoreboardStanding[];
  entryNames: Map<string, string>;
  title?: string;
};

function StandingsTable({
  standings,
  entryNames,
  title = "Tabell",
}: StandingsProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-xl backdrop-blur">
      <h2 className="border-b border-white/10 px-5 py-3 text-lg font-semibold uppercase tracking-wide text-white">
        {title}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-white/90">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-white/60">
              <th className="px-5 py-2">#</th>
              <th className="px-5 py-2">Lag</th>
              <th className="px-3 py-2 text-center">K</th>
              <th className="px-3 py-2 text-center">V</th>
              <th className="px-3 py-2 text-center">U</th>
              <th className="px-3 py-2 text-center">T</th>
              <th className="px-3 py-2 text-center">Mål</th>
              <th className="px-3 py-2 text-center">+/-</th>
              <th className="px-3 py-2 text-center">P</th>
            </tr>
          </thead>
          <tbody>
            {standings.length === 0 ? (
              <tr>
                <td className="px-5 py-4 text-center text-white/70" colSpan={9}>
                  Ingen tabell tilgjengelig enda.
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
      <div className="border-b border-white/10 px-4 py-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white">
          {title}
        </h2>
      </div>
      <div>
        <table className="w-full table-fixed text-left text-[0.68rem] text-white/90 leading-tight">
          <thead>
            <tr className="text-[0.55rem] uppercase tracking-wide text-white/60">
              <th className="w-[10%] px-3 py-1.5">#</th>
              <th className="px-3 py-1.5">Lag</th>
              <th className="w-[8%] px-2 py-1.5 text-center">K</th>
              <th className="w-[8%] px-2 py-1.5 text-center">V</th>
              <th className="w-[8%] px-2 py-1.5 text-center">U</th>
              <th className="w-[8%] px-2 py-1.5 text-center">T</th>
              <th className="w-[12%] px-2 py-1.5 text-center">Mål</th>
              <th className="w-[10%] px-2 py-1.5 text-center">+/-</th>
              <th className="w-[8%] px-2 py-1.5 text-center">P</th>
            </tr>
          </thead>
          <tbody>
            {standings.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-center text-white/70" colSpan={9}>
                  Ingen tabell tilgjengelig enda.
                </td>
              </tr>
            ) : (
              standings.map((row, index) => (
                <tr
                  key={row.entryId}
                  className={`border-t border-white/5 ${
                    index % 2 === 0 ? "bg-white/5" : "bg-transparent"
                  }`}
                >
                  <td className="px-3 py-0.5 text-[0.78rem] font-semibold">
                    {row.position}
                  </td>
                  <td className="px-3 py-0.5 text-[0.78rem] font-semibold">
                    {entryNames.get(row.entryId) ?? row.entryId}
                  </td>
                  <td className="px-2 py-0.5 text-center">{row.played}</td>
                  <td className="px-2 py-0.5 text-center">{row.won}</td>
                  <td className="px-2 py-0.5 text-center">{row.drawn}</td>
                  <td className="px-2 py-0.5 text-center">{row.lost}</td>
                  <td className="px-2 py-0.5 text-center">
                    {row.goalsFor} – {row.goalsAgainst}
                  </td>
                  <td className="px-2 py-0.5 text-center">
                    {row.goalDifference}
                  </td>
                  <td className="px-2 py-0.5 text-center font-semibold">
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

type GroupTablesGridProps = {
  tables: ScoreboardGroupTable[];
  entryNames: Map<string, string>;
};

function GroupTablesGrid({ tables, entryNames }: GroupTablesGridProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {tables.map((table) => (
        <StandingsTable
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

type TopScorersProps = {
  scorers: ScoreboardTopScorer[];
  entryNames: Map<string, string>;
};

function TopScorersList({ scorers, entryNames }: TopScorersProps) {
  const rows = useMemo(() => scorers.slice(0, 8), [scorers]);

  return (
    <section className="rounded-xl border border-white/20 bg-white/5 p-5 shadow-xl backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-white">
        Toppscorere
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-white/70">
          Ingen mål registrert enda. Spillere vises når kampene starter.
        </p>
      ) : (
        <ul className="space-y-3 text-sm">
          {rows.map((player) => (
            <li
              key={`${player.entryId}-${player.personId}`}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
            >
              <div>
                <p className="text-base font-semibold">
                  {player.name || "Navn mangler"}
                </p>
                <p className="text-xs text-white/70">
                  {entryNames.get(player.entryId) ?? player.entryId}
                </p>
              </div>
              <div className="flex items-center gap-4 text-right">
                <StatPill label="Mål" value={player.goals} />
                <StatPill label="Assist" value={player.assists} />
                <StatPill label="Gule" value={player.yellowCards} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type ScreenTopScorersTableProps = {
  scorers: ScoreboardTopScorer[];
};

function ScreenTopScorersTable({ scorers }: ScreenTopScorersTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-xl backdrop-blur">
      <div className="border-b border-white/10 px-4 py-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white">
          Toppscorer
        </h2>
      </div>
      <div>
        <table className="w-full text-left text-[0.68rem] text-white/90 leading-tight">
          <thead>
            <tr className="text-[0.55rem] uppercase tracking-wide text-white/60">
              <th className="px-3 py-1.5">Spiller</th>
              <th className="px-3 py-1.5 text-center">Mål</th>
            </tr>
          </thead>
          <tbody>
            {scorers.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-center text-white/70" colSpan={2}>
                  Ingen mål registrert enda.
                </td>
              </tr>
            ) : (
              scorers.map((player, index) => (
                <tr
                  key={`${player.entryId}-${player.personId}`}
                  className={`border-t border-white/5 ${
                    index % 2 === 0 ? "bg-white/5" : "bg-transparent"
                  }`}
                >
                  <td className="px-3 py-0.5 text-[0.78rem] font-semibold">
                    {player.name || "Navn mangler"}
                  </td>
                  <td className="px-3 py-0.5 text-center text-[0.78rem] font-semibold">
                    {player.goals}
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

type StatPillProps = {
  label: string;
  value: number;
};

function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="min-w-[3rem] rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
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
      return "Tvist";
    case "finalized":
      return "Ferdig";
    default:
      return "Planlagt";
  }
}

function formatMatchScore(match: ScoreboardMatch): string {
  if (
    match.status === "scheduled" &&
    match.home.score === 0 &&
    match.away.score === 0
  ) {
    return "";
  }

  return `${match.home.score} – ${match.away.score}`;
}

function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
  }).format(date);
}

function formatKickoff(date: Date): string {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatKickoffTime(date: Date): string {
  return new Intl.DateTimeFormat("nb-NO", {
    timeStyle: "short",
  }).format(date);
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function deriveScheduleSummary(matches: ScoreboardMatch[]): string | null {
  const dates = matches
    .map((match) => match.kickoffAt)
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  if (dates.length === 0) {
    return null;
  }

  const start = dates[0];
  const end = dates[dates.length - 1];
  if (!start || !end) {
    return null;
  }
  const startKey = toLocalDateKey(start);
  const endKey = toLocalDateKey(end);

  if (startKey === endKey) {
    return formatDateOnly(start);
  }

  return `${formatDateOnly(start)} - ${formatDateOnly(end)}`;
}

function deriveVenueSummary(matches: ScoreboardMatch[]): string | null {
  const seen = new Set<string>();
  const venues: string[] = [];

  for (const match of matches) {
    const name = match.venueName?.trim() ?? "";
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    venues.push(name);
  }

  if (venues.length === 0) {
    return null;
  }
  if (venues.length === 1) {
    return venues[0] ?? null;
  }
  if (venues.length === 2) {
    return `${venues[0]} og ${venues[1]}`;
  }
  return `${venues[0]} + ${venues.length - 1}`;
}

function deriveOverlayMessage(data: ScoreboardData): string {
  return (
    data.overlayMessage ??
    data.matches.find((match) => match.highlight)?.highlight ??
    "Ingen aktive høydepunkt akkurat nå."
  );
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function deriveSeasonTheme(date: Date): Exclude<SeasonTheme, "auto"> {
  const month = date.getMonth();
  if (month === 11) {
    return "christmas";
  }
  if (month === 10 || month === 0 || month === 1) {
    return "winter";
  }
  if (month >= 2 && month <= 4) {
    return "spring";
  }
  if (month >= 5 && month <= 7) {
    return "summer";
  }
  return "fall";
}

function parseSeasonTheme(value: string | null): SeasonTheme | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "jul" || normalized === "xmas") {
    return "christmas";
  }
  if (
    normalized === "auto" ||
    normalized === "christmas" ||
    normalized === "winter" ||
    normalized === "spring" ||
    normalized === "summer" ||
    normalized === "fall"
  ) {
    return normalized as SeasonTheme;
  }
  return null;
}

function parseThemeSource(value: string | null): ThemeSource | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "competition" || normalized === "season") {
    return normalized as ThemeSource;
  }
  return null;
}

function seasonGradient(theme: Exclude<SeasonTheme, "auto">): string {
  switch (theme) {
    case "christmas":
      return "linear-gradient(150deg, rgba(58,11,11,0.92) 0%, rgba(141,26,26,0.85) 45%, rgba(21,48,34,0.9) 100%)";
    case "winter":
      return "linear-gradient(150deg, rgba(7,22,43,0.92) 0%, rgba(18,53,84,0.84) 50%, rgba(20,42,74,0.9) 100%)";
    case "spring":
      return "linear-gradient(135deg, rgba(35,98,82,0.85) 0%, rgba(104,185,143,0.75) 48%, rgba(203,229,175,0.8) 100%)";
    case "summer":
      return "linear-gradient(135deg, rgba(20,71,120,0.78) 0%, rgba(62,158,189,0.72) 45%, rgba(255,209,120,0.7) 100%)";
    case "fall":
      return "linear-gradient(140deg, rgba(70,34,12,0.88) 0%, rgba(161,84,34,0.8) 45%, rgba(219,149,72,0.75) 100%)";
    default:
      return "linear-gradient(135deg, rgba(9,25,45,0.7) 0%, rgba(15,52,84,0.7) 100%)";
  }
}
