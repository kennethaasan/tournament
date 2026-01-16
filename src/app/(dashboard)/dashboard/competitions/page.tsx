import type { Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompetitionsForUser } from "@/modules/admin/service";
import { getSessionFromHeaders, userHasRole } from "@/server/auth";
import { Badge } from "@/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { PageHero } from "@/ui/components/page-hero";

export const dynamic = "force-dynamic";

const datetimeFormatter = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function MyCompetitionsPage() {
  const session = await getSessionFromHeaders(await headers());

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const isGlobalAdmin = userHasRole(session, "global_admin");

  // Global admins should use the global admin overview instead
  if (isGlobalAdmin) {
    redirect("/dashboard/admin/overview");
  }

  const competitions = await getCompetitionsForUser(session.user.id);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Dashboard · Mine konkurranser"
        title="Dine konkurranser"
        description="Administrer konkurranser og utgaver du har tilgang til som konkurranseadministrator."
      />

      {competitions.length === 0 ? (
        <Card className="border-border/70 bg-card/70">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Du har ikke tilgang til noen konkurranser enda.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Kontakt en global administrator for å bli lagt til som
              konkurranseadministrator.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {competitions.map((competition) => {
            const publishedEditions = competition.editions.filter(
              (edition) => edition.status === "published",
            ).length;
            const draftEditions = competition.editions.filter(
              (edition) => edition.status === "draft",
            ).length;

            return (
              <Card
                key={competition.id}
                className="border-border/70 bg-card/80"
              >
                <CardHeader className="border-b border-border/60">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl text-foreground">
                        <Link
                          href={`/dashboard/competitions/${competition.id}`}
                          className="hover:underline"
                        >
                          {competition.name}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {competition.description ??
                          `${competition.slug} · ${competition.defaultTimezone}`}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 text-emerald-700 dark:text-emerald-200"
                      >
                        {publishedEditions} publisert
                      </Badge>
                      <Badge variant="outline">{draftEditions} utkast</Badge>
                      {competition.archivedAt ? (
                        <Badge variant="outline">Arkivert</Badge>
                      ) : (
                        <Badge variant="accent">Aktiv</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-6">
                  {competition.editions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Ingen utgaver opprettet enda.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {competition.editions.map((edition) => (
                        <li
                          key={edition.id}
                          className="rounded-2xl border border-border/60 bg-card/60 px-5 py-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="text-base font-semibold text-foreground">
                                {edition.label}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {edition.slug} · {edition.format} ·{" "}
                                {edition.timezone}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Sist oppdatert {formatDate(edition.updatedAt)}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                {edition.status === "published" ? (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-500/40 text-emerald-700 dark:text-emerald-200"
                                  >
                                    Publisert
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Utkast</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={
                                  `/dashboard/editions/${edition.id}` as Route
                                }
                                className="rounded-full border border-primary bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20"
                              >
                                Administrer utgave
                              </Link>
                              <Link
                                href={
                                  `/competitions/${competition.slug}/${edition.slug}/scoreboard` as Route
                                }
                                className="rounded-full border border-border/70 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/10"
                              >
                                Offentlig scoreboard
                              </Link>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Link
                      href={`/dashboard/competitions/${competition.id}`}
                      className="rounded-full border border-border/70 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/10"
                    >
                      Konkurransedetaljer
                    </Link>
                    <Link
                      href={
                        `/dashboard/competitions/${competition.id}/venues` as Route
                      }
                      className="rounded-full border border-border/70 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-primary/10"
                    >
                      Arenaer
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date | null): string {
  if (!date) {
    return "Ingen registrert";
  }

  return datetimeFormatter.format(date);
}
