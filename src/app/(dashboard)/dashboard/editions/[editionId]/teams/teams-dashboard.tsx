"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  type EntryReview,
  editionEntriesQueryKey,
  fetchEditionEntries,
} from "@/lib/api/entries-client";
import {
  createTeam,
  fetchTeams,
  registerTeamEntry,
  teamListQueryKey,
} from "@/lib/api/teams-client";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";

type EditionTeamsDashboardProps = {
  editionId: string;
};

type EntryStatus = EntryReview["entry"]["status"];

export function EditionTeamsDashboard({
  editionId,
}: EditionTeamsDashboardProps) {
  const queryClient = useQueryClient();
  const [showAddTeam, setShowAddTeam] = useState(false);

  const entriesQuery = useQuery({
    queryKey: editionEntriesQueryKey(editionId),
    queryFn: ({ signal }) => fetchEditionEntries(editionId, { signal }),
  });

  const entries = entriesQuery.data ?? [];
  const loadError =
    entriesQuery.error instanceof Error ? entriesQuery.error.message : null;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Utgave · Lag og tropp
          </p>
          <h1 className="text-3xl font-bold text-foreground">Lagoversikt</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Her finner du lagene som er påmeldt denne utgaven. Bruk «Stall» for
            å legge til eller oppdatere spillere.
          </p>
        </div>
        <Button onClick={() => setShowAddTeam(!showAddTeam)}>
          {showAddTeam ? "Avbryt" : "Registrer lag"}
        </Button>
      </header>

      {showAddTeam && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <AddTeamSection
            editionId={editionId}
            existingTeamIds={new Set(entries.map((e) => e.team.id))}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: editionEntriesQueryKey(editionId),
              });
              setShowAddTeam(false);
            }}
          />
        </div>
      )}

      {entriesQuery.isLoading ? (
        <div className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          Laster lag …
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          Ingen lag er registrert for denne utgaven ennå.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((item) => {
            const entry = item.entry;
            return (
              <article
                key={entry.id}
                className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {item.team.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.team.slug}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Påmelding:{" "}
                      {entry.submitted_at
                        ? new Date(entry.submitted_at).toLocaleString("no-NB")
                        : "Ikke registrert"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(entry.status)}>
                      {statusLabel(entry.status)}
                    </Badge>
                    <Link
                      href={`/dashboard/teams/${item.team.id}/roster`}
                      className="rounded-full border border-border/70 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/10"
                    >
                      Stall
                    </Link>
                    <Link
                      href={`/dashboard/teams/${item.team.id}/entries`}
                      className="rounded-full border border-border/70 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/10"
                    >
                      Tropp
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function statusLabel(status: EntryStatus) {
  switch (status) {
    case "pending":
      return "Venter";
    case "approved":
      return "Godkjent";
    case "rejected":
      return "Avvist";
    case "withdrawn":
      return "Trukket";
    default:
      return status;
  }
}

function statusVariant(status: EntryStatus) {
  switch (status) {
    case "approved":
      return "accent";
    case "pending":
      return "outline";
    case "rejected":
    case "withdrawn":
      return "default";
    default:
      return "outline";
  }
}

function AddTeamSection({
  editionId,
  existingTeamIds,
  onSuccess,
}: {
  editionId: string;
  existingTeamIds: Set<string>;
  onSuccess: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"search" | "create">("search");

  return (
    <Card className="border-border/60 bg-card/40">
      <CardHeader>
        <CardTitle className="flex gap-4 text-base">
          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`border-b-2 pb-1 text-sm font-medium transition-colors ${
              activeTab === "search"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Søk etter lag
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`border-b-2 pb-1 text-sm font-medium transition-colors ${
              activeTab === "create"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Opprett nytt lag
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeTab === "search" ? (
          <SearchTeamForm
            editionId={editionId}
            existingTeamIds={existingTeamIds}
            onSuccess={onSuccess}
          />
        ) : (
          <CreateTeamForm editionId={editionId} onSuccess={onSuccess} />
        )}
      </CardContent>
    </Card>
  );
}

function SearchTeamForm({
  editionId,
  existingTeamIds,
  onSuccess,
}: {
  editionId: string;
  existingTeamIds: Set<string>;
  onSuccess: () => void;
}) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  // Fetch all teams to filter client-side
  const { data: teams, isLoading } = useQuery({
    queryKey: teamListQueryKey(),
    queryFn: ({ signal }) => fetchTeams({ signal }),
  });

  const registerMutation = useMutation({
    mutationFn: async (teamId: string) => {
      await registerTeamEntry(teamId, { edition_id: editionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamListQueryKey() });
      onSuccess();
    },
  });

  const filteredTeams =
    teams?.filter((team) => {
      if (existingTeamIds.has(team.id)) return false;
      if (!search) return false;
      return (
        team.name.toLowerCase().includes(search.toLowerCase()) ||
        team.slug.toLowerCase().includes(search.toLowerCase())
      );
    }) ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="team-search">Søk etter lagnavn</Label>
        <Input
          id="team-search"
          placeholder="F.eks. 'Start' eller 'Viking'"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="max-h-60 overflow-y-auto rounded-md border border-border bg-card p-2">
        {isLoading ? (
          <p className="p-2 text-sm text-muted-foreground">Laster lag...</p>
        ) : !search ? (
          <p className="p-2 text-sm text-muted-foreground">
            Skriv inn navn for å søke
          </p>
        ) : filteredTeams.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">Ingen lag funnet</p>
        ) : (
          <div className="space-y-1">
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between rounded p-2 hover:bg-muted"
              >
                <div>
                  <p className="font-medium">{team.name}</p>
                  <p className="text-xs text-muted-foreground">{team.slug}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => registerMutation.mutate(team.id)}
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Legger til..." : "Legg til"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      {registerMutation.error && (
        <p className="text-sm text-destructive">
          {registerMutation.error instanceof Error
            ? registerMutation.error.message
            : "Kunne ikke legge til lag"}
        </p>
      )}
    </div>
  );
}

function CreateTeamForm({
  editionId,
  onSuccess,
}: {
  editionId: string;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    contactEmail: "",
    contactPhone: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Create team
      const newTeam = await createTeam({
        name: formData.name,
        slug: formData.slug || null,
        contactEmail: formData.contactEmail || null,
        contactPhone: formData.contactPhone || null,
      });

      // 2. Register to edition
      await registerTeamEntry(newTeam.id, { edition_id: editionId });
      return newTeam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamListQueryKey() });
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Lagnavn *</Label>
          <Input
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (valgfritt)</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="f.eks. lag-navn-g14"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Kontakt e-post (valgfritt)</Label>
          <Input
            id="email"
            type="email"
            value={formData.contactEmail}
            onChange={(e) =>
              setFormData({ ...formData, contactEmail: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Kontakt tlf (valgfritt)</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.contactPhone}
            onChange={(e) =>
              setFormData({ ...formData, contactPhone: e.target.value })
            }
          />
        </div>
      </div>

      {createMutation.error && (
        <div className="text-sm text-destructive">
          {createMutation.error instanceof Error
            ? createMutation.error.message
            : "Kunne ikke opprette lag"}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Oppretter..." : "Opprett og legg til"}
        </Button>
      </div>
    </form>
  );
}
