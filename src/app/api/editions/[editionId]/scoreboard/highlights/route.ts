import { NextResponse } from "next/server";
import type { getEditionScoreboardSummary } from "@/modules/editions/service";
import {
  clearScoreboardHighlight,
  triggerScoreboardHighlight,
} from "@/modules/editions/service";
import { assertEditionAdminAccess } from "@/server/api/edition-access";
import { createApiHandler } from "@/server/api/handler";

type RouteParams = {
  editionId: string;
};

type HighlightBody = {
  message: string;
  duration_seconds: number;
};

export const POST = createApiHandler<RouteParams>(
  async ({ request, params, auth }) => {
    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;
    const edition = await assertEditionAdminAccess(editionId, auth);
    const payload = (await request.json()) as HighlightBody;

    const summary = await triggerScoreboardHighlight({
      editionId: edition.id,
      message: payload.message,
      durationSeconds: payload.duration_seconds,
      actorId: auth?.user.id ?? null,
    });

    return NextResponse.json(serializeScoreboardSummary(summary), {
      status: 201,
    });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

export const DELETE = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;
    const edition = await assertEditionAdminAccess(editionId, auth);
    const summary = await clearScoreboardHighlight(edition.id);

    return NextResponse.json(serializeScoreboardSummary(summary), {
      status: 200,
    });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

function serializeScoreboardSummary(
  summary: Awaited<ReturnType<typeof getEditionScoreboardSummary>>,
) {
  return {
    edition: {
      id: summary.edition.id,
      label: summary.edition.label,
      status: summary.edition.status,
      scoreboard_rotation_seconds: summary.edition.scoreboardRotationSeconds,
      scoreboard_modules: summary.edition.scoreboardModules,
      entries_locked_at: summary.edition.entriesLockedAt
        ? summary.edition.entriesLockedAt.toISOString()
        : null,
      scoreboard_theme: {
        primary_color: summary.edition.scoreboardTheme.primaryColor,
        secondary_color: summary.edition.scoreboardTheme.secondaryColor,
        background_image_url:
          summary.edition.scoreboardTheme.backgroundImageUrl,
      },
    },
    highlight: summary.highlight
      ? {
          message: summary.highlight.message,
          expires_at: summary.highlight.expiresAt.toISOString(),
          remaining_seconds: summary.highlight.remainingSeconds,
        }
      : null,
  };
}
