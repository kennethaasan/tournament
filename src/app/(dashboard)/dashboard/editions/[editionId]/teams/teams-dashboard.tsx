"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  type EntryReview,
  editionEntriesQueryKey,
  fetchEditionEntries,
} from "@/lib/api/entries-client";
import {
  type CreateTeamInput,
  createTeam,
  fetchTeams,
  registerTeamEntry,
  teamListQueryKey,
} from "@/lib/api/teams-client";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/ui/components/form";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";
import { EditionHeader } from "../edition-dashboard";

type EditionTeamsDashboardProps = {
  editionId: string;
};

type EntryStatus = EntryReview["entry"]["status"];

const createTeamSchema = z.object({
  name: z.string().min(1, "Lagnavn er påkrevd."),
  slug: z.string().optional(),
  contactEmail: z
    .string()
    .email("Ugyldig e-postadresse.")
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().optional(),
});

type CreateTeamFormValues = z.infer<typeof createTeamSchema>;

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
      <EditionHeader
        editionId={editionId}
        pageTitle="Lagoversikt"
        pageDescription="Her finner du lagene som er påmeldt denne utgaven. Bruk «Stall» for å legge til eller oppdatere spillere."
      />

      <div className="flex justify-end">
        <Button onClick={() => setShowAddTeam(!showAddTeam)}>
          {showAddTeam ? "Avbryt" : "Registrer lag"}
        </Button>
      </div>

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

  const form = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      slug: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTeamInput) => {
      // 1. Create team
      const newTeam = await createTeam({
        name: data.name,
        slug: data.slug || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
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

  const onSubmit = (data: CreateTeamFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lagnavn *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug (valgfritt)</FormLabel>
                <FormControl>
                  <Input placeholder="f.eks. lag-navn-g14" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kontakt e-post (valgfritt)</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kontakt tlf (valgfritt)</FormLabel>
                <FormControl>
                  <Input type="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
    </Form>
  );
}
