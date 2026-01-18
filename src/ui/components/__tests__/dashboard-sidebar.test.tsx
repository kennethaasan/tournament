import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DashboardSidebar } from "@/ui/components/dashboard-sidebar";
import { buildDashboardSections } from "@/ui/components/navigation-data";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
  })),
}));

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

const mockUsePathname = vi.fn(() => "/dashboard/admin/overview");

vi.mock("next/navigation", () => ({
  useParams: () => ({}),
  usePathname: () => mockUsePathname(),
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

  test("renders Oversikt section when it has non-redundant links", () => {
    // Competition admin who is NOT global admin will see "Mine konkurranser"
    const compAdminSections = buildDashboardSections({
      isGlobalAdmin: false,
      isCompetitionAdmin: true,
      isTeamManager: false,
    });
    render(<DashboardSidebar sections={compAdminSections} />);
    expect(screen.getByText("Oversikt")).toBeInTheDocument();
    expect(screen.getByText("Mine konkurranser")).toBeInTheDocument();
  });

  test("does not render Global administrasjon section", () => {
    render(<DashboardSidebar sections={sections} />);
    expect(screen.queryByText("Global administrasjon")).not.toBeInTheDocument();
  });

  test("renders system status panel", () => {
    render(<DashboardSidebar sections={sections} />);
    expect(screen.getByText("System Status")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Logget inn som administrator. Alle handlinger logges i systemets revisjonsspor.",
      ),
    ).toBeInTheDocument();
  });

  test("marks current page as active when link exists", () => {
    const compAdminSections = buildDashboardSections({
      isGlobalAdmin: false,
      isCompetitionAdmin: true,
      isTeamManager: false,
    });

    // Set pathname to Mine konkurranser
    mockUsePathname.mockReturnValue("/dashboard/competitions");

    render(<DashboardSidebar sections={compAdminSections} />);
    const competitionsLink = screen.getByRole("link", {
      name: /mine konkurranser/i,
    });
    expect(competitionsLink).toHaveAttribute("aria-current", "page");
    expect(competitionsLink).toHaveClass("bg-primary/10");
  });
});
