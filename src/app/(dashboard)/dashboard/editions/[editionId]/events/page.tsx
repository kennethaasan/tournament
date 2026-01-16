import { desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  buildBracketRoundMap,
  derivePlaceholderName,
  parseMatchMetadata,
} from "@/modules/matches/placeholder";
import { assertEditionAdminAccess } from "@/server/api/edition-access";
import { getSessionFromHeaders } from "@/server/auth";
import { db } from "@/server/db/client";
import {
  entries,
  groups,
  matchEvents,
  matches,
  persons,
  squadMembers,
  teamMemberships,
  teams,
  venues,
} from "@/server/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { EditionHeader } from "../edition-dashboard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ editionId?: string }>;
};

type MatchRow = {
  id: string;
  code: string | null;
  kickoffAt: Date | null;
  createdAt: Date;
  groupId: string | null;
  venueId: string | null;
  homeEntryId: string | null;
  awayEntryId: string | null;
  metadata: unknown;
  bracketId: string | null;
};

type MatchLabels = {
  id: string;
  codeLabel: string;
  kickoffAt: Date;
  venueName: string | null;
  homeName: string;
  awayName: string;
};

type EventRow = {
  id: string;
  matchId: string;
  teamSide: "home" | "away";
  eventType:
    | "goal"
    | "own_goal"
    | "penalty_goal"
    | "assist"
    | "yellow_card"
    | "red_card";
  minute: number | null;
  stoppageTime: number | null;
  createdAt: Date;
  firstName: string | null;
  lastName: string | null;
  jerseyNumber: number | null;
  membershipMeta: unknown;
};

const timestampFormatter = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const EVENT_LABELS: Record<EventRow["eventType"], string> = {
  goal: "Mål",
  own_goal: "Selvmål",
  penalty_goal: "Straffemål",
  assist: "Assist",
  yellow_card: "Gult kort",
  red_card: "Rødt kort",
};

