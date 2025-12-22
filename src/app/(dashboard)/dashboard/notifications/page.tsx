import type { Metadata } from "next";
import { NotificationsPanel } from "./notifications-panel";

export const metadata: Metadata = {
  title: "Varsler",
  description: "Følg med på systemhendelser og tvister.",
};

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <NotificationsPanel />
    </div>
  );
}
