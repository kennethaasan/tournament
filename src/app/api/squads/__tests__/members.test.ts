import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DELETE,
  PATCH,
} from "@/app/api/squads/[squadId]/members/[memberId]/route";
import { GET, POST } from "@/app/api/squads/[squadId]/members/route";
import type { AuthContext } from "@/server/auth";
import { getSession } from "@/server/auth";
import { db } from "@/server/db/client";
import {
  competitions,
  editions,
  entries,
  persons,
  squadMembers,
  squads,
  teamMemberships,
  teams,
} from "@/server/db/schema";
import { createTeamManagerContext } from "@/test/factories";

vi.mock("@/server/auth");

const SQUAD_ID = "00000000-0000-0000-0000-000000000411";
const ENTRY_ID = "00000000-0000-0000-0000-000000000412";
const EDITION_ID = "00000000-0000-0000-0000-000000000413";
const TEAM_ID = "00000000-0000-0000-0000-000000000414";
const COMPETITION_ID = "00000000-0000-0000-0000-000000000415";

beforeEach(async () => {
  await db.delete(squadMembers);
  await db.delete(squads);
  await db.delete(entries);
  await db.delete(teamMemberships);
  await db.delete(persons);
  await db.delete(teams);
  await db.delete(editions);
  await db.delete(competitions);

  await db.insert(competitions).values({
    id: COMPETITION_ID,
    name: "API Test",
    slug: "api-test",
    defaultTimezone: "UTC",
  });

  await db.insert(editions).values({
    id: EDITION_ID,
    competitionId: COMPETITION_ID,
    label: "2025",
    slug: "2025",
    status: "published",
    format: "round_robin",
    timezone: "UTC",
  });

  await db.insert(teams).values({
    id: TEAM_ID,
    name: "API Team",
    slug: "api-team",
  });

  await db.insert(entries).values({
    id: ENTRY_ID,
    editionId: EDITION_ID,
    teamId: TEAM_ID,
    status: "approved",
  });

  await db.insert(squads).values({
    id: SQUAD_ID,
    entryId: ENTRY_ID,
  });
});

describe("squad members API", () => {
  it("POST adds a member and GET lists them", async () => {
    const personId = "00000000-0000-0000-0000-000000000420";
    const membershipId = "00000000-0000-0000-0000-000000000421";

    await db.insert(persons).values({
      id: personId,
      firstName: "API",
      lastName: "Player",
    });

    await db.insert(teamMemberships).values({
      id: membershipId,
      teamId: TEAM_ID,
      personId,
      role: "player",
    });

    vi.mocked(getSession).mockResolvedValue(
      createTeamManagerContext(TEAM_ID) as unknown as AuthContext,
    );

    // 1. POST
    const postReq = new NextRequest(
      `http://localhost/api/squads/${SQUAD_ID}/members`,
      {
        method: "POST",
        body: JSON.stringify({
          membership_id: membershipId,
          jersey_number: 99,
          position: "Striker",
        }),
      },
    );

    const postRes = await POST(postReq, {
      params: Promise.resolve({ squadId: SQUAD_ID }),
    });
    expect(postRes.status).toBe(201);
    const postBody = await postRes.json();
    expect(postBody.jersey_number).toBe(99);
    expect(postBody.person.full_name).toBe("API Player");

    // 2. GET
    const getReq = new NextRequest(
      `http://localhost/api/squads/${SQUAD_ID}/members`,
    );
    const getRes = await GET(getReq, {
      params: Promise.resolve({ squadId: SQUAD_ID }),
    });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.members).toHaveLength(1);
    expect(getBody.members[0].jersey_number).toBe(99);
  });

  it("PATCH updates a member and DELETE removes them", async () => {
    const personId = "00000000-0000-0000-0000-000000000430";
    const membershipId = "00000000-0000-0000-0000-000000000431";
    const memberId = "00000000-0000-0000-0000-000000000432";

    await db.insert(persons).values({
      id: personId,
      firstName: "Update",
      lastName: "Test",
    });

    await db.insert(teamMemberships).values({
      id: membershipId,
      teamId: TEAM_ID,
      personId,
      role: "player",
    });

    await db.insert(squadMembers).values({
      id: memberId,
      squadId: SQUAD_ID,
      personId,
      membershipId,
      jerseyNumber: 10,
    });

    vi.mocked(getSession).mockResolvedValue(
      createTeamManagerContext(TEAM_ID) as unknown as AuthContext,
    );

    // 1. PATCH
    const patchReq = new NextRequest(
      `http://localhost/api/squads/${SQUAD_ID}/members/${memberId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          jersey_number: 7,
          position: "Winger",
        }),
      },
    );

    const patchRes = await PATCH(patchReq, {
      params: Promise.resolve({ squadId: SQUAD_ID, memberId }),
    });
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.jersey_number).toBe(7);

    // 2. DELETE
    const delReq = new NextRequest(
      `http://localhost/api/squads/${SQUAD_ID}/members/${memberId}`,
      {
        method: "DELETE",
      },
    );
    const delRes = await DELETE(delReq, {
      params: Promise.resolve({ squadId: SQUAD_ID, memberId }),
    });
    expect(delRes.status).toBe(204);

    const remaining = await db
      .select()
      .from(squadMembers)
      .where(eq(squadMembers.id, memberId));
    expect(remaining).toHaveLength(0);
  });
});
