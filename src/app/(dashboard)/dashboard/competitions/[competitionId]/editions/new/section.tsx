"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { FormField } from "@/ui/components/form-field";
import { Input } from "@/ui/components/input";
import {
  ScoreboardThemeForm,
  type ScoreboardThemeFormValue,
} from "@/ui/components/scoreboard/theme-form";
import { Select } from "@/ui/components/select";
import { TIMEZONES } from "@/ui/constants/timezones";

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
    <main className="min-h-screen bg-background pb-16">
      <div className="mx-auto w-full max-w-4xl px-6 pb-16 pt-14">
        <header className="mb-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Utgave · Administrasjon
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            Opprett ny utgave
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Registrer neste sesong eller arrangement for konkurransen. Du kan
            senere legge til lag, kamper og oppdatere storskjermen.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Utgaveinformasjon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField htmlFor="edition-label" label="Utgavenavn">
                  <Input
                    id="edition-label"
                    type="text"
                    value={form.label}
                    onChange={(event) =>
                      updateForm("label", event.target.value)
                    }
                    placeholder="Eksempel: Vårturnering 2026"
                    required
                  />
                </FormField>

                <FormField
                  htmlFor="edition-slug"
                  label="URL-navn (slug)"
                  description={`Hvis feltet står tomt bruker vi automatisk ${generateSlug(form.label)}.`}
                >
                  <Input
                    id="edition-slug"
                    type="text"
                    value={form.slug}
                    onChange={(event) =>
                      updateForm("slug", event.target.value.toLowerCase())
                    }
                    placeholder={generateSlug(form.label)}
                    required
                  />
                </FormField>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField htmlFor="edition-format" label="Format">
                  <Select
                    id="edition-format"
                    value={form.format}
                    onChange={(event) =>
                      updateForm(
                        "format",
                        event.target.value as EditionFormState["format"],
                      )
                    }
                  >
                    <option value="round_robin">Seriespill</option>
                    <option value="knockout">Sluttspill</option>
                    <option value="hybrid">Kombinasjon</option>
                  </Select>
                </FormField>

                <FormField htmlFor="edition-timezone" label="Tidssone">
                  <Select
                    id="edition-timezone"
                    value={form.timezone}
                    onChange={(event) =>
                      updateForm("timezone", event.target.value)
                    }
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  htmlFor="rotation-seconds"
                  label="Rotasjonstid scoreboard (sekunder)"
                  description="Må være 2 sekunder eller mer."
                >
                  <Input
                    id="rotation-seconds"
                    type="number"
                    min={2}
                    value={form.rotationSeconds}
                    onChange={(event) =>
                      updateForm("rotationSeconds", Number(event.target.value))
                    }
                  />
                </FormField>

                <FormField htmlFor="registration-opens" label="Påmelding åpner">
                  <Input
                    id="registration-opens"
                    type="datetime-local"
                    value={form.registrationOpens}
                    onChange={(event) =>
                      updateForm("registrationOpens", event.target.value)
                    }
                    required
                  />
                </FormField>
              </div>

              <FormField
                htmlFor="registration-closes"
                label="Påmelding stenger"
                className="md:w-1/2"
              >
                <Input
                  id="registration-closes"
                  type="datetime-local"
                  value={form.registrationCloses}
                  onChange={(event) =>
                    updateForm("registrationCloses", event.target.value)
                  }
                  required
                />
              </FormField>
            </CardContent>
          </Card>

          <ScoreboardThemeForm
            value={theme}
            onChange={setTheme}
            disabled={isSubmitting}
          />

          <Card>
            <CardContent className="space-y-4">
              {errorMessage ? (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}
              {successMessage ? (
                <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
                  {successMessage}
                </p>
              ) : null}

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-muted-foreground">
                  Etter opprettelse kan du legge til lag, kamper og
                  storskjerminnhold for den nye utgaven.
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[10rem]"
                >
                  {isSubmitting ? "Lagrer..." : "Opprett utgave"}
                </Button>
              </div>
            </CardContent>
          </Card>
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
      .replace(/^-+|-+$/g, "") || "ny-utgave"
  );
}
