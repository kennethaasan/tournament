import { NextResponse } from "next/server";
import { addRosterMember } from "@/modules/teams/service";
import { assertTeamAccess } from "@/server/api/access";
import { createApiHandler } from "@/server/api/handler";

type RouteParams = {
  teamId: string;
};

type RequestBody = {
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
  birth_date?: string | null;
  country?: string | null;
  role?: "player" | "coach" | "manager" | "staff";
};

export const POST = createApiHandler<RouteParams>(
  async ({ params, request, auth }) => {
    const teamId = Array.isArray(params.teamId)
      ? params.teamId[0]
      : params.teamId;
    await assertTeamAccess(teamId, auth);
    const payload = (await request.json()) as RequestBody;

    const member = await addRosterMember({
      teamId,
      person: {
        firstName: payload.first_name,
        lastName: payload.last_name,
        preferredName: payload.preferred_name,
        birthDate: payload.birth_date ?? null,
        country: payload.country,
      },
      role: payload.role ?? "player",
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
      },
      { status: 201 },
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
