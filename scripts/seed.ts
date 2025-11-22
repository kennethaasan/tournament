import "dotenv/config";

import bcrypt from "bcryptjs";
import { addHours, addMinutes } from "date-fns";
import type { InferSelectModel } from "drizzle-orm";
import { and, eq, inArray } from "drizzle-orm";
import { __internal as competitionInternal } from "@/modules/competitions/service";
import {
  type DrizzleDatabase,
  db,
  shutdown,
  type TransactionClient,
} from "@/server/db/client";
import {
  competitions,
  editionSettings,
  editions,
  entries,
  matchEvents,
  matches,
  persons,
  scoreboardHighlights,
  squadMembers,
  squads,
  stages,
  teamMemberships,
  teams,
  userRoles,
  users,
} from "@/server/db/schema";

type DatabaseExecutor = DrizzleDatabase | TransactionClient;

const COMPETITION = {
  name: "Oslo Cup",
  slug: "oslo-cup",
  defaultTimezone: "Europe/Oslo",
  description:
    "En demonstrasjonsturnering med både publikumsskjermer og administrasjonspanelet aktivert.",
  primaryColor: "#0B1F3A",
  secondaryColor: "#F2F4FF",
};

const EDITIONS = [
  {
    slug: "2025",
    label: "2025",
    status: "published" as const,
    format: "round_robin",
    timezone: "Europe/Oslo",
    scoreboard: {
      rotation: 5,
      theme: {
        primary_color: "#0B1F3A",
        secondary_color: "#F2F4FF",
        background_image_url: null,
      },
    },
  },
  {
    slug: "2026",
    label: "2026 (kladde)",
    status: "draft" as const,
    format: "round_robin",
    timezone: "Europe/Oslo",
    scoreboard: {
      rotation: 6,
      theme: {
        primary_color: "#002F6C",
        secondary_color: "#F9FBFF",
        background_image_url: null,
      },
    },
  },
];

type TeamDefinition = {
  name: string;
  contactEmail: string;
  contactPhone: string;
  players: Array<{
    firstName: string;
    lastName: string;
    birthDate: Date;
    jerseyNumber: number;
    position: string;
  }>;
};

const TEAM_DEFINITIONS: TeamDefinition[] = [
  {
    name: "Oslo Nord",
    contactEmail: "nord@example.com",
    contactPhone: "+47 900 00 001",
    players: [
      {
        firstName: "Mats",
        lastName: "Berg",
        birthDate: new Date("1996-01-12"),
        jerseyNumber: 9,
        position: "forward",
      },
      {
        firstName: "Eirik",
        lastName: "Haugen",
        birthDate: new Date("1995-04-02"),
        jerseyNumber: 4,
        position: "defender",
      },
      {
        firstName: "Jonas",
        lastName: "Lund",
        birthDate: new Date("1998-08-25"),
        jerseyNumber: 1,
        position: "keeper",
      },
    ],
  },
  {
    name: "Oslo Sør",
    contactEmail: "sor@example.com",
    contactPhone: "+47 900 00 002",
    players: [
      {
        firstName: "Lars",
        lastName: "Haug",
        birthDate: new Date("1997-02-04"),
        jerseyNumber: 10,
        position: "forward",
      },
      {
        firstName: "Martin",
        lastName: "Solberg",
        birthDate: new Date("1994-11-30"),
        jerseyNumber: 6,
        position: "midfielder",
      },
    ],
  },
  {
    name: "Bergen Blå",
    contactEmail: "bergen@example.com",
    contactPhone: "+47 900 00 003",
    players: [
      {
        firstName: "Even",
        lastName: "Midttun",
        birthDate: new Date("1993-07-18"),
        jerseyNumber: 11,
        position: "forward",
      },
      {
        firstName: "Kjetil",
        lastName: "Aas",
        birthDate: new Date("1992-05-22"),
        jerseyNumber: 5,
        position: "defender",
      },
    ],
  },
  {
    name: "Trondheim Lyn",
    contactEmail: "lyn@example.com",
    contactPhone: "+47 900 00 004",
    players: [
      {
        firstName: "Håkon",
        lastName: "Sunde",
        birthDate: new Date("1995-12-02"),
        jerseyNumber: 7,
        position: "forward",
      },
      {
        firstName: "Steffen",
        lastName: "Myhre",
        birthDate: new Date("1991-09-09"),
        jerseyNumber: 2,
        position: "defender",
      },
    ],
  },
];

