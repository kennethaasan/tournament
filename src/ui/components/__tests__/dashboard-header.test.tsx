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

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/admin/overview",
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

  test("renders navigation links in menu", () => {
    render(<DashboardHeader sections={sections} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Invitasjoner")).toBeInTheDocument();
    expect(screen.getByText("Ny konkurranse")).toBeInTheDocument();
  });

  test("marks current page as active", () => {
    render(<DashboardHeader sections={sections} />);
    // The current path is /dashboard/admin/overview, so Adminoversikt should be active
    const adminLink = screen.getByRole("link", { name: /global admin/i });
    expect(adminLink).toHaveAttribute("aria-current", "page");
  });

  test("non-active links do not have aria-current", () => {
    render(<DashboardHeader sections={sections} />);
    // Use exact text match to avoid matching the description in Adminoversikt
    const revisjonLink = screen.getByRole("link", { name: /revisjon/i });
    expect(revisjonLink).not.toHaveAttribute("aria-current");
  });
});
