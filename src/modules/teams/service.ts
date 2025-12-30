import { and, eq } from "drizzle-orm";
import { createProblem } from "@/lib/errors/problem";
import { __internal as competitionsInternal } from "@/modules/competitions/service";
import {
  type DrizzleDatabase,
  db as defaultDb,
  withTransaction as defaultWithTransaction,
  type TransactionClient,
} from "@/server/db/client";
import {
  type Person,
  persons,
  type Team,
  type TeamMembership,
  teamMemberships,
  teams,
} from "@/server/db/schema";

export type CreateTeamInput = {
  name: string;
  slug?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type UpdateTeamInput = {
  name?: string;
  slug?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export type CreatePersonInput = {
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  birthDate?: string | Date | null;
  country?: string | null;
};

export type UpdateTeamMemberInput = {
  firstName?: string;
  lastName?: string;
  preferredName?: string | null;
  country?: string | null;
  role?: TeamMembership["role"];
};

export type RosterMember = {
  membershipId: string;
  person: Person;
  role: TeamMembership["role"];
  status: TeamMembership["status"];
  joinedAt: Date | null;
  leftAt: Date | null;
};

export type TeamRoster = {
  team: Team;
  members: RosterMember[];
};

/**
 * Service dependencies for team operations.
 * Defaults to the production database client if not provided.
 */
export type TeamServiceDeps = {
  db?: DrizzleDatabase | TransactionClient;
  withTransaction?: typeof defaultWithTransaction;
};

export async function createTeam(
  input: CreateTeamInput,
  deps: TeamServiceDeps = {},
): Promise<Team> {
  const db = deps.db ?? defaultDb;
  const slug = competitionsInternal.normalizeSlug(input.slug ?? input.name);

  const [team] = await db
    .insert(teams)
    .values({
      name: input.name.trim(),
      slug,
      contactEmail: input.contactEmail?.trim().toLowerCase() ?? null,
      contactPhone: input.contactPhone?.trim() ?? null,
    })
    .returning();

  if (!team) {
    throw createProblem({
      type: "https://tournament.app/problems/team-not-created",
      title: "Team could not be created",
      status: 500,
      detail: "Please try again.",
    });
  }

  return team;
}

export async function addRosterMember(
  options: {
    teamId: string;
    person: CreatePersonInput;
    role?: TeamMembership["role"];
  },
  deps: TeamServiceDeps = {},
): Promise<RosterMember> {
  const withTransaction = deps.withTransaction ?? defaultWithTransaction;

  const result = await withTransaction(async (tx) => {
    const team = await tx.query.teams.findFirst({
      where: eq(teams.id, options.teamId),
    });

    if (!team) {
      throw createProblem({
        type: "https://tournament.app/problems/team-not-found",
        title: "Team not found",
        status: 404,
        detail: "Verify that you are using the correct team ID.",
      });
    }

    const personRecord = await tx
      .insert(persons)
      .values({
        firstName: options.person.firstName.trim(),
        lastName: options.person.lastName.trim(),
        preferredName: options.person.preferredName?.trim() || null,
        birthDate: options.person.birthDate
          ? new Date(options.person.birthDate)
          : null,
        country: options.person.country?.trim() || null,
      })
      .returning();

    const person = personRecord[0];
    if (!person) {
      throw createProblem({
        type: "https://tournament.app/problems/person-not-created",
        title: "Person could not be created",
        status: 500,
        detail: "Please try again.",
      });
    }

    const membershipRecord = await tx
      .insert(teamMemberships)
      .values({
        teamId: team.id,
        personId: person.id,
        role: options.role ?? "player",
      })
      .returning();

    const membership = membershipRecord[0];
    if (!membership) {
      throw createProblem({
        type: "https://tournament.app/problems/membership-not-created",
        title: "Membership could not be created",
        status: 500,
        detail: "Please try again.",
      });
    }

    return { person, membership };
  });

  return {
    membershipId: result.membership.id,
    person: result.person,
    role: result.membership.role,
    status: result.membership.status,
    joinedAt: result.membership.joinedAt ?? null,
    leftAt: result.membership.leftAt ?? null,
  };
}

export async function listTeamRoster(
  teamId: string,
  deps: TeamServiceDeps = {},
): Promise<TeamRoster> {
  const db = deps.db ?? defaultDb;

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!team) {
    throw createProblem({
      type: "https://tournament.app/problems/team-not-found",
      title: "Team not found",
      status: 404,
      detail: "Verify that you are using the correct team ID.",
    });
  }

  const memberships = await db
    .select({
      membership: teamMemberships,
      person: persons,
    })
    .from(teamMemberships)
    .where(eq(teamMemberships.teamId, teamId))
    .innerJoin(persons, eq(teamMemberships.personId, persons.id));

  return {
    team,
    members: memberships.map(({ membership, person }) => ({
      membershipId: membership.id,
      person,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joinedAt ?? null,
      leftAt: membership.leftAt ?? null,
    })),
  };
}

export async function deactivateMembership(
  options: {
    teamId: string;
    membershipId: string;
  },
  deps: TeamServiceDeps = {},
): Promise<void> {
  const db = deps.db ?? defaultDb;

  await db
    .update(teamMemberships)
    .set({
      status: "inactive",
      leftAt: new Date(),
    })
    .where(
      and(
        eq(teamMemberships.id, options.membershipId),
        eq(teamMemberships.teamId, options.teamId),
      ),
    );
}

export async function updateTeam(
  teamId: string,
  input: UpdateTeamInput,
  deps: TeamServiceDeps = {},
): Promise<Team> {
  const db = deps.db ?? defaultDb;

  const existingTeam = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!existingTeam) {
    throw createProblem({
      type: "https://tournament.app/problems/team-not-found",
      title: "Team not found",
      status: 404,
      detail: "Verify that you are using the correct team ID.",
    });
  }

  const updates: Partial<Team> = {};

  if (input.name !== undefined) {
    updates.name = input.name.trim();
  }

  if (input.slug !== undefined) {
    updates.slug = input.slug
      ? competitionsInternal.normalizeSlug(input.slug)
      : competitionsInternal.normalizeSlug(input.name ?? existingTeam.name);
  } else if (input.name !== undefined) {
    // Auto-update slug when name changes but slug not explicitly provided
    updates.slug = competitionsInternal.normalizeSlug(input.name);
  }

  if (input.contactEmail !== undefined) {
    updates.contactEmail = input.contactEmail?.trim().toLowerCase() ?? null;
  }

  if (input.contactPhone !== undefined) {
    updates.contactPhone = input.contactPhone?.trim() ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return existingTeam;
  }

  const [updatedTeam] = await db
    .update(teams)
    .set(updates)
    .where(eq(teams.id, teamId))
    .returning();

  if (!updatedTeam) {
    throw createProblem({
      type: "https://tournament.app/problems/team-update-failed",
      title: "Team update failed",
      status: 500,
      detail: "Please try again.",
    });
  }

  return updatedTeam;
}

