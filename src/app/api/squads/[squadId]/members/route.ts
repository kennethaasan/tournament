import { NextResponse } from "next/server";
import {
  addSquadMember,
  createAndAddSquadMember,
  listSquadMembers,
} from "@/modules/entries/service";
import { assertSquadAccess } from "@/server/api/access";
import { createApiHandler } from "@/server/api/handler";
import type { SquadMember } from "@/server/db/schema";

type RouteParams = {
  squadId: string;
};

type RequestBody = {
  membership_id?: string;
  team_id?: string;
  person?: {
    first_name: string;
    last_name: string;
    preferred_name?: string | null;
    birth_date?: string | null;
    country?: string | null;
  };
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

    let member: SquadMember;

    if (payload.person) {
      if (!payload.team_id) {
        return NextResponse.json(
          { title: "Team ID is required when creating a new person" },
          { status: 400 },
        );
      }
      member = await createAndAddSquadMember({
        squadId,
        teamId: payload.team_id,
        person: {
          firstName: payload.person.first_name,
          lastName: payload.person.last_name,
          preferredName: payload.person.preferred_name,
          birthDate: payload.person.birth_date,
          country: payload.person.country,
        },
        jerseyNumber: payload.jersey_number,
        position: payload.position,
      });
    } else {
      if (!payload.membership_id) {
        return NextResponse.json(
          { title: "Membership ID is required" },
          { status: 400 },
        );
      }
      member = await addSquadMember({
        squadId,
        membershipId: payload.membership_id,
        jerseyNumber: payload.jersey_number ?? null,
        position: payload.position,
        availability: payload.availability,
        notes: payload.notes,
      });
    }

    // Find the member we just added/updated to get person details
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
