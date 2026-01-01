import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { DashboardSidebar } from "@/ui/components/dashboard-sidebar";

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
  test("renders as complementary landmark", () => {
    render(<DashboardSidebar />);
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  test("renders Hurtigtilgang section", () => {
    render(<DashboardSidebar />);
    expect(screen.getByText("Hurtigtilgang")).toBeInTheDocument();
  });

  test("renders Operativt section", () => {
    render(<DashboardSidebar />);
    expect(screen.getByText("Operativt")).toBeInTheDocument();
  });

  test("renders Administrasjon info panel", () => {
    render(<DashboardSidebar />);
    expect(screen.getByText("Administrasjon")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Hold oversikt over konkurranser, utgaver og lag fra sidemenyen.",
      ),
    ).toBeInTheDocument();
  });

  test("renders navigation links", () => {
    render(<DashboardSidebar />);
    expect(screen.getByText("Adminoversikt")).toBeInTheDocument();
    expect(screen.getByText("Revisjon")).toBeInTheDocument();
    expect(screen.getByText("Ny konkurranse")).toBeInTheDocument();
  });

  test("marks current page as active", () => {
    render(<DashboardSidebar />);
    const adminLink = screen.getByRole("link", { name: /adminoversikt/i });
    expect(adminLink).toHaveAttribute("aria-current", "page");
  });

  test("non-active links do not have aria-current", () => {
    render(<DashboardSidebar />);
    const revisjonLink = screen.getByRole("link", { name: /revisjon/i });
    expect(revisjonLink).not.toHaveAttribute("aria-current");
  });

  test("active link has active styling", () => {
    render(<DashboardSidebar />);
    const adminLink = screen.getByRole("link", { name: /adminoversikt/i });
    expect(adminLink).toHaveClass("bg-primary/15");
  });

  test("non-active link has inactive styling", () => {
    render(<DashboardSidebar />);
    const revisjonLink = screen.getByRole("link", { name: /revisjon/i });
    expect(revisjonLink).toHaveClass("text-muted-foreground");
  });
});
