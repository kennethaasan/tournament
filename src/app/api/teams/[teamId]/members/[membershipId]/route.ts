import { NextResponse } from "next/server";
import { removeTeamMember, updateTeamMember } from "@/modules/teams/service";
import { assertTeamAccess } from "@/server/api/access";
import { createApiHandler } from "@/server/api/handler";

type RouteParams = {
  teamId: string;
  membershipId: string;
};

type UpdateRequestBody = {
  first_name?: string;
  last_name?: string;
  preferred_name?: string | null;
  country?: string | null;
  role?: "player" | "coach" | "manager" | "staff";
};

export const PATCH = createApiHandler<RouteParams>(
  async ({ params, request, auth }) => {
    const teamId = Array.isArray(params.teamId)
      ? params.teamId[0]
      : params.teamId;
    const membershipId = Array.isArray(params.membershipId)
      ? params.membershipId[0]
      : params.membershipId;

    await assertTeamAccess(teamId, auth);

    const payload = (await request.json()) as UpdateRequestBody;

    const member = await updateTeamMember({
      teamId,
      membershipId,
      updates: {
        firstName: payload.first_name,
        lastName: payload.last_name,
        preferredName: payload.preferred_name,
        country: payload.country,
        role: payload.role,
      },
    });

    return NextResponse.json(
      {
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
      },
      { status: 200 },
    );
  },
  {
    requireAuth: true,
    roles: ["team_manager", "competition_admin", "global_admin"],
  },
);

export const DELETE = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const teamId = Array.isArray(params.teamId)
      ? params.teamId[0]
      : params.teamId;
    const membershipId = Array.isArray(params.membershipId)
      ? params.membershipId[0]
      : params.membershipId;

    await assertTeamAccess(teamId, auth);

    await removeTeamMember({
      teamId,
      membershipId,
    });

    return new NextResponse(null, { status: 204 });
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
