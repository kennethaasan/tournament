import { NextResponse } from "next/server";
import {
  getEditionScoreboardSummary,
  updateEditionScoreboardSettings,
} from "@/modules/editions/service";
import { assertEditionAdminAccess } from "@/server/api/edition-access";
import { createApiHandler } from "@/server/api/handler";

type PatchEditionBody = {
  scoreboard_rotation_seconds?: number | null;
  scoreboard_theme?: {
    primary_color?: string | null;
    secondary_color?: string | null;
    background_image_url?: string | null;
  } | null;
};

type RouteParams = {
  editionId: string;
};

export const GET = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;
    const edition = await assertEditionAdminAccess(editionId, auth);
    const summary = await getEditionScoreboardSummary(edition.id);

    return NextResponse.json(serializeScoreboardSummary(summary), {
      status: 200,
    });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

export const PATCH = createApiHandler<RouteParams>(
  async ({ request, params, auth }) => {
    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;
    const edition = await assertEditionAdminAccess(editionId, auth);
    const payload = (await request.json()) as PatchEditionBody;

    const summary = await updateEditionScoreboardSettings({
      editionId: edition.id,
      scoreboardRotationSeconds:
        payload.scoreboard_rotation_seconds ?? undefined,
      scoreboardTheme: payload.scoreboard_theme
        ? {
            primaryColor: payload.scoreboard_theme.primary_color ?? undefined,
            secondaryColor:
              payload.scoreboard_theme.secondary_color ?? undefined,
            backgroundImageUrl:
              payload.scoreboard_theme.background_image_url ?? undefined,
          }
        : undefined,
    });

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
