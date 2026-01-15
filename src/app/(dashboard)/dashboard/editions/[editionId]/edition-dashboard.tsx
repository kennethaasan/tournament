"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { apiClient, unwrapResponse } from "@/lib/api/client";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";
import { PageHero } from "@/ui/components/page-hero";

type EditionDashboardProps = {
  editionId: string;
};

type EditionData = {
  edition: {
    id: string;
    competition_id: string;
    label: string;
    slug: string;
    format: string;
    timezone: string;
    status: string;
    registration_window: {
      opens_at: string | null;
      closes_at: string | null;
    };
    contact_email: string | null;
    contact_phone: string | null;
    scoreboard_rotation_seconds: number;
    scoreboard_modules: string[];
    entries_locked_at: string | null;
    scoreboard_theme: {
      primary_color: string;
      secondary_color: string;
      background_image_url: string | null;
    };
    created_at: string;
    updated_at: string;
  };
  highlight: {
    message: string;
    expires_at: string;
    remaining_seconds: number;
  } | null;
};

const FORMATS = [
  { value: "round_robin", label: "Seriespill" },
  { value: "knockout", label: "Sluttspill" },
  { value: "hybrid", label: "Kombinasjon" },
];

const STATUSES = [
  { value: "draft", label: "Utkast" },
  { value: "published", label: "Publisert" },
  { value: "archived", label: "Arkivert" },
];

const TIMEZONES = [
  "Europe/Oslo",
  "Europe/Copenhagen",
  "Europe/Stockholm",
  "UTC",
];

function editionQueryKey(editionId: string) {
  return ["edition", editionId] as const;
}

async function fetchEdition(
  editionId: string,
  signal?: AbortSignal,
): Promise<EditionData> {
  const { data, error, response } = await apiClient.GET(
    "/api/editions/{edition_id}",
    {
      params: { path: { edition_id: editionId } },
      signal,
      credentials: "include",
    },
  );
  return unwrapResponse({ data, error, response }) as EditionData;
}

export function EditionDashboard({ editionId }: EditionDashboardProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: editionQueryKey(editionId),
    queryFn: ({ signal }) => fetchEdition(editionId, signal),
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHero
          eyebrow="Utgave · Administrasjon"
          title="Laster..."
          description="Henter utgavedetaljer..."
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8">
        <PageHero
          eyebrow="Utgave · Administrasjon"
          title="Feil"
          description="Kunne ikke laste utgaven."
        />
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Ukjent feil"}
        </div>
      </div>
    );
  }

  const edition = data.edition;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Utgave · Administrasjon"
        title={edition.label}
        description="Administrer innstillinger, format og registrering for denne utgaven."
      />

      <div className="flex flex-wrap gap-3">
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link href={`/dashboard/editions/${editionId}/schedule`}>
            Kampoppsett
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link href={`/dashboard/editions/${editionId}/teams`}>
            Lag og tropp
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link href={`/dashboard/editions/${editionId}/results` as Route}>
            Resultater
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link href={`/dashboard/editions/${editionId}/scoreboard`}>
            Scoreboard
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EditionSettingsCard
          edition={edition}
          editionId={editionId}
          onUpdate={() =>
            queryClient.invalidateQueries({
              queryKey: editionQueryKey(editionId),
            })
          }
        />
        <RegistrationSettingsCard
          edition={edition}
          editionId={editionId}
          onUpdate={() =>
            queryClient.invalidateQueries({
              queryKey: editionQueryKey(editionId),
            })
          }
        />
      </div>

      <EditionStatusCard edition={edition} />
    </div>
  );
}

