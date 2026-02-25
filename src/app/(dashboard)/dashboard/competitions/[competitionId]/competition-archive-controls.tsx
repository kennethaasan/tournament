"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  setCompetitionArchivedState,
  softDeleteCompetition,
} from "@/lib/api/competitions-client";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";

type CompetitionArchiveControlsProps = {
  competitionId: string;
  archivedAt: string | null;
};

export function CompetitionArchiveControls({
  competitionId,
  archivedAt,
}: CompetitionArchiveControlsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<
    "archive" | "restore" | null
  >(null);
  const isArchived = archivedAt !== null;

  const archiveMutation = useMutation({
    mutationFn: async (action: "archive" | "restore") => {
      if (action === "archive") {
        return softDeleteCompetition(competitionId);
      }

      return setCompetitionArchivedState(competitionId, false);
    },
    onSuccess: (_updatedCompetition, action) => {
      toast.success(
        action === "archive"
          ? "Konkurransen er arkivert. Du kan gjenopprette den senere."
          : "Konkurransen er gjenopprettet.",
      );
      setPendingAction(null);
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kunne ikke oppdatere konkurransen.",
      );
    },
  });

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Fareområde</CardTitle>
        <CardDescription>
          Arkivering skjuler konkurransen som aktiv, men data beholdes så den
          kan gjenopprettes senere.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isArchived ? "Konkurransen er arkivert." : "Konkurransen er aktiv."}
        </p>
        <Button
          variant={isArchived ? "outline" : "destructive"}
          onClick={() => setPendingAction(isArchived ? "restore" : "archive")}
          disabled={archiveMutation.isPending}
        >
          {archiveMutation.isPending
            ? "Oppdaterer..."
            : isArchived
              ? "Gjenopprett konkurranse"
              : "Arkiver konkurranse"}
        </Button>
      </CardContent>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "archive"
                ? "Arkivere konkurransen?"
                : "Gjenopprette konkurransen?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "archive"
                ? "Konkurransen blir markert som arkivert, men kan gjenopprettes senere."
                : "Konkurransen blir markert som aktiv igjen."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className={
                pendingAction === "archive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
              onClick={() => {
                if (pendingAction) {
                  archiveMutation.mutate(pendingAction);
                }
              }}
            >
              {pendingAction === "archive" ? "Arkiver" : "Gjenopprett"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
