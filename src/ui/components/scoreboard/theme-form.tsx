"use client";

import { type ChangeEvent, useCallback, useMemo } from "react";
import { computeContrastRatio } from "@/lib/colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { FormField } from "@/ui/components/form-field";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";

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
      return computeContrastRatio(value.primaryColor, value.secondaryColor);
    } catch {
      return 0;
    }
  }, [value.primaryColor, value.secondaryColor]);

  const hasSufficientContrast = ratio >= MIN_CONTRAST;
  const primaryDescriptionId = "scoreboard-primary-color-hex-description";
  const secondaryDescriptionId = "scoreboard-secondary-color-hex-description";

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
    <Card className="space-y-6">
      <CardHeader>
        <CardTitle>Skjermtema</CardTitle>
        <p className="text-sm text-muted-foreground">
          Velg farger og bakgrunnsbilde for storskjermvisningen. Fargekontrasten
          må oppfylle WCAG 2.2 AA (minst 4,5:1).
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            htmlFor="scoreboard-primary-color-hex"
            label="Primærfarge"
            description="Bruk seks tegn i heksadesimalformat, for eksempel #0B1F3A."
          >
            <div className="flex items-center gap-3">
              <Input
                id="scoreboard-primary-color"
                type="color"
                value={value.primaryColor}
                onChange={handleColorChange("primaryColor")}
                disabled={disabled}
                className="h-10 w-16 cursor-pointer rounded-md border-input bg-background"
                aria-describedby={primaryDescriptionId}
                aria-label="Velg primærfarge"
              />
              <Input
                id="scoreboard-primary-color-hex"
                type="text"
                inputMode="text"
                pattern="^#[A-Fa-f0-9]{6}$"
                value={value.primaryColor}
                onChange={handleColorChange("primaryColor")}
                disabled={disabled}
                aria-describedby={primaryDescriptionId}
              />
              <Label htmlFor="scoreboard-primary-color-hex" className="sr-only">
                Primærfarge i hex-format
              </Label>
            </div>
          </FormField>

          <FormField
            htmlFor="scoreboard-secondary-color-hex"
            label="Sekundærfarge"
            description="Bruk kontrastfarge for tekst og ikonografi."
          >
            <div className="flex items-center gap-3">
              <Input
                id="scoreboard-secondary-color"
                type="color"
                value={value.secondaryColor}
                onChange={handleColorChange("secondaryColor")}
                disabled={disabled}
                className="h-10 w-16 cursor-pointer rounded-md border-input bg-background"
                aria-describedby={secondaryDescriptionId}
                aria-label="Velg sekundærfarge"
              />
              <Input
                id="scoreboard-secondary-color-hex"
                type="text"
                inputMode="text"
                pattern="^#[A-Fa-f0-9]{6}$"
                value={value.secondaryColor}
                onChange={handleColorChange("secondaryColor")}
                disabled={disabled}
                aria-describedby={secondaryDescriptionId}
              />
              <Label
                htmlFor="scoreboard-secondary-color-hex"
                className="sr-only"
              >
                Sekundærfarge i hex-format
              </Label>
            </div>
          </FormField>
        </div>

        <FormField
          htmlFor="scoreboard-background-url"
          label="Bakgrunnsbilde (valgfritt)"
          description="Bruk en offentlig tilgjengelig URL (HTTPS). Bildet skaleres for å dekke bakgrunnen."
        >
          <Input
            id="scoreboard-background-url"
            type="url"
            placeholder="https://eksempel.no/bilde.png"
            value={value.backgroundImageUrl ?? ""}
            onChange={handleBackgroundUrlChange}
            disabled={disabled}
          />
        </FormField>

        <div
          className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4"
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
          <div className="rounded bg-background/30 px-2 py-1 text-xs font-semibold backdrop-blur">
            {ratio.toFixed(2)} : 1
          </div>
        </div>

        <output
          className={`block rounded-md border px-3 py-2 text-sm ${
            hasSufficientContrast
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
          aria-live="polite"
        >
          {hasSufficientContrast
            ? "Kontrasten oppfyller WCAG 2.2 AA."
            : "Kontrasten er for lav. Juster fargene slik at forholdet blir minst 4,5:1."}
        </output>
      </CardContent>
    </Card>
  );
}

function normaliseHex(value: string): string {
  const trimmed = value.trim();
  const normalised = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return `#${normalised.slice(1, 7).toUpperCase()}`;
}
