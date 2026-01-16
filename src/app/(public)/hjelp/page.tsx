import type { Metadata } from "next";
import Markdown from "react-markdown";
import { PageHero } from "@/ui/components/page-hero";

export const metadata: Metadata = {
  title: "Hjelp og brukerveiledning",
  description:
    "Komplett brukerveiledning for turneringsplattformen. Lær hvordan du oppretter konkurranser, administrerer kamper og bruker scoreboardet.",
};

const guideContent = `
## Innholdsfortegnelse

1. [Kom i gang](#kom-i-gang)
2. [Brukerroller og tilganger](#brukerroller-og-tilganger)
3. [Opprette en ny konkurranse](#opprette-en-ny-konkurranse)
4. [Administrere utgaver](#administrere-utgaver)
5. [Påmeldinger og lagregistrering](#påmeldinger-og-lagregistrering)
6. [Lagadministrasjon og spillertropper](#lagadministrasjon-og-spillertropper)
7. [Opprette etapper og grupper](#opprette-etapper-og-grupper)
8. [Kampoppsett og terminliste](#kampoppsett-og-terminliste)
9. [Kampresultater og hendelser](#kampresultater-og-hendelser)
10. [Scoreboard og publikumsvisning](#scoreboard-og-publikumsvisning)
11. [Invitasjoner og tilgangsstyring](#invitasjoner-og-tilgangsstyring)
12. [Ofte stilte spørsmål (FAQ)](#ofte-stilte-spørsmål-faq)

---

## Kom i gang

### Logge inn

1. Gå til \`/auth/login\`
2. Logg inn med e-post og passord, eller bruk en av de tilgjengelige innloggingsmetodene
3. Etter innlogging blir du sendt til dashboardet

### Dashboard-oversikt

Dashboardet (\`/dashboard\`) gir deg rask tilgang til:

- **Varsler**: Frister, endringer og tvistesaker
- **Invitasjoner**: Send invitasjoner til administratorer og lagledere
- **Mine konkurranser**: Se konkurranser du administrerer (kun for konkurranseadministratorer)
- **Global administrasjon**: Plattformstatus og alle konkurranser (kun for globale administratorer)

---

## Brukerroller og tilganger

Plattformen har tre hovedroller:

### Global administrator

- Kan opprette og administrere alle konkurranser
- Kan invitere andre brukere til alle roller
- Har tilgang til global oversikt, revisjon og alle utgaver
- Tilgang: \`/dashboard/admin/overview\`

### Konkurranseadministrator

- Kan administrere konkurranser de er tildelt
- Kan opprette og publisere utgaver
- Kan godkjenne eller avslå påmeldinger
- Kan administrere kamper og resultater
- Kan invitere lagledere
- Tilgang: \`/dashboard/competitions\`

### Lagleder

- Kan administrere lag de er tildelt
- Kan melde på lag til utgaver
- Kan administrere spillertroppen (legge til/fjerne spillere, trenere, støtteapparat)
- Kan tildele draktnummer
- Tilgang: \`/dashboard/teams/[teamId]/roster\`

---

## Opprette en ny konkurranse

> **Krav**: Du må være global administrator for å opprette nye konkurranser.

### Steg for steg

1. Gå til **Dashboard** → **Ny konkurranse** (\`/dashboard/competitions/new\`)

2. Fyll ut konkurranseinformasjon:
   - **Navn**: Konkurransens fulle navn (f.eks. "Trondheim Cup")
   - **Slug**: URL-vennlig identifikator (f.eks. "trondheim-cup")
   - **Tidssone**: Standard tidssone for konkurransen
   - **Beskrivelse** (valgfritt): Kort beskrivelse av konkurransen
   - **Farger** (valgfritt): Primær- og sekundærfarge for branding

3. Opprett første utgave samtidig:
   - **Årstall/label**: F.eks. "2025"
   - **Slug**: URL-identifikator for utgaven
   - **Format**: \`round_robin\` (seriespill), \`knockout\` (utslagsspill) eller \`hybrid\`
   - **Påmeldingsvindu**: Start- og sluttdato for påmelding

4. Klikk **Opprett konkurranse**

### Etter opprettelse

- Du blir sendt til konkurranseoversikten
- Herfra kan du administrere utgaver, arenaer og invitere administratorer

---

## Administrere utgaver

En utgave representerer én gjennomføring av konkurransen (f.eks. "Trondheim Cup 2025").

### Navigere til utgaveadministrasjon

1. Gå til **Mine konkurranser** eller **Global admin** → **Konkurranser**
2. Klikk på ønsket konkurranse
3. Klikk **Administrer utgave** på ønsket utgave

### Utgaveinnstillinger

Fra utgaveoversikten har du tilgang til:

| Fane | Beskrivelse |
|------|-------------|
| **Oversikt** | Generelle innstillinger og påmeldingsstatus |
| **Lag** | Påmeldinger og lagoversikt |
| **Terminliste** | Etapper, grupper og kampoppsett |
| **Resultater** | Kampresultater og hendelser |
| **Scoreboard** | Publikumsvisning og tema |
| **Hendelser** | Oversikt over alle kamphendelser |

### Publisere en utgave

1. Gå til utgaveoversikten
2. Kontroller at alle innstillinger er korrekte
3. Klikk **Publiser utgave**
4. Utgaven blir nå synlig for publikum

> **Merk**: Du kan fortsatt redigere kamper og resultater etter publisering.

### Utgavestatus

- **Utkast**: Under utarbeidelse, ikke synlig for publikum
- **Publisert**: Aktiv og synlig for publikum
- **Arkivert**: Avsluttet, kun for historikk

---

## Påmeldinger og lagregistrering

### For lagledere: Melde på lag

1. Gå til lagoversikten for laget ditt
2. Finn utgaven du vil melde på til
3. Klikk **Meld på** eller **Send påmelding**
4. Påmeldingen sendes til godkjenning

### For administratorer: Godkjenne påmeldinger

1. Gå til utgaveadministrasjon → **Lag**-fanen
2. Se listen over ventende påmeldinger
3. For hver påmelding kan du:
   - **Godkjenn**: Laget blir med i utgaven
   - **Avslå**: Påmeldingen avvises med begrunnelse

### Påmeldingsstatus

| Status | Beskrivelse |
|--------|-------------|
| Venter | Venter på godkjenning |
| Godkjent | Godkjent og aktiv |
| Avslått | Avslått av administrator |
| Trukket | Trukket av lagleder |

### Påmeldingsvindu

Påmeldinger kan kun sendes innenfor det definerte påmeldingsvinduet:
- **Åpner**: Dato/tid påmelding starter
- **Stenger**: Siste frist for påmelding

---

## Lagadministrasjon og spillertropper

### Opprette et nytt lag

> **Krav**: Global administrator eller konkurranseadministrator

Lag opprettes automatisk ved første påmelding, eller manuelt via API.

### Administrere spillertroppen

Som lagleder har du tilgang til spillertroppadministrasjon på \`/dashboard/teams/[teamId]/roster\`.

#### Legge til medlem

1. Klikk **Legg til medlem**
2. Fyll ut:
   - **Navn**: Fullt navn
   - **Rolle**: Spiller, trener eller støtteapparat
   - **Draktnummer** (valgfritt): Nummer på drakten
3. Klikk **Legg til**

#### Redigere medlem

1. Finn medlemmet i listen
2. Klikk **Rediger**
3. Oppdater informasjon (navn, rolle, draktnummer)
4. Klikk **Lagre**

#### Fjerne medlem

1. Finn medlemmet i listen
2. Klikk **Fjern** og bekreft

### Draktnummer

- Draktnummer vises i format \`#10 Erik Hansen\`
- Synlig i kamprapporter, hendelseslister og toppscorerstatistikk
- Lagres i spillerens medlemskapsdata

---

## Opprette etapper og grupper

Etapper (stages) organiserer kamper i logiske deler av turneringen.

### Navigere til terminliste

1. Gå til utgaveadministrasjon
2. Klikk på **Terminliste**-fanen

### Opprette en ny etappe

1. Klikk **Ny etappe**
2. Fyll ut:
   - **Navn**: F.eks. "Gruppespill" eller "Kvartfinaler"
   - **Type**: Gruppespill eller utslagsspill
   - **Sorteringsrekkefølge**: Bestemmer visningsrekkefølge

3. For gruppespill, legg til grupper:
   - **Gruppekode**: F.eks. "A", "B", "C"
   - **Gruppenavn** (valgfritt): F.eks. "Gruppe A"

4. Klikk **Opprett etappe**

### Etappetyper

| Type | Beskrivelse | Bruksområde |
|------|-------------|-------------|
| Gruppespill | Alle møter alle | Innledende runder |
| Utslagsspill | Vinner går videre | Sluttspill |

### Administrere grupper

Etter at etappen er opprettet:

1. Klikk på etappen for å se grupper
2. Tildel lag til grupper ved å dra-og-slippe eller velge fra liste
3. Lagre endringer

---

## Kampoppsett og terminliste

### Generere kamper automatisk

Plattformen kan generere kamper automatisk basert på etappetype.

#### For gruppespill (round-robin)

1. Gå til etappen
2. Klikk **Generer kamper**
3. Velg:
   - **Antall møter**: 1 (enkel serie) eller 2 (dobbel serie)
   - **Starttidspunkt** (valgfritt)
   - **Arena** (valgfritt)
4. Klikk **Generer**

Systemet oppretter kamper der alle lag møter hverandre.

#### For utslagsspill (knockout)

1. Gå til etappen
2. Klikk **Generer bracket**
3. Velg:
   - **Antall lag**: Må være 2, 4, 8, 16, osv.
   - **Seedingmetode**: Manuell eller basert på grupperesultater
4. Klikk **Generer**

Systemet oppretter kamptreet med plassholdere.

### Opprette kamper manuelt

1. Gå til terminlisten
2. Klikk **Ny kamp**
3. Fyll ut:
   - **Etappe**: Hvilken etappe kampen tilhører
   - **Gruppe** (for gruppespill): Hvilken gruppe
   - **Hjemmelag**: Velg fra godkjente lag eller skriv plassholder
   - **Bortelag**: Velg fra godkjente lag eller skriv plassholder
   - **Dato og tid**: Avsparktidspunkt
   - **Arena**: Hvor kampen spilles
   - **Kampkode** (valgfritt): F.eks. "A1", "SF1"
4. Klikk **Opprett kamp**

### Plassholdere for lag

For utslagsspill kan du bruke plassholdere:
- \`Vinner A1\` - Vinner av kamp A1
- \`2. plass Gruppe B\` - Andreplassen fra gruppe B

Disse oppdateres automatisk når resultatene er klare.

### Redigere kampinformasjon

1. Finn kampen i terminlisten
2. Klikk **Rediger**
3. I modalen kan du endre:
   - Avsparktidspunkt
   - Arena
   - Hjemme-/bortelag
   - Kampkode
4. Klikk **Lagre**

---

## Kampresultater og hendelser

### Navigere til resultater

1. Gå til utgaveadministrasjon
2. Klikk på **Resultater**-fanen

### Filtrere kamper

Bruk filtrene øverst for å finne kamper:
- **Søk**: Fritekst (lagnavn, kampkode)
- **Status**: Planlagt, pågår, fullført, osv.
- **Runde**: Filtrer på runde/matchdag
- **Gruppe**: Filtrer på gruppe
- **Arena**: Filtrer på arena
- **Lag**: Vis kun kamper for ett lag

### Registrere kampresultat

1. Finn kampen i listen
2. Klikk **Rediger** (blå knapp)
3. I modalvinduet:

#### Grunnleggende resultat

- **Hjemmelag**: Antall mål i ordinær tid
- **Bortelag**: Antall mål i ordinær tid

#### Ekstra tid og straffer (for utslagsspill)

Klikk **Vis ekstra tid / straffer** for å legge til:
- **Ekstra tid hjemme/borte**: Mål i ekstraomgangene
- **Straffer hjemme/borte**: Mål i straffesparkkonkurranse

#### Kampstatus

| Status | Beskrivelse |
|--------|-------------|
| Planlagt | Kampen er satt opp, ikke startet |
| Pågår | Kampen spilles nå |
| Ekstraomganger | I forlengelse |
| Straffer | Straffesparkkonkurranse |
| Fullført | Kampen er ferdig |
| Tvist | Under protest |

> **Tips**: Når du legger inn resultat, settes status automatisk til "Fullført".

4. Klikk **Lagre kampdata**

### Registrere kamphendelser

Hendelser gir detaljert kampstatistikk og vises på scoreboard.

#### Åpne hendelsespanelet

1. I kampmodalen, klikk **Vis hendelser**
2. Hendelsespanelet vises under kampinformasjonen

#### Legge til hendelse

1. Klikk **Legg til hendelse** eller bruk hurtigknappene:
   - **+ Mål hjemme**: Legger til mål for hjemmelaget
   - **+ Mål borte**: Legger til mål for bortelaget

2. For hver hendelse, fyll ut:
   - **Lag**: Hjemme eller borte
   - **Type**: Mål, assist, gult kort, rødt kort
   - **Spiller**: Velg fra lagets tropp
   - **Minutt**: Når hendelsen skjedde
   - **Tilleggstid** (valgfritt): Minutter i tilleggstid

3. Klikk **Lagre hendelser**

#### Hendelsestyper

| Type | Beskrivelse |
|------|-------------|
| Mål | ⚽ Scoring |
| Assist | 🅰️ Målgivende pasning |
| Gult kort | 🟨 Advarsel |
| Rødt kort | 🟥 Utvisning |

#### Redigere hendelse

1. Finn hendelsen i listen
2. Endre verdiene direkte i skjemaet
3. Klikk **Lagre hendelser**

#### Slette hendelse

1. Finn hendelsen i listen
2. Klikk **Fjern** (søppelbøtte-ikon)
3. Klikk **Lagre hendelser**

### Slette kamp

1. Åpne kampen i modalvinduet
2. Scroll ned til bunnen
3. Klikk **Slett kamp**
4. Bekreft slettingen

> **Advarsel**: Sletting er permanent og fjerner også alle tilknyttede hendelser.

---

## Scoreboard og publikumsvisning

Scoreboardet er den offentlige visningen av turneringen.

### Offentlig URL

Scoreboardet er tilgjengelig på:
\`\`\`
/competitions/[konkurranseslug]/[utgaveslug]/scoreboard
\`\`\`

Eksempel: \`/competitions/trondheim-cup/2025/scoreboard\`

### Administrere scoreboard

1. Gå til utgaveadministrasjon
2. Klikk på **Scoreboard**-fanen

#### Tema og utseende

Du kan tilpasse scoreboardets utseende:

- **Primærfarge**: Hovedfarge for overskrifter og knapper
- **Sekundærfarge**: Aksentfarge og tekst
- **Bakgrunnsbilde** (valgfritt): URL til bakgrunnsbilde

#### Rotasjonsinnstillinger

Scoreboardet roterer automatisk mellom visninger:

- **Rotasjonstid**: Antall sekunder per visning (standard: 5)
- **Visninger**: Tabeller, kamper, toppscorere, osv.

#### Høydepunkter (Highlights)

Du kan vise spesielle meldinger på scoreboardet:

1. Klikk **Legg til høydepunkt**
2. Skriv inn meldingen (f.eks. "Gratulerer til vinneren!")
3. Velg visningsvarighet
4. Klikk **Aktiver**

### Scoreboard-funksjoner

Publikum ser:

| Visning | Innhold |
|---------|---------|
| **Tabeller** | Gruppetabeller med poeng, mål og målforskjell |
| **Kamper** | Dagens/neste kamper med tidspunkt og arena |
| **Resultater** | Siste resultater |
| **Toppscorere** | Spillere med flest mål (med draktnummer) |
| **Live** | Pågående kamper med sanntidsoppdatering |

---

## Invitasjoner og tilgangsstyring

### Sende invitasjon

1. Gå til **Dashboard** → **Invitasjoner** (\`/dashboard/invitations\`)
2. Klikk **Send invitasjon**
3. Fyll ut:
   - **E-post**: Mottakerens e-postadresse
   - **Rolle**: Konkurranseadministrator eller lagleder
   - **Scope**: Hvilken konkurranse eller lag invitasjonen gjelder

4. Klikk **Send**

### Invitasjonsbegrensninger

- **Global admin**: Kan invitere til alle roller og scopes
- **Konkurranseadmin**: Kan kun invitere lagledere til lag i sine konkurranser
- **Lagleder**: Kan ikke sende invitasjoner

### Motta invitasjon

1. Mottaker får e-post med invitasjonslenke
2. Klikk på lenken for å akseptere
3. Opprett konto eller logg inn
4. Rollen aktiveres automatisk

### Se invitasjonsstatus

I invitasjonsoversikten ser du:
- Sendte invitasjoner
- Status (venter, akseptert, utløpt)
- Dato sendt

---

## Ofte stilte spørsmål (FAQ)

### Generelt

**Hvordan bytter jeg mellom konkurranser?**

Gå til **Dashboard** → **Mine konkurranser** (for konkurranseadministratorer) eller **Global admin** → **Konkurranser** (for globale administratorer).

**Kan jeg ha flere roller samtidig?**

Ja, en bruker kan ha flere roller. For eksempel kan du være konkurranseadministrator for én konkurranse og lagleder for et lag i en annen.

### Konkurranser og utgaver

**Hva er forskjellen på en konkurranse og en utgave?**

En **konkurranse** er den overordnede turneringen (f.eks. "Trondheim Cup"). En **utgave** er én gjennomføring av konkurransen (f.eks. "Trondheim Cup 2025"). En konkurranse kan ha mange utgaver over tid.

**Kan jeg endre en utgave etter at den er publisert?**

Ja, du kan fortsatt redigere kamper, resultater og innstillinger etter publisering. Endringer vises umiddelbart på scoreboardet.

**Hvordan arkiverer jeg en utgave?**

Gå til utgaveinnstillinger og velg **Arkiver utgave**. Arkiverte utgaver er ikke lenger aktive, men dataene beholdes for historikk.

### Påmeldinger

**Kan jeg endre påmeldingsfristen etter at den er satt?**

Ja, gå til utgaveinnstillinger og oppdater påmeldingsvinduet. Husk å informere lagene om endringen.

**Hva skjer hvis et lag trekker seg?**

Laglederen kan trekke påmeldingen. Administratoren kan også manuelt endre status til "trukket". Kamper mot laget kan settes som walkover.

### Kamper og resultater

**Hvordan registrerer jeg en walkover?**

Åpne kampen, sett resultatet (vanligvis 3-0 eller tilsvarende) og status til "Fullført". Du kan legge til en kommentar i kampnotater.

**Kan jeg endre et resultat etter at det er registrert?**

Ja, åpne kampen og endre resultatet. Tabeller og statistikk oppdateres automatisk.

**Hvordan håndterer jeg en protest/tvist?**

Sett kampstatus til "Tvist". Dette markerer kampen for gjennomgang. Etter avgjørelse, oppdater resultatet og sett status til "Fullført".

**Hvordan legger jeg inn mål i ekstraomganger?**

I kampmodalen, klikk **Vis ekstra tid / straffer**. Fyll inn mål for hjemme- og bortelag i ekstraomgangene.

**Hvordan registrerer jeg straffesparkkonkurranse?**

I kampmodalen, klikk **Vis ekstra tid / straffer**. Fyll inn antall scorede straffer for hvert lag i straffefeltene.

### Scoreboard

**Hvorfor vises ikke endringene mine på scoreboardet?**

Scoreboardet oppdateres automatisk med polling. Vent noen sekunder, eller last siden på nytt. Sjekk også at utgaven er publisert.

**Kan jeg tilpasse scoreboardets utseende?**

Ja, gå til **Scoreboard**-fanen i utgaveadministrasjonen. Du kan endre farger, bakgrunnsbilde og rotasjonstid.

**Hvordan viser jeg et høydepunkt/melding på scoreboardet?**

Gå til **Scoreboard** → **Høydepunkter**. Legg til meldingen og aktiver den. Den vises øverst på scoreboardet.

### Teknisk

**Hvilke nettlesere støttes?**

Moderne versjoner av Chrome, Firefox, Safari og Edge støttes. Internet Explorer støttes ikke.

**Fungerer plattformen på mobil?**

Ja, både administrasjon og scoreboard er responsivt og fungerer på mobil og nettbrett.

**Hvordan rapporterer jeg en feil?**

Kontakt support eller opprett en sak i GitHub-repositoryet.

---

## Hurtigreferanse

### Vanlige URL-er

| Side | URL |
|------|-----|
| Dashboard | \`/dashboard\` |
| Mine konkurranser | \`/dashboard/competitions\` |
| Global admin | \`/dashboard/admin/overview\` |
| Ny konkurranse | \`/dashboard/competitions/new\` |
| Invitasjoner | \`/dashboard/invitations\` |
| Varsler | \`/dashboard/notifications\` |
| Hjelp | \`/hjelp\` |

### Statuskoder for kamper

| Status | Beskrivelse |
|--------|-------------|
| Planlagt | Kampen er satt opp |
| Pågår | Kampen spilles nå |
| Ekstraomganger | I forlengelse |
| Straffer | Straffesparkkonkurranse |
| Fullført | Kampen er ferdig |
| Tvist | Under protest |
`;

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHero
          eyebrow="Dokumentasjon"
          title="Brukerveiledning"
          description="Komplett veiledning for å bruke turneringsplattformen. Lær hvordan du oppretter konkurranser, administrerer kamper, registrerer resultater og mer."
        />

        <article className="prose prose-slate dark:prose-invert mt-12 max-w-none prose-headings:scroll-mt-20 prose-h2:mt-12 prose-h2:border-b prose-h2:border-border/40 prose-h2:pb-4 prose-h2:text-2xl prose-h2:font-bold prose-h3:mt-8 prose-h3:text-xl prose-h3:font-semibold prose-h4:mt-6 prose-h4:text-lg prose-h4:font-medium prose-p:text-muted-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted prose-pre:text-foreground prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:not-italic prose-table:text-sm prose-th:bg-muted/50 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-td:px-4 prose-td:py-2 prose-td:border-t prose-td:border-border/40 prose-li:text-muted-foreground prose-ol:text-muted-foreground prose-ul:text-muted-foreground">
          <Markdown>{guideContent}</Markdown>
        </article>

        <footer className="mt-16 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
          <p>
            Har du spørsmål eller trenger hjelp? Kontakt din
            konkurranseadministrator eller{" "}
            <a
              href="https://github.com/kennethaasan/tournament/issues"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              opprett en sak på GitHub
            </a>
            .
          </p>
          <p className="mt-2">Sist oppdatert: Januar 2026</p>
        </footer>
      </div>
    </main>
  );
}
