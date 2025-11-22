import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditionCreateForm } from "./section";

type PageProps = {
  params: {
    competitionId?: string;
  };
};

export const metadata: Metadata = {
  title: "Ny utgave",
  description: "Opprett en ny utgave for konkurransen og tilpass storskjermen.",
};

export default function EditionNewPage({ params }: PageProps) {
  const competitionId = params.competitionId;
  if (!competitionId) {
    notFound();
  }

  return <EditionCreateForm competitionId={competitionId} />;
}
