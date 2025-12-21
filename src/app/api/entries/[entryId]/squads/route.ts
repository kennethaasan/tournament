import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ensureSquad } from "@/modules/entries/service";
import { assertEntryAccess } from "@/server/api/access";
import { createApiHandler } from "@/server/api/handler";
import { db } from "@/server/db/client";
import { squads } from "@/server/db/schema";

type RouteParams = {
  entryId: string;
};

type RequestBody = {
  lock?: boolean;
};

export const PUT = createApiHandler<RouteParams>(
  async ({ params, request, auth }) => {
    const entryId = Array.isArray(params.entryId)
      ? params.entryId[0]
      : params.entryId;
    const payload = (await request.json()) as RequestBody;
    await assertEntryAccess(entryId, auth);

    const squad = await ensureSquad(entryId);

    if (typeof payload.lock === "boolean") {
      await db
        .update(squads)
        .set({
          lockedAt: payload.lock ? new Date() : null,
        })
        .where(eq(squads.id, squad.id));
    }

    const refreshed = await db.query.squads.findFirst({
      where: eq(squads.id, squad.id),
    });

    return NextResponse.json(
      {
        id: refreshed?.id ?? squad.id,
        entry_id: squad.entryId,
        locked_at: refreshed?.lockedAt?.toISOString() ?? null,
      },
      { status: 200 },
    );
  },
  {
    requireAuth: true,
    roles: ["team_manager", "competition_admin", "global_admin"],
  },
);
