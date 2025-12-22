import Link from "next/link";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { NavigationGrid } from "@/ui/components/navigation-links";
import { SiteNavbar } from "@/ui/components/site-navbar";

export default function LandingPage() {
  return (
    <div className="page-shell min-h-screen">
      <SiteNavbar />

      <main className="page-padding">
        <div className="grid-overlay absolute inset-0" aria-hidden />
        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-10 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(95,224,193,0.14),transparent_30%)]" />
          <div className="relative flex flex-col gap-6 text-left">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="accent" className="uppercase tracking-[0.28em]">
                Futuristisk turneringsplattform
              </Badge>
              <span className="pill">WCAG 2.2 AA</span>
              <span className="pill">Polling 5s</span>
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Moderne administrasjon for fotballturneringer
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Planlegg, publiser og vis alt fra én kontrollflate. Selvbetjent
              onboarding, avansert kampoppsett og en storskjerm som matcher
              x.ai-inspirert design.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="rounded-full px-6">
                <Link href="/dashboard/competitions/new">
                  Start din turnering
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="rounded-full border border-border/80 px-6"
              >
                <Link href="/competitions/trondheim-cup/2025/scoreboard">
                  Se scoreboard-demo
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Planlegg raskere"
            description="Generer kampoppsett for gruppespill og sluttspill, med tidsluker og baner ferdig fylt ut."
            metric="<5 min"
            hint="fra idé til publisert plan"
          />
          <FeatureCard
            title="Live oppdateringer"
            description="Polling og TanStack Query holder dashboard, toppscorere og tabeller ferske uten komplisert oppsett."
            metric="200 ms"
            hint="p95 på scoreboard-endepunkt"
          />
          <FeatureCard
            title="Venue-modus"
            description="Publikum får en storskjerm som roterer mellom kamper, tabeller og høydepunkter med høy kontrast."
            metric="5 s"
            hint="rotasjon som standard"
          />
        </section>

        <section className="mt-12 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Navigasjon
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                Alt du trenger i én meny
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Direkte snarveier til alle sidene som dekker spesifikasjonen:
                onboarding, revisjon, planlegging, lag og storskjerm.
              </p>
            </div>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/dashboard/admin/overview">Åpne dashboard</Link>
            </Button>
          </div>
          <NavigationGrid />
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-[2fr,1fr]">
          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <CardTitle className="text-foreground">
                Designet for mørkt og lyst modus
              </CardTitle>
              <CardDescription>
                Systemtema brukes som standard. Alle flater er bygget med samme
                glasstekstur, gradienter og kontraster for konsistente
                opplevelser.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="pill">Shadcn-komponenter</span>
              <span className="pill">Tilgjengelig navigasjon</span>
              <span className="pill">Bokmål i UI</span>
              <span className="pill">RFC 9457-feil</span>
              <span className="pill">Bedre-auth</span>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/60">
            <CardHeader>
              <CardTitle className="text-foreground">Rask start</CardTitle>
              <CardDescription>
                Oppsettet følger spesifikasjonen i
                `/specs/001-build-football-admin-app/` med klare lenker til
                hvert steg.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
              <Link
                className="rounded-lg border border-border/60 px-3 py-2 hover:border-primary/60"
                href="/dashboard/competitions/new"
              >
                Opprett arrangørkonto →
              </Link>
              <Link
                className="rounded-lg border border-border/60 px-3 py-2 hover:border-primary/60"
                href="/dashboard/competitions/new"
              >
                Bygg konkurranse →
              </Link>
              <Link
                className="rounded-lg border border-border/60 px-3 py-2 hover:border-primary/60"
                href="/dashboard/editions/demo-2025/schedule"
              >
                Planlegg utgave →
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background/80 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Turneringsadmin · Moderne
            turneringsadministrasjon i samsvar med spesifikasjonen.
          </p>
        </div>
      </footer>
    </div>
  );
}

type FeatureCardProps = {
  title: string;
  description: string;
  metric: string;
  hint: string;
};

function FeatureCard({ title, description, metric, hint }: FeatureCardProps) {
  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="space-y-3">
        <Badge variant="outline" className="w-fit uppercase tracking-[0.2em]">
          {hint}
        </Badge>
        <CardTitle className="text-foreground">{title}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-foreground">{metric}</p>
      </CardContent>
    </Card>
  );
}
