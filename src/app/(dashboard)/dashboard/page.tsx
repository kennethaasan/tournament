import type { Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { getSessionFromHeaders, userHasRole } from "@/server/auth";
import { Badge } from "@/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/card";
import { buildDashboardSections } from "@/ui/components/navigation-data";
import { PageHero } from "@/ui/components/page-hero";

export default async function DashboardHomePage() {
  const session = await getSessionFromHeaders(await headers());

  const roleFlags = {
    isGlobalAdmin: userHasRole(session, "global_admin"),
    isCompetitionAdmin: userHasRole(session, "competition_admin"),
    isTeamManager: userHasRole(session, "team_manager"),
  };
  const sections = buildDashboardSections(roleFlags);

  const primaryAction = roleFlags.isGlobalAdmin
    ? { label: "Opprett konkurranse", href: "/dashboard/competitions/new" }
    : roleFlags.isCompetitionAdmin || roleFlags.isTeamManager
      ? { label: "Send invitasjon", href: "/dashboard/invitations" }
      : { label: "Åpne varsler", href: "/dashboard/notifications" };

  const roleLabel = roleFlags.isGlobalAdmin
    ? "Global admin"
    : roleFlags.isCompetitionAdmin
      ? "Konkurranseadmin"
      : roleFlags.isTeamManager
        ? "Lagleder"
        : "Administrator";

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow={`Dashboard · ${roleLabel}`}
        title="Oversikt og snarveier"
        description="Samle oppgaver, invitasjoner og globale verktøy i én visning. Bruk snarveiene under for å komme raskt til riktig skjerm."
        actionLabel={primaryAction.label}
        actionHref={primaryAction.href as Route}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.label} className="border-border/70 bg-card/70">
            <CardHeader className="space-y-3">
              <Badge
                variant="outline"
                className="w-fit uppercase tracking-[0.2em]"
              >
                {section.label}
              </Badge>
              <CardTitle className="text-lg text-foreground">
                {section.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href as Route}
                  className="flex flex-col gap-1 rounded-xl border border-border/60 px-3 py-2 transition hover:border-primary/50 hover:bg-primary/10"
                >
                  <span className="font-semibold text-foreground">
                    {link.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {link.description}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
