import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  BusinessMetric,
  logger,
  recordBusinessMetric,
} from "@/lib/logger/powertools";
import { createCompetition } from "@/modules/competitions/service";
import { createApiHandler } from "@/server/api/handler";
import { userHasRole } from "@/server/auth";
import { db } from "@/server/db/client";
import { competitions, userRoles } from "@/server/db/schema";

type CreateCompetitionBody = {
  name: string;
  slug: string;
  default_timezone?: string | null;
  description?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  default_edition: {
    label: string;
    slug: string;
    format: string;
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
};

type CompetitionResponse = {
  id: string;
  name: string;
  slug: string;
  primary_venue_id: string | null;
  scoreboard_theme: {
    primary_color: string;
    secondary_color: string;
    background_image_url: string | null;
  };
  created_at: string;
};

type EditionResponse = {
  id: string;
  competition_id: string;
  label: string;
  slug: string;
  status: string;
  format: string;
  registration_window: {
    opens_at: string | null;
    closes_at: string | null;
  };
  scoreboard_rotation_seconds: number;
  published_at: string | null;
};

type CompetitionCreateResponse = {
  competition: CompetitionResponse;
  edition: EditionResponse;
};

export const POST = createApiHandler(
  async ({ request, auth }) => {
    if (!auth) {
      return NextResponse.json(
        {
          type: "https://tournament.app/problems/unauthorized",
          title: "Authentication required",
          status: 401,
          detail: "You must be authenticated to create competitions.",
        },
        { status: 401 },
      );
    }

    const existingCompetitionAdmin = await db
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, auth.user.id),
          eq(userRoles.role, "competition_admin"),
          eq(userRoles.scopeType, "competition"),
        ),
      )
      .limit(1);
    const isFirstCompetition = existingCompetitionAdmin.length === 0;

    const payload = (await request.json()) as CreateCompetitionBody;

    const defaultEdition = payload.default_edition;
    const scoreboardTheme = defaultEdition.scoreboard_theme
      ? {
          primaryColor:
            defaultEdition.scoreboard_theme.primary_color ?? undefined,
          secondaryColor:
            defaultEdition.scoreboard_theme.secondary_color ?? undefined,
          backgroundImageUrl:
            defaultEdition.scoreboard_theme.background_image_url ?? undefined,
        }
      : undefined;

    const editionFormat = defaultEdition.format as
      | "round_robin"
      | "knockout"
      | "hybrid";

    const result = await createCompetition({
      name: payload.name,
      slug: payload.slug,
      defaultTimezone: payload.default_timezone,
      description: payload.description,
      primaryColor: payload.primary_color,
      secondaryColor: payload.secondary_color,
      ownerUserId: auth.user.id,
      defaultEdition: {
        label: defaultEdition.label,
        slug: defaultEdition.slug,
        format: editionFormat,
        registrationWindow: {
          opensAt: defaultEdition.registration_window.opens_at,
          closesAt: defaultEdition.registration_window.closes_at,
        },
        scoreboardRotationSeconds: defaultEdition.scoreboard_rotation_seconds,
        scoreboardTheme,
        timezone: defaultEdition.timezone,
      },
    });

    const settingsTheme = (result.editionSettings.scoreboardTheme as {
      primary_color: string;
      secondary_color: string;
      background_image_url?: string | null;
    }) ?? {
      primary_color:
        payload.default_edition.scoreboard_theme?.primary_color ?? "#0B1F3A",
      secondary_color:
        payload.default_edition.scoreboard_theme?.secondary_color ?? "#FFFFFF",
      background_image_url:
        payload.default_edition.scoreboard_theme?.background_image_url ?? null,
    };

    const response: CompetitionCreateResponse = {
      competition: {
        id: result.competition.id,
        name: result.competition.name,
        slug: result.competition.slug,
        primary_venue_id: null,
        scoreboard_theme: {
          primary_color: settingsTheme.primary_color,
          secondary_color: settingsTheme.secondary_color,
          background_image_url: settingsTheme.background_image_url ?? null,
        },
        created_at: result.competition.createdAt.toISOString(),
      },
      edition: {
        id: result.edition.id,
        competition_id: result.edition.competitionId,
        label: result.edition.label,
        slug: result.edition.slug,
        status: result.edition.status,
        format: result.edition.format,
        registration_window: {
          opens_at: toIsoOrNull(result.edition.registrationOpensAt),
          closes_at: toIsoOrNull(result.edition.registrationClosesAt),
        },
        scoreboard_rotation_seconds:
          result.editionSettings.scoreboardRotationSeconds,
        published_at: null,
      },
    };

    recordBusinessMetric(BusinessMetric.COMPETITION_CREATED);
    if (isFirstCompetition) {
      recordBusinessMetric(BusinessMetric.FIRST_COMPETITION_CREATED);
    }
    logger.info("competition_created", {
      competitionId: result.competition.id,
      editionId: result.edition.id,
    });

    return NextResponse.json(response, { status: 201 });
  },
  {
    requireAuth: true,
  },
);

export const GET = createApiHandler(
  async ({ auth }) => {
    if (!auth) {
      return NextResponse.json(
        {
          type: "https://tournament.app/problems/unauthorized",
          title: "Authentication required",
          status: 401,
          detail: "You must be authenticated to list competitions.",
        },
        { status: 401 },
      );
    }

    const isGlobalAdmin = userHasRole(auth, "global_admin");

    if (isGlobalAdmin) {
      const rows = await db
        .select({
          id: competitions.id,
          name: competitions.name,
          slug: competitions.slug,
        })
        .from(competitions)
        .orderBy(competitions.name);

      return NextResponse.json({ competitions: rows }, { status: 200 });
    }

    const scopedIds = await db
      .select({ scopeId: userRoles.scopeId })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, auth.user.id),
          eq(userRoles.role, "competition_admin"),
          eq(userRoles.scopeType, "competition"),
        ),
      );

    const ids = scopedIds
      .map((row) => row.scopeId)
      .filter((id): id is string => Boolean(id));

    if (!ids.length) {
      return NextResponse.json({ competitions: [] }, { status: 200 });
    }

    const rows = await db
      .select({
        id: competitions.id,
        name: competitions.name,
        slug: competitions.slug,
      })
      .from(competitions)
      .where(inArray(competitions.id, ids))
      .orderBy(competitions.name);

    return NextResponse.json({ competitions: rows }, { status: 200 });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin", "team_manager"],
  },
);

function toIsoOrNull(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}
