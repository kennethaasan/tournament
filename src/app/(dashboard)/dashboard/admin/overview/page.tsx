import { getGlobalAdminOverview } from "@/modules/admin/service";

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
    <main className="min-h-screen bg-muted/40 pb-16">
      <div className="mx-auto w-full max-w-7xl px-6 pb-16 pt-14">
        <header className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Administrasjon · Global oversikt
          </p>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            Plattformsstatus og konkurranser
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Overvåk aktiviteten på tvers av alle konkurranser. Se hvilke utgaver
            som er publisert, hvilke invitasjoner som er åpne, og hvor det
            finnes utestående oppgaver for administratorene.
          </p>
        </header>

        <section className="mb-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {numberFormatter.format(card.value)}
              </p>
            </article>
          ))}
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <header className="flex flex-col gap-2 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Konkurranser
              </h2>
              <p className="text-sm text-muted-foreground">
                Oversikt over alle konkurranser, ansvarlige administratorer og
                siste aktivitet.
              </p>
            </div>
          </header>

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
                    className="rounded-xl border border-border bg-muted/50"
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
                    <td className="px-4 py-3 align-top">
                      {competition.archivedAt ? (
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                          Arkivert
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 dark:bg-green-900 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-100">
                          Aktiv
                        </span>
                      )}
                      <div className="mt-2 text-xs text-muted-foreground">
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
        </section>
      </div>
    </main>
  );
}

function formatDate(date: Date | null): string {
  if (!date) {
    return "Ingen registrert";
  }

  return datetimeFormatter.format(date);
}
