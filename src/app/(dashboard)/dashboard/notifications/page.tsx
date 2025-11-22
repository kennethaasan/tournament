import type { Metadata } from "next";
import { NotificationsPanel } from "./notifications-panel";

export const metadata: Metadata = {
  title: "Varsler",
  description: "Følg med på systemhendelser og tvister.",
};

export default function NotificationsPage() {
  return (
    <main className="min-h-screen bg-zinc-50 pb-16">
      <div className="mx-auto w-full max-w-4xl px-6 pb-16 pt-12">
        <NotificationsPanel />
      </div>
    </main>
  );
}
