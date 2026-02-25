import { NextResponse } from "next/server";
import { createProblem } from "@/lib/errors/problem";
import {
  getCompetitionDetail,
  type ScoreboardTheme,
} from "@/modules/admin/service";
import { setCompetitionArchivedState } from "@/modules/competitions/service";
import { assertCompetitionAdminAccess } from "@/server/api/access";
import { createApiHandler } from "@/server/api/handler";

type RouteParams = {
  competitionId: string;
};

type PatchCompetitionBody = {
  archived?: boolean | null;
};

const FALLBACK_THEME: ScoreboardTheme = {
  primaryColor: "#0B1F3A",
  secondaryColor: "#FFFFFF",
  backgroundImageUrl: null,
};

export const GET = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const competitionId = resolveCompetitionId(params);
    await assertCompetitionAdminAccess(competitionId, auth);

    const competition = await getCompetitionDetail(competitionId);
    return NextResponse.json(serializeCompetitionDetail(competition), {
      status: 200,
    });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

export const PATCH = createApiHandler<RouteParams>(
  async ({ params, request, auth }) => {
    const competitionId = resolveCompetitionId(params);
    await assertCompetitionAdminAccess(competitionId, auth);
    const payload = (await request.json()) as PatchCompetitionBody;

    if (typeof payload.archived !== "boolean") {
      throw createProblem({
        type: "https://httpstatuses.com/400",
        title: "Ugyldig forespørsel",
        status: 400,
        detail: "Feltet archived må være true eller false.",
      });
    }

    await setCompetitionArchivedState({
      competitionId,
      archived: payload.archived,
    });
    const competition = await getCompetitionDetail(competitionId);

    return NextResponse.json(serializeCompetitionDetail(competition), {
      status: 200,
    });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

export const DELETE = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    const competitionId = resolveCompetitionId(params);
    await assertCompetitionAdminAccess(competitionId, auth);
    await setCompetitionArchivedState({
      competitionId,
      archived: true,
    });
    const competition = await getCompetitionDetail(competitionId);

    return NextResponse.json(serializeCompetitionDetail(competition), {
      status: 200,
    });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

function resolveCompetitionId(params: RouteParams): string {
  const competitionIdRaw = params.competitionId;
  const competitionId = Array.isArray(competitionIdRaw)
    ? competitionIdRaw[0]
    : competitionIdRaw;

  if (!competitionId) {
    throw createProblem({
      type: "https://httpstatuses.com/400",
      title: "Ugyldig forespørsel",
      status: 400,
      detail: "competitionId mangler i URLen.",
    });
  }

  return competitionId;
}

function serializeCompetitionDetail(
  competition: Awaited<ReturnType<typeof getCompetitionDetail>>,
) {
  const editionTheme =
    competition.editions[0]?.scoreboardTheme ?? FALLBACK_THEME;
  const scoreboardTheme = {
    primary_color: competition.primaryColor ?? editionTheme.primaryColor,
    secondary_color: competition.secondaryColor ?? editionTheme.secondaryColor,
    background_image_url: editionTheme.backgroundImageUrl,
  };

  return {
    id: competition.id,
    name: competition.name,
    slug: competition.slug,
    primary_venue_id: null,
    scoreboard_theme: scoreboardTheme,
    created_at: competition.createdAt.toISOString(),
    default_timezone: competition.defaultTimezone,
    description: competition.description,
    archived_at: competition.archivedAt
      ? competition.archivedAt.toISOString()
      : null,
    editions: competition.editions.map((edition) => ({
      id: edition.id,
      competition_id: edition.competitionId,
      label: edition.label,
      slug: edition.slug,
      status: edition.status,
      format: edition.format,
      registration_window: {
        opens_at: edition.registrationOpensAt
          ? edition.registrationOpensAt.toISOString()
          : null,
        closes_at: edition.registrationClosesAt
          ? edition.registrationClosesAt.toISOString()
          : null,
      },
      scoreboard_rotation_seconds: edition.scoreboardRotationSeconds,
      published_at: edition.publishedAt
        ? edition.publishedAt.toISOString()
        : null,
    })),
    administrators: competition.administrators.map((administrator) => ({
      id: administrator.userId,
      name: administrator.name,
      email: administrator.email,
    })),
  };
}
