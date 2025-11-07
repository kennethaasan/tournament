import { and, eq } from "drizzle-orm";
import { createProblem } from "@/lib/errors/problem";
import { __internal as competitionsInternal } from "@/modules/competitions/service";
import { db, withTransaction } from "@/server/db/client";
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

export type CreatePersonInput = {
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  birthDate?: string | Date | null;
  country?: string | null;
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

export async function createTeam(input: CreateTeamInput): Promise<Team> {
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
      title: "Teamet kunne ikke opprettes",
      status: 500,
      detail: "Prøv igjen, så skal vi forsøke å opprette laget på nytt.",
    });
  }

  return team;
}

export async function addRosterMember(options: {
  teamId: string;
  person: CreatePersonInput;
  role?: TeamMembership["role"];
}): Promise<RosterMember> {
  const result = await withTransaction(async (tx) => {
    const team = await tx.query.teams.findFirst({
      where: eq(teams.id, options.teamId),
    });

    if (!team) {
      throw createProblem({
        type: "https://tournament.app/problems/team-not-found",
        title: "Teamet ble ikke funnet",
        status: 404,
        detail: "Sjekk at du bruker riktig team-ID.",
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
        title: "Personen kunne ikke opprettes",
        status: 500,
        detail: "Prøv igjen, så skal vi forsøke å lagre spilleren.",
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
        title: "Medlemskapet kunne ikke opprettes",
        status: 500,
        detail: "Prøv igjen, så skal vi forsøke å koble personen til laget.",
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

export async function listTeamRoster(teamId: string): Promise<TeamRoster> {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });

  if (!team) {
    throw createProblem({
      type: "https://tournament.app/problems/team-not-found",
      title: "Teamet ble ikke funnet",
      status: 404,
      detail: "Sjekk at du bruker riktig team-ID.",
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

export async function deactivateMembership(options: {
  teamId: string;
  membershipId: string;
}): Promise<void> {
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
