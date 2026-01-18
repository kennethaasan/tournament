import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DashboardHeader } from "@/ui/components/dashboard-header";
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

const mockUsePathname = vi.fn(() => "/dashboard/admin/overview");

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("@/ui/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Theme Toggle</button>,
}));

afterEach(() => {
  cleanup();
});

describe("DashboardHeader", () => {
  const sections = buildDashboardSections({
    isGlobalAdmin: true,
    isCompetitionAdmin: true,
    isTeamManager: true,
  });

  test("renders header element", () => {
    render(<DashboardHeader sections={sections} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  test("renders home link with trophy emoji", () => {
    render(<DashboardHeader sections={sections} />);
    const homeLink = screen.getByRole("link", { name: /turneringsadmin/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  test("renders menu button", () => {
    render(<DashboardHeader sections={sections} />);
    expect(screen.getByText("Meny")).toBeInTheDocument();
  });

  test("renders theme toggle", () => {
    render(<DashboardHeader sections={sections} />);
    expect(screen.getByText("Theme Toggle")).toBeInTheDocument();
  });

  test("renders navigation links in menu when they are not redundant", () => {
    // Competition admin who is NOT global admin will see "Mine konkurranser"
    const compAdminSections = buildDashboardSections({
      isGlobalAdmin: false,
      isCompetitionAdmin: true,
      isTeamManager: false,
    });
    render(<DashboardHeader sections={compAdminSections} />);
    expect(screen.getByText("Mine konkurranser")).toBeInTheDocument();
  });

  test("does not render redundant links or global admin links", () => {
    render(<DashboardHeader sections={sections} />);
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Invitasjoner")).not.toBeInTheDocument();
    expect(screen.queryByText("Ny konkurranse")).not.toBeInTheDocument();
  });

  test("marks current page as active when link exists", () => {
    const compAdminSections = buildDashboardSections({
      isGlobalAdmin: false,
      isCompetitionAdmin: true,
      isTeamManager: false,
    });

    // Use a path that exists in the filtered menu
    mockUsePathname.mockReturnValue("/dashboard/competitions");

    render(<DashboardHeader sections={compAdminSections} />);
    const competitionsLink = screen.getByRole("link", {
      name: /mine konkurranser/i,
    });
    expect(competitionsLink).toHaveAttribute("aria-current", "page");
  });
});
