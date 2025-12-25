"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  competitionVenuesQueryKey,
  createVenue,
  deleteVenue,
  fetchCompetitionVenues,
  updateVenue,
  type Venue,
} from "@/lib/api/venues-client";

type VenuesPanelProps = {
  competitionId: string;
};

type VenueFormState = {
  name: string;
  slug: string;
  editionId: string;
  address: string;
  notes: string;
  timezone: string;
};

export function VenuesPanel({ competitionId }: VenuesPanelProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VenueFormState>({
    name: "",
    slug: "",
    editionId: "",
    address: "",
    notes: "",
    timezone: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingVenueId, setSavingVenueId] = useState<string | null>(null);
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);

  const venuesQuery = useQuery({
    queryKey: competitionVenuesQueryKey(competitionId),
    queryFn: ({ signal }) => fetchCompetitionVenues(competitionId, { signal }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createVenue(competitionId, {
        name: form.name,
        slug: form.slug,
        edition_id: form.editionId || null,
        address: form.address || null,
        notes: form.notes || null,
        timezone: form.timezone || null,
      }),
    onSuccess: () => {
      setForm({
        name: "",
        slug: "",
        editionId: "",
        address: "",
        notes: "",
        timezone: "",
      });
      setFormError(null);
      void queryClient.invalidateQueries({
        queryKey: competitionVenuesQueryKey(competitionId),
      });
    },
    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : "Kunne ikke opprette arena.",
      );
    },
  });

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      await createMutation.mutateAsync();
    } catch {
      // handled in mutation callbacks
    }
  }

  async function handleSave(venueId: string, payload: Partial<VenueFormState>) {
    setActionError(null);
    setSavingVenueId(venueId);
    try {
      await updateVenue(venueId, {
        name: payload.name,
        slug: payload.slug,
        address: payload.address,
        notes: payload.notes,
        timezone: payload.timezone,
      });
      void queryClient.invalidateQueries({
        queryKey: competitionVenuesQueryKey(competitionId),
      });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Kunne ikke oppdatere arena.",
      );
    } finally {
      setSavingVenueId(null);
    }
  }

  async function handleDelete(venueId: string) {
    setActionError(null);
    setDeletingVenueId(venueId);
    try {
      await deleteVenue(venueId);
      void queryClient.invalidateQueries({
        queryKey: competitionVenuesQueryKey(competitionId),
      });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Kunne ikke slette arena.",
      );
    } finally {
      setDeletingVenueId(null);
    }
  }

  const venues = venuesQuery.data ?? [];
  const venuesLoading = venuesQuery.isLoading;
  const venuesError =
    venuesQuery.error instanceof Error ? venuesQuery.error.message : null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Konkurranse · Arenaer
        </p>
        <h1 className="text-3xl font-bold text-foreground">Arenaer</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Legg inn baner og haller som brukes i kampoppsett. Disse arenaene kan
          kobles direkte til kampene.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          Registrer ny arena
        </h2>
        <p className="text-sm text-muted-foreground">
          Slug brukes som unik identifikator. Du kan valgfritt knytte arenaen
          til en bestemt utgave.
        </p>

        {formError ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {formError}
          </div>
        ) : null}

        <form onSubmit={handleCreate} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="venue-name"
                className="text-sm font-medium text-foreground"
              >
                Navn
              </label>
              <input
                id="venue-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="venue-slug"
                className="text-sm font-medium text-foreground"
              >
                Slug
              </label>
              <input
                id="venue-slug"
                value={form.slug}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, slug: event.target.value }))
                }
                placeholder="f.eks. bane-1"
                required
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="venue-edition"
                className="text-sm font-medium text-foreground"
              >
                Utgave-ID (valgfritt)
              </label>
              <input
                id="venue-edition"
                value={form.editionId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    editionId: event.target.value,
                  }))
                }
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="venue-timezone"
                className="text-sm font-medium text-foreground"
              >
                Tidssone (valgfritt)
              </label>
              <input
                id="venue-timezone"
                value={form.timezone}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    timezone: event.target.value,
                  }))
                }
                placeholder="Europe/Oslo"
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="venue-address"
                className="text-sm font-medium text-foreground"
              >
                Adresse (valgfritt)
              </label>
              <input
                id="venue-address"
                value={form.address}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, address: event.target.value }))
                }
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="venue-notes"
                className="text-sm font-medium text-foreground"
              >
                Notater (valgfritt)
              </label>
              <input
                id="venue-notes"
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {createMutation.isPending ? "Oppretter …" : "Opprett arena"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Registrerte arenaer
            </h2>
            <p className="text-sm text-muted-foreground">
              Oppdater navn, slug og detaljer direkte i listen under.
            </p>
          </div>
        </header>

        {actionError ? (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {actionError}
          </div>
        ) : null}

        {venuesLoading ? (
          <div className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
            Laster arenaer …
          </div>
        ) : venuesError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {venuesError}
          </div>
        ) : venues.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
            Ingen arenaer registrert enda.
          </div>
        ) : (
          <div className="space-y-4">
            {venues.map((venue) => (
              <VenueEditor
                key={venue.id}
                venue={venue}
                onSave={handleSave}
                onDelete={handleDelete}
                isSaving={savingVenueId === venue.id}
                isDeleting={deletingVenueId === venue.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type VenueEditorProps = {
  venue: Venue;
  onSave: (venueId: string, payload: Partial<VenueFormState>) => void;
  onDelete: (venueId: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
};

function VenueEditor({
  venue,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: VenueEditorProps) {
  const [form, setForm] = useState<VenueFormState>({
    name: venue.name ?? "",
    slug: venue.slug ?? "",
    editionId: venue.edition_id ?? "",
    address: venue.address ?? "",
    notes: venue.notes ?? "",
    timezone: venue.timezone ?? "",
  });

  useEffect(() => {
    setForm({
      name: venue.name ?? "",
      slug: venue.slug ?? "",
      editionId: venue.edition_id ?? "",
      address: venue.address ?? "",
      notes: venue.notes ?? "",
      timezone: venue.timezone ?? "",
    });
  }, [
    venue.name,
    venue.slug,
    venue.edition_id,
    venue.address,
    venue.notes,
    venue.timezone,
  ]);

  const idBase = `venue-${venue.id}`;

  return (
    <article className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {venue.slug}
          </p>
          <p className="text-sm text-muted-foreground">ID: {venue.id}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSave(venue.id, form)}
            disabled={isSaving}
            className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Lagrer …" : "Lagre"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(venue.id)}
            disabled={isDeleting}
            className="rounded-md border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive shadow-sm transition hover:border-destructive/60 hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Sletter …" : "Slett"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor={`${idBase}-name`}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Navn
          </label>
          <input
            id={`${idBase}-name`}
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`${idBase}-slug`}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Slug
          </label>
          <input
            id={`${idBase}-slug`}
            value={form.slug}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, slug: event.target.value }))
            }
            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`${idBase}-edition`}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Utgave-ID
          </label>
          <input
            id={`${idBase}-edition`}
            value={form.editionId}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, editionId: event.target.value }))
            }
            disabled
            className="w-full rounded border border-border px-3 py-2 text-sm text-muted-foreground shadow-sm"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={`${idBase}-timezone`}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Tidssone
          </label>
          <input
            id={`${idBase}-timezone`}
            value={form.timezone}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, timezone: event.target.value }))
            }
            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor={`${idBase}-address`}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Adresse
          </label>
          <input
            id={`${idBase}-address`}
            value={form.address}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, address: event.target.value }))
            }
            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label
            htmlFor={`${idBase}-notes`}
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Notater
          </label>
          <input
            id={`${idBase}-notes`}
            value={form.notes}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, notes: event.target.value }))
            }
            className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
    </article>
  );
}
