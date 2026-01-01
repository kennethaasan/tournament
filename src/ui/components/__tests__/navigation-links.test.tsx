import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  NavigationGrid,
  navigationLinks,
} from "@/ui/components/navigation-links";

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

describe("navigationLinks", () => {
  test("exports navigation links array", () => {
    expect(navigationLinks).toBeInstanceOf(Array);
    expect(navigationLinks.length).toBeGreaterThan(0);
  });

  test("each link has required properties", () => {
    for (const link of navigationLinks) {
      expect(link).toHaveProperty("label");
      expect(link).toHaveProperty("href");
      expect(link).toHaveProperty("description");
    }
  });
});

describe("NavigationGrid", () => {
  test("renders all navigation links", () => {
    render(<NavigationGrid />);

    for (const link of navigationLinks) {
      expect(screen.getByText(link.label)).toBeInTheDocument();
      expect(screen.getByText(link.description)).toBeInTheDocument();
    }
  });

  test("renders Åpne button for each link", () => {
    render(<NavigationGrid />);

    const openButtons = screen.getAllByRole("link", { name: "Åpne" });
    expect(openButtons.length).toBe(navigationLinks.length);
  });

  test("marks active link with Aktiv badge", () => {
    render(<NavigationGrid />);

    // Current path is /dashboard/admin/overview, so Adminoversikt should be active
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
  });

  test("non-active links have Snarvei badge", () => {
    render(<NavigationGrid />);

    const snarveiLabels = screen.getAllByText("Snarvei");
    // There are 6 links total, 1 is active, so 5 should have Snarvei
    expect(snarveiLabels.length).toBe(navigationLinks.length - 1);
  });

  test("links point to correct hrefs", () => {
    render(<NavigationGrid />);

    for (const link of navigationLinks) {
      // Find the Åpne link within the card for this nav item
      const cardTitle = screen.getByText(link.label);
      const card = cardTitle.closest(".relative");
      const openLink = card?.querySelector(`a[href="${link.href}"]`);
      expect(openLink).toBeInTheDocument();
    }
  });

  test("active card has ring styling", () => {
    const { container } = render(<NavigationGrid />);

    // The card for /dashboard/admin/overview should have the ring class
    const activeCard = container.querySelector(".ring-2");
    expect(activeCard).toBeInTheDocument();
  });
});
