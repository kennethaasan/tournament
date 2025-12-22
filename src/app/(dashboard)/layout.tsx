import { DashboardHeader } from "@/ui/components/dashboard-header";
import { DashboardSidebar } from "@/ui/components/dashboard-sidebar";
import { SiteNavbar } from "@/ui/components/site-navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-shell min-h-screen">
      <SiteNavbar layout="dashboard" />
      <div className="grid-overlay absolute inset-0" aria-hidden />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] gap-6 px-4 py-6 lg:px-6">
        <DashboardSidebar />
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <DashboardHeader />
          <main className="min-w-0 flex-1 rounded-3xl border border-border/60 bg-background/75 p-6 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.45)] backdrop-blur">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
