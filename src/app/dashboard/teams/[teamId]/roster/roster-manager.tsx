"use client";

import { useEffect, useState } from "react";

type RosterResponse = {
  team: {
    id: string;
    name: string;
    slug: string;
    contact_email?: string | null;
    contact_phone?: string | null;
  };
  members: Array<{
    membership_id: string;
    person: {
      id: string;
      first_name: string;
      last_name: string;
      preferred_name?: string | null;
    };
    role: string;
    status: string;
  }>;
};

type RosterManagerProps = {
  teamId: string;
};

export function RosterManager({ teamId }: RosterManagerProps) {
  const [data, setData] = useState<RosterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    preferredName: "",
    country: "",
    role: "player",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    void refreshRoster();
  }, [refreshRoster]);

  async function refreshRoster() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = (await response.json()) as RosterResponse;
      setData(payload);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Klarte ikke å hente spillere.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.firstName,
          last_name: form.lastName,
          preferred_name: form.preferredName || null,
          country: form.country || null,
          role: form.role,
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setForm({
        firstName: "",
        lastName: "",
        preferredName: "",
        country: "",
        role: "player",
      });
      await refreshRoster();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Kunne ikke legge til medlem. Prøv igjen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <header className="mb-6 space-y-1">
          <h2 className="text-xl font-semibold text-zinc-900">
            Lagopplysninger
          </h2>
          <p className="text-sm text-zinc-600">
            Hold stallen oppdatert før du sender inn troppen for en utgave.
          </p>
        </header>

        {isLoading ? (
          <p className="text-sm text-zinc-600">Laster laginformasjon …</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <div className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              <p className="font-medium">{data?.team.name}</p>
              <p className="text-xs text-zinc-500">Team-ID: {data?.team.id}</p>
            </div>

            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-2 py-2">Navn</th>
                  <th className="px-2 py-2">Rolle</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.members.map((member) => (
                  <tr key={member.membership_id} className="border-t">
                    <td className="px-2 py-2 text-zinc-800">
                      {member.person.first_name} {member.person.last_name}
                      {member.person.preferred_name
                        ? ` (${member.person.preferred_name})`
                        : ""}
                    </td>
                    <td className="px-2 py-2 text-zinc-600">{member.role}</td>
                    <td className="px-2 py-2 text-zinc-600">{member.status}</td>
                  </tr>
                ))}
                {!data?.members.length && (
                  <tr>
                    <td
                      className="px-2 py-4 text-center text-sm text-zinc-500"
                      colSpan={3}
                    >
                      Ingen spillere registrert enda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <header className="mb-6 space-y-1">
          <h2 className="text-xl font-semibold text-zinc-900">
            Legg til spiller
          </h2>
          <p className="text-sm text-zinc-600">
            Lag en intern spillerprofil. Spilleren kan senere legges til i en
            tropp for en utgave.
          </p>
        </header>

        {submitError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-zinc-800"
                htmlFor="first-name"
              >
                Fornavn
              </label>
              <input
                id="first-name"
                type="text"
                value={form.firstName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    firstName: event.target.value,
                  }))
                }
                required
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-zinc-800"
                htmlFor="last-name"
              >
                Etternavn
              </label>
              <input
                id="last-name"
                type="text"
                value={form.lastName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lastName: event.target.value }))
                }
                required
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-zinc-800"
                htmlFor="preferred-name"
              >
                Kallenavn (valgfritt)
              </label>
              <input
                id="preferred-name"
                type="text"
                value={form.preferredName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    preferredName: event.target.value,
                  }))
                }
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-zinc-800"
                htmlFor="country"
              >
                Land (valgfritt)
              </label>
              <input
                id="country"
                type="text"
                value={form.country}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, country: event.target.value }))
                }
                className="w-full rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-800" htmlFor="role">
              Rolle
            </label>
            <select
              id="role"
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, role: event.target.value }))
              }
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="player">Spiller</option>
              <option value="coach">Trener</option>
              <option value="manager">Lagleder</option>
              <option value="staff">Støtteapparat</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Legger til …" : "Legg til medlem"}
          </button>
        </form>
      </section>
    </div>
  );
}
