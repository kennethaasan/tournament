"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearScoreboardHighlight,
  type EditionScoreboardView,
  editionScoreboardQueryKey,
  fetchEditionScoreboard,
  triggerScoreboardHighlight,
  updateEditionScoreboard,
} from "@/lib/api/scoreboard-client";
import {
  ScoreboardThemeForm,
  type ScoreboardThemeFormValue,
} from "@/ui/components/scoreboard/theme-form";

type ScoreboardControlProps = {
  editionId: string;
};

type ScoreboardModule =
  | "live_matches"
  | "upcoming"
  | "standings"
  | "top_scorers";

const DEFAULT_THEME: ScoreboardThemeFormValue = {
  primaryColor: "#0B1F3A",
  secondaryColor: "#FFFFFF",
  backgroundImageUrl: null,
};

const MODULE_OPTIONS: Array<{ id: ScoreboardModule; label: string }> = [
  { id: "live_matches", label: "Livekamper" },
  { id: "upcoming", label: "Kommende kamper" },
  { id: "standings", label: "Tabell" },
  { id: "top_scorers", label: "Toppscorere" },
];

export function ScoreboardControl({ editionId }: ScoreboardControlProps) {
  const queryClient = useQueryClient();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editionLabel, setEditionLabel] = useState("");

  const [rotationSeconds, setRotationSeconds] = useState<string>("5");
  const [modules, setModules] = useState<ScoreboardModule[]>(
    MODULE_OPTIONS.map((module) => module.id),
  );
  const [theme, setTheme] = useState<ScoreboardThemeFormValue>(DEFAULT_THEME);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [highlightMessage, setHighlightMessage] = useState("");
  const [highlightDuration, setHighlightDuration] = useState("30");
  const [highlightSuccess, setHighlightSuccess] = useState<string | null>(null);
  const [highlightError, setHighlightError] = useState<string | null>(null);

  const [activeHighlight, setActiveHighlight] = useState<
    EditionScoreboardView["highlight"] | null
  >(null);

  const highlightCountdown = useMemo(() => {
    if (!activeHighlight) {
      return null;
    }

    return Math.max(activeHighlight.remaining_seconds, 0);
  }, [activeHighlight]);

  const applySummary = useCallback((summary: EditionScoreboardView) => {
    setEditionLabel(summary.edition.label);
    setRotationSeconds(summary.edition.scoreboard_rotation_seconds.toString());
    setModules(
      summary.edition.scoreboard_modules?.length
        ? (summary.edition.scoreboard_modules as ScoreboardModule[])
        : MODULE_OPTIONS.map((module) => module.id),
    );
    setTheme({
      primaryColor:
        summary.edition.scoreboard_theme?.primary_color ??
        DEFAULT_THEME.primaryColor,
      secondaryColor:
        summary.edition.scoreboard_theme?.secondary_color ??
        DEFAULT_THEME.secondaryColor,
      backgroundImageUrl:
        summary.edition.scoreboard_theme?.background_image_url ?? null,
    });
    setActiveHighlight(summary.highlight ?? null);
  }, []);

  const scoreboardQuery = useQuery({
    queryKey: editionScoreboardQueryKey(editionId),
    queryFn: ({ signal }) => fetchEditionScoreboard(editionId, { signal }),
    retry: false,
  });

  useEffect(() => {
    if (scoreboardQuery.data) {
      applySummary(scoreboardQuery.data);
      setLoadError(null);
    }
    if (scoreboardQuery.error) {
      setLoadError(
        scoreboardQuery.error instanceof Error
          ? scoreboardQuery.error.message
          : "Kunne ikke hente scoreboard-innstillinger.",
      );
    }
  }, [applySummary, scoreboardQuery.data, scoreboardQuery.error]);

  const settingsMutation = useMutation({
    mutationFn: (input: {
      rotationSeconds: number;
      modules: ScoreboardModule[];
      theme: ScoreboardThemeFormValue;
    }) =>
      updateEditionScoreboard(editionId, {
        scoreboard_rotation_seconds: input.rotationSeconds,
        scoreboard_modules: input.modules,
        scoreboard_theme: {
          primary_color: input.theme.primaryColor,
          secondary_color: input.theme.secondaryColor,
          background_image_url: input.theme.backgroundImageUrl,
        },
      }),
    onSuccess: (data) => {
      applySummary(data);
      queryClient.setQueryData(editionScoreboardQueryKey(editionId), data);
      setSettingsSuccess("Scoreboard-innstillinger er oppdatert.");
      setSettingsError(null);
    },
    onError: (error) => {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Kunne ikke oppdatere scoreboard-innstillingene.",
      );
    },
  });

  const highlightMutation = useMutation({
    mutationFn: (input: { message: string; durationSeconds: number }) =>
      triggerScoreboardHighlight(editionId, {
        message: input.message,
        duration_seconds: input.durationSeconds,
      }),
    onSuccess: (data) => {
      applySummary(data);
      queryClient.setQueryData(editionScoreboardQueryKey(editionId), data);
      setHighlightSuccess("Highlight er aktivert og vises på storskjermen.");
      setHighlightError(null);
      setHighlightMessage("");
    },
    onError: (error) => {
      setHighlightError(
        error instanceof Error
          ? error.message
          : "Kunne ikke aktivere highlight-overlegget.",
      );
    },
  });

  const clearHighlightMutation = useMutation({
    mutationFn: () => clearScoreboardHighlight(editionId),
    onSuccess: (data) => {
      applySummary(data);
      queryClient.setQueryData(editionScoreboardQueryKey(editionId), data);
      setHighlightSuccess("Highlight er fjernet fra storskjermen.");
      setHighlightError(null);
    },
    onError: (error) => {
      setHighlightError(
        error instanceof Error
          ? error.message
          : "Kunne ikke fjerne highlight-overlegget.",
      );
    },
  });

  const isLoading = scoreboardQuery.isLoading;
  const isSavingSettings = settingsMutation.isPending;
  const isSubmittingHighlight =
    highlightMutation.isPending || clearHighlightMutation.isPending;

  async function handleSettingsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);

    try {
      const parsedRotation = Number.parseInt(rotationSeconds, 10);
      if (!Number.isFinite(parsedRotation) || parsedRotation < 2) {
        throw new Error("Rotasjonstiden må være minst 2 sekunder.");
      }

      if (!modules.length) {
        throw new Error("Velg minst én modul som skal vises på storskjermen.");
      }

      await settingsMutation.mutateAsync({
        rotationSeconds: parsedRotation,
        modules,
        theme,
      });
    } catch (error) {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Kunne ikke oppdatere scoreboard-innstillingene.",
      );
    }
  }

  async function handleHighlightSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setHighlightError(null);
    setHighlightSuccess(null);

    try {
      const trimmed = highlightMessage.trim();
      if (!trimmed) {
        throw new Error("Skriv inn en melding for highlight-overlegget.");
      }

      const durationValue = Number.parseInt(highlightDuration, 10);
      if (
        !Number.isFinite(durationValue) ||
        durationValue < 5 ||
        durationValue > 600
      ) {
        throw new Error("Varigheten må være mellom 5 og 600 sekunder.");
      }

      await highlightMutation.mutateAsync({
        message: trimmed,
        durationSeconds: durationValue,
      });
    } catch (error) {
      setHighlightError(
        error instanceof Error
          ? error.message
          : "Kunne ikke aktivere highlight-overlegget.",
      );
    }
  }

  async function handleHighlightClear() {
    setHighlightError(null);
    setHighlightSuccess(null);

    try {
      await clearHighlightMutation.mutateAsync();
    } catch (error) {
      setHighlightError(
        error instanceof Error
          ? error.message
          : "Kunne ikke fjerne highlight-overlegget.",
      );
    }
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Utgave · Storskjerm
        </p>
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          Kontroller scoreboard for {editionLabel || "utgaven"}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Tilpass farger, rotasjon og highlight-overlegg før du viser
          scoreboardet på arenaen. Endringer trer i kraft umiddelbart.
        </p>
      </header>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground shadow-sm">
          Laster scoreboard-innstillinger …
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive shadow-sm"
        >
          {loadError}
        </div>
      ) : (
        <div className="space-y-10">
          <section className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
            <header className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">
                Tema og rotasjon
              </h2>
              <p className="text-sm text-muted-foreground">
                Sikre at farger dekker WCAG-kravene og juster hvor raskt
                scoreboarden roterer mellom seksjoner.
              </p>
            </header>

            {settingsSuccess && (
              <output
                aria-live="polite"
                className="block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
              >
                {settingsSuccess}
              </output>
            )}

            {settingsError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {settingsError}
              </div>
            )}

            <form onSubmit={handleSettingsSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="rotation-seconds"
                    className="text-sm font-medium text-foreground"
                  >
                    Rotasjonstakt (sekunder)
                  </label>
                  <input
                    id="rotation-seconds"
                    type="number"
                    min={2}
                    value={rotationSeconds}
                    onChange={(event) => setRotationSeconds(event.target.value)}
                    required
                    className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    Scoreboarden roterer mellom seksjoner raskere verdier er
                    ikke tillatt enn 2 sekunder.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Vis moduler
                  </p>
                  <div className="grid gap-3">
                    {MODULE_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={modules.includes(option.id)}
                          onChange={(event) => {
                            setModules((prev) =>
                              event.target.checked
                                ? [...prev, option.id]
                                : prev.filter((module) => module !== option.id),
                            );
                          }}
                          className="h-4 w-4"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Velg hvilke seksjoner som skal rotere på storskjermen.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Aktiv highlight
                  </p>
                  <div className="rounded-lg border border-border bg-card/60 px-3 py-3 text-sm text-foreground">
                    {activeHighlight ? (
                      <div className="space-y-1">
                        <p className="font-medium">{activeHighlight.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Utløper om ca. {highlightCountdown ?? 0} sekunder (kl.{" "}
                          {new Date(
                            activeHighlight.expires_at,
                          ).toLocaleTimeString("no-NO")}
                          ).
                        </p>
                        <button
                          type="button"
                          onClick={handleHighlightClear}
                          disabled={isSubmittingHighlight}
                          className="inline-flex items-center justify-center rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive transition hover:border-destructive/60 hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Fjern highlight
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Ingen aktiv highlight. Bruk skjemaet nedenfor for å vise
                        en melding på storskjermen.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <ScoreboardThemeForm
                value={theme}
                onChange={setTheme}
                disabled={isSavingSettings}
              />

              <div>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingSettings ? "Lagrer …" : "Lagre innstillinger"}
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
            <header className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">
                Highlight-overlegg
              </h2>
              <p className="text-sm text-muted-foreground">
                Send en kort melding som vises på scoreboarden for å markere
                viktige øyeblikk. Meldingen forsvinner automatisk når tiden går
                ut.
              </p>
            </header>

            {highlightSuccess && (
              <output
                aria-live="polite"
                className="block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
              >
                {highlightSuccess}
              </output>
            )}

            {highlightError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {highlightError}
              </div>
            )}

            <form onSubmit={handleHighlightSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="highlight-message"
                  className="text-sm font-medium text-foreground"
                >
                  Melding
                </label>
                <textarea
                  id="highlight-message"
                  value={highlightMessage}
                  onChange={(event) => setHighlightMessage(event.target.value)}
                  placeholder="Finale starter nå! Finn plassene deres."
                  maxLength={160}
                  rows={3}
                  required
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-muted-foreground">
                  Maks 160 tegn. Vises umiddelbart på scoreboarden.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="highlight-duration"
                    className="text-sm font-medium text-foreground"
                  >
                    Varighet (sekunder)
                  </label>
                  <input
                    id="highlight-duration"
                    type="number"
                    min={5}
                    max={600}
                    value={highlightDuration}
                    onChange={(event) =>
                      setHighlightDuration(event.target.value)
                    }
                    required
                    className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    Standard er 30 sekunder. Maks 10 minutter.
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmittingHighlight}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingHighlight ? "Aktiverer …" : "Aktiver highlight"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
