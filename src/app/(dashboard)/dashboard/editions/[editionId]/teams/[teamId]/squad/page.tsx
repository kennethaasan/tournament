import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SquadManager } from "./squad-manager";

type PageProps = {
  params: Promise<{
    editionId?: string;
    teamId?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Troppoppsett",
  description: "Administrer spillertropp for denne utgaven.",
};

export default async function TeamSquadPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { editionId, teamId } = resolvedParams;

  if (!editionId || !teamId) {
    notFound();
  }

  return <SquadManager editionId={editionId} teamId={teamId} />;
}
