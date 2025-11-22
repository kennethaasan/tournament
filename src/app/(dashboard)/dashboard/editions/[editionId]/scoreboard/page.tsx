import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScoreboardControl } from "./scoreboard-control";

type PageProps = {
  params: {
    editionId?: string;
  };
};

export const metadata: Metadata = {
  title: "Storskjermkontroll",
  description:
    "Tilpass scoreboard-tema, rotasjon og highlight-overlegg for denne utgaven.",
};

export default function EditionScoreboardPage({ params }: PageProps) {
  const editionId = params.editionId;
  if (!editionId) {
    notFound();
  }

  return <ScoreboardControl editionId={editionId} />;
}
