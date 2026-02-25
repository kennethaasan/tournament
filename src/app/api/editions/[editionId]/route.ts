import { NextResponse } from "next/server";
import {
  type EditionDetail,
  getEditionDetail,
  getEditionScoreboardSummary,
  updateEdition,
  updateEditionScoreboardSettings,
} from "@/modules/editions/service";
import { assertEditionAdminAccess } from "@/server/api/edition-access";
import { createApiHandler } from "@/server/api/handler";

type PatchEditionBody = {
  label?: string | null;
  slug?: string | null;
  status?: "draft" | "published" | "archived" | null;
  format?: "round_robin" | "knockout" | "hybrid" | null;
  timezone?: string | null;
  registration_window?: {
    opens_at?: string | null;
    closes_at?: string | null;
  } | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  scoreboard_rotation_seconds?: number | null;
  scoreboard_modules?: Array<
    "live_matches" | "upcoming" | "standings" | "top_scorers"
  > | null;
  scoreboard_theme?: {
    primary_color?: string | null;
    secondary_color?: string | null;
    background_image_url?: string | null;
  } | null;
  entries_locked?: boolean | null;
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
    const [detail, scoreboardSummary] = await Promise.all([
      getEditionDetail(edition.id),
      getEditionScoreboardSummary(edition.id),
    ]);

    return NextResponse.json(
      serializeEditionResponse(detail, scoreboardSummary),
      {
        status: 200,
      },
    );
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

    // Check if we have core edition updates
    const hasCoreUpdates =
      payload.label !== undefined ||
      payload.slug !== undefined ||
      payload.status !== undefined ||
      payload.format !== undefined ||
      payload.timezone !== undefined ||
      payload.registration_window !== undefined ||
      payload.contact_email !== undefined ||
      payload.contact_phone !== undefined;

    // Check if we have scoreboard updates
    const hasScoreboardUpdates =
      payload.scoreboard_rotation_seconds !== undefined ||
      payload.scoreboard_modules !== undefined ||
      payload.scoreboard_theme !== undefined ||
      payload.entries_locked !== undefined;

    // Update core edition fields if provided
    if (hasCoreUpdates) {
      await updateEdition({
        editionId: edition.id,
        label: payload.label ?? undefined,
        slug: payload.slug ?? undefined,
        status: payload.status ?? undefined,
        format: payload.format ?? undefined,
        timezone: payload.timezone ?? undefined,
        registrationOpensAt: payload.registration_window?.opens_at
          ? new Date(payload.registration_window.opens_at)
          : payload.registration_window?.opens_at === null
            ? null
            : undefined,
        registrationClosesAt: payload.registration_window?.closes_at
          ? new Date(payload.registration_window.closes_at)
          : payload.registration_window?.closes_at === null
            ? null
            : undefined,
        contactEmail: payload.contact_email,
        contactPhone: payload.contact_phone,
      });
    }

    // Update scoreboard settings if provided
    if (hasScoreboardUpdates) {
      await updateEditionScoreboardSettings({
        editionId: edition.id,
        scoreboardRotationSeconds:
          payload.scoreboard_rotation_seconds ?? undefined,
        scoreboardModules: payload.scoreboard_modules ?? undefined,
        scoreboardTheme: payload.scoreboard_theme
          ? {
              primaryColor: payload.scoreboard_theme.primary_color ?? undefined,
              secondaryColor:
                payload.scoreboard_theme.secondary_color ?? undefined,
              backgroundImageUrl:
                payload.scoreboard_theme.background_image_url ?? undefined,
            }
          : undefined,
        entriesLocked: payload.entries_locked ?? undefined,
      });
    }

    // Return updated edition with scoreboard summary
    const [detail, scoreboardSummary] = await Promise.all([
      getEditionDetail(edition.id),
      getEditionScoreboardSummary(edition.id),
    ]);

    return NextResponse.json(
      serializeEditionResponse(detail, scoreboardSummary),
      {
        status: 200,
      },
    );
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

function serializeEditionResponse(
  detail: EditionDetail,
  scoreboardSummary: Awaited<ReturnType<typeof getEditionScoreboardSummary>>,
) {
  return {
    edition: {
      id: detail.id,
      competition_id: detail.competitionId,
      competition_name: detail.competitionName,
      competition_slug: detail.competitionSlug,
      label: detail.label,
      slug: detail.slug,
      format: detail.format,
      timezone: detail.timezone,
      status: detail.status,
      registration_window: {
        opens_at: detail.registrationOpensAt?.toISOString() ?? null,
        closes_at: detail.registrationClosesAt?.toISOString() ?? null,
      },
      contact_email: detail.contactEmail,
      contact_phone: detail.contactPhone,
      scoreboard_rotation_seconds:
        scoreboardSummary.edition.scoreboardRotationSeconds,
      scoreboard_modules: scoreboardSummary.edition.scoreboardModules,
      entries_locked_at: scoreboardSummary.edition.entriesLockedAt
        ? scoreboardSummary.edition.entriesLockedAt.toISOString()
        : null,
      scoreboard_theme: {
        primary_color: scoreboardSummary.edition.scoreboardTheme.primaryColor,
        secondary_color:
          scoreboardSummary.edition.scoreboardTheme.secondaryColor,
        background_image_url:
          scoreboardSummary.edition.scoreboardTheme.backgroundImageUrl,
      },
      created_at: detail.createdAt.toISOString(),
      updated_at: detail.updatedAt.toISOString(),
    },
    highlight: scoreboardSummary.highlight
      ? {
          message: scoreboardSummary.highlight.message,
          expires_at: scoreboardSummary.highlight.expiresAt.toISOString(),
          remaining_seconds: scoreboardSummary.highlight.remainingSeconds,
        }
      : null,
  };
}
