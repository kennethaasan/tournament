import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Organisatorregistrering",
  description:
    "Start egen turnering ved å be om invitasjon og sette opp konkurransen i det nye administrasjonsverktøyet.",
};

const steps: Array<{ title: string; description: string }> = [
  {
    title: "1. Be om invitasjon",
    description:
      "Send en e-post til support@tournament.local med navn, klubb/organisasjon og ønsket konkurransenavn. En global administrator sender deg en invitasjon på e-post.",
  },
  {
    title: "2. Opprett bruker",
    description:
      "Følg lenken i invitasjonen for å logge inn eller opprette bruker. Invitasjonen sikrer at du får riktig rolle (competition_admin) ved første pålogging.",
  },
  {
    title: "3. Sett opp konkurransen",
    description:
      "Etter innlogging kan du opprette konkurransen, legge til den første utgaven og konfigurere storskjermtemaet før du inviterer laget og dommerteamet.",
  },
];

const faqs: Array<{ question: string; answer: string }> = [
  {
    question: "Hvor lang tid er invitasjonen gyldig?",
    answer:
      "Invitasjonen er gyldig i 7 dager. Dersom fristen utløper kan du be om en ny invitasjon fra supportteamet.",
  },
  {
    question: "Kan flere i klubben få administratorrettigheter?",
    answer:
      "Ja. Etter at du har opprettet konkurransen kan du sende videre invitasjoner fra kontrollpanelet slik at flere får competition_admin-rolle.",
  },
  {
    question: "Hvilke data trenger jeg for å komme i gang?",
    answer:
      "Ha oversikt over turneringsnavn, tidsperiode, kontaktinformasjon og en kort beskrivelse. Du kan legge til lag, kamper og storskjerminnhold senere.",
  },
];

export default function OrganizerSignupPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 py-16">
        <section className="space-y-6 rounded-2xl border border-blue-100 bg-white p-8 shadow-lg shadow-blue-100/40">
          <p className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            Selvbetjent onboarding
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-blue-950 md:text-4xl">
            Bli turneringsarrangør på noen få minutter
          </h1>
          <p className="text-lg text-blue-900/80">
            Plattformen hjelper deg med registrering, kampoppsett, resultater og
            storskjermvisning. Følg stegene under for å be om invitasjon og
            opprette din første utgave.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.title}
              className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-zinc-900">
                {step.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {step.description}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 rounded-2xl border border-zinc-100 bg-zinc-950 px-8 py-10 text-zinc-50 md:grid-cols-[2fr,1fr] md:items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Klar til å sette i gang?</h2>
            <p className="text-sm text-zinc-200">
              Når du har mottatt invitasjonen, kan du logge inn og opprette
              konkurransen. Du kan også teste storskjermtema, registrere lag og
              sette opp kampoppsettet.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:justify-self-end">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
            >
              Logg inn / bruk invitasjon
            </Link>
            <a
              href="mailto:support@tournament.local?subject=Invitasjon%20til%20ny%20turnering"
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Kontakt support
            </a>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-900">
            Vanlige spørsmål
          </h2>
          <dl className="grid gap-4 md:grid-cols-3">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <dt className="text-sm font-semibold text-zinc-900">
                  {faq.question}
                </dt>
                <dd className="mt-2 text-sm text-zinc-600">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </main>
  );
}