export async function updateTeamMember(
  options: {
    teamId: string;
    membershipId: string;
    updates: UpdateTeamMemberInput;
  },
  deps: TeamServiceDeps = {},
): Promise<RosterMember> {
  const withTransaction = deps.withTransaction ?? defaultWithTransaction;

  return await withTransaction(async (tx) => {
    // Find membership with person
    const membershipRows = await tx
      .select({
        membership: teamMemberships,
        person: persons,
      })
      .from(teamMemberships)
      .innerJoin(persons, eq(teamMemberships.personId, persons.id))
      .where(
        and(
          eq(teamMemberships.id, options.membershipId),
          eq(teamMemberships.teamId, options.teamId),
        ),
      )
      .limit(1);

    const row = membershipRows[0];
    if (!row) {
      throw createProblem({
        type: "https://tournament.app/problems/membership-not-found",
        title: "Team member not found",
        status: 404,
        detail: "The team member you are trying to update does not exist.",
      });
    }

    // Update person fields if provided
    const personUpdates: Partial<Person> = {};
    if (options.updates.firstName !== undefined) {
      personUpdates.firstName = options.updates.firstName.trim();
    }
    if (options.updates.lastName !== undefined) {
      personUpdates.lastName = options.updates.lastName.trim();
    }
    if (options.updates.preferredName !== undefined) {
      personUpdates.preferredName =
        options.updates.preferredName?.trim() || null;
    }
    if (options.updates.country !== undefined) {
      personUpdates.country = options.updates.country?.trim() || null;
    }

    let updatedPerson = row.person;
    if (Object.keys(personUpdates).length > 0) {
      const [updated] = await tx
        .update(persons)
        .set(personUpdates)
        .where(eq(persons.id, row.person.id))
        .returning();
      if (updated) {
        updatedPerson = updated;
      }
    }

    // Update membership role if provided
    let updatedMembership = row.membership;
    if (options.updates.role !== undefined) {
      const [updated] = await tx
        .update(teamMemberships)
        .set({ role: options.updates.role })
        .where(eq(teamMemberships.id, options.membershipId))
        .returning();
      if (updated) {
        updatedMembership = updated;
      }
    }

    return {
      membershipId: updatedMembership.id,
      person: updatedPerson,
      role: updatedMembership.role,
      status: updatedMembership.status,
      joinedAt: updatedMembership.joinedAt ?? null,
      leftAt: updatedMembership.leftAt ?? null,
    };
  });
}

export async function removeTeamMember(
  options: {
    teamId: string;
    membershipId: string;
  },
  deps: TeamServiceDeps = {},
): Promise<void> {
  const db = deps.db ?? defaultDb;

  // First verify the membership exists and belongs to this team
  const membership = await db.query.teamMemberships.findFirst({
    where: and(
      eq(teamMemberships.id, options.membershipId),
      eq(teamMemberships.teamId, options.teamId),
    ),
  });

  if (!membership) {
    throw createProblem({
      type: "https://tournament.app/problems/membership-not-found",
      title: "Team member not found",
      status: 404,
      detail: "The team member you are trying to remove does not exist.",
    });
  }

  // Soft delete by setting status to inactive
  await db
    .update(teamMemberships)
    .set({
      status: "inactive",
      leftAt: new Date(),
    })
    .where(eq(teamMemberships.id, options.membershipId));
}
