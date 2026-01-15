import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompetitionDetail } from "@/modules/admin/service";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { PageHero } from "@/ui/components/page-hero";

type PageProps = {
  params: Promise<{
    competitionId?: string;
  }>;
};

export const dynamic = "force-dynamic";

const datetimeFormatter = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function CompetitionDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const competitionId = resolvedParams.competitionId;
  if (!competitionId) {
    notFound();
  }

  const competition = await getCompetitionDetail(competitionId);
  const publishedEditions = competition.editions.filter(
    (edition) => edition.status === "published",
  ).length;
  const draftEditions = competition.editions.filter(
    (edition) => edition.status === "draft",
  ).length;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Konkurranse · Administrasjon"
        title={competition.name}
        description={
          competition.description ??
          "Administrer utgaver, innstillinger og rettigheter for konkurransen."
        }
      />

      <div className="flex flex-wrap gap-3">
        <Button asChild size="sm" className="rounded-full">
          <Link href={`/dashboard/competitions/${competition.id}/editions/new`}>
            Ny utgave
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link
            href={`/dashboard/competitions/${competition.id}/venues` as Route}
          >
            Arenaer
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link href="/dashboard/admin/overview">Tilbake til oversikten</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="border-border/70 bg-card/70">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg text-foreground">
              Konkurransedetaljer
            </CardTitle>
            <CardDescription>
              Slug, tidssone og status for konkurransen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Slug
              </div>
              <div className="text-sm font-semibold text-foreground">
                {competition.slug}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Tidssone
              </div>
              <div className="text-sm font-semibold text-foreground">
                {competition.defaultTimezone}
              </div>
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
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Opprettet
              </div>
              <div className="text-sm font-semibold text-foreground">
                {formatDate(competition.createdAt)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg text-foreground">
              Administratorer
            </CardTitle>
            <CardDescription>
              Roller med tilgang til konkurransen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {competition.administrators.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen administratorer er registrert.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {competition.administrators.map((administrator) => (
                  <li
                    key={administrator.userId}
                    className="rounded-xl border border-border/60 bg-card/60 px-4 py-3"
                  >
                    <div className="font-semibold text-foreground">
                      {administrator.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {administrator.email}
                    </div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {administrator.role}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-xl text-foreground">Utgaver</CardTitle>
          <CardDescription>
            Gå direkte til kampoppsett, scoreboard og detaljer for hver utgave.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-6">
          {competition.editions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ingen utgaver opprettet enda. Bruk «Ny utgave» for å komme i gang.
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
                        {edition.slug} · {edition.format} · {edition.timezone}
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
                        {edition.registrationOpensAt ? (
                          <Badge variant="outline">
                            Påmelding åpner{" "}
                            {formatDate(edition.registrationOpensAt)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/editions/${edition.id}` as Route}
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
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(date: Date | null): string {
  if (!date) {
    return "Ingen registrert";
  }

  return datetimeFormatter.format(date);
}
