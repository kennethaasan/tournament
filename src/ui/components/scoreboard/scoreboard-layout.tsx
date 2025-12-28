"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useScoreboardPoll } from "@/ui/hooks/useScoreboardPoll";
import { FullHdFrame, ScoreboardBackground } from "./scoreboard-backdrop";
import {
  ConnectionStatusIndicator,
  ModeToggle,
  ThemeControls,
} from "./scoreboard-controls";
import {
  useAutoHideControls,
  useConnectionStatus,
  useCountdown,
  useHighlightAnimation,
  usePersistedMode,
  usePersistedTheme,
  useUrlParams,
} from "./scoreboard-hooks";
import { LandingLayout } from "./scoreboard-landing";
import { ScreenLayout } from "./scoreboard-screen";
import type {
  MatchSortOption,
  MatchStatusFilter,
  ScoreboardScreenProps,
} from "./scoreboard-ui-types";
import {
  deriveOverlayMessage,
  deriveScheduleSummary,
  deriveSeasonTheme,
  deriveVenueSummary,
} from "./scoreboard-utils";

type ProvidersProps = {
  children: React.ReactNode;
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
  const params = useParams<{
    competitionSlug?: string;
    editionSlug?: string;
  }>();
  const searchParams = useSearchParams();
  const urlParams = useUrlParams();

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
  const overlayText = useMemo(() => deriveOverlayMessage(data), [data]);
  const highlightAnimating = useHighlightAnimation(overlayText);

  // Mode state
  const [mode, setMode] = usePersistedMode();
  const controlsVisible = useAutoHideControls(mode);

  // Apply URL param mode override on mount
  useEffect(() => {
    if (urlParams.mode) {
      setMode(urlParams.mode);
    }
  }, [urlParams.mode, setMode]);

  // Theme state
  const themeOverrideParam =
    searchParams?.get("theme") ?? urlParams.theme ?? null;
  const { themePreference, setThemePreference, themeSource, setThemeSource } =
    usePersistedTheme(themeOverrideParam);

  // Memoize season derivation to avoid recalculating on every render
  const seasonFromPreference = useMemo(() => {
    if (themePreference === "auto") {
      return deriveSeasonTheme(new Date());
    }
    return themePreference;
  }, [themePreference]);

  const useSeasonTheme = themeSource === "season";

  // Landing mode filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>("all");
  const [sortOption, setSortOption] = useState<MatchSortOption>("time");

  // Connection status
  const connectionStatus = useConnectionStatus(
    query.isFetching,
    query.isError,
    query.dataUpdatedAt,
  );
  const lastUpdated = query.dataUpdatedAt
    ? new Date(query.dataUpdatedAt)
    : null;

  // Countdown ticker for upcoming matches
  const nextMatch = useMemo(() => {
    const upcoming = data.matches
      .filter((m) => m.status === "scheduled")
      .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());
    return upcoming[0] ?? null;
  }, [data.matches]);
  useCountdown(nextMatch?.kickoffAt ?? null, 30000);

  // Derived data
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

  const hasHighlight = Boolean(
    data.overlayMessage || data.matches.find((match) => match.highlight),
  );

  const content = (
    <div
      className={`mx-auto text-white ${
        mode === "screen"
          ? "flex h-full w-full max-w-[1920px] flex-col"
          : "max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8 2xl:max-w-[1680px]"
      }`}
    >
      {/* Header */}
      <header
        className={`transition-opacity duration-300 ${
          mode === "screen" && !controlsVisible
            ? "pointer-events-none opacity-0"
            : "opacity-100"
        } ${
          mode === "screen"
            ? "flex items-center justify-between border-b border-white/20 px-6 py-3"
            : "mb-8 grid gap-2 border-b border-white/20 pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
        }`}
      >
        <div
          className={
            mode === "screen" ? "flex items-center gap-4" : "space-y-2"
          }
        >
          {mode === "screen" ? (
            <>
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/70">
                  Offentlig visning
                </p>
                <h1 className="text-xl font-semibold leading-tight">
                  {data.edition.label}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
                {headerMeta ? (
                  <span className="text-white/70">{headerMeta}</span>
                ) : null}
                <span className="text-white/70">
                  Oppdateres hvert {data.edition.scoreboardRotationSeconds}{" "}
                  sekunder
                </span>
                <ConnectionStatusIndicator
                  status={connectionStatus}
                  lastUpdated={lastUpdated}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">
                Offentlig visning
              </p>
              <h1 className="text-3xl font-semibold">{data.edition.label}</h1>
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
              <ConnectionStatusIndicator
                status={connectionStatus}
                lastUpdated={lastUpdated}
              />
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
        </div>
      </header>

      {/* Main Content */}
      <div
        id={mode === "screen" ? "screen-panel" : "landing-panel"}
        role="tabpanel"
        aria-labelledby={mode === "screen" ? "screen-tab" : "landing-tab"}
        className={mode === "screen" ? "flex-1" : ""}
      >
        {mode === "screen" ? (
          <ScreenLayout
            overlayText={overlayText}
            hasHighlight={hasHighlight}
            highlightAnimating={highlightAnimating}
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
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortOption={sortOption}
            onSortOptionChange={setSortOption}
            connectionStatus={connectionStatus}
            lastUpdated={lastUpdated}
            isLoading={query.isLoading}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ScoreboardBackground
        primaryColor={theme.primaryColor}
        secondaryColor={theme.secondaryColor}
        backgroundImageUrl={theme.backgroundImageUrl}
        useSeasonTheme={useSeasonTheme}
        season={seasonFromPreference}
      />
      <div className="relative z-10">
        {mode === "screen" ? <FullHdFrame>{content}</FullHdFrame> : content}
      </div>
    </div>
  );
}

export { LandingLayout } from "./scoreboard-landing";
// Re-export for backwards compatibility
export { ScreenLayout } from "./scoreboard-screen";
