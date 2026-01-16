import Link from "next/link";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import {
  Card,
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

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-8 shadow-2xl sm:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(95,224,193,0.14),transparent_30%)]" />
          <div className="relative flex flex-col gap-6 text-left">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="accent" className="uppercase tracking-[0.28em]">
                Turneringsadmin
              </Badge>
              <Badge variant="outline" className="rounded-full font-medium">
                For arrangører og lagledere
              </Badge>
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-6xl">
              Gjør turneringshverdagen enklere
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
              En komplett plattform for planlegging og gjennomføring av
              fotballturneringer. Fra påmelding og kampoppsett til live
              resultater på storskjerm.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href="/dashboard">Kom i gang</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="rounded-full border border-border/80 px-8"
              >
                <Link href="/hjelp">Les brukerveiledning</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Product Explanation Section (Based on Help Page) */}
        <section className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <div className="mb-2 text-2xl">📋</div>
              <CardTitle>Alt på ett sted</CardTitle>
              <CardDescription className="text-base">
                Administrer alle deler av turneringen fra ett dashboard. Full
                kontroll over konkurranser, utgaver, arenaer og tilganger for
                hele teamet ditt.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <div className="mb-2 text-2xl">⚡</div>
              <CardTitle>Smarte kampoppsett</CardTitle>
              <CardDescription className="text-base">
                Generer terminlister automatisk for både gruppespill og
                utslagsrunder. Systemet håndterer baner, tider og plassholdere
                for sluttspill.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <div className="mb-2 text-2xl">🏆</div>
              <CardTitle>Scoreboard for publikum</CardTitle>
              <CardDescription className="text-base">
                Gi publikum en profesjonell opplevelse med et live scoreboard
                som roterer mellom kamper, tabeller og toppscorere automatisk.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <div className="mb-2 text-2xl">👥</div>
              <CardTitle>Lagledelse</CardTitle>
              <CardDescription className="text-base">
                Lagledere kan selv administrere sine lag og spillertropper.
                Enkel påmelding og oversikt over egne kamper gjennom hele
                turneringen.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <div className="mb-2 text-2xl">📱</div>
              <CardTitle>Resultater i lomma</CardTitle>
              <CardDescription className="text-base">
                Både administrasjon og publikumsvisning fungerer like godt på
                mobil som på desktop. Før resultater direkte fra sidelinja.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/70">
            <CardHeader>
              <div className="mb-2 text-2xl">🔒</div>
              <CardTitle>Trygg forvaltning</CardTitle>
              <CardDescription className="text-base">
                Innebygd revisjonshistorikk og rollebasert tilgangsstyring
                sørger for at du alltid har kontroll på hvem som har gjort hva.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        {/* Navigation Section */}
        <section className="mt-20 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
                Hurtigstart
              </p>
              <h2 className="text-3xl font-semibold text-foreground">
                Gå direkte til verktøyene
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                Trenger du å hoppe rett til en spesifikk del av systemet? Her er
                snarveier til de viktigste funksjonene for din rolle.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="w-fit rounded-full px-6"
            >
              <Link href="/dashboard">Gå til hoveddashboard →</Link>
            </Button>
          </div>
          <NavigationGrid />
        </section>

        {/* Support Section */}
        <section className="mt-20 rounded-3xl border border-border/60 bg-card/40 p-8 sm:p-12 text-center">
          <h2 className="text-3xl font-semibold text-foreground">
            Trenger du hjelp?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Vi har laget en omfattende brukerveiledning som tar deg gjennom alt
            fra din første turnering til avansert resultathåndtering.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="rounded-full px-10"
            >
              <Link href="/hjelp">Se brukerveiledning</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="mt-20 border-t border-border/60 bg-background/80 py-12">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Turneringsadmin · Profesjonell
            turneringsadministrasjon for moderne idrett.
          </p>
        </div>
      </footer>
    </div>
  );
}
