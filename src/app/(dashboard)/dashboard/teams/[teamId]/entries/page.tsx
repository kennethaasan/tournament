import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntriesManager } from "./entries-manager";

type PageProps = {
  params: {
    teamId?: string;
  };
};

export const metadata: Metadata = {
  title: "Påmeldinger og tropp",
  description: "Administrer påmeldinger og troppssammensetning for laget.",
};

export default function TeamEntriesPage({ params }: PageProps) {
  const teamId = params.teamId;
  if (!teamId) {
    notFound();
  }

  return <EntriesManager teamId={teamId} />;
}
