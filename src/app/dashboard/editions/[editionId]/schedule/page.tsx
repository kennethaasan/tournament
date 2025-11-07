import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScheduleDashboard } from "./schedule-dashboard";

type PageProps = {
  params: {
    editionId?: string;
  };
};

export const metadata: Metadata = {
  title: "Kampoppsett og stadier",
  description:
    "Administrer stadier, generer kampoppsett og følg status for denne utgaven.",
};

export default function EditionSchedulePage({ params }: PageProps) {
  const editionId = params.editionId;
  if (!editionId) {
    notFound();
  }

  return <ScheduleDashboard editionId={editionId} />;
}
