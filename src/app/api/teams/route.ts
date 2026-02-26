import { and, eq, inArray, or } from "drizzle-orm";
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

    const teamManagerScopeIds: string[] = [];
    const competitionAdminScopeIds: string[] = [];
    for (const assignment of auth.user.roles) {
      if (
        assignment.role === "team_manager" &&
        assignment.scopeType === "team" &&
        assignment.scopeId
      ) {
        teamManagerScopeIds.push(assignment.scopeId);
      } else if (
        assignment.role === "competition_admin" &&
        assignment.scopeType === "competition" &&
        assignment.scopeId
      ) {
        competitionAdminScopeIds.push(assignment.scopeId);
      }
    }

    const teamManagerCondition =
      teamManagerScopeIds.length > 0
        ? inArray(teams.id, teamManagerScopeIds)
        : null;
    const competitionAdminCondition =
      competitionAdminScopeIds.length > 0
        ? inArray(
            teams.id,
            db
              .select({ teamId: entries.teamId })
              .from(entries)
              .innerJoin(editions, eq(entries.editionId, editions.id))
              .where(inArray(editions.competitionId, competitionAdminScopeIds)),
          )
        : null;

    const visibleTeamsWhere =
      teamManagerCondition && competitionAdminCondition
        ? or(teamManagerCondition, competitionAdminCondition)
        : (teamManagerCondition ?? competitionAdminCondition);
    if (!visibleTeamsWhere) {
      return NextResponse.json({ teams: [] }, { status: 200 });
    }

    const whereClause = slug
      ? and(visibleTeamsWhere, eq(teams.slug, slug))
      : visibleTeamsWhere;
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
