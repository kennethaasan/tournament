import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AcceptInvitationPanel } from "./accept-invitation-panel";

type PageProps = {
  params: Promise<{
    token?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Godta invitasjon",
  description:
    "Godta invitasjonen din og få tilgang til konkurranse- eller lagadministrasjon.",
};

export default async function AcceptInvitationPage({ params }: PageProps) {
  const resolvedParams = await params;
  const token = resolvedParams.token;
  if (!token) {
    notFound();
  }

  return <AcceptInvitationPanel token={token} />;
}
