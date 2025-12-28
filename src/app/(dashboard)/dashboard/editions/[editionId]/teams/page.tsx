import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditionTeamsDashboard } from "./teams-dashboard";

type PageProps = {
  params: Promise<{
    editionId?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Lag og tropp",
  description: "Administrer lagene som er påmeldt denne utgaven.",
};

export default async function EditionTeamsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const editionId = resolvedParams.editionId;
  if (!editionId) {
    notFound();
  }

  return <EditionTeamsDashboard editionId={editionId} />;
}
