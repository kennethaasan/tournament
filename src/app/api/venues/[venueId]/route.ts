import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createProblem } from "@/lib/errors/problem";
import { assertCompetitionAdminAccess } from "@/server/api/access";
import { createApiHandler } from "@/server/api/handler";
import { db } from "@/server/db/client";
import { venues } from "@/server/db/schema";

type RouteParams = {
  venueId: string;
};

type RequestBody = {
  name?: string | null;
  slug?: string | null;
  address?: string | null;
  notes?: string | null;
  timezone?: string | null;
};

export const PATCH = createApiHandler<RouteParams>(
  async ({ params, request, auth }) => {
    const venueId = Array.isArray(params.venueId)
      ? params.venueId[0]
      : params.venueId;

    if (!venueId) {
      throw createProblem({
        type: "https://httpstatuses.com/400",
        title: "Ugyldig forespørsel",
        status: 400,
        detail: "VenueId mangler i URLen.",
      });
    }

    const existing = await db.query.venues.findFirst({
      where: eq(venues.id, venueId),
    });

    if (!existing) {
      throw createProblem({
        type: "https://tournament.app/problems/venues/not-found",
        title: "Arena finnes ikke",
        status: 404,
        detail: "Fant ikke arenaen du prøver å oppdatere.",
      });
    }

    const competitionId = existing.competitionId;
    if (!competitionId) {
      throw createProblem({
        type: "https://tournament.app/problems/venues/missing-competition",
        title: "Konkurranse mangler",
        status: 500,
        detail: "Arenaen mangler konkurransetilknytning.",
      });
    }

    await assertCompetitionAdminAccess(competitionId, auth);

    const payload = (await request.json()) as RequestBody;
    const update: Partial<typeof venues.$inferInsert> = {};

    if (payload.name !== undefined) {
      const name = payload.name?.trim();
      if (!name) {
        throw createProblem({
          type: "https://tournament.app/problems/venues/name-required",
          title: "Navn mangler",
          status: 400,
          detail: "Arenaen må ha et navn.",
        });
      }
      update.name = name;
    }

    if (payload.slug !== undefined) {
      const slug = normalizeSlug(payload.slug);
      await ensureSlugAvailable({
        competitionId,
        editionId: existing.editionId ?? null,
        slug,
        ignoreId: existing.id,
      });
      update.slug = slug;
    }

    if (payload.address !== undefined) {
      update.address = payload.address?.trim() || null;
    }

    if (payload.notes !== undefined) {
      update.notes = payload.notes?.trim() || null;
    }

    if (payload.timezone !== undefined) {
      update.timezone = payload.timezone?.trim() || null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(serializeVenue(existing), { status: 200 });
    }

    const [updated] = await db
      .update(venues)
      .set(update)
      .where(eq(venues.id, venueId))
      .returning();

    if (!updated) {
      throw createProblem({
        type: "https://tournament.app/problems/venues/not-updated",
        title: "Kunne ikke oppdatere arena",
        status: 500,
        detail: "Arenaen ble ikke oppdatert.",
      });
    }

    return NextResponse.json(serializeVenue(updated), { status: 200 });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

export const DELETE = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const venueId = Array.isArray(params.venueId)
      ? params.venueId[0]
      : params.venueId;

    if (!venueId) {
      throw createProblem({
        type: "https://httpstatuses.com/400",
        title: "Ugyldig forespørsel",
        status: 400,
        detail: "VenueId mangler i URLen.",
      });
    }

    const existing = await db.query.venues.findFirst({
      columns: { id: true, competitionId: true },
      where: eq(venues.id, venueId),
    });

    if (!existing) {
      throw createProblem({
        type: "https://tournament.app/problems/venues/not-found",
        title: "Arena finnes ikke",
        status: 404,
        detail: "Fant ikke arenaen du prøver å slette.",
      });
    }

    if (!existing.competitionId) {
      throw createProblem({
        type: "https://tournament.app/problems/venues/missing-competition",
        title: "Konkurranse mangler",
        status: 500,
        detail: "Arenaen mangler konkurransetilknytning.",
      });
    }

    await assertCompetitionAdminAccess(existing.competitionId, auth);

    await db.delete(venues).where(eq(venues.id, venueId));

    return new NextResponse(null, { status: 204 });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

async function ensureSlugAvailable(input: {
  competitionId: string;
  editionId: string | null;
  slug: string;
  ignoreId?: string | null;
}) {
  const existing = await db.query.venues.findFirst({
    columns: { id: true },
    where: input.editionId
      ? and(
          eq(venues.competitionId, input.competitionId),
          eq(venues.editionId, input.editionId),
          eq(venues.slug, input.slug),
        )
      : and(
          eq(venues.competitionId, input.competitionId),
          isNull(venues.editionId),
          eq(venues.slug, input.slug),
        ),
  });

  if (!existing) {
    return;
  }

  if (input.ignoreId && existing.id === input.ignoreId) {
    return;
  }

  throw createProblem({
    type: "https://tournament.app/problems/venues/slug-taken",
    title: "Slug er allerede i bruk",
    status: 409,
    detail: `Sluggen "${input.slug}" er allerede brukt på denne konkurransen.`,
  });
}

function normalizeSlug(value: string | null | undefined): string {
  const slug = (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw createProblem({
      type: "https://tournament.app/problems/venues/slug-invalid",
      title: "Ugyldig slug",
      status: 400,
      detail: "Slug må inneholde minst ett tegn eller tall.",
    });
  }

  return slug;
}

function serializeVenue(venue: {
  id: string;
  competitionId: string | null;
  editionId: string | null;
  name: string;
  slug: string;
  address: string | null;
  notes: string | null;
  timezone: string | null;
  createdAt: Date | null;
}) {
  if (!venue.competitionId) {
    throw createProblem({
      type: "https://tournament.app/problems/venues/missing-competition",
      title: "Konkurranse mangler",
      status: 500,
      detail: "Arenaen mangler konkurransetilknytning.",
    });
  }

  return {
    id: venue.id,
    competition_id: venue.competitionId,
    edition_id: venue.editionId,
    name: venue.name,
    slug: venue.slug,
    address: venue.address,
    notes: venue.notes,
    timezone: venue.timezone,
    created_at: venue.createdAt ? venue.createdAt.toISOString() : null,
  };
}
