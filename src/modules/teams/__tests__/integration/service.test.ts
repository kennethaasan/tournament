import { beforeEach, describe, expect, it } from "vitest";
import { ProblemError } from "@/lib/errors/problem";
import {
  addRosterMember,
  createTeam,
  listTeamRoster,
  removeTeamMember,
  updateTeam,
  updateTeamMember,
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

  it("supports long compound team names with separators", async () => {
    const team = await createTeam({
      name: "Stadsbygd/Vanvik/Rissa 1",
    });

    expect(team.name).toBe("Stadsbygd/Vanvik/Rissa 1");
    expect(team.slug).toBe("stadsbygd-vanvik-rissa-1");
  });

  it("returns conflict when another team already uses the slug", async () => {
    await createTeam({
      name: "Stadsbygd/Vanvik/Rissa 1",
    });

    await expect(
      createTeam({
        name: "Stadsbygd Vanvik Rissa 1",
      }),
    ).rejects.toMatchObject({
      problem: {
        type: "https://tournament.app/problems/team-slug-conflict",
        status: 409,
      },
    });
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

  describe("updateTeam", () => {
    it("updates a team name and auto-updates slug", async () => {
      const team = await createTeam({
        name: "Original Name",
        contactEmail: "team@example.com",
      });

      const updated = await updateTeam(team.id, {
        name: "Updated Team Name",
      });

      expect(updated.name).toBe("Updated Team Name");
      expect(updated.slug).toBe("updated-team-name");
      expect(updated.contactEmail).toBe("team@example.com");
    });

    it("updates contact information without changing name", async () => {
      const team = await createTeam({
        name: "Contact Test Team",
      });

      const updated = await updateTeam(team.id, {
        contactEmail: "NEW@CONTACT.COM",
        contactPhone: "+47 123 45 678",
      });

      expect(updated.name).toBe("Contact Test Team");
      expect(updated.slug).toBe("contact-test-team");
      expect(updated.contactEmail).toBe("new@contact.com");
      expect(updated.contactPhone).toBe("+47 123 45 678");
    });

    it("allows explicit slug override", async () => {
      const team = await createTeam({
        name: "Slug Override Team",
      });

      const updated = await updateTeam(team.id, {
        slug: "custom-slug",
      });

      expect(updated.name).toBe("Slug Override Team");
      expect(updated.slug).toBe("custom-slug");
    });

    it("rejects slug updates that conflict with another team", async () => {
      const sourceTeam = await createTeam({
        name: "Source Team",
      });
      const targetTeam = await createTeam({
        name: "Target Team",
      });

      await expect(
        updateTeam(sourceTeam.id, {
          slug: targetTeam.slug,
        }),
      ).rejects.toMatchObject({
        problem: {
          type: "https://tournament.app/problems/team-slug-conflict",
          status: 409,
        },
      });
    });

    it("returns unchanged team when no updates provided", async () => {
      const team = await createTeam({
        name: "No Changes Team",
        contactEmail: "nochange@example.com",
      });

      const updated = await updateTeam(team.id, {});

      expect(updated.id).toBe(team.id);
      expect(updated.name).toBe("No Changes Team");
      expect(updated.contactEmail).toBe("nochange@example.com");
    });

    it("throws when team does not exist", async () => {
      await expect(
        updateTeam("00000000-0000-0000-0000-000000000999", {
          name: "Ghost Team",
        }),
      ).rejects.toBeInstanceOf(ProblemError);
    });

    it("trims whitespace from name", async () => {
      const team = await createTeam({
        name: "Whitespace Team",
      });

      const updated = await updateTeam(team.id, {
        name: "  Trimmed Name  ",
      });

      expect(updated.name).toBe("Trimmed Name");
      expect(updated.slug).toBe("trimmed-name");
    });
  });

  describe("updateTeamMember", () => {
    it("updates person fields for a team member", async () => {
      const team = await createTeam({ name: "Update Member Team" });
      const member = await addRosterMember({
        teamId: team.id,
        person: {
          firstName: "Ida",
          lastName: "Strand",
          preferredName: null,
          country: "NO",
        },
        role: "player",
      });

      const updated = await updateTeamMember({
        teamId: team.id,
        membershipId: member.membershipId,
        updates: {
          firstName: "Idun",
          lastName: "Strandheim",
          preferredName: "Idun S",
          country: "SE",
        },
      });

      expect(updated.person.firstName).toBe("Idun");
      expect(updated.person.lastName).toBe("Strandheim");
      expect(updated.person.preferredName).toBe("Idun S");
      expect(updated.person.country).toBe("SE");
    });

    it("updates membership role for a team member", async () => {
      const team = await createTeam({ name: "Role Update Team" });
      const member = await addRosterMember({
        teamId: team.id,
        person: { firstName: "Kari", lastName: "Nordmann" },
        role: "player",
      });

      const updated = await updateTeamMember({
        teamId: team.id,
        membershipId: member.membershipId,
        updates: { role: "coach" },
      });

      expect(updated.role).toBe("coach");
      expect(updated.person.firstName).toBe("Kari");
    });

    it("updates both person and role simultaneously", async () => {
      const team = await createTeam({ name: "Combined Update Team" });
      const member = await addRosterMember({
        teamId: team.id,
        person: { firstName: "Per", lastName: "Hansen" },
        role: "player",
      });

      const updated = await updateTeamMember({
        teamId: team.id,
        membershipId: member.membershipId,
        updates: {
          firstName: "Peter",
          role: "manager",
        },
      });

      expect(updated.person.firstName).toBe("Peter");
      expect(updated.role).toBe("manager");
    });

    it("throws when membership does not exist", async () => {
      const team = await createTeam({ name: "Missing Member Team" });

      await expect(
        updateTeamMember({
          teamId: team.id,
          membershipId: "00000000-0000-0000-0000-000000000999",
          updates: { firstName: "Ghost" },
        }),
      ).rejects.toBeInstanceOf(ProblemError);
    });

    it("throws when membership belongs to different team", async () => {
      const team1 = await createTeam({ name: "Team One" });
      const team2 = await createTeam({ name: "Team Two" });
      const member = await addRosterMember({
        teamId: team1.id,
        person: { firstName: "Wrong", lastName: "Team" },
      });

      await expect(
        updateTeamMember({
          teamId: team2.id,
          membershipId: member.membershipId,
          updates: { firstName: "Hacker" },
        }),
      ).rejects.toBeInstanceOf(ProblemError);
    });
  });

  describe("removeTeamMember", () => {
    it("soft deletes a team member by setting status to inactive", async () => {
      const team = await createTeam({ name: "Remove Member Team" });
      const member = await addRosterMember({
        teamId: team.id,
        person: { firstName: "Leaving", lastName: "Player" },
        role: "player",
      });

      await removeTeamMember({
        teamId: team.id,
        membershipId: member.membershipId,
      });

      const roster = await listTeamRoster(team.id);
      const removedMember = roster.members.find(
        (m) => m.membershipId === member.membershipId,
      );

      expect(removedMember).toBeDefined();
      expect(removedMember?.status).toBe("inactive");
      expect(removedMember?.leftAt).toBeInstanceOf(Date);
    });

    it("throws when membership does not exist", async () => {
      const team = await createTeam({ name: "Missing Remove Team" });

      await expect(
        removeTeamMember({
          teamId: team.id,
          membershipId: "00000000-0000-0000-0000-000000000999",
        }),
      ).rejects.toBeInstanceOf(ProblemError);
    });

    it("throws when membership belongs to different team", async () => {
      const team1 = await createTeam({ name: "Remove Team One" });
      const team2 = await createTeam({ name: "Remove Team Two" });
      const member = await addRosterMember({
        teamId: team1.id,
        person: { firstName: "Cross", lastName: "Team" },
      });

      await expect(
        removeTeamMember({
          teamId: team2.id,
          membershipId: member.membershipId,
        }),
      ).rejects.toBeInstanceOf(ProblemError);
    });
  });
});
