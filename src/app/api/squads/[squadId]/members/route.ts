import { NextResponse } from "next/server";
import { addSquadMember, listSquadMembers } from "@/modules/entries/service";
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

export const GET = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const squadId = Array.isArray(params.squadId)
      ? params.squadId[0]
      : params.squadId;
    await assertSquadAccess(squadId, auth);

    const rows = await listSquadMembers(squadId);

    return NextResponse.json(
      {
        members: rows.map((row) => ({
          id: row.id,
          squad_id: row.squadId,
          membership_id: row.membershipId ?? null,
          person_id: row.personId,
          jersey_number: row.jerseyNumber ?? null,
          position: row.position ?? null,
          availability: row.availability,
          notes: row.notes ?? null,
          person: {
            id: row.person.id,
            first_name: row.person.firstName,
            last_name: row.person.lastName,
            full_name: `${row.person.firstName} ${row.person.lastName}`,
            preferred_name: row.person.preferredName,
          },
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

    const [_row] = await listSquadMembers(squadId);
    // Find the member we just added/updated
    const updatedMember = (await listSquadMembers(squadId)).find(
      (m) => m.id === member.id,
    );

    if (!updatedMember) {
      return NextResponse.json(
        { title: "Failed to fetch updated member" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        id: updatedMember.id,
        squad_id: updatedMember.squadId,
        membership_id: updatedMember.membershipId,
        person_id: updatedMember.personId,
        jersey_number: updatedMember.jerseyNumber,
        position: updatedMember.position,
        availability: updatedMember.availability,
        person: {
          id: updatedMember.person.id,
          first_name: updatedMember.person.firstName,
          last_name: updatedMember.person.lastName,
          full_name: `${updatedMember.person.firstName} ${updatedMember.person.lastName}`,
          preferred_name: updatedMember.person.preferredName,
        },
      },
      { status: 201 },
    );
  },
  {
    requireAuth: true,
    roles: ["team_manager", "competition_admin", "global_admin"],
  },
);
