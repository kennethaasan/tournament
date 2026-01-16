import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsDashboard } from "./results-dashboard";

type PageProps = {
  params: Promise<{
    editionId?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Kamp-administrasjon",
  description: "Administrer kampstatus, poeng og resultater for utgaven.",
};

export default async function EditionResultsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const editionId = resolvedParams.editionId;
  if (!editionId) {
    notFound();
  }

  return <ResultsDashboard editionId={editionId} />;
}
