import { NextResponse } from "next/server";
import { submitMatchDispute } from "@/modules/entries/service";
import { createApiHandler } from "@/server/api/handler";
import { sendMatchDisputeSubmittedEmails } from "@/server/email/action-emails";

type RouteParams = {
  matchId: string;
};

type RequestBody = {
  entry_id: string;
  reason: string;
};

export const POST = createApiHandler<RouteParams>(
  async ({ params, request }) => {
    const matchId = Array.isArray(params.matchId)
      ? params.matchId[0]
      : params.matchId;
    const payload = (await request.json()) as RequestBody;

    await submitMatchDispute({
      matchId,
      entryId: payload.entry_id,
      reason: payload.reason,
    });
    await sendMatchDisputeSubmittedEmails({
      matchId,
      entryId: payload.entry_id,
      reason: payload.reason,
    });

    return NextResponse.json({ status: "accepted" }, { status: 201 });
  },
  {
    requireAuth: true,
    roles: ["team_manager", "competition_admin", "global_admin"],
  },
);
