import { NextResponse } from "next/server";
import { createProblem } from "@/lib/errors/problem";
import {
  getCompetitionDetail,
  type ScoreboardTheme,
} from "@/modules/admin/service";
import { createApiHandler } from "@/server/api/handler";
import { userHasRole } from "@/server/auth";

type RouteParams = {
  competitionId: string;
};

const FALLBACK_THEME: ScoreboardTheme = {
  primaryColor: "#0B1F3A",
  secondaryColor: "#FFFFFF",
  backgroundImageUrl: null,
};

export const GET = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
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

    if (!auth) {
      throw createProblem({
        type: "https://httpstatuses.com/401",
        title: "Autentisering kreves",
        status: 401,
        detail: "Du må være innlogget for å se konkurransedetaljer.",
      });
    }

    if (!userHasRole(auth, "global_admin")) {
      const hasScopedAccess = auth.user.roles.some(
        (assignment) =>
          assignment.role === "competition_admin" &&
          assignment.scopeType === "competition" &&
          assignment.scopeId === competitionId,
      );

      if (!hasScopedAccess) {
        throw createProblem({
          type: "https://httpstatuses.com/403",
          title: "Ingen tilgang",
          status: 403,
          detail: "Du har ikke rettigheter til å vise denne konkurransen.",
        });
      }
    }

    const competition = await getCompetitionDetail(competitionId);

    const editionTheme =
      competition.editions[0]?.scoreboardTheme ?? FALLBACK_THEME;
    const scoreboardTheme = {
      primary_color: competition.primaryColor ?? editionTheme.primaryColor,
      secondary_color:
        competition.secondaryColor ?? editionTheme.secondaryColor,
      background_image_url: editionTheme.backgroundImageUrl,
    };

    const response = {
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

    return NextResponse.json(response, { status: 200 });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);
