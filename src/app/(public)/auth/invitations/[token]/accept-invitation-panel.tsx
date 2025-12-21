"use client";

import Link from "next/link";
import { useState } from "react";
import { acceptInvitation } from "@/lib/api/invitations-client";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";

type AcceptInvitationPanelProps = {
  token: string;
};

type StatusState = "idle" | "loading" | "success" | "error";

export function AcceptInvitationPanel({ token }: AcceptInvitationPanelProps) {
  const [status, setStatus] = useState<StatusState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);

  async function handleAccept() {
    setStatus("loading");
    setErrorMessage(null);
    setRoleMessage(null);

    try {
      const result = await acceptInvitation(token);
      const role = result.role.role.replace("_", " ");
      const scopeId = result.role.scope.id ?? "global";
      setRoleMessage(`Du har fått rollen ${role} (${scopeId}).`);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kunne ikke godta invitasjonen. Prøv igjen.",
      );
    }
  }

  return (
    <main className="page-shell">
      <div className="page-padding flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-xl border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <Badge variant="accent" className="uppercase tracking-[0.2em]">
              Invitasjon
            </Badge>
            <CardTitle className="text-2xl text-foreground">
              Godta invitasjonen din
            </CardTitle>
            <CardDescription>
              Du må være innlogget med samme e-postadresse som invitasjonen ble
              sendt til. Når invitasjonen er godkjent får du tilgang til
              kontrollpanelet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roleMessage ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
                {roleMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleAccept}
                disabled={status === "loading"}
              >
                {status === "loading"
                  ? "Godtar invitasjon ..."
                  : "Godta invitasjon"}
              </Button>
              <Button asChild variant="ghost">
                <Link href="/dashboard/competitions/new">
                  Gå til kontrollpanel
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Har du problemer? Logg inn først og prøv på nytt. Invitasjoner er
              personlige og kan ikke deles.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
