import { getGlobalAdminOverview } from "@/modules/admin/service";
import {
  Card,
  CardContent,
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
    <div className="space-y-10">
      <PageHero
        eyebrow="Administrasjon · Global oversikt"
        title="Plattformsstatus og konkurranser"
        description="Overvåk aktiviteten på tvers av alle konkurranser. Se publiseringsstatus, invitasjoner og hvor administratorene har oppgaver."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.label} className="border-border/70 bg-card/70">
            <CardHeader className="space-y-2">
              <CardDescription className="uppercase tracking-[0.2em] text-xs">
                {card.label}
              </CardDescription>
              <CardTitle className="text-3xl text-foreground">
                {numberFormatter.format(card.value)}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-xl text-foreground">
            Konkurranser
          </CardTitle>
          <CardDescription>
            Oversikt over alle konkurranser, ansvarlige administratorer og siste
            aktivitet.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm text-muted-foreground">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2">Navn</th>
                  <th className="px-4 py-2">Utgaver</th>
                  <th className="px-4 py-2">Administratorer</th>
                  <th className="px-4 py-2">Sist endret</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.competitions.map((competition) => (
                  <tr
                    key={competition.id}
                    className="rounded-xl border border-border/70 bg-card/60"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="font-semibold text-foreground">
                        {competition.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {competition.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-medium text-foreground">
                        {numberFormatter.format(
                          competition.editions.filter(
                            (edition) => edition.status === "published",
                          ).length,
                        )}{" "}
                        publisert
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {numberFormatter.format(
                          competition.editions.filter(
                            (edition) => edition.status === "draft",
                          ).length,
                        )}{" "}
                        utkast
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {competition.administrators.map((administrator) => (
                          <li key={administrator.userId}>
                            <span className="font-medium text-foreground">
                              {administrator.name}
                            </span>
                            <span className="ml-1 text-muted-foreground">
                              ({administrator.role})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm text-foreground">
                        {formatDate(competition.health.lastAuditEventAt)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Siste revisjon
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top space-y-1">
                      {competition.archivedAt ? (
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                          Arkivert
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-200">
                          Aktiv
                        </span>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {competition.health.pendingEntries > 0
                          ? `${numberFormatter.format(competition.health.pendingEntries)} påmeldinger`
                          : "Ingen ventende påmeldinger"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {competition.health.unresolvedDisputes > 0
                          ? `${numberFormatter.format(competition.health.unresolvedDisputes)} uavklarte tvister`
                          : "Ingen tvistesaker"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
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
