import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  FullHdFrame,
  HolidayGlow,
  ScoreboardBackground,
  SnowBackdrop,
} from "@/ui/components/scoreboard/scoreboard-backdrop";

afterEach(() => {
  cleanup();
});

describe("SnowBackdrop", () => {
  test("renders with winter variant", () => {
    const { container } = render(<SnowBackdrop variant="winter" />);
    const backdrop = container.querySelector("[aria-hidden='true']");
    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveClass("scoreboard-snow");
    expect(backdrop).not.toHaveClass("scoreboard-snow--christmas");
  });

  test("renders with christmas variant", () => {
    const { container } = render(<SnowBackdrop variant="christmas" />);
    const backdrop = container.querySelector("[aria-hidden='true']");
    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveClass("scoreboard-snow");
    expect(backdrop).toHaveClass("scoreboard-snow--christmas");
  });
});

describe("HolidayGlow", () => {
  test("renders with aria-hidden", () => {
    const { container } = render(<HolidayGlow />);
    const glow = container.querySelector("[aria-hidden='true']");
    expect(glow).toBeInTheDocument();
  });
});

describe("FullHdFrame", () => {
  test("renders children", () => {
    render(
      <FullHdFrame>
        <div data-testid="child">Content</div>
      </FullHdFrame>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  test("applies max-width container", () => {
    const { container } = render(
      <FullHdFrame>
        <div>Content</div>
      </FullHdFrame>,
    );
    const innerContainer = container.querySelector(".max-w-\\[1920px\\]");
    expect(innerContainer).toBeInTheDocument();
  });
});

describe("ScoreboardBackground", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-07-15T12:00:00Z")); // Summer - default season
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders gradient background without season theme", () => {
    const { container } = render(
      <ScoreboardBackground
        primaryColor="#ff0000"
        secondaryColor="#0000ff"
        backgroundImageUrl={null}
        useSeasonTheme={false}
        season="auto"
      />,
    );

    const background = container.querySelector("[aria-hidden='true']");
    expect(background).toBeInTheDocument();
    expect(background).toHaveStyle({
      backgroundImage: "linear-gradient(135deg, #ff0000 0%, #0000ff 100%)",
    });
  });

  test("renders background image overlay when provided", () => {
    const { container } = render(
      <ScoreboardBackground
        primaryColor="#ff0000"
        secondaryColor="#0000ff"
        backgroundImageUrl="https://example.com/bg.jpg"
        useSeasonTheme={false}
        season="auto"
      />,
    );

    const imageOverlay = container.querySelector(".bg-cover.bg-center");
    expect(imageOverlay).toBeInTheDocument();
    expect(imageOverlay).toHaveStyle({
      backgroundImage: "url(https://example.com/bg.jpg)",
    });
  });

  test("does not render background image overlay when null", () => {
    const { container } = render(
      <ScoreboardBackground
        primaryColor="#ff0000"
        secondaryColor="#0000ff"
        backgroundImageUrl={null}
        useSeasonTheme={false}
        season="auto"
      />,
    );

    const imageOverlay = container.querySelector(".bg-cover.bg-center");
    expect(imageOverlay).not.toBeInTheDocument();
  });

  test("renders snow for winter season theme", () => {
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z")); // Winter

    const { container } = render(
      <ScoreboardBackground
        primaryColor="#ff0000"
        secondaryColor="#0000ff"
        backgroundImageUrl={null}
        useSeasonTheme={true}
        season="auto"
      />,
    );

    const snowBackdrop = container.querySelector(".scoreboard-snow");
    expect(snowBackdrop).toBeInTheDocument();
  });

  test("renders snow with christmas class for christmas season", () => {
    vi.setSystemTime(new Date("2025-12-20T12:00:00Z")); // Christmas

    const { container } = render(
      <ScoreboardBackground
        primaryColor="#ff0000"
        secondaryColor="#0000ff"
        backgroundImageUrl={null}
        useSeasonTheme={true}
        season="auto"
      />,
    );

    const snowBackdrop = container.querySelector(".scoreboard-snow--christmas");
    expect(snowBackdrop).toBeInTheDocument();
  });

  test("renders holiday glow for christmas season", () => {
    vi.setSystemTime(new Date("2025-12-20T12:00:00Z")); // Christmas

    const { container } = render(
      <ScoreboardBackground
        primaryColor="#ff0000"
        secondaryColor="#0000ff"
        backgroundImageUrl={null}
        useSeasonTheme={true}
        season="auto"
      />,
    );

    // Holiday glow has radial gradients in style
    const elements = container.querySelectorAll("[aria-hidden='true']");
    expect(elements.length).toBeGreaterThanOrEqual(2); // Main background + holiday glow
  });

  test("does not render snow when useSeasonTheme is false", () => {
    vi.setSystemTime(new Date("2025-12-20T12:00:00Z")); // Christmas

    const { container } = render(
      <ScoreboardBackground
        primaryColor="#ff0000"
        secondaryColor="#0000ff"
        backgroundImageUrl={null}
        useSeasonTheme={false}
        season="christmas"
      />,
    );

    const snowBackdrop = container.querySelector(".scoreboard-snow");
    expect(snowBackdrop).not.toBeInTheDocument();
  });

  test("uses explicit winter season override", () => {
    vi.setSystemTime(new Date("2025-07-15T12:00:00Z")); // Summer

    const { container } = render(
      <ScoreboardBackground
        primaryColor="#ff0000"
        secondaryColor="#0000ff"
        backgroundImageUrl={null}
        useSeasonTheme={true}
        season="winter"
      />,
    );

    const snowBackdrop = container.querySelector(".scoreboard-snow");
    expect(snowBackdrop).toBeInTheDocument();
  });

  test("uses explicit christmas season override", () => {
    vi.setSystemTime(new Date("2025-07-15T12:00:00Z")); // Summer

    const { container } = render(
      <ScoreboardBackground
        primaryColor="#ff0000"
        secondaryColor="#0000ff"
        backgroundImageUrl={null}
        useSeasonTheme={true}
        season="christmas"
      />,
    );

    const snowBackdrop = container.querySelector(".scoreboard-snow--christmas");
    expect(snowBackdrop).toBeInTheDocument();
  });

  test("does not render snow for summer season", () => {
    const { container } = render(
      <ScoreboardBackground
        primaryColor="#ff0000"
        secondaryColor="#0000ff"
        backgroundImageUrl={null}
        useSeasonTheme={true}
        season="summer"
      />,
    );

    const snowBackdrop = container.querySelector(".scoreboard-snow");
    expect(snowBackdrop).not.toBeInTheDocument();
  });

  test("does not render snow for spring season", () => {
    const { container } = render(
      <ScoreboardBackground
        primaryColor="#ff0000"
        secondaryColor="#0000ff"
        backgroundImageUrl={null}
        useSeasonTheme={true}
        season="spring"
      />,
    );

    const snowBackdrop = container.querySelector(".scoreboard-snow");
    expect(snowBackdrop).not.toBeInTheDocument();
  });

  test("does not render snow for fall season", () => {
    const { container } = render(
      <ScoreboardBackground
        primaryColor="#ff0000"
        secondaryColor="#0000ff"
        backgroundImageUrl={null}
        useSeasonTheme={true}
        season="fall"
      />,
    );

    const snowBackdrop = container.querySelector(".scoreboard-snow");
    expect(snowBackdrop).not.toBeInTheDocument();
  });
});
