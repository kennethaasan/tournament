import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST as addTeamMember } from "@/app/api/teams/[teamId]/members/route";
import { GET as getTeam } from "@/app/api/teams/[teamId]/route";
import type { AuthContext } from "@/server/auth";
import { getSession } from "@/server/auth";
import { db } from "@/server/db/client";
import { persons, teamMemberships, teams } from "@/server/db/schema";
import { createTeamManagerContext } from "@/test/factories";

vi.mock("@/server/auth");

const mockGetSession = vi.mocked(getSession);

const TEAM_ID = "00000000-0000-0000-0000-000000001101";
const PERSON_ID = "00000000-0000-0000-0000-000000001102";
const MEMBERSHIP_ID = "00000000-0000-0000-0000-000000001103";

beforeEach(async () => {
  await db.delete(teamMemberships);
  await db.delete(persons);
  await db.delete(teams);

  await db.insert(teams).values({
    id: TEAM_ID,
    name: "Ravens",
    slug: "ravens",
  });
});

describe("teams route", () => {
  test("GET roster includes person full_name", async () => {
    await db.insert(persons).values({
      id: PERSON_ID,
      firstName: "Theodore",
      lastName: "Jones",
      preferredName: "Theo",
      birthDate: null,
      country: null,
    });

    await db.insert(teamMemberships).values({
      id: MEMBERSHIP_ID,
      teamId: TEAM_ID,
      personId: PERSON_ID,
      role: "player",
      status: "active",
    });

    const auth = createTeamManagerContext(TEAM_ID);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const request = new NextRequest(`http://localhost/api/teams/${TEAM_ID}`);
    const response = await getTeam(request, {
      params: Promise.resolve({ teamId: TEAM_ID }),
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.members).toHaveLength(1);
    expect(body.members[0]?.person.full_name).toBe("Theo Jones");
  });

  test("POST member returns person full_name", async () => {
    const auth = createTeamManagerContext(TEAM_ID);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const payload = {
      first_name: "Ingrid",
      last_name: "Solberg",
      preferred_name: "Inga",
      country: "NO",
      role: "player",
    };

    const request = new NextRequest(
      `http://localhost/api/teams/${TEAM_ID}/members`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const response = await addTeamMember(request, {
      params: Promise.resolve({ teamId: TEAM_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.person.full_name).toBe("Inga Solberg");
  });
});
