import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RosterManager } from "./roster-manager";

type PageProps = {
  params: Promise<{
    teamId?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Lagoppsett",
  description: "Administrer lagets roster og roller.",
};

export default async function TeamRosterPage({ params }: PageProps) {
  const resolvedParams = await params;
  const teamId = resolvedParams.teamId;
  if (!teamId) {
    notFound();
  }

  return <RosterManager teamId={teamId} />;
}
