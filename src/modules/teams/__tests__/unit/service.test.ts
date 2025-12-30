import { describe, expect, it } from "vitest";
import { ProblemError } from "@/lib/errors/problem";
import type { TeamServiceDeps } from "@/modules/teams/service";
import {
  createTeam,
  listTeamRoster,
  removeTeamMember,
  updateTeam,
  updateTeamMember,
} from "@/modules/teams/service";

type TeamRecord = {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt?: Date;
};

describe("teams service", () => {
  it("creates a team with normalized slug", async () => {
    const teams: TeamRecord[] = [];
    const fakeDb = {
      insert: () => ({
        values: (payload: TeamRecord) => ({
          returning: () => {
            const record = {
              ...payload,
              id: `team-${teams.length + 1}`,
            };
            teams.push(record);
            return [record];
          },
        }),
      }),
    };

    const team = await createTeam(
      { name: "North Stars", contactEmail: "OWNER@MAIL.com" },
      { db: fakeDb as unknown as TeamServiceDeps["db"] },
    );

    expect(team.slug).toBe("north-stars");
    expect(team.contactEmail).toBe("owner@mail.com");
    expect(teams).toHaveLength(1);
  });

  it("lists roster members for a team", async () => {
    const team = {
      id: "team-1",
      name: "Harbor United",
      slug: "harbor-united",
      contactEmail: null,
      contactPhone: null,
    };

    const fakeDb = {
      query: {
        teams: {
          findFirst: () => team,
        },
      },
      select: () => ({
        from: () => ({
          where: () => ({
            innerJoin: () => [
              {
                membership: {
                  id: "membership-1",
                  teamId: team.id,
                  personId: "person-1",
                  role: "player",
                  status: "active",
                  joinedAt: new Date("2024-01-01"),
                  leftAt: null,
                },
                person: {
                  id: "person-1",
                  firstName: "Ida",
                  lastName: "Strand",
                  preferredName: null,
                  birthDate: null,
                  country: "NO",
                },
              },
            ],
          }),
        }),
      }),
    };

    const roster = await listTeamRoster(team.id, {
      db: fakeDb as unknown as TeamServiceDeps["db"],
    });

    expect(roster.team.name).toBe("Harbor United");
    expect(roster.members[0]?.person.firstName).toBe("Ida");
    expect(roster.members[0]?.status).toBe("active");
  });

  it("updates a team name and auto-updates slug", async () => {
    const existingTeam: TeamRecord = {
      id: "team-1",
      name: "Old Name",
      slug: "old-name",
      contactEmail: null,
      contactPhone: null,
    };

    let updatedTeam: TeamRecord | null = null;

    const fakeDb = {
      query: {
        teams: {
          findFirst: () => existingTeam,
        },
      },
      update: () => ({
        set: (updates: Partial<TeamRecord>) => ({
          where: () => ({
            returning: () => {
              updatedTeam = { ...existingTeam, ...updates };
              return [updatedTeam];
            },
          }),
        }),
      }),
    };

    const result = await updateTeam(
      "team-1",
      { name: "New Team Name" },
      { db: fakeDb as unknown as TeamServiceDeps["db"] },
    );

    expect(result.name).toBe("New Team Name");
    expect(result.slug).toBe("new-team-name");
  });

  it("returns existing team when no updates provided", async () => {
    const existingTeam: TeamRecord = {
      id: "team-1",
      name: "Unchanged",
      slug: "unchanged",
      contactEmail: null,
      contactPhone: null,
    };

    const fakeDb = {
      query: {
        teams: {
          findFirst: () => existingTeam,
        },
      },
    };

    const result = await updateTeam(
      "team-1",
      {},
      { db: fakeDb as unknown as TeamServiceDeps["db"] },
    );

    expect(result.name).toBe("Unchanged");
    expect(result.slug).toBe("unchanged");
  });

  describe("updateTeamMember", () => {
    it("updates person fields and membership role", async () => {
      const existingMembership = {
        id: "membership-1",
        teamId: "team-1",
        personId: "person-1",
        role: "player" as const,
        status: "active" as const,
        joinedAt: new Date("2024-01-01"),
        leftAt: null,
      };

      const existingPerson = {
        id: "person-1",
        firstName: "Ida",
        lastName: "Strand",
        preferredName: null,
        birthDate: null,
        country: "NO",
        createdAt: new Date(),
      };

      let updatedPerson = { ...existingPerson };
      let updatedMembership = { ...existingMembership };

      const fakeTransaction = async (fn: (tx: unknown) => Promise<unknown>) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  limit: () => [
                    { membership: existingMembership, person: existingPerson },
                  ],
                }),
              }),
            }),
          }),
          update: () => ({
            set: (updates: Record<string, unknown>) => ({
              where: () => ({
                returning: () => {
                  if ("firstName" in updates || "lastName" in updates) {
                    updatedPerson = { ...updatedPerson, ...updates };
                    return [updatedPerson];
                  }
                  if ("role" in updates) {
                    updatedMembership = { ...updatedMembership, ...updates };
                    return [updatedMembership];
                  }
                  return [];
                },
              }),
            }),
          }),
        };
        return fn(fakeTx);
      };

      const result = await updateTeamMember(
        {
          teamId: "team-1",
          membershipId: "membership-1",
          updates: {
            firstName: "Idun",
            lastName: "Strandheim",
            role: "coach",
          },
        },
        {
          withTransaction:
            fakeTransaction as unknown as TeamServiceDeps["withTransaction"],
        },
      );

      expect(result.person.firstName).toBe("Idun");
      expect(result.person.lastName).toBe("Strandheim");
      expect(result.role).toBe("coach");
    });

    it("throws when membership not found", async () => {
      const fakeTransaction = async (fn: (tx: unknown) => Promise<unknown>) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              innerJoin: () => ({
                where: () => ({
                  limit: () => [],
                }),
              }),
            }),
          }),
        };
        return fn(fakeTx);
      };

      await expect(
        updateTeamMember(
          {
            teamId: "team-1",
            membershipId: "nonexistent",
            updates: { firstName: "Test" },
          },
          {
            withTransaction:
              fakeTransaction as unknown as TeamServiceDeps["withTransaction"],
          },
        ),
      ).rejects.toBeInstanceOf(ProblemError);
    });
  });

  describe("removeTeamMember", () => {
    it("soft deletes membership by setting inactive status", async () => {
      type MembershipRecord = {
        id: string;
        teamId: string;
        personId: string;
        role: "player" | "coach" | "manager";
        status: "active" | "inactive";
        joinedAt: Date | null;
        leftAt: Date | null;
      };

      const existingMembership: MembershipRecord = {
        id: "membership-1",
        teamId: "team-1",
        personId: "person-1",
        role: "player",
        status: "active",
        joinedAt: new Date("2024-01-01"),
        leftAt: null,
      };

      let updatedMembership: MembershipRecord | null = null;

      const fakeDb = {
        query: {
          teamMemberships: {
            findFirst: () => existingMembership,
          },
        },
        update: () => ({
          set: (updates: Partial<MembershipRecord>) => ({
            where: () => {
              updatedMembership = {
                ...existingMembership,
                ...updates,
              };
              return Promise.resolve();
            },
          }),
        }),
      };

      await removeTeamMember(
        { teamId: "team-1", membershipId: "membership-1" },
        { db: fakeDb as unknown as TeamServiceDeps["db"] },
      );

      expect(updatedMembership).not.toBeNull();
      expect(updatedMembership!.status).toBe("inactive");
      expect(updatedMembership!.leftAt).toBeInstanceOf(Date);
    });

    it("throws when membership not found", async () => {
      const fakeDb = {
        query: {
          teamMemberships: {
            findFirst: () => null,
          },
        },
      };

      await expect(
        removeTeamMember(
          { teamId: "team-1", membershipId: "nonexistent" },
          { db: fakeDb as unknown as TeamServiceDeps["db"] },
        ),
      ).rejects.toBeInstanceOf(ProblemError);
    });
  });
});
