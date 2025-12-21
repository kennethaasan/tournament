"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import {
  ScoreboardThemeForm,
  type ScoreboardThemeFormValue,
} from "@/ui/components/scoreboard/theme-form";

type EditionFormState = {
  label: string;
  slug: string;
  format: "round_robin" | "knockout" | "hybrid";
  timezone: string;
  rotationSeconds: number;
  registrationOpens: string;
  registrationCloses: string;
};

const INITIAL_FORM: EditionFormState = {
  label: "",
  slug: "",
  format: "round_robin",
  timezone: "Europe/Oslo",
  rotationSeconds: 5,
  registrationOpens: "",
  registrationCloses: "",
};

const INITIAL_THEME: ScoreboardThemeFormValue = {
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

type EditionCreateFormProps = {
  competitionId: string;
};

export function EditionCreateForm({ competitionId }: EditionCreateFormProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [theme, setTheme] = useState(INITIAL_THEME);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function updateForm<K extends keyof EditionFormState>(
    field: K,
    value: EditionFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!form.registrationOpens || !form.registrationCloses) {
        throw new Error("Fyll inn åpning og frist for påmeldingsperioden.");
      }

      const response = await apiClient.POST(
        "/api/competitions/{competition_id}/editions",
        {
          params: {
            path: {
              competition_id: competitionId,
            },
          },
          body: {
            label: form.label,
            slug: form.slug || generateSlug(form.label),
            format: form.format,
            timezone: form.timezone,
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
      );

      if (response.error) {
        throw new Error(
          response.error.title ?? "Ukjent feil ved opprettelse av utgave.",
        );
      }

      setSuccessMessage(
        `Utgaven ${response.data?.label ?? form.label} ble opprettet.`,
      );
      setForm(INITIAL_FORM);
      setTheme(INITIAL_THEME);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Noe gikk galt under opprettelsen. Prøv igjen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
          Utgave · Administrasjon
        </p>
        <h1 className="text-3xl font-bold text-zinc-900">Opprett ny utgave</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Registrer neste sesong eller arrangement for konkurransen. Du kan
          senere legge til lag, kamper og oppdatere storskjermen.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="space-y-6 rounded-2xl border border-border bg-white p-8 shadow-sm">
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
                value={form.label}
                onChange={(event) => updateForm("label", event.target.value)}
                placeholder="Eksempel: Vårturnering 2026"
                required
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="edition-slug"
                className="text-sm font-medium text-zinc-800"
              >
                URL-navn (slug)
              </label>
              <input
                id="edition-slug"
                type="text"
                value={form.slug}
                onChange={(event) =>
                  updateForm("slug", event.target.value.toLowerCase())
                }
                placeholder={generateSlug(form.label)}
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
                Format
              </label>
              <select
                id="edition-format"
                value={form.format}
                onChange={(event) =>
                  updateForm(
                    "format",
                    event.target.value as EditionFormState["format"],
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
                htmlFor="edition-timezone"
                className="text-sm font-medium text-zinc-800"
              >
                Tidssone
              </label>
              <select
                id="edition-timezone"
                value={form.timezone}
                onChange={(event) => updateForm("timezone", event.target.value)}
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

          <div className="grid gap-6 md:grid-cols-2">
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
            </div>

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
          </div>

          <div className="space-y-2 md:w-1/2">
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

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-zinc-500">
              Etter opprettelse kan du legge til lag, kamper og
              storskjerminnhold for den nye utgaven.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ? "Lagrer..." : "Opprett utgave"}
            </button>
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
      .replace(/^-+|-+$/g, "") || "ny-utgave"
  );
}
