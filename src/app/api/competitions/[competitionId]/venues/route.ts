import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createProblem } from "@/lib/errors/problem";
import { assertCompetitionAdminAccess } from "@/server/api/access";
import { createApiHandler } from "@/server/api/handler";
import { db } from "@/server/db/client";
import { editions, venues } from "@/server/db/schema";

type RouteParams = {
  competitionId: string;
};

type RequestBody = {
  name: string;
  slug?: string | null;
  edition_id?: string | null;
  address?: string | null;
  notes?: string | null;
  timezone?: string | null;
};

export const GET = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const competitionId = Array.isArray(params.competitionId)
      ? params.competitionId[0]
      : params.competitionId;

    await assertCompetitionAdminAccess(competitionId, auth);

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
      .where(eq(venues.competitionId, competitionId))
      .orderBy(venues.name);

    return NextResponse.json(
      {
        venues: rows.map((venue) => serializeVenue(venue)),
      },
      { status: 200 },
    );
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

export const POST = createApiHandler<RouteParams>(
  async ({ params, request, auth }) => {
    const competitionId = Array.isArray(params.competitionId)
      ? params.competitionId[0]
      : params.competitionId;

    await assertCompetitionAdminAccess(competitionId, auth);

    const payload = (await request.json()) as RequestBody;
    const name = payload.name?.trim();
    if (!name) {
      throw createProblem({
        type: "https://tournament.app/problems/venues/name-required",
        title: "Navn mangler",
        status: 400,
        detail: "Du må oppgi et navn på arenaen.",
      });
    }

    const slug = normalizeSlug(payload.slug ?? name);
    const editionId = payload.edition_id ?? null;

    if (editionId) {
      const edition = await db.query.editions.findFirst({
        columns: { id: true },
        where: and(
          eq(editions.id, editionId),
          eq(editions.competitionId, competitionId),
        ),
      });
      if (!edition) {
        throw createProblem({
          type: "https://tournament.app/problems/venues/edition-mismatch",
          title: "Ugyldig utgave",
          status: 400,
          detail: "Utgaven finnes ikke eller tilhører en annen konkurranse.",
        });
      }
    }

    await ensureSlugAvailable({
      competitionId,
      editionId,
      slug,
    });

    const [venue] = await db
      .insert(venues)
      .values({
        competitionId,
        editionId,
        name,
        slug,
        address: payload.address?.trim() || null,
        notes: payload.notes?.trim() || null,
        timezone: payload.timezone?.trim() || null,
      })
      .returning();

    if (!venue) {
      throw createProblem({
        type: "https://tournament.app/problems/venues/not-created",
        title: "Kunne ikke opprette arena",
        status: 500,
        detail: "Vi klarte ikke å opprette arenaen akkurat nå.",
      });
    }

    return NextResponse.json(serializeVenue(venue), { status: 201 });
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

function normalizeSlug(value: string): string {
  const slug = value
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
