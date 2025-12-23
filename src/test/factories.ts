import { v7 as uuidv7 } from "uuid";
import type {
  Competition,
  Edition,
  EditionSetting,
  Entry,
  Person,
  Squad,
  SquadMember,
  Team,
  TeamMembership,
  User,
} from "@/server/db/schema";

/**
 * Test factories for creating domain entities with sensible defaults.
 * All factories accept optional overrides to customize specific fields.
 *
 * @example
 * ```ts
 * const user = createTestUser({ email: "custom@example.com" });
 * const team = createTestTeam({ name: "FC Barcelona" });
 * ```
 */

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

// ============================================================================
// Auth Entities
// ============================================================================

export function createTestUser(overrides?: Partial<User>): User {
  const suffix = uniqueSuffix();
  return {
    id: uuidv7(),
    email: `test-user-${suffix}@example.com`,
    emailVerified: true,
    hashedPassword: null,
    fullName: `Test User ${suffix}`,
    locale: "nb-NO",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export type TestAuthContext = {
  user: User & {
    roles: Array<{
      role: "global_admin" | "competition_admin" | "team_manager";
      scopeType: "global" | "competition" | "team";
      scopeId: string | null;
    }>;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress: string;
    userAgent: string;
  };
};

export function createTestAuthContext(
  overrides?: Partial<TestAuthContext> & {
    roles?: TestAuthContext["user"]["roles"];
  },
): TestAuthContext {
  const user = createTestUser(overrides?.user);
  return {
    user: {
      ...user,
      roles: overrides?.roles ?? [],
    },
    session: {
      id: uuidv7(),
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      token: `test-token-${uniqueSuffix()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      ...overrides?.session,
    },
  };
}

export function createGlobalAdminContext(
  overrides?: Partial<TestAuthContext>,
): TestAuthContext {
  return createTestAuthContext({
    ...overrides,
    roles: [{ role: "global_admin", scopeType: "global", scopeId: null }],
  });
}

export function createCompetitionAdminContext(
  competitionId: string,
  overrides?: Partial<TestAuthContext>,
): TestAuthContext {
  return createTestAuthContext({
    ...overrides,
    roles: [
      {
        role: "competition_admin",
        scopeType: "competition",
        scopeId: competitionId,
      },
    ],
  });
}

export function createTeamManagerContext(
  teamId: string,
  overrides?: Partial<TestAuthContext>,
): TestAuthContext {
  return createTestAuthContext({
    ...overrides,
    roles: [{ role: "team_manager", scopeType: "team", scopeId: teamId }],
  });
}

// ============================================================================
// Competition Entities
// ============================================================================

export function createTestCompetition(
  overrides?: Partial<Competition>,
): Competition {
  const suffix = uniqueSuffix();
  return {
    id: uuidv7(),
    name: `Test Competition ${suffix}`,
    slug: `test-competition-${suffix}`,
    defaultTimezone: "Europe/Oslo",
    description: null,
    primaryColor: "#0B1F3A",
    secondaryColor: "#FFFFFF",
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestEdition(
  competitionId: string,
  overrides?: Partial<Edition>,
): Edition {
  const suffix = uniqueSuffix();
  return {
    id: uuidv7(),
    competitionId,
    label: `2025 Season ${suffix}`,
    slug: `2025-${suffix}`,
    format: "round_robin",
    timezone: "Europe/Oslo",
    status: "draft",
    registrationOpensAt: new Date(),
    registrationClosesAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    contactEmail: null,
    contactPhone: null,
    primaryVenueId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestEditionSettings(
  editionId: string,
  overrides?: Partial<EditionSetting>,
): EditionSetting {
  return {
    editionId,
    scoreboardTheme: {
      primary_color: "#0B1F3A",
      secondary_color: "#FFFFFF",
      background_image_url: null,
    },
    scoreboardRotationSeconds: 5,
    registrationRequirements: {
      scoreboard_modules: [
        "live_matches",
        "upcoming",
        "standings",
        "top_scorers",
      ],
      entries_locked_at: null,
    },
    rulesetNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Team Entities
// ============================================================================

export function createTestTeam(overrides?: Partial<Team>): Team {
  const suffix = uniqueSuffix();
  return {
    id: uuidv7(),
    name: `Test Team ${suffix}`,
    slug: `test-team-${suffix}`,
    contactEmail: null,
    contactPhone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestPerson(overrides?: Partial<Person>): Person {
  const suffix = uniqueSuffix();
  return {
    id: uuidv7(),
    firstName: `First${suffix}`,
    lastName: `Last${suffix}`,
    preferredName: null,
    birthDate: new Date("2000-01-01"),
    country: "NO",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestTeamMembership(
  teamId: string,
  personId: string,
  overrides?: Partial<TeamMembership>,
): TeamMembership {
  return {
    id: uuidv7(),
    teamId,
    personId,
    role: "player",
    status: "active",
    joinedAt: new Date(),
    leftAt: null,
    meta: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Entry Entities
// ============================================================================

export function createTestEntry(
  editionId: string,
  teamId: string,
  overrides?: Partial<Entry>,
): Entry {
  return {
    id: uuidv7(),
    editionId,
    teamId,
    status: "pending",
    submittedAt: new Date(),
    approvedAt: null,
    rejectedAt: null,
    notes: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestSquad(
  entryId: string,
  overrides?: Partial<Squad>,
): Squad {
  return {
    id: uuidv7(),
    entryId,
    lockedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestSquadMember(
  squadId: string,
  personId: string,
  overrides?: Partial<SquadMember>,
): SquadMember {
  return {
    id: uuidv7(),
    squadId,
    personId,
    membershipId: null,
    jerseyNumber: null,
    position: null,
    availability: "available",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Composite Factories
// ============================================================================

/**
 * Creates a full competition setup with an edition and settings.
 */
export function createTestCompetitionWithEdition(overrides?: {
  competition?: Partial<Competition>;
  edition?: Partial<Edition>;
  settings?: Partial<EditionSetting>;
}): {
  competition: Competition;
  edition: Edition;
  settings: EditionSetting;
} {
  const competition = createTestCompetition(overrides?.competition);
  const edition = createTestEdition(competition.id, overrides?.edition);
  const settings = createTestEditionSettings(edition.id, overrides?.settings);
  return { competition, edition, settings };
}

/**
 * Creates a team with a roster of players.
 */
export function createTestTeamWithRoster(
  playerCount = 11,
  overrides?: {
    team?: Partial<Team>;
  },
): {
  team: Team;
  persons: Person[];
  memberships: TeamMembership[];
} {
  const team = createTestTeam(overrides?.team);
  const persons: Person[] = [];
  const memberships: TeamMembership[] = [];

  for (let i = 0; i < playerCount; i++) {
    const person = createTestPerson({
      firstName: `Player${i + 1}`,
      lastName: team.name.replace(/\s/g, ""),
    });
    persons.push(person);
    memberships.push(createTestTeamMembership(team.id, person.id));
  }

  return { team, persons, memberships };
}

/**
 * Creates a full entry setup with a squad and members.
 */
export function createTestEntryWithSquad(
  editionId: string,
  teamId: string,
  playerCount = 11,
  overrides?: {
    entry?: Partial<Entry>;
    squad?: Partial<Squad>;
  },
): {
  entry: Entry;
  squad: Squad;
  persons: Person[];
  squadMembers: SquadMember[];
} {
  const entry = createTestEntry(editionId, teamId, overrides?.entry);
  const squad = createTestSquad(entry.id, overrides?.squad);
  const persons: Person[] = [];
  const squadMembers: SquadMember[] = [];

  for (let i = 0; i < playerCount; i++) {
    const person = createTestPerson({
      firstName: `Player${i + 1}`,
    });
    persons.push(person);
    squadMembers.push(
      createTestSquadMember(squad.id, person.id, {
        jerseyNumber: i + 1,
      }),
    );
  }

  return { entry, squad, persons, squadMembers };
}
