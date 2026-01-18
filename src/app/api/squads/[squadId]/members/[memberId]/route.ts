import { NextResponse } from "next/server";
import {
  removeSquadMember,
  updateSquadMember,
} from "@/modules/entries/service";
import { assertSquadAccess } from "@/server/api/access";
import { createApiHandler } from "@/server/api/handler";

type RouteParams = {
  squadId: string;
  memberId: string;
};

type UpdateRequestBody = {
  jersey_number?: number | null;
  position?: string | null;
  availability?: "available" | "doubtful" | "injured" | "suspended";
  notes?: string | null;
};

export const PATCH = createApiHandler<RouteParams>(
  async ({ params, request, auth }) => {
    const squadId = Array.isArray(params.squadId)
      ? params.squadId[0]
      : params.squadId;
    const memberId = Array.isArray(params.memberId)
      ? params.memberId[0]
      : params.memberId;

    if (!squadId || !memberId) {
      return NextResponse.json(
        { title: "Missing parameters" },
        { status: 400 },
      );
    }

    await assertSquadAccess(squadId, auth);
    const payload = (await request.json()) as UpdateRequestBody;

    const member = await updateSquadMember(memberId, {
      jerseyNumber: payload.jersey_number,
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
        notes: member.notes,
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
    const squadId = Array.isArray(params.squadId)
      ? params.squadId[0]
      : params.squadId;
    const memberId = Array.isArray(params.memberId)
      ? params.memberId[0]
      : params.memberId;

    if (!squadId || !memberId) {
      return NextResponse.json(
        { title: "Missing parameters" },
        { status: 400 },
      );
    }

    await assertSquadAccess(squadId, auth);
    await removeSquadMember(memberId);

    return new NextResponse(null, { status: 204 });
  },
  {
    requireAuth: true,
    roles: ["team_manager", "competition_admin", "global_admin"],
  },
);