function EditionSettingsCard({
  edition,
  editionId,
  onUpdate,
}: {
  edition: EditionData["edition"];
  editionId: string;
  onUpdate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(edition.label);
  const [format, setFormat] = useState(edition.format);
  const [timezone, setTimezone] = useState(edition.timezone);
  const [status, setStatus] = useState(edition.status);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await apiClient.PATCH(
        "/api/editions/{edition_id}",
        {
          params: { path: { edition_id: editionId } },
          body: {
            label,
            format: format as "round_robin" | "knockout" | "hybrid",
            timezone,
            status: status as "draft" | "published" | "archived",
          },
          credentials: "include",
        },
      );
      return unwrapResponse({ data, error, response });
    },
    onSuccess: () => {
      onUpdate();
      setIsEditing(false);
    },
  });

  const handleCancel = () => {
    setLabel(edition.label);
    setFormat(edition.format);
    setTimezone(edition.timezone);
    setStatus(edition.status);
    setIsEditing(false);
  };

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg text-foreground">
            Utgaveinnstillinger
          </CardTitle>
          <CardDescription>
            Navn, format, tidssone og status for utgaven.
          </CardDescription>
        </div>
        {!isEditing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            Rediger
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="edition-label">Utgavenavn</Label>
              <Input
                id="edition-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edition-format">Format</Label>
                <select
                  id="edition-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edition-timezone">Tidssone</Label>
                <select
                  id="edition-timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
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
            <div className="space-y-2">
              <Label htmlFor="edition-status">Status</Label>
              <select
                id="edition-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {mutation.error && (
              <p className="text-sm text-destructive">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Kunne ikke lagre"}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Lagrer..." : "Lagre"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={mutation.isPending}
              >
                Avbryt
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Navn
              </div>
              <div className="font-semibold text-foreground">
                {edition.label}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Format
                </div>
                <div className="font-semibold text-foreground">
                  {FORMATS.find((f) => f.value === edition.format)?.label ??
                    edition.format}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Tidssone
                </div>
                <div className="font-semibold text-foreground">
                  {edition.timezone}
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Status
              </div>
              <Badge
                variant={edition.status === "published" ? "accent" : "outline"}
              >
                {STATUSES.find((s) => s.value === edition.status)?.label ??
                  edition.status}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RegistrationSettingsCard({
  edition,
  editionId,
  onUpdate,
}: {
  edition: EditionData["edition"];
  editionId: string;
  onUpdate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [opensAt, setOpensAt] = useState(
    edition.registration_window.opens_at
      ? new Date(edition.registration_window.opens_at)
          .toISOString()
          .slice(0, 16)
      : "",
  );
  const [closesAt, setClosesAt] = useState(
    edition.registration_window.closes_at
      ? new Date(edition.registration_window.closes_at)
          .toISOString()
          .slice(0, 16)
      : "",
  );
  const [contactEmail, setContactEmail] = useState(edition.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(edition.contact_phone ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await apiClient.PATCH(
        "/api/editions/{edition_id}",
        {
          params: { path: { edition_id: editionId } },
          body: {
            registration_window: {
              opens_at: opensAt ? new Date(opensAt).toISOString() : undefined,
              closes_at: closesAt
                ? new Date(closesAt).toISOString()
                : undefined,
            },
            contact_email: contactEmail || undefined,
            contact_phone: contactPhone || undefined,
          },
          credentials: "include",
        },
      );
      return unwrapResponse({ data, error, response });
    },
    onSuccess: () => {
      onUpdate();
      setIsEditing(false);
    },
  });

  const handleCancel = () => {
    setOpensAt(
      edition.registration_window.opens_at
        ? new Date(edition.registration_window.opens_at)
            .toISOString()
            .slice(0, 16)
        : "",
    );
    setClosesAt(
      edition.registration_window.closes_at
        ? new Date(edition.registration_window.closes_at)
            .toISOString()
            .slice(0, 16)
        : "",
    );
    setContactEmail(edition.contact_email ?? "");
    setContactPhone(edition.contact_phone ?? "");
    setIsEditing(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Ikke satt";
    return new Date(dateStr).toLocaleString("nb-NO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg text-foreground">
            Påmeldingsinnstillinger
          </CardTitle>
          <CardDescription>
            Påmeldingsperiode og kontaktinformasjon.
          </CardDescription>
        </div>
        {!isEditing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
          >
            Rediger
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reg-opens">Påmelding åpner</Label>
                <Input
                  id="reg-opens"
                  type="datetime-local"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-closes">Påmelding stenger</Label>
                <Input
                  id="reg-closes"
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Kontakt e-post</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="kontakt@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Kontakt telefon</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+47 123 45 678"
                />
              </div>
            </div>
            {mutation.error && (
              <p className="text-sm text-destructive">
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Kunne ikke lagre"}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Lagrer..." : "Lagre"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={mutation.isPending}
              >
                Avbryt
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Påmelding åpner
                </div>
                <div className="font-semibold text-foreground">
                  {formatDate(edition.registration_window.opens_at)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Påmelding stenger
                </div>
                <div className="font-semibold text-foreground">
                  {formatDate(edition.registration_window.closes_at)}
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Kontakt e-post
                </div>
                <div className="font-semibold text-foreground">
                  {edition.contact_email ?? "Ikke satt"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Kontakt telefon
                </div>
                <div className="font-semibold text-foreground">
                  {edition.contact_phone ?? "Ikke satt"}
                </div>
              </div>
            </div>
            {edition.entries_locked_at && (
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Påmelding låst
                </div>
                <Badge variant="outline">
                  {formatDate(edition.entries_locked_at)}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditionStatusCard({ edition }: { edition: EditionData["edition"] }) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("nb-NO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Metadata</CardTitle>
        <CardDescription>Teknisk informasjon om utgaven.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Slug
            </div>
            <div className="font-mono text-foreground">{edition.slug}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Opprettet
            </div>
            <div className="text-foreground">
              {formatDate(edition.created_at)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Sist oppdatert
            </div>
            <div className="text-foreground">
              {formatDate(edition.updated_at)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
