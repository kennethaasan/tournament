import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntriesManager } from "./entries-manager";

type PageProps = {
  params: Promise<{
    teamId?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Påmeldinger og tropp",
  description: "Administrer påmeldinger og troppssammensetning for laget.",
};

export default async function TeamEntriesPage({ params }: PageProps) {
  const resolvedParams = await params;
  const teamId = resolvedParams.teamId;
  if (!teamId) {
    notFound();
  }

  return <EntriesManager teamId={teamId} />;
}
