import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditionDashboard } from "./edition-dashboard";

type PageProps = {
  params: Promise<{
    editionId?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Utgave - Innstillinger",
  description:
    "Administrer innstillinger, format og registrering for denne utgaven.",
};

export default async function EditionSettingsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const editionId = resolvedParams.editionId;
  if (!editionId) {
    notFound();
  }

  return <EditionDashboard editionId={editionId} />;
}
