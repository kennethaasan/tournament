"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { computeContrastRatio } from "@/lib/colors";
import {
  ScoreboardThemeForm,
  type ScoreboardThemeFormValue,
} from "@/ui/components/scoreboard/theme-form";

type CompetitionFormState = {
  name: string;
  slug: string;
  description: string;
  timezone: string;
  editionLabel: string;
  editionSlug: string;
  editionFormat: "round_robin" | "knockout" | "hybrid";
  editionTimezone: string;
  rotationSeconds: number;
  registrationOpens: string;
  registrationCloses: string;
};

type FieldErrorKey =
  | "name"
  | "slug"
  | "editionLabel"
  | "editionSlug"
  | "registrationOpens"
  | "registrationCloses"
  | "rotationSeconds"
  | "themeContrast";

const DEFAULT_THEME: ScoreboardThemeFormValue = {
  primaryColor: "#0B1F3A",
  secondaryColor: "#FFFFFF",
  backgroundImageUrl: null,
};

const TIMEZONES = [
  "Europe/Oslo",
  "Europe/Copenhagen",
  "Europe/Stockholm",
  "UTC",
];

export default function CompetitionCreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<CompetitionFormState>(() =>
    buildInitialForm(),
  );
  const [theme, setTheme] = useState<ScoreboardThemeFormValue>(DEFAULT_THEME);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldErrorKey, string>>
  >({});

  const slugSuggestion = useMemo(() => generateSlug(form.name), [form.name]);

  function updateForm<K extends keyof CompetitionFormState>(
    field: K,
    value: CompetitionFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFieldErrors((prev) => clearFieldError(prev, field));
  }

  function handleNextStep() {
    const errors = validateStepOne(form, slugSuggestion);
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) {
      setStep(2);
    }
  }

  function handlePreviousStep() {
    setFieldErrors({});
    setStep(1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      if (step === 1) {
        handleNextStep();
        setIsSubmitting(false);
        return;
      }

      const errors = validateStepTwo(form, theme);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setIsSubmitting(false);
        return;
      }

      const response = await apiClient.POST("/api/competitions", {
        body: {
          name: form.name,
          slug: form.slug || slugSuggestion,
          default_timezone: form.timezone,
          description: form.description || undefined,
          primary_color: theme.primaryColor,
          secondary_color: theme.secondaryColor,
          default_edition: {
            label: form.editionLabel,
            slug: form.editionSlug || generateSlug(form.editionLabel),
            format: form.editionFormat,
            timezone: form.editionTimezone,
            scoreboard_rotation_seconds: form.rotationSeconds,
            scoreboard_theme: {
              primary_color: theme.primaryColor,
              secondary_color: theme.secondaryColor,
              background_image_url: theme.backgroundImageUrl,
            },
            registration_window: {
              opens_at: new Date(form.registrationOpens).toISOString(),
              closes_at: new Date(form.registrationCloses).toISOString(),
            },
          },
        },
      });

      if (response.error) {
        throw new Error(
          response.error.title ?? "Ukjent feil ved opprettelse av konkurranse.",
        );
      }

      const competitionId = response.data?.competition.id;
      if (competitionId) {
        router.push(`/dashboard/competitions/${competitionId}?welcome=1`);
        router.refresh();
        return;
      }

      setForm(buildInitialForm());
      setTheme(DEFAULT_THEME);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Noe gikk galt under opprettelsen. Vennligst prøv igjen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Turnering · Selvbetjent
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Opprett ny konkurranse
          </h1>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
            Steg {step} av 2
          </span>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Registrer grunninformasjon og første utgave. Du kan senere legge til
          flere utgaver, lag, kamper og storskjerminnhold.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-10">
        {step === 1 ? (
          <section className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">
              Konkurransedetaljer
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="competition-name"
                  className="text-sm font-medium text-foreground"
                >
                  Navn
                </label>
                <input
                  id="competition-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Eksempel: Elite Cup 2025"
                  required
                  aria-invalid={Boolean(fieldErrors.name)}
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {fieldErrors.name ? (
                  <p className="text-xs text-destructive">{fieldErrors.name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Navnet vises offentlig på landingssiden.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="competition-slug"
                  className="text-sm font-medium text-foreground"
                >
                  URL-navn (slug)
                </label>
                <input
                  id="competition-slug"
                  type="text"
                  value={form.slug}
                  onChange={(event) =>
                    updateForm("slug", event.target.value.toLowerCase())
                  }
                  placeholder={slugSuggestion}
                  aria-invalid={Boolean(fieldErrors.slug)}
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {fieldErrors.slug ? (
                  <p className="text-xs text-destructive">{fieldErrors.slug}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Hvis feltet står tomt bruker vi automatisk {slugSuggestion}.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="competition-description"
                className="text-sm font-medium text-foreground"
              >
                Beskrivelse (valgfritt)
              </label>
              <textarea
                id="competition-description"
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                rows={4}
                placeholder="Kort introduksjon til turneringen som vises offentlig."
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="competition-timezone"
                  className="text-sm font-medium text-foreground"
                >
                  Tidssone
                </label>
                <select
                  id="competition-timezone"
                  value={form.timezone}
                  onChange={(event) =>
                    updateForm("timezone", event.target.value)
                  }
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="edition-timezone"
                  className="text-sm font-medium text-foreground"
                >
                  Tidssone for første utgave
                </label>
                <select
                  id="edition-timezone"
                  value={form.editionTimezone}
                  onChange={(event) =>
                    updateForm("editionTimezone", event.target.value)
                  }
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">
              Første utgave
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="edition-label"
                  className="text-sm font-medium text-foreground"
                >
                  Utgavenavn
                </label>
                <input
                  id="edition-label"
                  type="text"
                  value={form.editionLabel}
                  onChange={(event) =>
                    updateForm("editionLabel", event.target.value)
                  }
                  placeholder="Eksempel: 2025"
                  required
                  aria-invalid={Boolean(fieldErrors.editionLabel)}
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {fieldErrors.editionLabel ? (
                  <p className="text-xs text-destructive">
                    {fieldErrors.editionLabel}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="edition-slug"
                  className="text-sm font-medium text-foreground"
                >
                  Utgave (slug)
                </label>
                <input
                  id="edition-slug"
                  type="text"
                  value={form.editionSlug}
                  onChange={(event) =>
                    updateForm("editionSlug", event.target.value.toLowerCase())
                  }
                  placeholder={generateSlug(form.editionLabel)}
                  required
                  aria-invalid={Boolean(fieldErrors.editionSlug)}
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {fieldErrors.editionSlug ? (
                  <p className="text-xs text-destructive">
                    {fieldErrors.editionSlug}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="edition-format"
                  className="text-sm font-medium text-foreground"
                >
                  Turneringsformat
                </label>
                <select
                  id="edition-format"
                  value={form.editionFormat}
                  onChange={(event) =>
                    updateForm(
                      "editionFormat",
                      event.target
                        .value as CompetitionFormState["editionFormat"],
                    )
                  }
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="round_robin">Seriespill</option>
                  <option value="knockout">Sluttspill</option>
                  <option value="hybrid">Kombinasjon</option>
                </select>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="registration-opens"
                  className="text-sm font-medium text-foreground"
                >
                  Påmelding åpner
                </label>
                <input
                  id="registration-opens"
                  type="datetime-local"
                  value={form.registrationOpens}
                  onChange={(event) =>
                    updateForm("registrationOpens", event.target.value)
                  }
                  required
                  aria-invalid={Boolean(fieldErrors.registrationOpens)}
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {fieldErrors.registrationOpens ? (
                  <p className="text-xs text-destructive">
                    {fieldErrors.registrationOpens}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="registration-closes"
                  className="text-sm font-medium text-foreground"
                >
                  Påmelding stenger
                </label>
                <input
                  id="registration-closes"
                  type="datetime-local"
                  value={form.registrationCloses}
                  onChange={(event) =>
                    updateForm("registrationCloses", event.target.value)
                  }
                  required
                  aria-invalid={Boolean(fieldErrors.registrationCloses)}
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {fieldErrors.registrationCloses ? (
                  <p className="text-xs text-destructive">
                    {fieldErrors.registrationCloses}
                  </p>
                ) : null}
              </div>
            </div>

            <details className="rounded-2xl border border-border bg-background/50 p-6">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                Avanserte innstillinger for scoreboard
              </summary>
              <div className="mt-4 space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="rotation-seconds"
                    className="text-sm font-medium text-foreground"
                  >
                    Rotasjonstid scoreboard (sekunder)
                  </label>
                  <input
                    id="rotation-seconds"
                    type="number"
                    min={2}
                    value={form.rotationSeconds}
                    onChange={(event) =>
                      updateForm("rotationSeconds", Number(event.target.value))
                    }
                    aria-invalid={Boolean(fieldErrors.rotationSeconds)}
                    className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {fieldErrors.rotationSeconds ? (
                    <p className="text-xs text-destructive">
                      {fieldErrors.rotationSeconds}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Må være 2 sekunder eller mer. Bruk 5 sekunder som anbefalt
                      standard.
                    </p>
                  )}
                </div>

                <ScoreboardThemeForm
                  value={theme}
                  onChange={(value) => {
                    setTheme(value);
                    setFieldErrors((prev) =>
                      prev.themeContrast
                        ? { ...prev, themeContrast: undefined }
                        : prev,
                    );
                  }}
                  disabled={isSubmitting}
                />
                {fieldErrors.themeContrast ? (
                  <p className="text-xs text-destructive">
                    {fieldErrors.themeContrast}
                  </p>
                ) : null}
              </div>
            </details>
          </section>
        ) : null}

        <footer className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {errorMessage ? (
            <p className="rounded border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <p className="text-xs text-muted-foreground">
              Når konkurransen er opprettet kan du legge til flere utgaver,
              invitere lag og konfigurere storskjermen fra kontrollpanelet.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {step === 2 ? (
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  className="inline-flex items-center justify-center rounded-full border border-border/70 px-5 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/10"
                >
                  Tilbake
                </button>
              ) : null}
              {step === 1 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                >
                  Fortsett
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/40"
                >
                  {isSubmitting ? "Lagrer..." : "Opprett konkurranse"}
                </button>
              )}
            </div>
          </div>
        </footer>
      </form>
    </div>
  );
}

function generateSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "ny-turnering"
  );
}

function buildInitialForm(): CompetitionFormState {
  const timezone = resolveTimezone();
  const now = new Date();
  const closes = new Date(now);
  closes.setDate(now.getDate() + 30);

  return {
    name: "",
    slug: "",
    description: "",
    timezone,
    editionLabel: "",
    editionSlug: "",
    editionFormat: "round_robin",
    editionTimezone: timezone,
    rotationSeconds: 5,
    registrationOpens: formatDateTimeLocal(now),
    registrationCloses: formatDateTimeLocal(closes),
  };
}

function resolveTimezone(): string {
  try {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (local && TIMEZONES.includes(local)) {
      return local;
    }
  } catch {
    return "Europe/Oslo";
  }

  return "Europe/Oslo";
}

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function validateStepOne(
  form: CompetitionFormState,
  slugSuggestion: string,
): Partial<Record<FieldErrorKey, string>> {
  const errors: Partial<Record<FieldErrorKey, string>> = {};

  if (!form.name.trim()) {
    errors.name = "Skriv inn et navn for konkurransen.";
  }

  const slug = form.slug.trim() || slugSuggestion;
  if (!isValidSlug(slug)) {
    errors.slug = "Slug må bestå av bokstaver, tall eller bindestrek.";
  }

  return errors;
}

function validateStepTwo(
  form: CompetitionFormState,
  theme: ScoreboardThemeFormValue,
): Partial<Record<FieldErrorKey, string>> {
  const errors: Partial<Record<FieldErrorKey, string>> = {};

  if (!form.editionLabel.trim()) {
    errors.editionLabel = "Skriv inn et navn for første utgave.";
  }

  const editionSlug =
    form.editionSlug.trim() || generateSlug(form.editionLabel);
  if (!isValidSlug(editionSlug)) {
    errors.editionSlug = "Slug må bestå av bokstaver, tall eller bindestrek.";
  }

  const opensAt = new Date(form.registrationOpens);
  const closesAt = new Date(form.registrationCloses);
  if (Number.isNaN(opensAt.getTime())) {
    errors.registrationOpens = "Velg en gyldig startdato.";
  }
  if (Number.isNaN(closesAt.getTime())) {
    errors.registrationCloses = "Velg en gyldig sluttdato.";
  }
  if (
    !Number.isNaN(opensAt.getTime()) &&
    !Number.isNaN(closesAt.getTime()) &&
    opensAt >= closesAt
  ) {
    errors.registrationCloses = "Påmelding må stenge etter at den har åpnet.";
  }

  if (!Number.isFinite(form.rotationSeconds) || form.rotationSeconds < 2) {
    errors.rotationSeconds = "Rotasjonstid må være minst 2 sekunder.";
  }

  if (isValidHex(theme.primaryColor) && isValidHex(theme.secondaryColor)) {
    const ratio = computeContrastRatio(
      theme.primaryColor,
      theme.secondaryColor,
    );
    if (ratio < 4.5) {
      errors.themeContrast =
        "Fargekontrast er for lav. Velg mer kontrast mellom primær og sekundær.";
    }
  }

  return errors;
}

function isValidSlug(value: string): boolean {
  if (!value) {
    return false;
  }

  return /^[a-z0-9-]+$/.test(value);
}

function isValidHex(value: string): boolean {
  return /^#([a-f0-9]{6})$/i.test(value);
}

function clearFieldError(
  prev: Partial<Record<FieldErrorKey, string>>,
  field: keyof CompetitionFormState,
): Partial<Record<FieldErrorKey, string>> {
  if (!prev || Object.keys(prev).length === 0) {
    return prev;
  }

  const next = { ...prev };

  switch (field) {
    case "name":
      delete next.name;
      break;
    case "slug":
      delete next.slug;
      break;
    case "editionLabel":
      delete next.editionLabel;
      break;
    case "editionSlug":
      delete next.editionSlug;
      break;
    case "registrationOpens":
      delete next.registrationOpens;
      delete next.registrationCloses;
      break;
    case "registrationCloses":
      delete next.registrationCloses;
      break;
    case "rotationSeconds":
      delete next.rotationSeconds;
      break;
    default:
      break;
  }

  return next;
}
