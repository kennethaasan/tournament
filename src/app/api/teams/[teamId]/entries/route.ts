import { NextResponse } from "next/server";
import { createEntry, ensureSquad } from "@/modules/entries/service";
import { createApiHandler } from "@/server/api/handler";
import { sendEntrySubmittedEmails } from "@/server/email/action-emails";

type RouteParams = {
  teamId: string;
};

type RequestBody = {
  edition_id: string;
  notes?: string | null;
};

export const POST = createApiHandler<RouteParams>(
  async ({ params, request }) => {
    const teamId = Array.isArray(params.teamId)
      ? params.teamId[0]
      : params.teamId;
    const payload = (await request.json()) as RequestBody;

    const entry = await createEntry({
      editionId: payload.edition_id,
      teamId,
      notes: payload.notes,
    });
    const squad = await ensureSquad(entry.id);
    await sendEntrySubmittedEmails({
      teamId,
      editionId: entry.editionId,
    });

    return NextResponse.json(
      {
        entry: {
          id: entry.id,
          team_id: entry.teamId,
          edition_id: entry.editionId,
          status: entry.status,
          submitted_at: entry.submittedAt?.toISOString() ?? null,
        },
        squad: {
          id: squad.id,
          entry_id: squad.entryId,
          locked_at: squad.lockedAt?.toISOString() ?? null,
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
