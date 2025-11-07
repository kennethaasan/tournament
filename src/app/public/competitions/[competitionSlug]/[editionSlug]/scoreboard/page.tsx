import type { Metadata } from "next";
import { getPublicScoreboard } from "@/modules/public/scoreboard-service";
import {
  ScoreboardProviders,
  ScoreboardScreen,
} from "@/ui/components/scoreboard/scoreboard-layout";

type PageParams = {
  competitionSlug: string;
  editionSlug: string;
};

type PageProps = {
  params: PageParams;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const scoreboard = await getPublicScoreboard({
    competitionSlug: params.competitionSlug,
    editionSlug: params.editionSlug,
  });

  return {
    title: `${scoreboard.edition.label} · Public scoreboard`,
    description: "Live scores, standings, and top scorers for spectators.",
  };
}

export default async function ScoreboardPage({ params }: PageProps) {
  const scoreboard = await getPublicScoreboard({
    competitionSlug: params.competitionSlug,
    editionSlug: params.editionSlug,
  });

  return (
    <ScoreboardProviders>
      <ScoreboardScreen
        initialData={scoreboard}
        competitionSlug={params.competitionSlug}
        editionSlug={params.editionSlug}
      />
    </ScoreboardProviders>
  );
}
