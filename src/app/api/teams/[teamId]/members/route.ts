import { NextResponse } from "next/server";
import { addRosterMember } from "@/modules/teams/service";
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
  async ({ params, request }) => {
    const teamId = Array.isArray(params.teamId)
      ? params.teamId[0]
      : params.teamId;
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
