import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScheduleDashboard } from "./schedule-dashboard";

type PageProps = {
  params: Promise<{
    editionId?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Kampoppsett og stadier",
  description:
    "Administrer stadier, generer kampoppsett og følg status for denne utgaven.",
};

export default async function EditionSchedulePage({ params }: PageProps) {
  const resolvedParams = await params;
  const editionId = resolvedParams.editionId;
  if (!editionId) {
    notFound();
  }

  return <ScheduleDashboard editionId={editionId} />;
}
