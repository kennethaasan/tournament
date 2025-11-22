"use client";

import { useState } from "react";

type EntriesManagerProps = {
  teamId: string;
};

type EntryPayload = {
  entry: {
    id: string;
    edition_id: string;
    status: string;
  };
  squad: {
    id: string;
    locked_at: string | null;
  };
};

export function EntriesManager({ teamId }: EntriesManagerProps) {
  const [entryForm, setEntryForm] = useState({
    editionId: "",
    notes: "",
  });
  const [entryInfo, setEntryInfo] = useState<EntryPayload | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entrySubmitting, setEntrySubmitting] = useState(false);

  const [squadLocking, setSquadLocking] = useState(false);
  const [squadError, setSquadError] = useState<string | null>(null);

  const [memberForm, setMemberForm] = useState({
    membershipId: "",
    jerseyNumber: "",
    position: "",
  });
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);

  async function handleEntrySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEntrySubmitting(true);
    setEntryError(null);

    try {
      const response = await fetch(`/api/teams/${teamId}/entries`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edition_id: entryForm.editionId,
          notes: entryForm.notes,
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = (await response.json()) as EntryPayload;
      setEntryInfo(payload);
    } catch (err) {
      setEntryError(
        err instanceof Error ? err.message : "Kunne ikke opprette påmelding.",
      );
    } finally {
      setEntrySubmitting(false);
    }
  }

  async function handleLockChange(lock: boolean) {
    if (!entryInfo?.entry.id) return;
    setSquadLocking(true);
    setSquadError(null);

    try {
      const response = await fetch(
        `/api/entries/${entryInfo.entry.id}/squads`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lock }),
        },
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const squad = await response.json();
      setEntryInfo((prev) =>
        prev
          ? {
              entry: prev.entry,
              squad: {
                id: squad.id,
                locked_at: squad.locked_at,
              },
            }
          : prev,
      );
    } catch (err) {
      setSquadError(
        err instanceof Error ? err.message : "Kunne ikke oppdatere troppen.",
      );
    } finally {
      setSquadLocking(false);
    }
  }

  async function handleMemberSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entryInfo?.squad.id) return;

    setMemberSubmitting(true);
    setMemberError(null);
    setMemberSuccess(null);

    try {
      const response = await fetch(
        `/api/squads/${entryInfo.squad.id}/members`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            membership_id: memberForm.membershipId,
            jersey_number: memberForm.jerseyNumber
              ? Number(memberForm.jerseyNumber)
              : undefined,
            position: memberForm.position || undefined,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
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
    } finally {
      setMemberSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-900">
          Send inn påmelding
        </h2>
        <p className="mb-6 text-sm text-zinc-600">
          Oppgi utgave-ID for å registrere laget. Du får tilbake både entry- og
          squad-ID.
        </p>

        {entryError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {entryError}
          </div>
        )}

        <form onSubmit={handleEntrySubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-zinc-800"
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
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-zinc-800"
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
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <button
            type="submit"
            disabled={entrySubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {entrySubmitting ? "Sender inn …" : "Opprett påmelding"}
          </button>
        </form>

        {entryInfo && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <p className="font-medium">Entry-ID: {entryInfo.entry.id}</p>
            <p>Tropp-ID: {entryInfo.squad.id}</p>
            <p>Status: {entryInfo.entry.status}</p>
          </div>
        )}
      </section>

      {entryInfo && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Administrer tropp
              </h2>
              <p className="text-sm text-zinc-600">
                Bruk squad-ID for å låse troppen før turneringsstart.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleLockChange(false)}
                disabled={squadLocking}
                className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Åpne tropp
              </button>
              <button
                type="button"
                onClick={() => handleLockChange(true)}
                disabled={squadLocking}
                className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Lås tropp
              </button>
            </div>
          </div>

          {squadError && (
            <p className="mb-4 text-sm text-red-600">{squadError}</p>
          )}

          <p className="text-xs text-zinc-500">
            Status:{" "}
            {entryInfo.squad.locked_at
              ? `Låst ${new Date(entryInfo.squad.locked_at).toLocaleString("no-NB")}`
              : "Ikke låst"}
          </p>
        </section>
      )}

      {entryInfo && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">
            Legg til troppsmedlem
          </h2>
          <p className="mb-6 text-sm text-zinc-600">
            Bruk medlems-ID fra lagrosteren for å flytte spillere til denne
            utgaven.
          </p>

          {memberError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {memberError}
            </div>
          )}

          {memberSuccess && (
            <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {memberSuccess}
            </div>
          )}

          <form onSubmit={handleMemberSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-zinc-800"
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
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-zinc-800"
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
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-zinc-800"
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
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={memberSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {memberSubmitting ? "Legger til …" : "Legg til i troppen"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
