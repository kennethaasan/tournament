import { and, eq, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { assertEditionAdminAccess } from "@/server/api/edition-access";
import { createApiHandler } from "@/server/api/handler";
import { db } from "@/server/db/client";
import { venues } from "@/server/db/schema";

type RouteParams = {
  editionId: string;
};

export const GET = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;

    const edition = await assertEditionAdminAccess(editionId, auth);

    const rows = await db
      .select({
        id: venues.id,
        competitionId: venues.competitionId,
        editionId: venues.editionId,
        name: venues.name,
        slug: venues.slug,
        address: venues.address,
        notes: venues.notes,
        timezone: venues.timezone,
        createdAt: venues.createdAt,
      })
      .from(venues)
      .where(
        and(
          eq(venues.competitionId, edition.competitionId),
          or(eq(venues.editionId, edition.id), isNull(venues.editionId)),
        ),
      )
      .orderBy(venues.name);

    return NextResponse.json(
      {
        venues: rows.map((venue) => ({
          id: venue.id,
          competition_id: venue.competitionId,
          edition_id: venue.editionId,
          name: venue.name,
          slug: venue.slug,
          address: venue.address,
          notes: venue.notes,
          timezone: venue.timezone,
          created_at: venue.createdAt ? venue.createdAt.toISOString() : null,
        })),
      },
      { status: 200 },
    );
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);
