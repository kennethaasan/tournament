import Link from "next/link";
import { Button } from "@/ui/components/button";
import { ThemeToggle } from "@/ui/components/theme-toggle";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              🏆
            </div>
            <span>TourneyAdmin</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/auth/organizer-signup"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Arrangør
            </Link>
            <Link
              href="/dashboard/admin/overview"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Logg inn
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 sm:py-32">
          <div className="container mx-auto px-4 text-center">
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Moderne turneringsadministrasjon for fotball
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Alt du trenger for å arrangere, planlegge og gjennomføre
              turneringer. Fra påmelding og kampoppsett til live resultatservice
              og storskjerm.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/auth/organizer-signup">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Start din turnering
                </Button>
              </Link>
              <Link
                href="/competitions/oslo-cup/2025/scoreboard"
                className="text-sm font-semibold leading-6 text-foreground"
              >
                Se demo <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <FeatureCard
                title="Enkel planlegging"
                description="Automatisk generering av kampoppsett for både seriespill og sluttspill. Fleksibel håndtering av baner og tidspunkter."
                icon="📅"
              />
              <FeatureCard
                title="Live resultater"
                description="Oppdater resultater i sanntid fra sidelinjen. Tabeller og toppscorerlister oppdateres umiddelbart."
                icon="⚡"
              />
              <FeatureCard
                title="Storskjerm"
                description="Profesjonell visning for publikum på arenaen. Roterer automatisk mellom pågående kamper, tabeller og kommende oppgjør."
                icon="📺"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} TourneyAdmin. Alle rettigheter
            reservert.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-4 text-4xl">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold text-foreground">
        {title}
      </h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
