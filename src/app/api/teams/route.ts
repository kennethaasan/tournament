import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createTeam } from "@/modules/teams/service";
import { createApiHandler } from "@/server/api/handler";
import { userHasRole } from "@/server/auth";
import { db } from "@/server/db/client";
import { editions, entries, teams } from "@/server/db/schema";

type RequestBody = {
  name: string;
  slug?: string | null;
  edition_id?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
};

export const POST = createApiHandler(
  async ({ request }) => {
    const payload = (await request.json()) as RequestBody;

    const team = await createTeam({
      name: payload.name,
      slug: payload.slug,
      editionId: payload.edition_id,
      contactEmail: payload.contact_email,
      contactPhone: payload.contact_phone,
    });

    return NextResponse.json(
      {
        id: team.id,
        name: team.name,
        slug: team.slug,
        contact_email: team.contactEmail,
        contact_phone: team.contactPhone,
        created_at: team.createdAt?.toISOString() ?? null,
      },
      { status: 201 },
    );
  },
  {
    requireAuth: true,
    roles: ["team_manager", "competition_admin", "global_admin"],
  },
);

export const GET = createApiHandler(
  async ({ request, auth }) => {
    if (!auth) {
      return NextResponse.json(
        {
          type: "https://tournament.app/problems/unauthorized",
          title: "Authentication required",
          status: 401,
          detail: "You must be authenticated to list teams.",
        },
        { status: 401 },
      );
    }

    const slugFilter = request.nextUrl.searchParams.get("slug")?.trim() ?? "";
    const slug = slugFilter.length > 0 ? slugFilter : null;

    const isGlobalAdmin = userHasRole(auth, "global_admin");
    if (isGlobalAdmin) {
      const query = db
        .select({
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
        })
        .from(teams);
      const rows = slug
        ? await query.where(eq(teams.slug, slug)).orderBy(teams.name)
        : await query.orderBy(teams.name);

      return NextResponse.json({ teams: rows }, { status: 200 });
    }

    const ids = new Set<string>();
    const competitionScopeIds = new Set<string>();
    for (const assignment of auth.user.roles) {
      if (
        assignment.role === "team_manager" &&
        assignment.scopeType === "team" &&
        assignment.scopeId
      ) {
        ids.add(assignment.scopeId);
      }

      if (
        assignment.role === "competition_admin" &&
        assignment.scopeType === "competition" &&
        assignment.scopeId
      ) {
        competitionScopeIds.add(assignment.scopeId);
      }
    }

    if (competitionScopeIds.size > 0) {
      const competitionTeamRows = await db
        .select({ teamId: entries.teamId })
        .from(entries)
        .innerJoin(editions, eq(entries.editionId, editions.id))
        .where(
          inArray(editions.competitionId, Array.from(competitionScopeIds)),
        );

      for (const row of competitionTeamRows) {
        ids.add(row.teamId);
      }
    }

    const teamIds = Array.from(ids);
    if (!teamIds.length) {
      return NextResponse.json({ teams: [] }, { status: 200 });
    }

    const baseWhere = inArray(teams.id, teamIds);
    const whereClause = slug ? and(baseWhere, eq(teams.slug, slug)) : baseWhere;
    const rows = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
      })
      .from(teams)
      .where(whereClause)
      .orderBy(teams.name);

    return NextResponse.json({ teams: rows }, { status: 200 });
  },
  {
    requireAuth: true,
    roles: ["team_manager", "global_admin", "competition_admin"],
  },
);
