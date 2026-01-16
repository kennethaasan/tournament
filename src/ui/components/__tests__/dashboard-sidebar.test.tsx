import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DashboardSidebar } from "@/ui/components/dashboard-sidebar";
import { buildDashboardSections } from "@/ui/components/navigation-data";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/admin/overview",
}));

afterEach(() => {
  cleanup();
});

describe("DashboardSidebar", () => {
  const sections = buildDashboardSections({
    isGlobalAdmin: true,
    isCompetitionAdmin: true,
    isTeamManager: true,
  });

  test("renders as complementary landmark", () => {
    render(<DashboardSidebar sections={sections} />);
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  test("renders Oversikt section", () => {
    render(<DashboardSidebar sections={sections} />);
    expect(screen.getByText("Oversikt")).toBeInTheDocument();
  });

  test("renders Global administrasjon section", () => {
    render(<DashboardSidebar sections={sections} />);
    expect(screen.getByText("Global administrasjon")).toBeInTheDocument();
  });

  test("renders Administrasjon info panel", () => {
    render(<DashboardSidebar sections={sections} />);
    expect(screen.getByText("Administrasjon")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Hold oversikt over oppgaver, invitasjoner og globale innstillinger.",
      ),
    ).toBeInTheDocument();
  });

  test("renders navigation links", () => {
    render(<DashboardSidebar sections={sections} />);
    expect(screen.getByText("Global admin")).toBeInTheDocument();
    expect(screen.getByText("Revisjon")).toBeInTheDocument();
    expect(screen.getByText("Ny konkurranse")).toBeInTheDocument();
  });

  test("marks current page as active", () => {
    render(<DashboardSidebar sections={sections} />);
    const adminLink = screen.getByRole("link", { name: /global admin/i });
    expect(adminLink).toHaveAttribute("aria-current", "page");
  });

  test("non-active links do not have aria-current", () => {
    render(<DashboardSidebar sections={sections} />);
    const revisjonLink = screen.getByRole("link", { name: /revisjon/i });
    expect(revisjonLink).not.toHaveAttribute("aria-current");
  });

  test("active link has active styling", () => {
    render(<DashboardSidebar sections={sections} />);
    const adminLink = screen.getByRole("link", { name: /global admin/i });
    expect(adminLink).toHaveClass("bg-primary/15");
  });

  test("non-active link has inactive styling", () => {
    render(<DashboardSidebar sections={sections} />);
    const revisjonLink = screen.getByRole("link", { name: /revisjon/i });
    expect(revisjonLink).toHaveClass("text-muted-foreground");
  });
});
