import type { Metadata } from "next";
import type { components } from "@/lib/api/generated/openapi";
import { getPublicScoreboard } from "@/modules/public/scoreboard-service";
import {
  DEFAULT_ROTATION,
  fromApiScoreboardPayload,
  type ScoreboardData,
} from "@/modules/public/scoreboard-types";
import {
  ScoreboardProviders,
  ScoreboardScreen,
} from "@/ui/components/scoreboard/scoreboard-layout";

type PageParams = {
  competitionSlug: string;
  editionSlug: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const scoreboard = await loadScoreboard(resolvedParams);

  return {
    title: `${scoreboard.edition.label} · Offentlig visning`,
    description:
      "Publikumsvisning med resultater, tabell, toppscorere og storskjermmodus.",
  };
}

export default async function ScoreboardPage({ params }: PageProps) {
  const resolvedParams = await params;
  const scoreboard = await loadScoreboard(resolvedParams);

  return (
    <ScoreboardProviders>
      <ScoreboardScreen
        initialData={scoreboard}
        competitionSlug={resolvedParams.competitionSlug}
        editionSlug={resolvedParams.editionSlug}
      />
    </ScoreboardProviders>
  );
}

async function loadScoreboard(params: PageParams): Promise<ScoreboardData> {
  try {
    return await getPublicScoreboard({
      competitionSlug: params.competitionSlug,
      editionSlug: params.editionSlug,
    });
  } catch {
    return buildFallbackScoreboard(params);
  }
}

function buildFallbackScoreboard(params: PageParams): ScoreboardData {
  const now = new Date().toISOString();
  const payload: components["schemas"]["ScoreboardPayload"] = {
    edition: {
      id: `${params.editionSlug}-edition`,
      competition_id: `${params.competitionSlug}-competition`,
      label: params.editionSlug,
      slug: params.editionSlug,
      status: "published",
      format: "round_robin",
      registration_window: {
        opens_at: now,
        closes_at: now,
      },
      scoreboard_rotation_seconds: 3,
      scoreboard_theme: {
        primary_color: "#0B1F3A",
        secondary_color: "#F2F4FF",
        background_image_url: null,
      },
      published_at: now,
    },
    matches: [],
    standings: [],
    top_scorers: [],
    rotation: DEFAULT_ROTATION,
  };

  const parsed = fromApiScoreboardPayload(payload);

  return {
    ...parsed,
    edition: {
      ...parsed.edition,
      competitionSlug: params.competitionSlug,
    },
  };
}
