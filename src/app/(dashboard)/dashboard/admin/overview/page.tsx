import { AlertCircle, Gavel, History, Plus, Users } from "lucide-react";
import Link from "next/link";
import { getGlobalAdminOverview } from "@/modules/admin/service";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { NavigationGrid } from "@/ui/components/navigation-links";
import { PageHero } from "@/ui/components/page-hero";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("nb-NO");
const datetimeFormatter = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminOverviewPage() {
  const overview = await getGlobalAdminOverview();

  const metricCards = [
    {
      label: "Aktive konkurranser",
      value: overview.metrics.totalCompetitions,
    },
    {
      label: "Publiserte utgaver",
      value: overview.metrics.publishedEditions,
    },
    {
      label: "Utkast til utgaver",
      value: overview.metrics.draftEditions,
    },
    {
      label: "Ventende invitasjoner",
      value: overview.metrics.pendingInvitations,
    },
    {
      label: "Uleste varsler",
      value: overview.metrics.unreadNotifications,
    },
    {
      label: "Administratorer",
      value: overview.metrics.totalAdministrators,
    },
    {
      label: "Åpne tvistesaker",
      value: overview.metrics.unresolvedDisputes,
    },
    {
      label: "Ventende påmeldinger",
      value: overview.metrics.pendingEntries,
    },
  ];

  return (
    <div className="space-y-12">
      <PageHero
        eyebrow="Administrasjon · Global oversikt"
        title="Plattformsstatus og konkurranser"
        description="Overvåk aktiviteten på tvers av alle konkurranser. Se publiseringsstatus, invitasjoner og hvor administratorene har oppgaver."
        actionLabel="Opprett konkurranse"
        actionHref="/dashboard/competitions/new"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.label} className="border-border/70 bg-card/70">
            <CardHeader className="p-4 space-y-1">
              <CardDescription className="uppercase tracking-[0.1em] text-[10px] font-bold">
                {card.label}
              </CardDescription>
              <CardTitle className="text-2xl font-black text-foreground">
                {numberFormatter.format(card.value)}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Konkurranser</h2>
            <p className="text-sm text-muted-foreground">
              Oversikt over alle turneringer og deres gjeldende status.
            </p>
          </div>
          <Badge variant="outline" className="h-fit">
            {overview.competitions.length} totalt
          </Badge>
        </div>

        <div className="grid gap-6">
          {overview.competitions.map((competition) => (
            <Card
              key={competition.id}
              className="border-border/70 bg-card/70 transition-all hover:border-primary/30 hover:bg-card/90"
            >
              <div className="flex flex-col lg:flex-row lg:items-center p-6 gap-8">
                {/* Main Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/competitions/${competition.id}`}
                      className="text-xl font-bold text-foreground hover:underline decoration-primary/30 decoration-2 underline-offset-4"
                    >
                      {competition.name}
                    </Link>
                    {competition.archivedAt ? (
                      <Badge variant="outline" className="font-bold">
                        ARKIVERT
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-500/20 font-bold">
                        AKTIV
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono">{competition.slug}</span>
                    <span className="flex items-center gap-1">
                      <History className="h-3 w-3" />
                      {formatDate(competition.health.lastAuditEventAt)}
                    </span>
                  </div>
                </div>

                {/* Metrics Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:gap-10 gap-4">
                  {/* Editions */}
                  <div className="space-y-1 min-w-[100px]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Utgaver
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {numberFormatter.format(
                        competition.editions.filter(
                          (e) => e.status === "published",
                        ).length,
                      )}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground uppercase tracking-tight">
                        Publisert
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {numberFormatter.format(
                        competition.editions.filter((e) => e.status === "draft")
                          .length,
                      )}{" "}
                      utkast
                    </p>
                  </div>

                  {/* Health/Tasks */}
                  <div className="space-y-1 min-w-[140px]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Oppgaver
                    </p>
                    {competition.health.pendingEntries > 0 ? (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-tight">
                        <AlertCircle className="h-3 w-3" />
                        {competition.health.pendingEntries} påmeldinger
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">
                        Ingen ventende påm.
                      </p>
                    )}
                    {competition.health.unresolvedDisputes > 0 ? (
                      <div className="flex items-center gap-1.5 text-destructive font-bold text-xs uppercase tracking-tight">
                        <Gavel className="h-3 w-3" />
                        {competition.health.unresolvedDisputes} tvister
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">
                        Ingen tvistesaker
                      </p>
                    )}
                  </div>

                  {/* Admins */}
                  <div className="space-y-1 min-w-[140px]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Administratorer
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">
                        {competition.administrators.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {competition.administrators
                        .map((a) => a.name.split(" ")[0])
                        .join(", ")}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-row lg:flex-col gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/40">
                  <Button variant="outline" size="sm" asChild className="h-8">
                    <Link href={`/dashboard/competitions/${competition.id}`}>
                      Administrer
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="h-8">
                    <Link
                      href={`/dashboard/competitions/${competition.id}/editions/new`}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Ny utgave
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4 pt-10 border-t border-border/40">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground font-bold">
          Navigasjon
        </p>
        <NavigationGrid />
      </section>
    </div>
  );
}

function formatDate(date: Date | null): string {
  if (!date) {
    return "Ingen registrert";
  }

  return datetimeFormatter.format(date);
}
