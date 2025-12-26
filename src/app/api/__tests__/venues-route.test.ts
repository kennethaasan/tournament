import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DELETE, PATCH } from "@/app/api/venues/[venueId]/route";
import type { AuthContext } from "@/server/auth";
import { getSession } from "@/server/auth";
import { db } from "@/server/db/client";
import { competitions, venues } from "@/server/db/schema";
import { createCompetitionAdminContext } from "@/test/factories";

const mockGetSession = vi.mocked(getSession);

const COMPETITION_ID = "00000000-0000-0000-0000-000000000801";
const VENUE_ID = "00000000-0000-0000-0000-000000000802";

beforeEach(async () => {
  await db.delete(venues);
  await db.delete(competitions);

  await db.insert(competitions).values({
    id: COMPETITION_ID,
    name: "Elite Cup",
    slug: "elite-cup",
    defaultTimezone: "Europe/Oslo",
  });

  await db.insert(venues).values({
    id: VENUE_ID,
    competitionId: COMPETITION_ID,
    editionId: null,
    name: "Old Arena",
    slug: "old-arena",
  });
});

describe("venues route", () => {
  test("PATCH updates venue details and normalizes slugs", async () => {
    const auth = createCompetitionAdminContext(COMPETITION_ID);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const payload = {
      name: "New Arena",
      slug: "  New Arena ",
      address: "Street 1",
    };

    const request = new NextRequest(`http://localhost/api/venues/${VENUE_ID}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ venueId: VENUE_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe("New Arena");
    expect(body.slug).toBe("new-arena");
  });

  test("DELETE removes venues", async () => {
    const auth = createCompetitionAdminContext(COMPETITION_ID);
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const request = new NextRequest(`http://localhost/api/venues/${VENUE_ID}`, {
      method: "DELETE",
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ venueId: VENUE_ID }),
    });

    expect(response.status).toBe(204);

    const remaining = await db.query.venues.findMany();
    expect(remaining).toHaveLength(0);
  });
});
