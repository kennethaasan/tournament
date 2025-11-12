import { NextResponse } from "next/server";
import { listTeamRoster } from "@/modules/teams/service";
import { createApiHandler } from "@/server/api/handler";

type RouteParams = {
  teamId: string;
};

export const GET = createApiHandler<RouteParams>(
  async ({ params }) => {
    const teamId = Array.isArray(params.teamId)
      ? params.teamId[0]
      : params.teamId;
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
            first_name: member.person.firstName,
            last_name: member.person.lastName,
            preferred_name: member.person.preferredName,
          },
          role: member.role,
          status: member.status,
          joined_at: member.joinedAt?.toISOString() ?? null,
          left_at: member.leftAt?.toISOString() ?? null,
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
