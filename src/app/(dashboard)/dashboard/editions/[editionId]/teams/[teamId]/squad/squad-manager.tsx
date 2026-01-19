"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchEditionEntries } from "@/lib/api/entries-client";
import {
  addSquadMember,
  ensureEntrySquad,
  entrySquadQueryKey,
  fetchSquadMembers,
  removeSquadMember,
  updateSquadMember,
} from "@/lib/api/squads-client";
import { fetchTeamRoster, teamRosterQueryKey } from "@/lib/api/teams-client";
import { Button } from "@/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";

type SquadManagerProps = {
  editionId: string;
  teamId: string;
};

export function SquadManager({ editionId, teamId }: SquadManagerProps) {
  const queryClient = useQueryClient();
  const firstNameRef = useRef<HTMLInputElement>(null);

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    jerseyNumber: string;
    position: string;
  }>({ jerseyNumber: "", position: "" });

  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState({
    firstName: "",
    lastName: "",
    preferredName: "",
    jerseyNumber: "",
    position: "",
  });

  // 1. Fetch entries to find the one for this team/edition
  const entriesQuery = useQuery({
    queryKey: ["edition", editionId, "entries"],
    queryFn: ({ signal }) => fetchEditionEntries(editionId, { signal }),
  });

  const entry = useMemo(() => {
    return entriesQuery.data?.find((e) => e.team.id === teamId);
  }, [entriesQuery.data, teamId]);

  const entryId = entry?.entry.id;

  // 2. Ensure squad exists and fetch members
  const squadQuery = useQuery({
    queryKey: entryId ? entrySquadQueryKey(entryId) : ["squad", "none"],
    queryFn: ({ signal }) =>
      entryId ? ensureEntrySquad(entryId, { signal }) : Promise.reject(),
    enabled: !!entryId,
  });

  const squadId = squadQuery.data?.id;

  const squadMembersQuery = useQuery({
    queryKey: squadId
      ? ["squad", squadId, "members"]
      : ["squad", "none", "members"],
    queryFn: ({ signal }) =>
      squadId ? fetchSquadMembers(squadId, { signal }) : Promise.resolve([]),
    enabled: !!squadId,
  });

  // 3. Fetch team roster (the "Stall")
  const rosterQuery = useQuery({
    queryKey: teamRosterQueryKey(teamId),
    queryFn: ({ signal }) => fetchTeamRoster(teamId, { signal }),
  });

  const roster =
    rosterQuery.data?.members.filter((m) => m.status === "active") ?? [];
  const squadMembers = squadMembersQuery.data ?? [];

  const membersInSquadIds = new Set(squadMembers.map((m) => m.membership_id));

  // Mutations
  const addMutation = useMutation({
    mutationFn: (membershipId: string) =>
      /* biome-ignore lint/style/noNonNullAssertion: squadId is checked by isLoading */
      addSquadMember(squadId!, { membership_id: membershipId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["squad", squadId, "members"],
      });
      toast.success("Spiller lagt til i troppen.");
    },
  });

  const createAndAddMutation = useMutation({
    mutationFn: (payload: {
      team_id: string;
      person: {
        first_name: string;
        last_name: string;
        preferred_name?: string;
      };
      jersey_number?: number | null;
      position?: string | null;
    }) =>
      /* biome-ignore lint/style/noNonNullAssertion: squadId is checked by isLoading */
      addSquadMember(squadId!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["squad", squadId, "members"],
      });
      void queryClient.invalidateQueries({
        queryKey: teamRosterQueryKey(teamId),
      });
      // Clear form but KEEP IT OPEN for fast entry
      setNewPlayerForm({
        firstName: "",
        lastName: "",
        preferredName: "",
        jerseyNumber: "",
        position: "",
      });
      firstNameRef.current?.focus();
      toast.success("Ny spiller opprettet og lagt i troppen.");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      /* biome-ignore lint/style/noNonNullAssertion: squadId is checked by isLoading */
      removeSquadMember(squadId!, memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["squad", squadId, "members"],
      });
      toast.success("Spiller fjernet fra troppen.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      memberId,
      jerseyNumber,
      position,
    }: {
      memberId: string;
      jerseyNumber: number | null;
      position: string | null;
    }) =>
      /* biome-ignore lint/style/noNonNullAssertion: squadId is checked by isLoading */
      updateSquadMember(squadId!, memberId, {
        jersey_number: jerseyNumber,
        position,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["squad", squadId, "members"],
      });
      setEditingMemberId(null);
      toast.success("Spiller oppdatert.");
    },
  });

  const handleStartEdit = (m: (typeof squadMembers)[0]) => {
    setEditingMemberId(m.id);
    setEditForm({
      jerseyNumber: m.jersey_number?.toString() ?? "",
      position: m.position ?? "",
    });
  };

  const handleSaveEdit = (memberId: string) => {
    const num = parseInt(editForm.jerseyNumber, 10);
    updateMutation.mutate({
      memberId,
      jerseyNumber: Number.isNaN(num) ? null : num,
      position: editForm.position || null,
    });
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerForm.firstName || !newPlayerForm.lastName) {
      toast.error("Fornavn og etternavn er påkrevd");
      return;
    }

    const jerseyNum = parseInt(newPlayerForm.jerseyNumber, 10);

    createAndAddMutation.mutate({
      team_id: teamId,
      person: {
        first_name: newPlayerForm.firstName,
        last_name: newPlayerForm.lastName,
        preferred_name: newPlayerForm.preferredName || undefined,
      },
      jersey_number: Number.isNaN(jerseyNum) ? null : jerseyNum,
      position: newPlayerForm.position || null,
    });
  };

  if (entriesQuery.isLoading || squadQuery.isLoading || rosterQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Laster tropp...
      </div>
    );
  }

  /* biome-ignore lint/suspicious/noExplicitAny: typed routes are too strict for dynamic paths */
  const path = `/dashboard/editions/${editionId}/teams/${teamId}/squad` as any;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {entry?.team.name ?? "Laster..."}
          </p>
          <h1 className="text-2xl font-bold">Administrer tropp</h1>
          <p className="text-sm text-muted-foreground">
            Velg spillere fra stallen og tildel draktnummer for denne utgaven.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={path}>Tilbake til lagoversikt</Link>
        </Button>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Current Squad */}
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">Tropp for denne utgaven</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {squadMembers.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground italic">
                  Troppen er tom. Legg til spillere fra stallen til høyre.
                </p>
              ) : (
                <div className="divide-y divide-border/50">
                  {squadMembers
                    .sort(
                      (a, b) =>
                        (a.jersey_number ?? 999) - (b.jersey_number ?? 999),
                    )
                    .map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        {editingMemberId === m.id ? (
                          <div className="flex flex-1 items-end gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Nr
                              </Label>
                              <Input
                                className="h-8 w-16 text-sm"
                                value={editForm.jerseyNumber}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    jerseyNumber: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Posisjon
                              </Label>
                              <Input
                                className="h-8 text-sm"
                                value={editForm.position}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    position: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={() => handleSaveEdit(m.id)}
                              disabled={updateMutation.isPending}
                            >
                              OK
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={() => setEditingMemberId(null)}
                            >
                              X
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-foreground">
                                {m.jersey_number ? (
                                  <span className="mr-1.5 font-mono text-primary">
                                    #{m.jersey_number}
                                  </span>
                                ) : null}
                                {/* biome-ignore lint/suspicious/noExplicitAny: person is joined in service but not in components types yet */}
                                {(m as any).person?.full_name ??
                                  "Ukjent spiller"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {m.position || "Ingen posisjon"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={() => handleStartEdit(m)}
                              >
                                Endre
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-destructive hover:bg-destructive/10"
                                onClick={() => removeMutation.mutate(m.id)}
                                disabled={removeMutation.isPending}
                              >
                                Fjern
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available from Stall & New Player Form */}
        <div className="space-y-6">
          <Card className="border-border/70 bg-card/70">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                Stall (tilgjengelige spillere)
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-primary"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? "Lukk skjema" : "Opprett ny spiller"}
              </Button>
            </CardHeader>
            <CardContent>
              {showAddForm ? (
                <form
                  onSubmit={handleCreateAndAdd}
                  className="mb-6 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label
                        htmlFor="firstName"
                        className="text-[10px] uppercase"
                      >
                        Fornavn
                      </Label>
                      <Input
                        id="firstName"
                        ref={firstNameRef}
                        className="h-8 text-sm"
                        value={newPlayerForm.firstName}
                        onChange={(e) =>
                          setNewPlayerForm((prev) => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                        placeholder="Erik"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor="lastName"
                        className="text-[10px] uppercase"
                      >
                        Etternavn
                      </Label>
                      <Input
                        id="lastName"
                        className="h-8 text-sm"
                        value={newPlayerForm.lastName}
                        onChange={(e) =>
                          setNewPlayerForm((prev) => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                        placeholder="Hansen"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label
                        htmlFor="jerseyNumber"
                        className="text-[10px] uppercase"
                      >
                        Draktnummer
                      </Label>
                      <Input
                        id="jerseyNumber"
                        type="number"
                        className="h-8 text-sm"
                        value={newPlayerForm.jerseyNumber}
                        onChange={(e) =>
                          setNewPlayerForm((prev) => ({
                            ...prev,
                            jerseyNumber: e.target.value,
                          }))
                        }
                        placeholder="10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor="position"
                        className="text-[10px] uppercase"
                      >
                        Posisjon
                      </Label>
                      <Input
                        id="position"
                        className="h-8 text-sm"
                        value={newPlayerForm.position}
                        onChange={(e) =>
                          setNewPlayerForm((prev) => ({
                            ...prev,
                            position: e.target.value,
                          }))
                        }
                        placeholder="Spiss"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="h-8 w-full text-xs font-semibold"
                    disabled={createAndAddMutation.isPending}
                  >
                    {createAndAddMutation.isPending
                      ? "Oppretter..."
                      : "Opprett og legg i tropp"}
                  </Button>
                </form>
              ) : null}

              <div className="divide-y divide-border/50">
                {roster.map((m) => {
                  const isInSquad = membersInSquadIds.has(m.membership_id);
                  return (
                    <div
                      key={m.membership_id}
                      className="flex items-center justify-between py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {/* biome-ignore lint/suspicious/noExplicitAny: roster types not yet updated for person */}
                          {m.person && (m.person as any).first_name}{" "}
                          {/* biome-ignore lint/suspicious/noExplicitAny: roster types not yet updated for person */}
                          {m.person && (m.person as any).last_name}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {m.role}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={isInSquad ? "secondary" : "default"}
                        className="h-8"
                        disabled={isInSquad || addMutation.isPending}
                        onClick={() => addMutation.mutate(m.membership_id)}
                      >
                        {isInSquad ? "Lagt til" : "Legg i tropp"}
                      </Button>
                    </div>
                  );
                })}
                {roster.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground italic">
                    Ingen aktive spillere i stallen.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
