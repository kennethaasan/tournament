"use client";

import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";
import {
  competitionListQueryKey,
  fetchCompetitions,
} from "@/lib/api/competitions-client";
import { createInvitation } from "@/lib/api/invitations-client";
import { fetchTeams, teamListQueryKey } from "@/lib/api/teams-client";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";

type RoleOption = "competition_admin" | "team_manager" | "global_admin";
type ScopeType = "competition" | "team" | "global";

const ROLE_LABELS: Record<RoleOption, string> = {
  competition_admin: "Konkurranseadministrator",
  team_manager: "Lagleder",
  global_admin: "Global administrator",
};

const DEFAULT_SCOPE: Record<RoleOption, ScopeType> = {
  competition_admin: "competition",
  team_manager: "team",
  global_admin: "global",
};

export function InvitationsPanel() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleOption>("competition_admin");
  const [scopeId, setScopeId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const competitionsQuery = useQuery({
    queryKey: competitionListQueryKey(),
    queryFn: ({ signal }) => fetchCompetitions({ signal }),
    staleTime: 60_000,
  });

  const teamsQuery = useQuery({
    queryKey: teamListQueryKey(),
    queryFn: ({ signal }) => fetchTeams({ signal }),
    staleTime: 60_000,
  });

  const scopeType = useMemo(() => DEFAULT_SCOPE[role], [role]);
  const scopeLabel = scopeType === "competition" ? "Konkurranse-ID" : "Lag-ID";
  const scopePlaceholder =
    scopeType === "competition" ? "UUID for konkurransen" : "UUID for laget";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Skriv inn e-postadressen som skal inviteres.");
      return;
    }

    if (scopeType !== "global" && !scopeId.trim()) {
      setErrorMessage("Oppgi riktig ID for scope før du sender invitasjonen.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createInvitation({
        email: email.trim(),
        role,
        scope: {
          type: scopeType,
          id: scopeType === "global" ? null : scopeId.trim(),
        },
        message: undefined,
      });

      setMessage(
        "Invitasjonen ble sendt. Mottakeren får en e-post med lenke for å godta.",
      );
      setEmail("");
      setScopeId("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kunne ikke sende invitasjonen. Prøv igjen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const competitionOptions = competitionsQuery.data ?? [];
  const teamOptions = useMemo(() => {
    const teams = teamsQuery.data ?? [];
    return [...teams].sort((left, right) =>
      left.name.localeCompare(right.name, "nb", { sensitivity: "base" }),
    );
  }, [teamsQuery.data]);

  return (
    <div className="space-y-8">
      <Card className="border-border/70 bg-card/80">
        <CardHeader className="space-y-3">
          <Badge variant="accent" className="uppercase tracking-[0.2em]">
            Invitasjoner
          </Badge>
          <CardTitle className="text-2xl text-foreground">
            Inviter administratorer og lagledere
          </CardTitle>
          <CardDescription>
            Bruk skjemaet for å invitere nye administratorer til konkurransen,
            eller nye lagledere til et spesifikt lag. Invitasjoner er valgfrie
            og brukes kun når du ønsker å gi tilgang til andre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-post</Label>
              <Input
                id="invite-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="navn@klubb.no"
                type="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Rolle</Label>
              <select
                id="invite-role"
                value={role}
                onChange={(event) => {
                  const nextRole = event.target.value as RoleOption;
                  setRole(nextRole);
                  if (DEFAULT_SCOPE[nextRole] === "global") {
                    setScopeId("");
                  }
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm"
              >
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {scopeType !== "global" ? (
              <div className="space-y-2">
                <Label htmlFor="invite-scope">{scopeLabel}</Label>
                <Input
                  id="invite-scope"
                  value={scopeId}
                  onChange={(event) => setScopeId(event.target.value)}
                  placeholder={scopePlaceholder}
                  list={
                    scopeType === "competition"
                      ? "competition-options"
                      : "team-options"
                  }
                />
                {scopeType === "competition" && competitionOptions.length ? (
                  <datalist id="competition-options">
                    {competitionOptions.map((competition) => (
                      <option
                        key={competition.id}
                        value={competition.id}
                        label={`${competition.name} (${competition.slug})`}
                      />
                    ))}
                  </datalist>
                ) : null}
                {scopeType === "team" && teamOptions.length ? (
                  <datalist id="team-options">
                    {teamOptions.map((team) => (
                      <option
                        key={team.id}
                        value={team.id}
                        label={`${team.name} (${team.slug})`}
                      />
                    ))}
                  </datalist>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Velg fra listen hvis tilgjengelig, eller lim inn ID-en
                  manuelt.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Global administrator har ingen spesifikk scope.
              </p>
            )}

            {message ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
                {message}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sender invitasjon ..." : "Send invitasjon"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
