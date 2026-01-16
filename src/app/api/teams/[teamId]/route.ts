import { NextResponse } from "next/server";
import { listTeamRoster, updateTeam } from "@/modules/teams/service";
import { assertTeamAccess } from "@/server/api/access";
import { createApiHandler } from "@/server/api/handler";

type RouteParams = {
  teamId: string;
};

export const GET = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const teamId = Array.isArray(params.teamId)
      ? params.teamId[0]
      : params.teamId;
    await assertTeamAccess(teamId, auth);
    const roster = await listTeamRoster(teamId);

    return NextResponse.json(
      {
        team: {
          id: roster.team.id,
          name: roster.team.name,
          slug: roster.team.slug,
          contact_email: roster.team.contactEmail,
          contact_phone: roster.team.contactPhone,
        },
        members: roster.members.map((member) => ({
          membership_id: member.membershipId,
          person: {
            id: member.person.id,
            full_name: formatPersonName(member.person),
            first_name: member.person.firstName,
            last_name: member.person.lastName,
            preferred_name: member.person.preferredName,
          },
          role: member.role,
          status: member.status,
          joined_at: member.joinedAt?.toISOString() ?? null,
          left_at: member.leftAt?.toISOString() ?? null,
          jersey_number: member.jerseyNumber ?? null,
        })),
      },
      { status: 200 },
    );
  },
  {
    requireAuth: true,
    roles: ["team_manager", "competition_admin", "global_admin"],
  },
);

type UpdateTeamBody = {
  name?: string;
  slug?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
};

export const PATCH = createApiHandler<RouteParams>(
  async ({ params, request, auth }) => {
    const teamId = Array.isArray(params.teamId)
      ? params.teamId[0]
      : params.teamId;
    await assertTeamAccess(teamId, auth);

    const body = (await request.json()) as UpdateTeamBody;

    const team = await updateTeam(teamId, {
      name: body.name,
      slug: body.slug,
      contactEmail: body.contact_email,
      contactPhone: body.contact_phone,
    });

    return NextResponse.json(
      {
        id: team.id,
        name: team.name,
        slug: team.slug,
        contact_email: team.contactEmail,
        contact_phone: team.contactPhone,
      },
      { status: 200 },
    );
  },
  {
    requireAuth: true,
    roles: ["team_manager", "competition_admin", "global_admin"],
  },
);

function formatPersonName(person: {
  firstName: string;
  lastName: string;
  preferredName: string | null;
}) {
  const first = person.preferredName?.trim() || person.firstName.trim();
  const last = person.lastName.trim();
  return [first, last].filter(Boolean).join(" ");
}