const MATCH_PLAN = [
  {
    code: "seed-match-1",
    homeSlug: "oslo-nord",
    awaySlug: "oslo-s-r",
    status: "in_progress",
    kickoffOffset: -20,
    homeScore: 2,
    awayScore: 1,
  },
  {
    code: "seed-match-2",
    homeSlug: "bergen-bl",
    awaySlug: "trondheim-lyn",
    status: "scheduled",
    kickoffOffset: 30,
    homeScore: 0,
    awayScore: 0,
  },
  {
    code: "seed-match-3",
    homeSlug: "oslo-nord",
    awaySlug: "bergen-bl",
    status: "finalized",
    kickoffOffset: -180,
    homeScore: 3,
    awayScore: 2,
  },
];

const MATCH_EVENTS = [
  {
    matchCode: "seed-match-1",
    playerKey: "oslo-nord:9",
    type: "goal",
    minute: 8,
  },
  {
    matchCode: "seed-match-1",
    playerKey: "oslo-s-r:10",
    type: "goal",
    minute: 38,
  },
  {
    matchCode: "seed-match-3",
    playerKey: "oslo-nord:9",
    type: "goal",
    minute: 14,
  },
  {
    matchCode: "seed-match-3",
    playerKey: "oslo-nord:9",
    type: "assist",
    minute: 60,
  },
  {
    matchCode: "seed-match-3",
    playerKey: "bergen-bl:11",
    type: "goal",
    minute: 75,
  },
];

const DEMO_USERS = [
  {
    email: "admin@example.com",
    fullName: "Global Admin",
    role: "global_admin",
    scopeType: "global" as const,
    scopeSlug: null,
  },
  {
    email: "edition-admin@example.com",
    fullName: "Konkurranseansvarlig",
    role: "competition_admin",
    scopeType: "competition" as const,
    scopeSlug: COMPETITION.slug,
  },
  {
    email: "lagleder@example.com",
    fullName: "Lagleder Oslo Nord",
    role: "team_manager",
    scopeType: "team" as const,
    scopeSlug: "oslo-nord",
  },
] as const;

type SeededTeam = InferSelectModel<typeof teams>;
type SeededCompetition = InferSelectModel<typeof competitions>;
type SeededEdition = InferSelectModel<typeof editions>;
type SeededEntry = InferSelectModel<typeof entries>;
type SeededSquad = InferSelectModel<typeof squads>;
type SeededMatch = InferSelectModel<typeof matches>;

type EntryDirectory = Map<string, { entry: SeededEntry; team: SeededTeam }>;
type SquadDirectory = Map<string, { squad: SeededSquad; entry: SeededEntry }>;
type PlayerDirectory = Map<
  string,
  { squadMemberId: string; entryId: string; teamSlug: string }
>;

