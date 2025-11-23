import { DashboardHeader } from "@/ui/components/dashboard-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <DashboardHeader />
      <div className="page-padding flex-1 space-y-6">
        <div className="grid-overlay absolute inset-0" aria-hidden />
        {children}
      </div>
    </div>
  );
}
