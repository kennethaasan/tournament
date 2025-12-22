"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  addSquadMember,
  type EntryWithSquad,
  registerTeamEntry,
  updateSquadLock,
} from "@/lib/api/teams-client";

type EntriesManagerProps = {
  teamId: string;
};

type EntryPayload = EntryWithSquad;

export function EntriesManager({ teamId }: EntriesManagerProps) {
  const [entryForm, setEntryForm] = useState({
    editionId: "",
    notes: "",
  });
  const [entryInfo, setEntryInfo] = useState<EntryPayload | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [squadError, setSquadError] = useState<string | null>(null);

  const [memberForm, setMemberForm] = useState({
    membershipId: "",
    jerseyNumber: "",
    position: "",
  });
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);
  const entryMutation = useMutation({
    mutationFn: (payload: { editionId: string; notes?: string }) =>
      registerTeamEntry(teamId, {
        edition_id: payload.editionId,
        notes: payload.notes,
      }),
  });
  const squadLockMutation = useMutation({
    mutationFn: (lock: boolean) => {
      if (!entryInfo?.entry.id) {
        throw new Error("Entry mangler; oppdater siden og prøv igjen.");
      }
      return updateSquadLock(entryInfo.entry.id, lock);
    },
  });
  const squadMemberMutation = useMutation({
    mutationFn: (payload: {
      squadId: string;
      membershipId: string;
      jerseyNumber: string;
      position: string;
    }) =>
      addSquadMember(payload.squadId, {
        membership_id: payload.membershipId,
        jersey_number: payload.jerseyNumber
          ? Number(payload.jerseyNumber)
          : undefined,
        position: payload.position || undefined,
      }),
  });
  const entrySubmitting = entryMutation.isPending;
  const squadLocking = squadLockMutation.isPending;
  const memberSubmitting = squadMemberMutation.isPending;

  async function handleEntrySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEntryError(null);

    try {
      const notes = entryForm.notes.trim();
      const payload = await entryMutation.mutateAsync({
        editionId: entryForm.editionId,
        notes: notes.length > 0 ? notes : undefined,
      });
      setEntryInfo(payload);
    } catch (err) {
      setEntryError(
        err instanceof Error ? err.message : "Kunne ikke opprette påmelding.",
      );
    }
  }

  async function handleLockChange(lock: boolean) {
    if (!entryInfo?.entry.id) {
      return;
    }
    setSquadError(null);

    try {
      const squad = await squadLockMutation.mutateAsync(lock);
      setEntryInfo((prev) =>
        prev
          ? {
              entry: prev.entry,
              squad,
            }
          : prev,
      );
    } catch (err) {
      setSquadError(
        err instanceof Error ? err.message : "Kunne ikke oppdatere troppen.",
      );
    }
  }

  async function handleMemberSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entryInfo?.squad.id) return;

    setMemberError(null);
    setMemberSuccess(null);

    try {
      await squadMemberMutation.mutateAsync({
        squadId: entryInfo.squad.id,
        membershipId: memberForm.membershipId,
        jerseyNumber: memberForm.jerseyNumber,
        position: memberForm.position,
      });
      setMemberSuccess("Spilleren er lagt til i troppen.");
      setMemberForm({
        membershipId: "",
        jerseyNumber: "",
        position: "",
      });
    } catch (err) {
      setMemberError(
        err instanceof Error ? err.message : "Kunne ikke legge til spiller.",
      );
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-foreground">
          Send inn påmelding
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Oppgi utgave-ID for å registrere laget. Du får tilbake både entry- og
          squad-ID.
        </p>

        {entryError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {entryError}
          </div>
        )}

        <form onSubmit={handleEntrySubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="edition-id"
            >
              Utgave-ID
            </label>
            <input
              id="edition-id"
              type="text"
              value={entryForm.editionId}
              onChange={(event) =>
                setEntryForm((prev) => ({
                  ...prev,
                  editionId: event.target.value,
                }))
              }
              required
              className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="notes"
            >
              Notater (valgfritt)
            </label>
            <textarea
              id="notes"
              value={entryForm.notes}
              onChange={(event) =>
                setEntryForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              rows={3}
              className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <button
            type="submit"
            disabled={entrySubmitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {entrySubmitting ? "Sender inn …" : "Opprett påmelding"}
          </button>
        </form>

        {entryInfo && (
          <div className="mt-6 rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-foreground">
            <p className="font-medium">Entry-ID: {entryInfo.entry.id}</p>
            <p>Tropp-ID: {entryInfo.squad.id}</p>
            <p>Status: {entryInfo.entry.status}</p>
          </div>
        )}
      </section>

      {entryInfo && (
        <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Administrer tropp
              </h2>
              <p className="text-sm text-muted-foreground">
                Bruk squad-ID for å låse troppen før turneringsstart.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleLockChange(false)}
                disabled={squadLocking}
                className="rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-card/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Åpne tropp
              </button>
              <button
                type="button"
                onClick={() => handleLockChange(true)}
                disabled={squadLocking}
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Lås tropp
              </button>
            </div>
          </div>

          {squadError && (
            <p className="mb-4 text-sm text-destructive">{squadError}</p>
          )}

          <p className="text-xs text-muted-foreground">
            Status:{" "}
            {entryInfo.squad.locked_at
              ? `Låst ${new Date(entryInfo.squad.locked_at).toLocaleString("no-NB")}`
              : "Ikke låst"}
          </p>
        </section>
      )}

      {entryInfo && (
        <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">
            Legg til troppsmedlem
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Bruk medlems-ID fra lagrosteren for å flytte spillere til denne
            utgaven.
          </p>

          {memberError && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {memberError}
            </div>
          )}

          {memberSuccess && (
            <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
              {memberSuccess}
            </div>
          )}

          <form onSubmit={handleMemberSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="membership-id"
              >
                Medlems-ID
              </label>
              <input
                id="membership-id"
                type="text"
                value={memberForm.membershipId}
                onChange={(event) =>
                  setMemberForm((prev) => ({
                    ...prev,
                    membershipId: event.target.value,
                  }))
                }
                required
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="jersey-number"
                >
                  Draktnummer (valgfritt)
                </label>
                <input
                  id="jersey-number"
                  type="number"
                  value={memberForm.jerseyNumber}
                  onChange={(event) =>
                    setMemberForm((prev) => ({
                      ...prev,
                      jerseyNumber: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="position"
                >
                  Posisjon (valgfritt)
                </label>
                <input
                  id="position"
                  type="text"
                  value={memberForm.position}
                  onChange={(event) =>
                    setMemberForm((prev) => ({
                      ...prev,
                      position: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={memberSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
            >
              {memberSubmitting ? "Legger til …" : "Legg til i troppen"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
