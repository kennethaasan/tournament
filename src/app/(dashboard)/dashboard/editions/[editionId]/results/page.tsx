import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsDashboard } from "./results-dashboard";

type PageProps = {
  params: {
    editionId?: string;
  };
};

export const metadata: Metadata = {
  title: "Resultater",
  description: "Registrer resultater og kampstatus for utgaven.",
};

export default function EditionResultsPage({ params }: PageProps) {
  const editionId = params.editionId;
  if (!editionId) {
    notFound();
  }

  return <ResultsDashboard editionId={editionId} />;
}
