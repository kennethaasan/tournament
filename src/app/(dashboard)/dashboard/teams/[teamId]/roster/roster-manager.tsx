"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { components } from "@/lib/api/generated/openapi";
import {
  addTeamMember,
  fetchTeamRoster,
  teamRosterQueryKey,
} from "@/lib/api/teams-client";

type TeamMemberRole = components["schemas"]["AddTeamMemberRequest"]["role"];
type RosterFormState = {
  firstName: string;
  lastName: string;
  preferredName: string;
  country: string;
  role: TeamMemberRole;
};

type RosterManagerProps = {
  teamId: string;
};

export function RosterManager({ teamId }: RosterManagerProps) {
  const [form, setForm] = useState<RosterFormState>({
    firstName: "",
    lastName: "",
    preferredName: "",
    country: "",
    role: "player",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const rosterQuery = useQuery({
    queryKey: teamRosterQueryKey(teamId),
    queryFn: ({ signal }) => fetchTeamRoster(teamId, { signal }),
  });

  const addMemberMutation = useMutation({
    mutationFn: () =>
      addTeamMember(teamId, {
        first_name: form.firstName,
        last_name: form.lastName,
        preferred_name: form.preferredName || null,
        country: form.country || null,
        role: form.role,
      }),
    onSuccess: () => {
      setForm({
        firstName: "",
        lastName: "",
        preferredName: "",
        country: "",
        role: "player",
      });
      void queryClient.invalidateQueries({
        queryKey: teamRosterQueryKey(teamId),
      });
    },
  });
  const isSubmitting = addMemberMutation.isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    try {
      await addMemberMutation.mutateAsync();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Kunne ikke legge til medlem. Prøv igjen.",
      );
    }
  }

  const isLoadingRoster = rosterQuery.isLoading;
  const rosterError =
    rosterQuery.error instanceof Error ? rosterQuery.error.message : null;
  const roster = rosterQuery.data;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <header className="mb-6 space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            Lagopplysninger
          </h2>
          <p className="text-sm text-muted-foreground">
            Hold stallen oppdatert før du sender inn troppen for en utgave.
          </p>
        </header>

        {isLoadingRoster ? (
          <p className="text-sm text-muted-foreground">
            Laster laginformasjon …
          </p>
        ) : rosterError ? (
          <p className="text-sm text-destructive">{rosterError}</p>
        ) : (
          <>
            <div className="mb-6 rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-foreground">
              <p className="font-medium">{roster?.team.name}</p>
              <p className="text-xs text-muted-foreground">
                Team-ID: {roster?.team.id}
              </p>
            </div>

            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Navn</th>
                  <th className="px-2 py-2">Rolle</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {roster?.members.map((member) => (
                  <tr key={member.membership_id} className="border-t">
                    <td className="px-2 py-2 text-foreground">
                      {member.person.full_name}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {member.role}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {member.status}
                    </td>
                  </tr>
                ))}
                {!roster?.members.length && (
                  <tr>
                    <td
                      className="px-2 py-4 text-center text-sm text-muted-foreground"
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

      <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <header className="mb-6 space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            Legg til spiller
          </h2>
          <p className="text-sm text-muted-foreground">
            Lag en intern spillerprofil. Spilleren kan senere legges til i en
            tropp for en utgave.
          </p>
        </header>

        {submitError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
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
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
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
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
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
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
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
                className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="role"
            >
              Rolle
            </label>
            <select
              id="role"
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  role: event.target.value as TeamMemberRole,
                }))
              }
              className="w-full rounded border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Legger til …" : "Legg til medlem"}
          </button>
        </form>
      </section>
    </div>
  );
}
