import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { NavigationGrid } from "@/ui/components/navigation-links";
import { PageHero } from "@/ui/components/page-hero";

export const metadata: Metadata = {
  title: "Organisatorregistrering",
  description:
    "Start egen turnering ved å opprette konto og sette opp konkurransen direkte i administrasjonsverktøyet.",
};

const steps: Array<{ title: string; description: string }> = [
  {
    title: "1. Opprett konto",
    description:
      "Logg inn eller registrer deg med e-post. Du trenger ingen forhåndsinvitasjon for å starte en ny konkurranse.",
  },
  {
    title: "2. Opprett konkurranse",
    description:
      "Fyll inn grunninformasjon og den første utgaven. Du blir automatisk competition_admin og får tilgang til kontrollpanelet.",
  },
  {
    title: "3. Inviter flere",
    description:
      "Når konkurransen er klar kan du invitere flere administratorer og lagledere til samme konkurranse.",
  },
];

const faqs: Array<{ question: string; answer: string }> = [
  {
    question: "Trenger jeg invitasjon for å starte?",
    answer:
      "Nei. Du kan registrere deg og opprette en konkurranse uten invitasjon. Invitasjoner brukes kun for å gi andre tilgang.",
  },
  {
    question: "Kan flere i klubben få administratorrettigheter?",
    answer:
      "Ja. Etter at du har opprettet konkurransen kan du sende invitasjoner fra kontrollpanelet slik at flere får competition_admin-rolle.",
  },
  {
    question: "Hvilke data trenger jeg for å komme i gang?",
    answer:
      "Ha oversikt over turneringsnavn, tidsperiode, kontaktinformasjon og en kort beskrivelse. Du kan legge til lag, kamper og storskjerminnhold senere.",
  },
];

export default function OrganizerSignupPage() {
  return (
    <main className="page-shell">
      <div className="page-padding space-y-10">
        <PageHero
          eyebrow="Selvbetjent onboarding"
          title="Bli turneringsarrangør på noen få minutter"
          description="Plattformen støtter deg fra registrering til publiserte utgaver. Følg stegene, og koble deg på kontrollpanelet uten friksjon."
          actionHref="/dashboard/competitions/new"
          actionLabel="Opprett konkurranse"
        />

        <section className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <Card
              key={step.title}
              className="border-border/70 bg-card/70 transition hover:-translate-y-1 hover:border-primary/40"
            >
              <CardHeader>
                <Badge
                  variant="accent"
                  className="w-fit uppercase tracking-[0.2em]"
                >
                  Steg
                </Badge>
                <CardTitle className="text-lg text-foreground">
                  {step.title}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {step.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-card to-card/80">
          <CardContent className="grid gap-6 p-8 md:grid-cols-[2fr,1fr] md:items-center">
            <div className="space-y-4">
              <Badge variant="accent" className="uppercase tracking-[0.24em]">
                Start nå
              </Badge>
              <CardTitle className="text-foreground">
                Klar til å sette i gang?
              </CardTitle>
              <CardDescription>
                Logg inn for å opprette konkurransen din. Du kan teste
                storskjermtema, registrere lag og publisere kampoppsett før
                kickoff.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 md:justify-self-end">
              <Link
                href="/dashboard/competitions/new"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90"
              >
                Gå til opprettelse
              </Link>
              <a
                href="mailto:support@tournament.local?subject=Invitasjon%20til%20ny%20turnering"
                className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:border-primary/60"
              >
                Kontakt support
              </a>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Vanlige spørsmål
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                Svar før du inviterer teamet
              </h2>
            </div>
            <Badge variant="outline">Oppdatert</Badge>
          </div>
          <dl className="grid gap-4 md:grid-cols-3">
            {faqs.map((faq) => (
              <Card key={faq.question} className="border-border/70 bg-card/70">
                <CardHeader>
                  <CardTitle className="text-sm text-foreground">
                    {faq.question}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {faq.answer}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </dl>
        </section>

        <section className="space-y-4">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Navigasjon
          </p>
          <NavigationGrid />
        </section>
      </div>
    </main>
  );
}
