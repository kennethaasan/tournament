import { cleanup, render, screen } from "@testing-library/react";
import type { Route } from "next";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { PageHero } from "@/ui/components/page-hero";

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

afterEach(() => {
  cleanup();
});

describe("PageHero", () => {
  test("renders eyebrow, title, and description", () => {
    render(
      <PageHero
        eyebrow="Welcome"
        title="Main Title"
        description="This is the description text."
      />,
    );

    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Main Title")).toBeInTheDocument();
    expect(
      screen.getByText("This is the description text."),
    ).toBeInTheDocument();
  });

  test("renders action button when actionHref and actionLabel are provided", () => {
    render(
      <PageHero
        eyebrow="Welcome"
        title="Main Title"
        description="Description"
        actionHref={"/auth/signup" as Route}
        actionLabel="Get Started"
      />,
    );

    const actionLink = screen.getByText("Get Started");
    expect(actionLink).toBeInTheDocument();
    expect(actionLink.closest("a")).toHaveAttribute("href", "/auth/signup");
  });

  test("does not render action button when actionHref is missing", () => {
    render(
      <PageHero
        eyebrow="Welcome"
        title="Main Title"
        description="Description"
        actionLabel="Get Started"
      />,
    );

    expect(screen.queryByText("Get Started")).not.toBeInTheDocument();
  });

  test("does not render action button when actionLabel is missing", () => {
    render(
      <PageHero
        eyebrow="Welcome"
        title="Main Title"
        description="Description"
        actionHref={"/auth/signup" as Route}
      />,
    );

    // The scoreboard demo link should also not render when action buttons are not shown
    expect(screen.queryByText("Se scoreboard-demo")).not.toBeInTheDocument();
  });

  test("renders scoreboard demo link when action is provided", () => {
    render(
      <PageHero
        eyebrow="Welcome"
        title="Main Title"
        description="Description"
        actionHref={"/auth/signup" as Route}
        actionLabel="Get Started"
      />,
    );

    const demoLink = screen.getByText("Se scoreboard-demo");
    expect(demoLink).toBeInTheDocument();
    expect(demoLink.closest("a")).toHaveAttribute(
      "href",
      "/competitions/trondheim-cup/2025/scoreboard",
    );
  });
});
