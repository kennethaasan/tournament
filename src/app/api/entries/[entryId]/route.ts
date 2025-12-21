import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createProblem } from "@/lib/errors/problem";
import { reviewEntry } from "@/modules/entries/service";
import { assertEditionAdminAccess } from "@/server/api/edition-access";
import { createApiHandler } from "@/server/api/handler";
import { db } from "@/server/db/client";
import { entries, notifications, teams, userRoles } from "@/server/db/schema";
import { sendEntryStatusEmails } from "@/server/email/action-emails";

type RouteParams = {
  entryId: string;
};

type UpdateEntryBody = {
  status: "approved" | "rejected";
  reason?: string | null;
};

export const PATCH = createApiHandler<RouteParams>(
  async ({ request, params, auth }) => {
    if (!auth) {
      throw createProblem({
        type: "https://httpstatuses.com/401",
        title: "Autentisering kreves",
        status: 401,
        detail: "Du må være innlogget for å oppdatere påmeldingen.",
      });
    }

    const entryId = Array.isArray(params.entryId)
      ? params.entryId[0]
      : params.entryId;

    const entry = await db.query.entries.findFirst({
      where: eq(entries.id, entryId),
    });

    if (!entry) {
      throw createProblem({
        type: "https://httpstatuses.com/404",
        title: "Påmeldingen finnes ikke",
        status: 404,
        detail: "Påmeldingen ble ikke funnet.",
      });
    }

    const edition = await assertEditionAdminAccess(entry.editionId, auth);

    const payload = (await request.json()) as UpdateEntryBody;

    if (!payload.status) {
      throw createProblem({
        type: "https://httpstatuses.com/400",
        title: "Ugyldig forespørsel",
        status: 400,
        detail: "Status mangler i forespørselen.",
      });
    }

    const updated = await reviewEntry({
      entryId: entry.id,
      status: payload.status,
      reason: payload.reason ?? null,
      actorId: auth.user.id,
    });

    await notifyTeamManagers(entry.teamId, edition.id, payload.status);
    await sendEntryStatusEmails({
      teamId: entry.teamId,
      editionId: edition.id,
      status: payload.status,
      reason: payload.reason ?? null,
    });

    return NextResponse.json(serializeEntry(updated), { status: 200 });
  },
  {
    requireAuth: true,
    roles: ["competition_admin", "global_admin"],
  },
);

async function notifyTeamManagers(
  teamId: string,
  editionId: string,
  status: "approved" | "rejected",
) {
  const team = await db.query.teams.findFirst({
    columns: { name: true },
    where: eq(teams.id, teamId),
  });

  const teamManagers = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.role, "team_manager"),
        eq(userRoles.scopeType, "team"),
        eq(userRoles.scopeId, teamId),
      ),
    );

  const ids = teamManagers.map((row) => row.userId);
  if (!ids.length) {
    return;
  }

  await db.insert(notifications).values(
    ids.map((userId) => ({
      userId,
      type: "entry_status" as const,
      payload: {
        team_id: teamId,
        team_name: team?.name ?? null,
        edition_id: editionId,
        status,
      },
    })),
  );
}

function serializeEntry(entry: typeof entries.$inferSelect) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;

  return {
    id: entry.id,
    team_id: entry.teamId,
    edition_id: entry.editionId,
    status: entry.status,
    notes: entry.notes ?? null,
    submitted_at: entry.submittedAt?.toISOString() ?? null,
    approved_at: entry.approvedAt?.toISOString() ?? null,
    rejected_at: entry.rejectedAt?.toISOString() ?? null,
    decision_reason:
      typeof metadata.decision_reason === "string"
        ? metadata.decision_reason
        : null,
  };
}
