import { beforeEach, describe, expect, it } from "vitest";
import { ProblemError } from "@/lib/errors/problem";
import {
  addRosterMember,
  createTeam,
  listTeamRoster,
} from "@/modules/teams/service";
import { db } from "@/server/db/client";
import { persons, teamMemberships, teams } from "@/server/db/schema";

const TEAM_ID = "00000000-0000-0000-0000-000000000611";

beforeEach(async () => {
  await db.delete(teamMemberships);
  await db.delete(persons);
  await db.delete(teams);
});

describe("teams service integration", () => {
  it("creates teams and adds roster members", async () => {
    const team = await createTeam({
      name: "North Stars",
      contactEmail: "CAPTAIN@EXAMPLE.COM",
    });

    expect(team.slug).toBe("north-stars");
    expect(team.contactEmail).toBe("captain@example.com");

    const member = await addRosterMember({
      teamId: team.id,
      person: {
        firstName: "Ida",
        lastName: "Strand",
        preferredName: "Ida S",
        birthDate: "2000-01-01",
        country: "NO",
      },
      role: "player",
    });

    expect(member.membershipId).toBeTruthy();
    expect(member.person.firstName).toBe("Ida");
    expect(member.role).toBe("player");

    const memberships = await db.query.teamMemberships.findMany({
      where: (table, { eq }) => eq(table.teamId, team.id),
    });
    expect(memberships).toHaveLength(1);
  });

  it("lists roster members for a team", async () => {
    await db.insert(teams).values({
      id: TEAM_ID,
      name: "Harbor United",
      slug: "harbor-united",
    });

    await addRosterMember({
      teamId: TEAM_ID,
      person: {
        firstName: "Ola",
        lastName: "Nordmann",
      },
      role: "coach",
    });

    const roster = await listTeamRoster(TEAM_ID);

    expect(roster.team.id).toBe(TEAM_ID);
    expect(roster.members).toHaveLength(1);
    expect(roster.members[0]?.role).toBe("coach");
  });

  it("throws when the team is missing", async () => {
    await expect(
      addRosterMember({
        teamId: "00000000-0000-0000-0000-000000000699",
        person: {
          firstName: "Missing",
          lastName: "Team",
        },
      }),
    ).rejects.toBeInstanceOf(ProblemError);

    await expect(
      listTeamRoster("00000000-0000-0000-0000-000000000699"),
    ).rejects.toBeInstanceOf(ProblemError);
  });
});
