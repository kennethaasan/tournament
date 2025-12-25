import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VenuesPanel } from "./venues-panel";

type PageProps = {
  params: {
    competitionId?: string;
  };
};

export const metadata: Metadata = {
  title: "Arenaer",
  description: "Administrer arenaer og baner for konkurransen.",
};

export default function CompetitionVenuesPage({ params }: PageProps) {
  const competitionId = params.competitionId;
  if (!competitionId) {
    notFound();
  }

  return <VenuesPanel competitionId={competitionId} />;
}
