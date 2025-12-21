import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { assertEditionAdminAccess } from "@/server/api/edition-access";
import { createApiHandler } from "@/server/api/handler";
import { db } from "@/server/db/client";
import { entries, teams } from "@/server/db/schema";

type RouteParams = {
  editionId: string;
};

export const GET = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;

    const edition = await assertEditionAdminAccess(editionId, auth);

    const rows = await db
      .select({
        entryId: entries.id,
        teamId: teams.id,
        teamName: teams.name,
        teamSlug: teams.slug,
        status: entries.status,
        notes: entries.notes,
        submittedAt: entries.submittedAt,
        approvedAt: entries.approvedAt,
        rejectedAt: entries.rejectedAt,
        metadata: entries.metadata,
      })
      .from(entries)
      .innerJoin(teams, eq(entries.teamId, teams.id))
      .where(eq(entries.editionId, edition.id))
      .orderBy(asc(entries.submittedAt));

    const payload = rows.map((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      return {
        entry: {
          id: row.entryId,
          team_id: row.teamId,
          edition_id: edition.id,
          status: row.status,
          notes: row.notes ?? null,
          submitted_at: row.submittedAt?.toISOString() ?? null,
          approved_at: row.approvedAt?.toISOString() ?? null,
          rejected_at: row.rejectedAt?.toISOString() ?? null,
          decision_reason:
            typeof metadata.decision_reason === "string"
              ? metadata.decision_reason
              : null,
        },
        team: {
          id: row.teamId,
          name: row.teamName,
          slug: row.teamSlug,
        },
      };
    });

    return NextResponse.json({ entries: payload }, { status: 200 });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);
