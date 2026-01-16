"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiClient, unwrapResponse } from "@/lib/api/client";
import {
  deleteEntry,
  type EntryReview,
  editionEntriesQueryKey,
  fetchEditionEntries,
  updateEntryStatus,
} from "@/lib/api/entries-client";
import { updateEditionScoreboard } from "@/lib/api/scoreboard-client";
import { translateEditionStatus } from "@/lib/utils/translations";
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

/**
 * Formats an ISO date string to a local datetime-local input value.
 * datetime-local inputs expect YYYY-MM-DDTHH:mm in local time.
 */
function toLocalDatetimeString(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

type EditionDashboardProps = {
  editionId: string;
};

type EditionData = {
  edition: {
    id: string;
    competition_id: string;
    competition_name?: string | null;
    competition_slug?: string | null;
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
  { value: "draft", label: translateEditionStatus("draft") },
  { value: "published", label: translateEditionStatus("published") },
  { value: "archived", label: translateEditionStatus("archived") },
];

const TIMEZONES = [
  "Europe/Oslo",
  "Europe/Copenhagen",
  "Europe/Stockholm",
  "UTC",
];

type EditionHeaderProps = {
  editionId: string;
  pageTitle: string;
  pageDescription: string;
  edition?: EditionData["edition"];
};

export function EditionHeader({
  editionId,
  pageTitle,
  pageDescription,
  edition,
}: EditionHeaderProps) {
  const shouldFetchEdition = !edition?.competition_name;
  const editionQuery = useQuery({
    queryKey: editionQueryKey(editionId),
    queryFn: ({ signal }) => fetchEdition(editionId, signal),
    enabled: shouldFetchEdition,
  });
  const resolvedEdition = editionQuery.data?.edition ?? edition;
  const competitionName =
    resolvedEdition?.competition_name ??
    (editionQuery.isLoading && shouldFetchEdition
      ? "Laster..."
      : "Ukjent konkurranse");
  const editionLabel =
    resolvedEdition?.label ??
    (editionQuery.isLoading && shouldFetchEdition
      ? "Laster..."
      : "Ukjent utgave");

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {competitionName}
        </p>
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          {editionLabel}
        </h1>
      </header>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">{pageTitle}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {pageDescription}
        </p>
      </div>
    </div>
  );
}

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
        <EditionHeader
          editionId={editionId}
          pageTitle="Administrasjon"
          pageDescription="Henter utgavedetaljer..."
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8">
        <EditionHeader
          editionId={editionId}
          pageTitle="Administrasjon"
          pageDescription="Kunne ikke laste utgaven."
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
      <EditionHeader
        editionId={editionId}
        edition={edition}
        pageTitle="Administrasjon"
        pageDescription="Administrer innstillinger, format og registrering for denne utgaven."
      />

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

      <RegistrationLockCard
        editionId={editionId}
        entriesLockedAt={edition.entries_locked_at}
      />

      <RegistrationRequestsCard editionId={editionId} />

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

  // Sync state when edition prop changes (e.g., after refetch)
  useEffect(() => {
    if (!isEditing) {
      setLabel(edition.label);
      setFormat(edition.format);
      setTimezone(edition.timezone);
      setStatus(edition.status);
    }
  }, [edition, isEditing]);

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
                {translateEditionStatus(edition.status)}
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
    toLocalDatetimeString(edition.registration_window.opens_at),
  );
  const [closesAt, setClosesAt] = useState(
    toLocalDatetimeString(edition.registration_window.closes_at),
  );
  const [contactEmail, setContactEmail] = useState(edition.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(edition.contact_phone ?? "");

  // Sync state when edition prop changes (e.g., after refetch)
  useEffect(() => {
    if (!isEditing) {
      setOpensAt(toLocalDatetimeString(edition.registration_window.opens_at));
      setClosesAt(toLocalDatetimeString(edition.registration_window.closes_at));
      setContactEmail(edition.contact_email ?? "");
      setContactPhone(edition.contact_phone ?? "");
    }
  }, [edition, isEditing]);

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
    setOpensAt(toLocalDatetimeString(edition.registration_window.opens_at));
    setClosesAt(toLocalDatetimeString(edition.registration_window.closes_at));
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

function RegistrationLockCard({
  editionId,
  entriesLockedAt,
}: {
  editionId: string;
  entriesLockedAt: string | null;
}) {
  const queryClient = useQueryClient();
  const [entryLockMessage, setEntryLockMessage] = useState<string | null>(null);
  const [entryLockError, setEntryLockError] = useState<string | null>(null);

  const lockMutation = useMutation({
    mutationFn: (lock: boolean) =>
      updateEditionScoreboard(editionId, {
        entries_locked: lock,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(editionQueryKey(editionId), data);
      setEntryLockMessage(
        data.edition.entries_locked_at
          ? "Påmeldinger er låst for denne utgaven."
          : "Påmeldinger er åpnet igjen.",
      );
      setEntryLockError(null);
    },
    onError: (error) => {
      setEntryLockError(
        error instanceof Error
          ? error.message
          : "Kunne ikke oppdatere påmeldingslåsen.",
      );
    },
  });

  const entriesLockedAtDate = entriesLockedAt
    ? new Date(entriesLockedAt)
    : null;
  const isLockingEntries = lockMutation.isPending;

  async function handleEntryLockChange(lock: boolean) {
    setEntryLockError(null);
    setEntryLockMessage(null);

    try {
      await lockMutation.mutateAsync(lock);
    } catch (error) {
      setEntryLockError(
        error instanceof Error
          ? error.message
          : "Kunne ikke oppdatere påmeldingslåsen.",
      );
    }
  }

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Påmeldingslås</CardTitle>
        <CardDescription>
          Lås nye påmeldinger når kampoppsettet er i ferd med å publiseres for å
          unngå endringer i laglisten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entryLockMessage && (
          <output
            aria-live="polite"
            className="block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
          >
            {entryLockMessage}
          </output>
        )}

        {entryLockError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {entryLockError}
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm text-foreground">
            Status:{" "}
            <span className="font-medium">
              {entriesLockedAtDate
                ? `Låst ${entriesLockedAtDate.toLocaleString("no-NB")}`
                : "Åpen"}
            </span>
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleEntryLockChange(false)}
              disabled={!entriesLockedAtDate || isLockingEntries}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-card/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Åpne påmeldinger
            </button>
            <button
              type="button"
              onClick={() => handleEntryLockChange(true)}
              disabled={Boolean(entriesLockedAtDate) || isLockingEntries}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Lås påmeldinger
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RegistrationRequestsCard({ editionId }: { editionId: string }) {
  const queryClient = useQueryClient();

  const [entryReviewMessage, setEntryReviewMessage] = useState<string | null>(
    null,
  );
  const [entryReviewError, setEntryReviewError] = useState<string | null>(null);
  const [decisionReasons, setDecisionReasons] = useState<
    Record<string, string>
  >({});
  const [reviewingEntryId, setReviewingEntryId] = useState<string | null>(null);

  const entriesQuery = useQuery({
    queryKey: editionEntriesQueryKey(editionId),
    queryFn: ({ signal }) => fetchEditionEntries(editionId, { signal }),
    staleTime: 30_000,
  });

  const entryReviewMutation = useMutation({
    mutationFn: (payload: {
      entryId: string;
      status: "approved" | "rejected";
      reason?: string;
    }) =>
      updateEntryStatus(payload.entryId, {
        status: payload.status,
        ...(payload.reason ? { reason: payload.reason } : {}),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        editionEntriesQueryKey(editionId),
        (current: EntryReview[] | undefined) =>
          current?.map((item) =>
            item.entry.id === updated.id
              ? { ...item, entry: { ...item.entry, ...updated } }
              : item,
          ),
      );
      setEntryReviewMessage("Påmeldingen er oppdatert.");
      setEntryReviewError(null);
    },
    onError: (error) => {
      setEntryReviewError(
        error instanceof Error
          ? error.message
          : "Kunne ikke oppdatere påmeldingen.",
      );
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (entryId: string) => deleteEntry(entryId),
    onSuccess: (_, entryId) => {
      queryClient.setQueryData(
        editionEntriesQueryKey(editionId),
        (current: EntryReview[] | undefined) =>
          current?.filter((item) => item.entry.id !== entryId),
      );
      setEntryReviewMessage("Påmeldingen er slettet.");
      setEntryReviewError(null);
    },
    onError: (error) => {
      setEntryReviewError(
        error instanceof Error
          ? error.message
          : "Kunne ikke slette påmeldingen.",
      );
    },
  });

  const entries = entriesQuery.data ?? [];
  const entriesLoading = entriesQuery.isLoading;
  const entriesError =
    entriesQuery.error instanceof Error ? entriesQuery.error.message : null;

  async function handleEntryDecision(
    entryId: string,
    status: "approved" | "rejected",
  ) {
    setEntryReviewError(null);
    setEntryReviewMessage(null);
    setReviewingEntryId(entryId);

    try {
      const reason = decisionReasons[entryId]?.trim();
      await entryReviewMutation.mutateAsync({
        entryId,
        status,
        reason: reason ? reason : undefined,
      });
      setDecisionReasons((prev) => ({
        ...prev,
        [entryId]: "",
      }));
    } catch (error) {
      setEntryReviewError(
        error instanceof Error
          ? error.message
          : "Kunne ikke oppdatere påmeldingen.",
      );
    } finally {
      setReviewingEntryId(null);
    }
  }

  async function handleEntryDelete(entryId: string) {
    if (!confirm("Er du sikker på at du vil slette denne påmeldingen?")) {
      return;
    }

    setEntryReviewError(null);
    setEntryReviewMessage(null);

    try {
      await deleteEntryMutation.mutateAsync(entryId);
    } catch (error) {
      setEntryReviewError(
        error instanceof Error
          ? error.message
          : "Kunne ikke slette påmeldingen.",
      );
    }
  }

  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">
          Påmeldingsforespørsler
        </CardTitle>
        <CardDescription>
          Godkjenn eller avvis nye påmeldinger før kampoppsettet publiseres.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {entryReviewMessage && (
          <output
            aria-live="polite"
            className="block rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
          >
            {entryReviewMessage}
          </output>
        )}

        {entryReviewError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {entryReviewError}
          </div>
        )}

        {entriesLoading ? (
          <div className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
            Laster påmeldinger …
          </div>
        ) : entriesError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {entriesError}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            Ingen påmeldinger tilgjengelig ennå.
          </div>
        ) : (
          <div className="grid gap-4">
            {entries.map((item) => {
              const entry = item.entry;
              const isPending = entry.status === "pending";
              const isReviewing = reviewingEntryId === entry.id;
              return (
                <article
                  key={entry.id}
                  className="rounded-xl border border-border/80 bg-card/50 p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {item.team.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Lag-ID: {item.team.id}
                      </p>
                    </div>
                    <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground">
                      {entryStatusLabel(entry.status)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                    <div>
                      Påmeldt:{" "}
                      {entry.submitted_at
                        ? new Date(entry.submitted_at).toLocaleString("no-NB")
                        : "—"}
                    </div>
                    <div>
                      Notat: {entry.notes ? entry.notes : "Ingen notat"}
                    </div>
                  </div>

                  {isPending ? (
                    <div className="mt-4 space-y-2">
                      <label
                        htmlFor={`decision-${entry.id}`}
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Begrunnelse (valgfritt)
                      </label>
                      <textarea
                        id={`decision-${entry.id}`}
                        value={decisionReasons[entry.id] ?? ""}
                        onChange={(event) =>
                          setDecisionReasons((prev) => ({
                            ...prev,
                            [entry.id]: event.target.value,
                          }))
                        }
                        rows={2}
                        className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  ) : entry.decision_reason ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Begrunnelse: {entry.decision_reason}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleEntryDecision(entry.id, "approved")}
                      disabled={!isPending || isReviewing}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isReviewing ? "Oppdaterer ..." : "Godkjenn"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEntryDecision(entry.id, "rejected")}
                      disabled={!isPending || isReviewing}
                      className="rounded-md border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive shadow-sm transition hover:border-destructive/60 hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Avvis
                    </button>
                    {(entry.status === "rejected" ||
                      entry.status === "withdrawn") && (
                      <button
                        type="button"
                        onClick={() => handleEntryDelete(entry.id)}
                        disabled={deleteEntryMutation.isPending}
                        className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deleteEntryMutation.isPending
                          ? "Sletter ..."
                          : "Slett permanent"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function entryStatusLabel(status: string) {
  if (status === "approved") return "Godkjent";
  if (status === "rejected") return "Avvist";
  if (status === "pending") return "Venter";
  if (status === "withdrawn") return "Trukket";
  return status;
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
