import { NextResponse } from "next/server";
import { addSquadMember } from "@/modules/entries/service";
import { assertSquadAccess } from "@/server/api/access";
import { createApiHandler } from "@/server/api/handler";

type RouteParams = {
  squadId: string;
};

type RequestBody = {
  membership_id: string;
  jersey_number?: number | null;
  position?: string | null;
  availability?: "available" | "doubtful" | "injured" | "suspended";
  notes?: string | null;
};

export const POST = createApiHandler<RouteParams>(
  async ({ params, request, auth }) => {
    const squadId = Array.isArray(params.squadId)
      ? params.squadId[0]
      : params.squadId;
    await assertSquadAccess(squadId, auth);
    const payload = (await request.json()) as RequestBody;

    const member = await addSquadMember({
      squadId,
      membershipId: payload.membership_id,
      jerseyNumber: payload.jersey_number ?? null,
      position: payload.position,
      availability: payload.availability,
      notes: payload.notes,
    });

    return NextResponse.json(
      {
        id: member.id,
        squad_id: member.squadId,
        membership_id: member.membershipId,
        person_id: member.personId,
        jersey_number: member.jerseyNumber,
        position: member.position,
        availability: member.availability,
      },
      { status: 201 },
    );
  },
  {
    requireAuth: true,
    roles: ["team_manager", "competition_admin", "global_admin"],
  },
);