async function main() {
  try {
    const summary = await db.transaction(async (tx) => seedDatabase(tx));
    process.stdout.write(
      `Seed complete: ${summary.teamCount} lag, ${summary.matchCount} kamper, ` +
        `kontoer for ${summary.userCount} demo-brukere.\n`,
    );
  } catch (error) {
    process.stderr.write(
      `Seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  } finally {
    await shutdown();
  }
}

async function seedDatabase(client: DatabaseExecutor) {
  const competition = await upsertCompetition(client);
  const editions = await upsertEditions(client, competition.id);
  const stage = await ensureGroupStage(client, editions.published.id);

  const seededTeams = await upsertTeams(client);
  const entryDirectory = await upsertEntries(
    client,
    editions.published.id,
    seededTeams,
  );
  const squadDirectory = await ensureSquads(client, entryDirectory);
  const playerDirectory = await seedSquads(client, squadDirectory);

  const matchesSeeded = await seedMatches(
    client,
    stage.id,
    editions.published.id,
    entryDirectory,
  );
  await seedMatchEvents(client, matchesSeeded, playerDirectory);

  await seedHighlight(client, editions.published.id);
  await seedUsers(client, competition, seededTeams);

  return {
    teamCount: seededTeams.length,
    matchCount: matchesSeeded.length,
    userCount: DEMO_USERS.length,
  };
}

async function upsertCompetition(client: DatabaseExecutor) {
  const [row] = await client
    .insert(competitions)
    .values({
      name: COMPETITION.name,
      slug: COMPETITION.slug,
      defaultTimezone: COMPETITION.defaultTimezone,
      description: COMPETITION.description,
      primaryColor: COMPETITION.primaryColor,
      secondaryColor: COMPETITION.secondaryColor,
    })
    .onConflictDoUpdate({
      target: competitions.slug,
      set: {
        name: COMPETITION.name,
        defaultTimezone: COMPETITION.defaultTimezone,
        description: COMPETITION.description,
        primaryColor: COMPETITION.primaryColor,
        secondaryColor: COMPETITION.secondaryColor,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!row) {
    throw new Error("Kunne ikke opprette konkurranse");
  }

  return row;
}

async function upsertEditions(client: DatabaseExecutor, competitionId: string) {
  const now = new Date();
  const results: Partial<Record<"published" | "draft", SeededEdition>> = {};

  for (const editionConfig of EDITIONS) {
    const [edition] = await client
      .insert(editions)
      .values({
        competitionId,
        label: editionConfig.label,
        slug: editionConfig.slug,
        format: editionConfig.format,
        timezone: editionConfig.timezone,
        status: editionConfig.status,
        registrationOpensAt: addHours(now, -96),
        registrationClosesAt: addHours(now, 96),
      })
      .onConflictDoUpdate({
        target: [editions.competitionId, editions.slug],
        set: {
          label: editionConfig.label,
          format: editionConfig.format,
          timezone: editionConfig.timezone,
          status: editionConfig.status,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!edition) {
      throw new Error(`Kunne ikke opprette utgave ${editionConfig.slug}`);
    }

    await client
      .insert(editionSettings)
      .values({
        editionId: edition.id,
        scoreboardRotationSeconds: editionConfig.scoreboard.rotation,
        scoreboardTheme: editionConfig.scoreboard.theme,
      })
      .onConflictDoUpdate({
        target: editionSettings.editionId,
        set: {
          scoreboardRotationSeconds: editionConfig.scoreboard.rotation,
          scoreboardTheme: editionConfig.scoreboard.theme,
          updatedAt: new Date(),
        },
      });

    if (editionConfig.status === "published") {
      results.published = edition;
    } else {
      results.draft = edition;
    }
  }

  if (!results.published || !results.draft) {
    throw new Error("Utgaver mangler etter seeding");
  }

  return {
    published: results.published,
    draft: results.draft,
  };
}

async function ensureGroupStage(client: DatabaseExecutor, editionId: string) {
  const existing = await client.query.stages.findFirst({
    where: (table, { and: andFn, eq: equals }) =>
      andFn(equals(table.editionId, editionId), equals(table.orderIndex, 1)),
  });

  if (existing) {
    return existing;
  }

  const [stage] = await client
    .insert(stages)
    .values({
      editionId,
      name: "Gruppespill",
      stageType: "group",
      orderIndex: 1,
    })
    .returning();

  if (!stage) {
    throw new Error("Kunne ikke opprette gruppespill");
  }

  return stage;
}

async function upsertTeams(client: DatabaseExecutor) {
  const seeded: SeededTeam[] = [];

  for (const definition of TEAM_DEFINITIONS) {
    const slug = competitionInternal.normalizeSlug(definition.name);
    const [team] = await client
      .insert(teams)
      .values({
        name: definition.name,
        slug,
        contactEmail: definition.contactEmail,
        contactPhone: definition.contactPhone,
      })
      .onConflictDoUpdate({
        target: teams.slug,
        set: {
          name: definition.name,
          contactEmail: definition.contactEmail,
          contactPhone: definition.contactPhone,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!team) {
      throw new Error(`Kunne ikke opprette laget ${definition.name}`);
    }

    seeded.push(team);
  }

  return seeded;
}

async function upsertEntries(
  client: DatabaseExecutor,
  editionId: string,
  teamsSeeded: SeededTeam[],
) {
  const directory: EntryDirectory = new Map();

  for (const team of teamsSeeded) {
    const [entry] = await client
      .insert(entries)
      .values({
        editionId,
        teamId: team.id,
        status: "approved",
        submittedAt: new Date(),
        approvedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [entries.editionId, entries.teamId],
        set: {
          status: "approved",
          submittedAt: new Date(),
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!entry) {
      throw new Error(`Kunne ikke opprette deltaker for ${team.name}`);
    }

    directory.set(team.slug, { entry, team });
  }

  return directory;
}

async function ensureSquads(client: DatabaseExecutor, entries: EntryDirectory) {
  const squadsDirectory: SquadDirectory = new Map();

  for (const [teamSlug, record] of entries.entries()) {
    const [squad] = await client
      .insert(squads)
      .values({
        entryId: record.entry.id,
      })
      .onConflictDoUpdate({
        target: squads.entryId,
        set: {
          updatedAt: new Date(),
        },
      })
      .returning();

    const squadRecord =
      squad ??
      (await client.query.squads.findFirst({
        where: (table, { eq: equals }) =>
          equals(table.entryId, record.entry.id),
      }));

    if (!squadRecord) {
      throw new Error(`Kunne ikke opprette tropp for ${teamSlug}`);
    }

    squadsDirectory.set(teamSlug, { squad: squadRecord, entry: record.entry });
    await client
      .delete(squadMembers)
      .where(eq(squadMembers.squadId, squadRecord.id));
  }

  return squadsDirectory;
}

async function seedSquads(
  client: DatabaseExecutor,
  squadsDirectory: SquadDirectory,
) {
  const directory: PlayerDirectory = new Map();

  for (const definition of TEAM_DEFINITIONS) {
    const slug = competitionInternal.normalizeSlug(definition.name);
    const squadRecord = squadsDirectory.get(slug);
    if (!squadRecord) {
      continue;
    }

    for (const player of definition.players) {
      const person = await upsertPerson(client, player);
      const membership = await upsertMembership(
        client,
        person.id,
        squadRecord.entry.teamId,
      );

      const [member] = await client
        .insert(squadMembers)
        .values({
          squadId: squadRecord.squad.id,
          personId: person.id,
          membershipId: membership.id,
          jerseyNumber: player.jerseyNumber,
          position: player.position,
        })
        .returning();

      if (!member) {
        throw new Error(
          `Kunne ikke legge til ${player.firstName} ${player.lastName}`,
        );
      }

      const key = `${slug}:${player.jerseyNumber}`;
      directory.set(key, {
        squadMemberId: member.id,
        entryId: squadRecord.entry.id,
        teamSlug: slug,
      });
    }
  }

  return directory;
}

async function upsertPerson(
  client: DatabaseExecutor,
  player: TeamDefinition["players"][number],
) {
  const [created] = await client
    .insert(persons)
    .values({
      firstName: player.firstName,
      lastName: player.lastName,
      preferredName: null,
      birthDate: player.birthDate,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  const existing = await client.query.persons.findFirst({
    where: (table, { and: andFn, eq: equals }) =>
      andFn(
        equals(table.firstName, player.firstName),
        equals(table.lastName, player.lastName),
        equals(table.birthDate, player.birthDate),
      ),
  });

  if (!existing) {
    throw new Error(
      `Kunne ikke finne spiller ${player.firstName} ${player.lastName}`,
    );
  }

  return existing;
}

async function upsertMembership(
  client: DatabaseExecutor,
  personId: string,
  teamId: string,
) {
  await client
    .delete(teamMemberships)
    .where(
      and(
        eq(teamMemberships.teamId, teamId),
        eq(teamMemberships.personId, personId),
      ),
    );

  const [membership] = await client
    .insert(teamMemberships)
    .values({
      teamId,
      personId,
      role: "player",
      status: "active",
      joinedAt: new Date(),
    })
    .returning();

  if (!membership) {
    throw new Error("Kunne ikke opprette medlem");
  }

  return membership;
}

async function seedMatches(
  client: DatabaseExecutor,
  stageId: string,
  editionId: string,
  entries: EntryDirectory,
) {
  const now = new Date();
  const matchesSeeded: SeededMatch[] = [];

  for (const plan of MATCH_PLAN) {
    const home = entries.get(plan.homeSlug);
    const away = entries.get(plan.awaySlug);

    if (!home || !away) {
      throw new Error(
        `Mangler deltaker for ${plan.homeSlug} eller ${plan.awaySlug}`,
      );
    }

    await client.delete(matches).where(eq(matches.code, plan.code));

    const [match] = await client
      .insert(matches)
      .values({
        editionId,
        stageId,
        homeEntryId: home.entry.id,
        awayEntryId: away.entry.id,
        code: plan.code,
        kickoffAt: addMinutes(now, plan.kickoffOffset),
        status: plan.status as SeededMatch["status"],
        homeScore: plan.homeScore,
        awayScore: plan.awayScore,
      })
      .returning();

    if (!match) {
      throw new Error(`Kunne ikke opprette kamp ${plan.code}`);
    }

    matchesSeeded.push(match);
  }

  return matchesSeeded;
}

async function seedMatchEvents(
  client: DatabaseExecutor,
  matchesSeeded: SeededMatch[],
  players: PlayerDirectory,
) {
  const matchByCode = new Map(
    matchesSeeded.map((match) => [match.code ?? "", match]),
  );
  const matchIds = matchesSeeded.map((match) => match.id);

  if (matchIds.length) {
    await client
      .delete(matchEvents)
      .where(inArray(matchEvents.matchId, matchIds));
  }

  for (const plan of MATCH_EVENTS) {
    const match = matchByCode.get(plan.matchCode);
    const player = players.get(plan.playerKey);

    if (!match || !player) {
      continue;
    }

    await client.insert(matchEvents).values({
      matchId: match.id,
      relatedMemberId: player.squadMemberId,
      teamSide:
        match.homeEntryId === player.entryId
          ? "home"
          : match.awayEntryId === player.entryId
            ? "away"
            : "home",
      eventType: plan.type as InferSelectModel<typeof matchEvents>["eventType"],
      minute: plan.minute,
    });
  }
}

async function seedHighlight(client: DatabaseExecutor, editionId: string) {
  await client
    .delete(scoreboardHighlights)
    .where(eq(scoreboardHighlights.editionId, editionId));

  await client.insert(scoreboardHighlights).values({
    editionId,
    message: "Finaleavgjørelse pågår – følg med på storskjermen!",
    durationSeconds: 120,
    expiresAt: addMinutes(new Date(), 15),
  });
}

async function seedUsers(
  client: DatabaseExecutor,
  competition: SeededCompetition,
  teamsSeeded: SeededTeam[],
) {
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const teamBySlug = new Map(teamsSeeded.map((team) => [team.slug, team]));

  for (const userDefinition of DEMO_USERS) {
    const [created] = await client
      .insert(users)
      .values({
        email: userDefinition.email,
        fullName: userDefinition.fullName,
        hashedPassword: passwordHash,
        locale: "nb-NO",
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          fullName: userDefinition.fullName,
          hashedPassword: passwordHash,
          updatedAt: new Date(),
        },
      })
      .returning();

    const user =
      created ??
      (await client.query.users.findFirst({
        where: (table, { eq: equals }) =>
          equals(table.email, userDefinition.email),
      }));

    if (!user) {
      throw new Error(`Kunne ikke opprette bruker ${userDefinition.email}`);
    }

    await client.delete(userRoles).where(eq(userRoles.userId, user.id));
    await client.insert(userRoles).values({
      userId: user.id,
      role: userDefinition.role,
      scopeType: userDefinition.scopeType,
      scopeId: resolveScopeId(userDefinition, competition, teamBySlug),
    });
  }
}

function resolveScopeId(
  userDefinition: (typeof DEMO_USERS)[number],
  competition: SeededCompetition,
  teamBySlug: Map<string, SeededTeam>,
) {
  if (userDefinition.scopeType === "global") {
    return null;
  }

  if (userDefinition.scopeType === "competition") {
    return competition.id;
  }

  if (userDefinition.scopeType === "team" && userDefinition.scopeSlug) {
    const team = teamBySlug.get(userDefinition.scopeSlug);
    if (!team) {
      throw new Error(`Fant ikke lag for ${userDefinition.scopeSlug}`);
    }
    return team.id;
  }

  return null;
}

void main();
