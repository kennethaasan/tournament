import { describe, expect, it } from "vitest";
import type { TeamServiceDeps } from "@/modules/teams/service";
import {
  createTeam,
  listTeamRoster,
  updateTeam,
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
});
