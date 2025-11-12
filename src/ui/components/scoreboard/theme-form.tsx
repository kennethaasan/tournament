"use client";

import { type ChangeEvent, useCallback, useMemo } from "react";
import { __internal } from "@/modules/competitions/service";

export type ScoreboardThemeFormValue = {
  primaryColor: string;
  secondaryColor: string;
  backgroundImageUrl: string | null;
};

type ScoreboardThemeFormProps = {
  value: ScoreboardThemeFormValue;
  onChange: (value: ScoreboardThemeFormValue) => void;
  disabled?: boolean;
};

const MIN_CONTRAST = 4.5;

export function ScoreboardThemeForm({
  value,
  onChange,
  disabled,
}: ScoreboardThemeFormProps) {
  const ratio = useMemo(() => {
    try {
      return __internal.computeContrastRatio(
        value.primaryColor,
        value.secondaryColor,
      );
    } catch {
      return 0;
    }
  }, [value.primaryColor, value.secondaryColor]);

  const hasSufficientContrast = ratio >= MIN_CONTRAST;

  const updateValue = useCallback(
    (partial: Partial<ScoreboardThemeFormValue>) => {
      onChange({
        ...value,
        ...partial,
      });
    },
    [onChange, value],
  );

  const handleColorChange = useCallback(
    (field: "primaryColor" | "secondaryColor") =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const next = normaliseHex(event.target.value);
        updateValue({ [field]: next } as Partial<ScoreboardThemeFormValue>);
      },
    [updateValue],
  );

  const handleBackgroundUrlChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value.trim();
      updateValue({ backgroundImageUrl: next.length > 0 ? next : null });
    },
    [updateValue],
  );

  return (
    <section className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-zinc-900">Skjermtema</h2>
        <p className="text-sm text-zinc-600">
          Velg farger og bakgrunnsbilde for storskjermvisningen. Fargekontrasten
          må oppfylle WCAG 2.2 AA (minst 4,5:1).
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="scoreboard-primary-color"
            className="text-sm font-medium text-zinc-800"
          >
            Primærfarge
          </label>
          <div className="flex items-center gap-3">
            <input
              id="scoreboard-primary-color"
              type="color"
              value={value.primaryColor}
              onChange={handleColorChange("primaryColor")}
              disabled={disabled}
              className="h-10 w-16 cursor-pointer rounded border border-zinc-300 bg-white"
            />
            <input
              id="scoreboard-primary-color-hex"
              type="text"
              inputMode="text"
              pattern="^#[A-Fa-f0-9]{6}$"
              value={value.primaryColor}
              onChange={handleColorChange("primaryColor")}
              disabled={disabled}
              className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              aria-describedby="scoreboard-primary-color-help"
              aria-labelledby="scoreboard-primary-hex-label"
            />
            <label
              id="scoreboard-primary-hex-label"
              htmlFor="scoreboard-primary-color-hex"
              className="sr-only"
            >
              Primærfarge i hex-format
            </label>
          </div>
          <p
            id="scoreboard-primary-color-help"
            className="text-xs text-zinc-500"
          >
            Bruk seks tegn i heksadesimalformat, for eksempel #0B1F3A.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="scoreboard-secondary-color"
            className="text-sm font-medium text-zinc-800"
          >
            Sekundærfarge
          </label>
          <div className="flex items-center gap-3">
            <input
              id="scoreboard-secondary-color"
              type="color"
              value={value.secondaryColor}
              onChange={handleColorChange("secondaryColor")}
              disabled={disabled}
              className="h-10 w-16 cursor-pointer rounded border border-zinc-300 bg-white"
            />
            <input
              id="scoreboard-secondary-color-hex"
              type="text"
              inputMode="text"
              pattern="^#[A-Fa-f0-9]{6}$"
              value={value.secondaryColor}
              onChange={handleColorChange("secondaryColor")}
              disabled={disabled}
              className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              aria-describedby="scoreboard-secondary-color-help"
              aria-labelledby="scoreboard-secondary-hex-label"
            />
            <label
              id="scoreboard-secondary-hex-label"
              htmlFor="scoreboard-secondary-color-hex"
              className="sr-only"
            >
              Sekundærfarge i hex-format
            </label>
          </div>
          <p
            id="scoreboard-secondary-color-help"
            className="text-xs text-zinc-500"
          >
            Bruk kontrastfarge for tekst og ikonografi.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="scoreboard-background-url"
          className="text-sm font-medium text-zinc-800"
        >
          Bakgrunnsbilde (valgfritt)
        </label>
        <input
          id="scoreboard-background-url"
          type="url"
          placeholder="https://eksempel.no/bilde.png"
          value={value.backgroundImageUrl ?? ""}
          onChange={handleBackgroundUrlChange}
          disabled={disabled}
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <p className="text-xs text-zinc-500">
          Bruk en offentlig tilgjengelig URL (HTTPS). Bildet skaleres for å
          dekke bakgrunnen.
        </p>
      </div>

      <div
        className="flex items-center justify-between rounded-md border p-4"
        style={{
          background: value.primaryColor,
          color: value.secondaryColor,
        }}
      >
        <div className="space-y-1">
          <p className="text-sm font-medium">Forhåndsvisning</p>
          <p className="text-xs opacity-80">
            Rotasjon og høydepunkter bruker primærfargen som bakgrunn og
            sekundærfargen for tekst.
          </p>
        </div>
        <div className="rounded bg-white/20 px-2 py-1 text-xs font-semibold backdrop-blur">
          {ratio.toFixed(2)} : 1
        </div>
      </div>

      <output
        className={`rounded-md border px-3 py-2 text-sm ${
          hasSufficientContrast
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}
        aria-live="polite"
      >
        {hasSufficientContrast
          ? "Kontrasten oppfyller WCAG 2.2 AA."
          : "Kontrasten er for lav. Juster fargene slik at forholdet blir minst 4,5:1."}
      </output>
    </section>
  );
}

function normaliseHex(value: string): string {
  const trimmed = value.trim();
  const normalised = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return `#${normalised.slice(1, 7).toUpperCase()}`;
}
