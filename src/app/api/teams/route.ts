import { NextResponse } from "next/server";
import { createTeam } from "@/modules/teams/service";
import { createApiHandler } from "@/server/api/handler";

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
