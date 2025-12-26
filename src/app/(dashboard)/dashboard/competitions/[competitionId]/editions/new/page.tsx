import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditionCreateForm } from "./section";

type PageProps = {
  params: Promise<{
    competitionId?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Ny utgave",
  description: "Opprett en ny utgave for konkurransen og tilpass storskjermen.",
};

export const dynamic = "force-dynamic";

export default async function EditionNewPage({ params }: PageProps) {
  const resolvedParams = await params;
  const competitionId = resolvedParams.competitionId;
  if (!competitionId) {
    notFound();
  }

  return <EditionCreateForm competitionId={competitionId} />;
}
