"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiClient } from "@/lib/api/client";
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

const DEFAULT_THEME: ScoreboardThemeFormValue = {
  primaryColor: "#0B1F3A",
  secondaryColor: "#FFFFFF",
  backgroundImageUrl: null,
};

const INITIAL_FORM: CompetitionFormState = {
  name: "",
  slug: "",
  description: "",
  timezone: "Europe/Oslo",
  editionLabel: "",
  editionSlug: "",
  editionFormat: "round_robin",
  editionTimezone: "Europe/Oslo",
  rotationSeconds: 5,
  registrationOpens: "",
  registrationCloses: "",
};

const TIMEZONES = [
  "Europe/Oslo",
  "Europe/Copenhagen",
  "Europe/Stockholm",
  "UTC",
];

export default function CompetitionCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState<CompetitionFormState>(INITIAL_FORM);
  const [theme, setTheme] = useState<ScoreboardThemeFormValue>(DEFAULT_THEME);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const slugSuggestion = useMemo(() => generateSlug(form.name), [form.name]);

  function updateForm<K extends keyof CompetitionFormState>(
    field: K,
    value: CompetitionFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (!form.registrationOpens || !form.registrationCloses) {
        throw new Error("Fyll inn åpning og frist for påmeldingsperioden.");
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

      setSuccessMessage(
        `Konkurransen ${response.data?.competition.name ?? form.name} ble opprettet. Du kan nå legge til flere utgaver og invitere lag.`,
      );
      setForm(INITIAL_FORM);
      setTheme(DEFAULT_THEME);
      router.refresh();
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
    <main className="min-h-screen bg-card/60 pb-16">
      <div className="mx-auto w-full max-w-5xl px-6 pb-16 pt-14">
        <header className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Turnering · Selvbetjent
          </p>
          <h1 className="text-3xl font-bold text-zinc-900 md:text-4xl">
            Opprett ny konkurranse
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Registrer grunninformasjon og første utgave. Du kan senere legge til
            flere utgaver, lag, kamper og storskjerminnhold.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10">
          <section className="space-y-6 rounded-2xl border border-border bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900">
              Konkurransedetaljer
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="competition-name"
                  className="text-sm font-medium text-zinc-800"
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-xs text-zinc-500">
                  Navnet vises offentlig på landingssiden.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="competition-slug"
                  className="text-sm font-medium text-zinc-800"
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-xs text-zinc-500">
                  Hvis feltet står tomt bruker vi automatisk {slugSuggestion}.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="competition-description"
                className="text-sm font-medium text-zinc-800"
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
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="competition-timezone"
                  className="text-sm font-medium text-zinc-800"
                >
                  Tidssone
                </label>
                <select
                  id="competition-timezone"
                  value={form.timezone}
                  onChange={(event) =>
                    updateForm("timezone", event.target.value)
                  }
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                  className="text-sm font-medium text-zinc-800"
                >
                  Tidssone for første utgave
                </label>
                <select
                  id="edition-timezone"
                  value={form.editionTimezone}
                  onChange={(event) =>
                    updateForm("editionTimezone", event.target.value)
                  }
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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

          <section className="space-y-6 rounded-2xl border border-border bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900">
              Første utgave
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="edition-label"
                  className="text-sm font-medium text-zinc-800"
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="edition-slug"
                  className="text-sm font-medium text-zinc-800"
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="edition-format"
                  className="text-sm font-medium text-zinc-800"
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="round_robin">Seriespill</option>
                  <option value="knockout">Sluttspill</option>
                  <option value="hybrid">Kombinasjon</option>
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="rotation-seconds"
                  className="text-sm font-medium text-zinc-800"
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <p className="text-xs text-zinc-500">
                  Må være 2 sekunder eller mer. Bruk 5 sekunder som anbefalt
                  standard.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="registration-opens"
                  className="text-sm font-medium text-zinc-800"
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="registration-closes"
                  className="text-sm font-medium text-zinc-800"
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
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
          </section>

          <ScoreboardThemeForm
            value={theme}
            onChange={setTheme}
            disabled={isSubmitting}
          />

          <footer className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
            {errorMessage ? (
              <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {successMessage}
              </p>
            ) : null}

            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <p className="text-xs text-zinc-500">
                Når konkurransen er opprettet kan du legge til flere utgaver,
                invitere lag og konfigurere storskjermen fra kontrollpanelet.
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isSubmitting ? "Lagrer..." : "Opprett konkurranse"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </main>
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
