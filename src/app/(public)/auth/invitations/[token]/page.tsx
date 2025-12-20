import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AcceptInvitationPanel } from "./accept-invitation-panel";

type PageProps = {
  params: {
    token?: string;
  };
};

export const metadata: Metadata = {
  title: "Godta invitasjon",
  description:
    "Godta invitasjonen din og få tilgang til konkurranse- eller lagadministrasjon.",
};

export default function AcceptInvitationPage({ params }: PageProps) {
  const token = params.token;
  if (!token) {
    notFound();
  }

  return <AcceptInvitationPanel token={token} />;
}
