"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { components } from "@/lib/api/generated/openapi";
import {
  addTeamMember,
  fetchTeamRoster,
  removeTeamMember,
  teamRosterQueryKey,
  updateTeam,
  updateTeamMember,
} from "@/lib/api/teams-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/components/alert-dialog";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";

type TeamMemberRole = components["schemas"]["AddTeamMemberRequest"]["role"];
type TeamMember = components["schemas"]["TeamMember"];

type RosterFormState = {
  firstName: string;
  lastName: string;
  preferredName: string;
  country: string;
  role: TeamMemberRole;
  jerseyNumber: string;
};

type EditMemberFormState = {
  firstName: string;
  lastName: string;
  preferredName: string;
  country: string;
  role: TeamMemberRole;
  jerseyNumber: string;
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
    jerseyNumber: "",
  });

  // Team name edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Edit member modal state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editMemberForm, setEditMemberForm] = useState<EditMemberFormState>({
    firstName: "",
    lastName: "",
    preferredName: "",
    country: "",
    role: "player",
    jerseyNumber: "",
  });

  // Remove member confirmation state
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

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
        jersey_number: parseOptionalNumber(form.jerseyNumber).value,
      }),
    onSuccess: () => {
      setForm({
        firstName: "",
        lastName: "",
        preferredName: "",
        country: "",
        role: "player",
        jerseyNumber: "",
      });
      void queryClient.invalidateQueries({
        queryKey: teamRosterQueryKey(teamId),
      });
      toast.success("Medlem lagt til.");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Kunne ikke legge til medlem.",
      );
    },
  });
  const isSubmitting = addMemberMutation.isPending;

  const updateTeamMutation = useMutation({
    mutationFn: (name: string) => updateTeam(teamId, { name }),
    onSuccess: () => {
      setIsEditingName(false);
      setNameError(null);
      void queryClient.invalidateQueries({
        queryKey: teamRosterQueryKey(teamId),
      });
      toast.success("Lagnavn oppdatert.");
    },
    onError: (err) => {
      setNameError(
        err instanceof Error
          ? err.message
          : "Kunne ikke oppdatere lagnavnet. Prøv igjen.",
      );
      toast.error("Kunne ikke oppdatere lagnavnet.");
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: (membershipId: string) =>
      updateTeamMember(teamId, membershipId, {
        first_name: editMemberForm.firstName,
        last_name: editMemberForm.lastName,
        preferred_name: editMemberForm.preferredName || null,
        country: editMemberForm.country || null,
        role: editMemberForm.role,
        jersey_number: parseOptionalNumber(editMemberForm.jerseyNumber).value,
      }),
    onSuccess: () => {
      setEditingMember(null);
      void queryClient.invalidateQueries({
        queryKey: teamRosterQueryKey(teamId),
      });
      toast.success("Medlem oppdatert.");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Kunne ikke oppdatere medlemmet.",
      );
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (membershipId: string) =>
      removeTeamMember(teamId, membershipId),
    onSuccess: () => {
      setMemberToRemove(null);
      void queryClient.invalidateQueries({
        queryKey: teamRosterQueryKey(teamId),
      });
      toast.success("Medlem fjernet.");
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Kunne ikke fjerne medlemmet.",
      );
    },
  });

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const jerseyResult = parseOptionalNumber(form.jerseyNumber);
    if (!jerseyResult.isValid) {
      toast.error("Draktnummer må være et ikke-negativt tall.");
      return;
    }
    await addMemberMutation.mutateAsync();
  }

  function handleStartEditName() {
    setEditedName(rosterQuery.data?.team.name ?? "");
    setIsEditingName(true);
    setNameError(null);
  }

  function handleCancelEditName() {
    setIsEditingName(false);
    setEditedName("");
    setNameError(null);
  }

  async function handleSaveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      setNameError("Lagnavnet kan ikke være tomt.");
      return;
    }
    await updateTeamMutation.mutateAsync(trimmedName);
  }

  function handleStartEditMember(member: TeamMember) {
    setEditingMember(member);
    setEditMemberForm({
      firstName: member.person.first_name ?? "",
      lastName: member.person.last_name ?? "",
      preferredName: member.person.preferred_name ?? "",
      country: "",
      role: (member.role as TeamMemberRole) ?? "player",
      jerseyNumber:
        member.jersey_number !== null && member.jersey_number !== undefined
          ? String(member.jersey_number)
          : "",
    });
  }

  function handleCloseEditMember() {
    setEditingMember(null);
  }

  async function handleSaveMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingMember) return;

    const trimmedFirstName = editMemberForm.firstName.trim();
    const trimmedLastName = editMemberForm.lastName.trim();
    const jerseyResult = parseOptionalNumber(editMemberForm.jerseyNumber);

    if (!trimmedFirstName || !trimmedLastName) {
      toast.error("Fornavn og etternavn er påkrevd.");
      return;
    }
    if (!jerseyResult.isValid) {
      toast.error("Draktnummer må være et ikke-negativt tall.");
      return;
    }

    await updateMemberMutation.mutateAsync(editingMember.membership_id);
  }

  function handleStartRemoveMember(member: TeamMember) {
    setMemberToRemove(member);
  }

  function handleCancelRemove() {
    setMemberToRemove(null);
  }

  async function handleConfirmRemove() {
    if (!memberToRemove) return;
    await removeMemberMutation.mutateAsync(memberToRemove.membership_id);
  }

  const isLoadingRoster = rosterQuery.isLoading;
  const rosterError =
    rosterQuery.error instanceof Error ? rosterQuery.error.message : null;
  const roster = rosterQuery.data;

  // Filter to only show active members
  const activeMembers =
    roster?.members.filter((m) => m.status === "active") ?? [];

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
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      ref={nameInputRef}
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="flex-1"
                      aria-label="Lagnavn"
                    />
                    <Button
                      type="submit"
                      disabled={updateTeamMutation.isPending}
                      size="sm"
                    >
                      {updateTeamMutation.isPending ? "Lagrer …" : "Lagre"}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCancelEditName}
                      disabled={updateTeamMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      Avbryt
                    </Button>
                  </div>
                  {nameError && (
                    <p className="text-xs text-destructive">{nameError}</p>
                  )}
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{roster?.team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Team-ID: {roster?.team.id}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleStartEditName}
                    variant="outline"
                    size="sm"
                  >
                    Endre navn
                  </Button>
                </div>
              )}
            </div>

            <table className="w-full table-auto text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Navn</th>
                  <th className="px-2 py-2">Rolle</th>
                  <th className="px-2 py-2 text-right">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((member) => (
                  <tr key={member.membership_id} className="border-t">
                    <td className="px-2 py-2 text-foreground">
                      {formatMemberName(member)}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {formatRole(member.role)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          onClick={() => handleStartEditMember(member)}
                          variant="outline"
                          size="sm"
                        >
                          Rediger
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleStartRemoveMember(member)}
                          variant="outline"
                          size="sm"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                        >
                          Fjern
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!activeMembers.length && (
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">Fornavn</Label>
              <Input
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-name">Etternavn</Label>
              <Input
                id="last-name"
                type="text"
                value={form.lastName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lastName: event.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="preferred-name">Kallenavn (valgfritt)</Label>
              <Input
                id="preferred-name"
                type="text"
                value={form.preferredName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    preferredName: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Land (valgfritt)</Label>
              <Input
                id="country"
                type="text"
                value={form.country}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, country: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role">Rolle</Label>
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
            <div className="space-y-2">
              <Label htmlFor="jersey-number">Draktnummer (valgfritt)</Label>
              <Input
                id="jersey-number"
                type="number"
                min={0}
                value={form.jerseyNumber}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    jerseyNumber: event.target.value,
                  }))
                }
                placeholder="#"
              />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Legger til …" : "Legg til medlem"}
          </Button>
        </form>
      </section>

      {/* Edit Member Modal */}
      <Dialog
        open={editingMember !== null}
        onOpenChange={(open) => {
          if (!open) handleCloseEditMember();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger medlem</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveMember} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name">Fornavn</Label>
              <Input
                id="edit-first-name"
                type="text"
                value={editMemberForm.firstName}
                onChange={(e) =>
                  setEditMemberForm((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-last-name">Etternavn</Label>
              <Input
                id="edit-last-name"
                type="text"
                value={editMemberForm.lastName}
                onChange={(e) =>
                  setEditMemberForm((prev) => ({
                    ...prev,
                    lastName: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-preferred-name">Kallenavn (valgfritt)</Label>
              <Input
                id="edit-preferred-name"
                type="text"
                value={editMemberForm.preferredName}
                onChange={(e) =>
                  setEditMemberForm((prev) => ({
                    ...prev,
                    preferredName: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-country">Land (valgfritt)</Label>
              <Input
                id="edit-country"
                type="text"
                value={editMemberForm.country}
                onChange={(e) =>
                  setEditMemberForm((prev) => ({
                    ...prev,
                    country: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Rolle</Label>
                <select
                  id="edit-role"
                  value={editMemberForm.role}
                  onChange={(e) =>
                    setEditMemberForm((prev) => ({
                      ...prev,
                      role: e.target.value as TeamMemberRole,
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
              <div className="space-y-2">
                <Label htmlFor="edit-jersey-number">
                  Draktnummer (valgfritt)
                </Label>
                <Input
                  id="edit-jersey-number"
                  type="number"
                  min={0}
                  value={editMemberForm.jerseyNumber}
                  onChange={(event) =>
                    setEditMemberForm((prev) => ({
                      ...prev,
                      jerseyNumber: event.target.value,
                    }))
                  }
                  placeholder="#"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={handleCloseEditMember}
                disabled={updateMemberMutation.isPending}
                variant="outline"
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={updateMemberMutation.isPending}>
                {updateMemberMutation.isPending ? "Lagrer …" : "Lagre"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open) handleCancelRemove();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fjern medlem</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove
                ? `Er du sikker på at du vil fjerne ${formatMemberName(
                    memberToRemove,
                  )} fra laget? Medlemmet vil bli deaktivert og kan ikke velges til tropper.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmRemove}
            >
              Fjern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatRole(role: string | undefined): string {
  switch (role) {
    case "player":
      return "Spiller";
    case "coach":
      return "Trener";
    case "manager":
      return "Lagleder";
    case "staff":
      return "Støtteapparat";
    default:
      return role ?? "Ukjent";
  }
}

function formatMemberName(member: TeamMember): string {
  const jerseyNumber = member.jersey_number;
  const baseName = member.person.full_name;
  if (jerseyNumber === null || jerseyNumber === undefined) {
    return baseName;
  }
  return `${baseName} (#${jerseyNumber})`;
}

function parseOptionalNumber(value: string): {
  value: number | null;
  isValid: boolean;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, isValid: true };
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { value: null, isValid: false };
  }
  return { value: parsed, isValid: true };
}
