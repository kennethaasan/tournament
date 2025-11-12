import { NextResponse } from "next/server";
import { createEdition } from "@/modules/competitions/service";
import { createApiHandler } from "@/server/api/handler";

type CreateEditionBody = {
  label: string;
  slug: string;
  format: "round_robin" | "knockout" | "hybrid";
  timezone?: string | null;
  scoreboard_rotation_seconds?: number | null;
  scoreboard_theme?: {
    primary_color?: string | null;
    secondary_color?: string | null;
    background_image_url?: string | null;
  };
  registration_window: {
    opens_at: string;
    closes_at: string;
  };
};

type RouteParams = {
  competitionId: string;
};

export const POST = createApiHandler<RouteParams>(
  async ({ request, params, auth }) => {
    if (!auth) {
      return NextResponse.json(
        {
          type: "https://tournament.app/problems/unauthorized",
          title: "Authentication required",
          status: 401,
          detail: "You must be authenticated to create editions.",
        },
        { status: 401 },
      );
    }

    const competitionId = Array.isArray(params.competitionId)
      ? params.competitionId[0]
      : params.competitionId;

    if (!competitionId) {
      return NextResponse.json(
        {
          type: "https://tournament.app/problems/invalid-competition",
          title: "Competition identifier missing",
          status: 400,
          detail: "Provide a valid competition identifier.",
        },
        { status: 400 },
      );
    }

    const payload = (await request.json()) as CreateEditionBody;

    const editionResult = await createEdition({
      competitionId,
      label: payload.label,
      slug: payload.slug,
      format: payload.format,
      registrationWindow: {
        opensAt: payload.registration_window.opens_at,
        closesAt: payload.registration_window.closes_at,
      },
      scoreboardRotationSeconds: payload.scoreboard_rotation_seconds,
      scoreboardTheme: payload.scoreboard_theme
        ? {
            primaryColor: payload.scoreboard_theme.primary_color ?? undefined,
            secondaryColor:
              payload.scoreboard_theme.secondary_color ?? undefined,
            backgroundImageUrl:
              payload.scoreboard_theme.background_image_url ?? undefined,
          }
        : undefined,
      timezone: payload.timezone,
    });

    return NextResponse.json(
      {
        id: editionResult.edition.id,
        competition_id: editionResult.edition.competitionId,
        label: editionResult.edition.label,
        slug: editionResult.edition.slug,
        status: editionResult.edition.status,
        format: editionResult.edition.format,
        registration_window: {
          opens_at: toIsoOrNull(editionResult.edition.registrationOpensAt),
          closes_at: toIsoOrNull(editionResult.edition.registrationClosesAt),
        },
        scoreboard_rotation_seconds:
          editionResult.editionSettings.scoreboardRotationSeconds,
        published_at: null,
      },
      { status: 201 },
    );
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

function toIsoOrNull(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}
