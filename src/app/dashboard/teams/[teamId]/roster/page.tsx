import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RosterManager } from "./roster-manager";

type PageProps = {
  params: {
    teamId?: string;
  };
};

export const metadata: Metadata = {
  title: "Lagoppsett",
  description: "Administrer lagets roster og roller.",
};

export default function TeamRosterPage({ params }: PageProps) {
  const teamId = params.teamId;
  if (!teamId) {
    notFound();
  }

  return <RosterManager teamId={teamId} />;
}