export default async function EditionEventsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const editionId = resolvedParams.editionId;
  if (!editionId) {
    notFound();
  }

  const auth = await getSessionFromHeaders(await headers());
  const edition = await assertEditionAdminAccess(editionId, auth);

  const matchRows: MatchRow[] = await db
    .select({
      id: matches.id,
      code: matches.code,
      kickoffAt: matches.kickoffAt,
      createdAt: matches.createdAt,
      groupId: matches.groupId,
      venueId: matches.venueId,
      homeEntryId: matches.homeEntryId,
      awayEntryId: matches.awayEntryId,
      metadata: matches.metadata,
      bracketId: matches.bracketId,
    })
    .from(matches)
    .where(eq(matches.editionId, edition.id));

  const entryRows = await db
    .select({
      entryId: entries.id,
      teamName: teams.name,
    })
    .from(entries)
    .innerJoin(teams, eq(teams.id, entries.teamId))
    .where(eq(entries.editionId, edition.id));

  const entryNameMap = new Map(
    entryRows.map((entry) => [entry.entryId, entry.teamName]),
  );

  const groupIds = Array.from(
    new Set(matchRows.map((row) => row.groupId).filter(Boolean)),
  ) as string[];
  const groupRows = groupIds.length
    ? await db
        .select({ id: groups.id, code: groups.code })
        .from(groups)
        .where(inArray(groups.id, groupIds))
    : [];
  const groupCodeMap = new Map(
    groupRows.map((group) => [group.id, group.code]),
  );

  const venueIds = Array.from(
    new Set(matchRows.map((row) => row.venueId).filter(Boolean)),
  ) as string[];
  const venueRows = venueIds.length
    ? await db
        .select({ id: venues.id, name: venues.name })
        .from(venues)
        .where(inArray(venues.id, venueIds))
    : [];
  const venueNameMap = new Map(
    venueRows.map((venue) => [venue.id, venue.name]),
  );

  const bracketRounds = buildBracketRoundMap(
    matchRows.map((row) => ({
      bracketId: row.bracketId,
      metadata: row.metadata,
    })),
  );

  const matchLabelMap = new Map<string, MatchLabels>();
  for (const row of matchRows) {
    const metadata = parseMatchMetadata(row.metadata);
    const homeLabel = row.homeEntryId
      ? (entryNameMap.get(row.homeEntryId) ?? "Ukjent")
      : (metadata.homeLabel ??
        derivePlaceholderName(metadata.homeSource, bracketRounds) ??
        "TBD");
    const awayLabel = row.awayEntryId
      ? (entryNameMap.get(row.awayEntryId) ?? "Ukjent")
      : (metadata.awayLabel ??
        derivePlaceholderName(metadata.awaySource, bracketRounds) ??
        "TBD");
    const groupCode = row.groupId ? groupCodeMap.get(row.groupId) : null;
    const codeLabel = row.code ?? groupCode ?? "Uten kode";
    const kickoffAt = row.kickoffAt ?? row.createdAt;
    const venueName = row.venueId
      ? (venueNameMap.get(row.venueId) ?? null)
      : null;

    matchLabelMap.set(row.id, {
      id: row.id,
      codeLabel,
      kickoffAt,
      venueName,
      homeName: homeLabel,
      awayName: awayLabel,
    });
  }

  const events: EventRow[] = await db
    .select({
      id: matchEvents.id,
      matchId: matchEvents.matchId,
      teamSide: matchEvents.teamSide,
      eventType: matchEvents.eventType,
      minute: matchEvents.minute,
      stoppageTime: matchEvents.stoppageTime,
      createdAt: matchEvents.createdAt,
      firstName: persons.firstName,
      lastName: persons.lastName,
      jerseyNumber: squadMembers.jerseyNumber,
      membershipMeta: teamMemberships.meta,
    })
    .from(matchEvents)
    .innerJoin(matches, eq(matches.id, matchEvents.matchId))
    .leftJoin(squadMembers, eq(squadMembers.id, matchEvents.relatedMemberId))
    .leftJoin(
      teamMemberships,
      eq(teamMemberships.id, squadMembers.membershipId),
    )
    .leftJoin(persons, eq(persons.id, squadMembers.personId))
    .where(eq(matches.editionId, edition.id))
    .orderBy(desc(matchEvents.createdAt));

  const totals = events.reduce(
    (acc, event) => {
      acc.total += 1;
      if (event.eventType === "goal" || event.eventType === "own_goal") {
        acc.goals += 1;
      }
      if (event.eventType === "penalty_goal") {
        acc.penalties += 1;
      }
      if (event.eventType === "assist") {
        acc.assists += 1;
      }
      if (event.eventType === "yellow_card") {
        acc.yellow += 1;
      }
      if (event.eventType === "red_card") {
        acc.red += 1;
      }
      return acc;
    },
    { total: 0, goals: 0, penalties: 0, assists: 0, yellow: 0, red: 0 },
  );

  return (
    <div className="space-y-8">
      <EditionHeader
        editionId={edition.id}
        pageTitle="Hendelser"
        pageDescription="Full oversikt over mål, kort og assist registrert for utgaven."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Totalt" value={totals.total} />
        <MetricCard label="Mål" value={totals.goals} />
        <MetricCard label="Straffemål" value={totals.penalties} />
        <MetricCard label="Assist" value={totals.assists} />
        <MetricCard label="Gule kort" value={totals.yellow} />
        <MetricCard label="Røde kort" value={totals.red} />
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-foreground">Kamp-hendelser</CardTitle>
          <CardDescription>
            Viser {events.length} registrerte hendelser i denne utgaven.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Ingen hendelser registrert enda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3 text-left text-sm text-muted-foreground">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2">Tidspunkt</th>
                    <th className="px-4 py-2">Kamp</th>
                    <th className="px-4 py-2">Lag</th>
                    <th className="px-4 py-2">Hendelse</th>
                    <th className="px-4 py-2">Spiller</th>
                    <th className="px-4 py-2">Minutt</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const match = matchLabelMap.get(event.matchId);
                    const teamName = match
                      ? event.teamSide === "home"
                        ? match.homeName
                        : match.awayName
                      : event.teamSide === "home"
                        ? "Hjemme"
                        : "Borte";
                    const matchLabel = match
                      ? `${match.codeLabel} · ${match.homeName} – ${match.awayName}`
                      : "Ukjent kamp";
                    const playerName =
                      event.firstName || event.lastName
                        ? formatEventPlayerName(event)
                        : "Ukjent spiller";
                    const minuteLabel = formatMinuteLabel(
                      event.minute,
                      event.stoppageTime,
                    );

                    return (
                      <tr
                        key={event.id}
                        className="align-top rounded-xl border border-border/70 bg-card/60"
                      >
                        <td className="px-4 py-3 text-foreground">
                          {timestampFormatter.format(event.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {matchLabel}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {match
                              ? `${match.venueName ?? "Ukjent arena"} · ${timestampFormatter.format(match.kickoffAt)}`
                              : "Kampinfo mangler"}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {teamName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-foreground">
                            {EVENT_LABELS[event.eventType]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {playerName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {minuteLabel}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: number;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Card className="border-border/70 bg-card/70">
      <CardHeader className="space-y-1">
        <CardDescription className="uppercase tracking-[0.2em] text-xs">
          {label}
        </CardDescription>
        <CardTitle className="text-2xl text-foreground">{value}</CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  );
}

function formatMinuteLabel(minute: number | null, stoppage: number | null) {
  if (minute === null || minute === undefined) {
    return "—";
  }
  if (stoppage && stoppage > 0) {
    return `${minute}+${stoppage}`;
  }
  return `${minute}`;
}

function formatEventPlayerName(event: EventRow) {
  const baseName = `${event.firstName ?? ""} ${event.lastName ?? ""}`.trim();
  const jerseyNumber =
    event.jerseyNumber ?? resolveJerseyNumber(event.membershipMeta);
  if (!baseName) {
    return "Ukjent spiller";
  }
  if (jerseyNumber == null) {
    return baseName;
  }
  return `#${jerseyNumber} ${baseName}`;
}

function resolveJerseyNumber(meta: unknown): number | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return null;
  }

  const value = (meta as Record<string, unknown>).jerseyNumber;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.trunc(value);
}
