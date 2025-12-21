import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createTeam } from "@/modules/teams/service";
import { createApiHandler } from "@/server/api/handler";
import { userHasRole } from "@/server/auth";
import { db } from "@/server/db/client";
import { teams, userRoles } from "@/server/db/schema";

type RequestBody = {
  name: string;
  slug?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
};

export const POST = createApiHandler(
  async ({ request }) => {
    const payload = (await request.json()) as RequestBody;

    const team = await createTeam({
      name: payload.name,
      slug: payload.slug,
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
  async ({ auth }) => {
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

    const isGlobalAdmin = userHasRole(auth, "global_admin");
    if (isGlobalAdmin) {
      const rows = await db
        .select({
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
        })
        .from(teams)
        .orderBy(teams.name);

      return NextResponse.json({ teams: rows }, { status: 200 });
    }

    const scoped = await db
      .select({ scopeId: userRoles.scopeId })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, auth.user.id),
          eq(userRoles.role, "team_manager"),
          eq(userRoles.scopeType, "team"),
        ),
      );

    const ids = scoped
      .map((row) => row.scopeId)
      .filter((id): id is string => Boolean(id));

    if (!ids.length) {
      return NextResponse.json({ teams: [] }, { status: 200 });
    }

    const rows = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
      })
      .from(teams)
      .where(inArray(teams.id, ids))
      .orderBy(teams.name);

    return NextResponse.json({ teams: rows }, { status: 200 });
  },
  {
    requireAuth: true,
    roles: ["team_manager", "global_admin", "competition_admin"],
  },
);
