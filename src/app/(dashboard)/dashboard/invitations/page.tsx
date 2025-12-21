import type { Metadata } from "next";
import { InvitationsPanel } from "./invitations-panel";

export const metadata: Metadata = {
  title: "Invitasjoner",
  description: "Send invitasjoner til administratorer og lagledere.",
};

export default function InvitationsPage() {
  return <InvitationsPanel />;
}
