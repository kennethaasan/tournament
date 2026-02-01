import type { Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { translateEntryStatus } from "@/lib/utils/translations";
import {
  getCompetitionsForUser,
  getTeamsForUser,
} from "@/modules/admin/service";
import { getSessionFromHeaders, userHasRole } from "@/server/auth";
import { Badge } from "@/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { buildDashboardSections } from "@/ui/components/navigation-data";
import { PageHero } from "@/ui/components/page-hero";

export default async function DashboardHomePage() {
  const session = await getSessionFromHeaders(await headers());
  const userId = session?.user?.id;

  const roleFlags = {
    isGlobalAdmin: userHasRole(session, "global_admin"),
    isCompetitionAdmin: userHasRole(session, "competition_admin"),
    isTeamManager: userHasRole(session, "team_manager"),
  };
  const hasAnyRole =
    roleFlags.isGlobalAdmin ||
    roleFlags.isCompetitionAdmin ||
    roleFlags.isTeamManager;
  const sections = buildDashboardSections(roleFlags);

  const managedTeams =
    roleFlags.isTeamManager && userId ? await getTeamsForUser(userId) : [];
  const managedCompetitions =
    roleFlags.isCompetitionAdmin && userId
      ? await getCompetitionsForUser(userId)
      : [];

  const primaryAction = !hasAnyRole
    ? { label: "Opprett konkurranse", href: "/dashboard/competitions/new" }
    : roleFlags.isGlobalAdmin
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
    <div className="space-y-12">
      <PageHero
        eyebrow={`Dashboard · ${roleLabel}`}
        title="Oversikt og snarveier"
        description="Samle oppgaver, invitasjoner og globale verktøy i én visning. Bruk snarveiene under for å komme raskt til riktig skjerm."
        actionLabel={primaryAction.label}
        actionHref={primaryAction.href as Route}
      />

      {!hasAnyRole ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg text-foreground">
              Velkommen! Opprett din første konkurranse.
            </CardTitle>
            <CardDescription>
              Du trenger ingen invitasjon for å komme i gang. Når du oppretter
              en konkurranse blir du automatisk administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/competitions/new"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              Opprett konkurranse
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {managedTeams.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Mine lag</h2>
            <Badge variant="outline">{managedTeams.length}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {managedTeams.map((team) => (
              <Card
                key={team.id}
                className="border-border/70 bg-card/70 text-card-foreground shadow-sm"
              >
                <CardHeader>
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <CardDescription>{team.slug}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link
                    href={`/dashboard/teams/${team.id}/roster` as Route}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-xs font-semibold transition hover:bg-primary/5"
                  >
                    <span>Gå til Stall</span>
                    <span className="text-primary">→</span>
                  </Link>
                  {team.entries.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Aktive Påmeldinger
                      </p>
                      <div className="space-y-2">
                        {team.entries.map((entry) => (
                          <Link
                            key={entry.id}
                            href={
                              /* biome-ignore lint/suspicious/noExplicitAny: typed routes are too strict for dynamic paths */
                              `/dashboard/editions/${entry.editionId}/teams/${team.id}/squad` as any
                            }
                            className="group flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-xs transition hover:bg-primary/5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-foreground">
                                {entry.competitionName}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {entry.editionLabel}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="ml-2 scale-90 opacity-70 group-hover:opacity-100"
                            >
                              {translateEntryStatus(entry.status)}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {managedCompetitions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              Mine konkurranser
            </h2>
            <Badge variant="outline">{managedCompetitions.length}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {managedCompetitions.map((comp) => (
              <Card
                key={comp.id}
                className="border-border/70 bg-card/70 text-card-foreground shadow-sm"
              >
                <CardHeader>
                  <CardTitle className="text-base">{comp.name}</CardTitle>
                  <CardDescription>{comp.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/dashboard/competitions/${comp.id}` as Route}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-xs font-semibold transition hover:bg-primary/5"
                  >
                    <span>Administrer konkurranse</span>
                    <span className="text-primary">→</span>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Snarveier</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <Card
              key={section.label}
              className="border-border/70 bg-card/70 text-card-foreground shadow-sm"
            >
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
    </div>
  );
}
