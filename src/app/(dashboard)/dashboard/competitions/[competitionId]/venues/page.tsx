import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VenuesPanel } from "./venues-panel";

type PageProps = {
  params: Promise<{
    competitionId?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Arenaer",
  description: "Administrer arenaer og baner for konkurransen.",
};

export default async function CompetitionVenuesPage({ params }: PageProps) {
  const resolvedParams = await params;
  const competitionId = resolvedParams.competitionId;
  if (!competitionId) {
    notFound();
  }

  return <VenuesPanel competitionId={competitionId} />;
}
