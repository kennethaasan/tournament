import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-theme-provider">{children}</div>
  ),
}));

import { ThemeProvider } from "@/ui/providers/theme-provider";

describe("ThemeProvider", () => {
  it("renders children inside the theme provider", () => {
    render(
      <ThemeProvider>
        <span data-testid="child">Hello Theme</span>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("mock-theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toHaveTextContent("Hello Theme");
  });

  it("passes additional props to NextThemesProvider", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <span>Themed Content</span>
      </ThemeProvider>,
    );

    expect(screen.getByText("Themed Content")).toBeInTheDocument();
  });
});
