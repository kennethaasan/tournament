"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { Textarea } from "@/ui/components/textarea";
import { TIMEZONES } from "@/ui/constants/timezones";

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
    <main className="min-h-screen bg-background pb-16">
      <div className="mx-auto w-full max-w-5xl px-6 pb-16 pt-14">
        <header className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Turnering · Selvbetjent
          </p>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Opprett ny konkurranse
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Registrer grunninformasjon og første utgave. Du kan senere legge til
            flere utgaver, lag, kamper og storskjerminnhold.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Konkurransedetaljer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  htmlFor="competition-name"
                  label="Navn"
                  description="Navnet vises offentlig på landingssiden."
                >
                  <Input
                    id="competition-name"
                    type="text"
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="Eksempel: Elite Cup 2025"
                    required
                  />
                </FormField>

                <FormField
                  htmlFor="competition-slug"
                  label="URL-navn (slug)"
                  description={`Hvis feltet står tomt bruker vi automatisk ${slugSuggestion}.`}
                >
                  <Input
                    id="competition-slug"
                    type="text"
                    value={form.slug}
                    onChange={(event) =>
                      updateForm("slug", event.target.value.toLowerCase())
                    }
                    placeholder={slugSuggestion}
                  />
                </FormField>
              </div>

              <FormField
                htmlFor="competition-description"
                label="Beskrivelse (valgfritt)"
              >
                <Textarea
                  id="competition-description"
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="Kort introduksjon til turneringen som vises offentlig."
                />
              </FormField>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField htmlFor="competition-timezone" label="Tidssone">
                  <Select
                    id="competition-timezone"
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

                <FormField
                  htmlFor="edition-timezone"
                  label="Tidssone for første utgave"
                >
                  <Select
                    id="edition-timezone"
                    value={form.editionTimezone}
                    onChange={(event) =>
                      updateForm("editionTimezone", event.target.value)
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Første utgave</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField htmlFor="edition-label" label="Utgavenavn">
                  <Input
                    id="edition-label"
                    type="text"
                    value={form.editionLabel}
                    onChange={(event) =>
                      updateForm("editionLabel", event.target.value)
                    }
                    placeholder="Eksempel: 2025"
                    required
                  />
                </FormField>

                <FormField
                  htmlFor="edition-slug"
                  label="Utgave (slug)"
                  description={`Hvis feltet står tomt bruker vi automatisk ${generateSlug(form.editionLabel)}.`}
                >
                  <Input
                    id="edition-slug"
                    type="text"
                    value={form.editionSlug}
                    onChange={(event) =>
                      updateForm(
                        "editionSlug",
                        event.target.value.toLowerCase(),
                      )
                    }
                    placeholder={generateSlug(form.editionLabel)}
                    required
                  />
                </FormField>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField htmlFor="edition-format" label="Turneringsformat">
                  <Select
                    id="edition-format"
                    value={form.editionFormat}
                    onChange={(event) =>
                      updateForm(
                        "editionFormat",
                        event.target
                          .value as CompetitionFormState["editionFormat"],
                      )
                    }
                  >
                    <option value="round_robin">Seriespill</option>
                    <option value="knockout">Sluttspill</option>
                    <option value="hybrid">Kombinasjon</option>
                  </Select>
                </FormField>

                <FormField
                  htmlFor="rotation-seconds"
                  label="Rotasjonstid scoreboard (sekunder)"
                  description="Må være 2 sekunder eller mer. Bruk 5 sekunder som anbefalt standard."
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
              </div>

              <div className="grid gap-6 md:grid-cols-2">
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

                <FormField
                  htmlFor="registration-closes"
                  label="Påmelding stenger"
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
              </div>
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

              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <p className="text-xs text-muted-foreground">
                  Når konkurransen er opprettet kan du legge til flere utgaver,
                  invitere lag og konfigurere storskjermen fra kontrollpanelet.
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[12rem]"
                >
                  {isSubmitting ? "Lagrer..." : "Opprett konkurranse"}
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
      .replace(/^-+|-+$/g, "") || "ny-turnering"
  );
}
