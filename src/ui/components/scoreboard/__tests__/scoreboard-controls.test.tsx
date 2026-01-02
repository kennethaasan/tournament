import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  ConnectionStatusIndicator,
  ModeToggle,
  ThemeControls,
} from "@/ui/components/scoreboard/scoreboard-controls";

afterEach(() => {
  cleanup();
});

describe("ModeToggle", () => {
  test("renders landing and screen buttons", () => {
    render(<ModeToggle mode="landing" onChange={vi.fn()} />);

    expect(
      screen.getByRole("tab", { name: "Publikumsvisning" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Storskjerm" })).toBeInTheDocument();
  });

  test("landing mode button is selected when mode is landing", () => {
    render(<ModeToggle mode="landing" onChange={vi.fn()} />);

    const landingButton = screen.getByRole("tab", { name: "Publikumsvisning" });
    const screenButton = screen.getByRole("tab", { name: "Storskjerm" });

    expect(landingButton).toHaveAttribute("aria-selected", "true");
    expect(screenButton).toHaveAttribute("aria-selected", "false");
    expect(landingButton).toHaveAttribute("tabindex", "0");
    expect(screenButton).toHaveAttribute("tabindex", "-1");
  });

  test("screen mode button is selected when mode is screen", () => {
    render(<ModeToggle mode="screen" onChange={vi.fn()} />);

    const landingButton = screen.getByRole("tab", { name: "Publikumsvisning" });
    const screenButton = screen.getByRole("tab", { name: "Storskjerm" });

    expect(landingButton).toHaveAttribute("aria-selected", "false");
    expect(screenButton).toHaveAttribute("aria-selected", "true");
    expect(landingButton).toHaveAttribute("tabindex", "-1");
    expect(screenButton).toHaveAttribute("tabindex", "0");
  });

  test("calls onChange with landing when landing button clicked", () => {
    const onChange = vi.fn();
    render(<ModeToggle mode="screen" onChange={onChange} />);

    fireEvent.click(screen.getByRole("tab", { name: "Publikumsvisning" }));
    expect(onChange).toHaveBeenCalledWith("landing");
  });

  test("calls onChange with screen when screen button clicked", () => {
    const onChange = vi.fn();
    render(<ModeToggle mode="landing" onChange={onChange} />);

    fireEvent.click(screen.getByRole("tab", { name: "Storskjerm" }));
    expect(onChange).toHaveBeenCalledWith("screen");
  });

  test("has accessible tablist role", () => {
    render(<ModeToggle mode="landing" onChange={vi.fn()} />);

    expect(
      screen.getByRole("tablist", { name: "Velg visningsmodus" }),
    ).toBeInTheDocument();
  });
});

describe("ThemeControls", () => {
  const defaultProps = {
    source: "season" as const,
    onSourceChange: vi.fn(),
    season: "auto" as const,
    onSeasonChange: vi.fn(),
    showSeason: true,
  };

  test("renders theme source select", () => {
    render(<ThemeControls {...defaultProps} />);

    expect(
      screen.getByRole("combobox", { name: "Velg temakilde" }),
    ).toBeInTheDocument();
  });

  test("renders season select when showSeason is true", () => {
    render(<ThemeControls {...defaultProps} showSeason={true} />);

    expect(
      screen.getByRole("combobox", { name: "Velg sesongtema" }),
    ).toBeInTheDocument();
  });

  test("hides season select when showSeason is false", () => {
    render(<ThemeControls {...defaultProps} showSeason={false} />);

    expect(
      screen.queryByRole("combobox", { name: "Velg sesongtema" }),
    ).not.toBeInTheDocument();
  });

  test("calls onSourceChange when theme source changes", () => {
    const onSourceChange = vi.fn();
    render(<ThemeControls {...defaultProps} onSourceChange={onSourceChange} />);

    const select = screen.getByRole("combobox", { name: "Velg temakilde" });
    fireEvent.change(select, { target: { value: "competition" } });

    expect(onSourceChange).toHaveBeenCalledWith("competition");
  });

  test("calls onSeasonChange when season changes", () => {
    const onSeasonChange = vi.fn();
    render(<ThemeControls {...defaultProps} onSeasonChange={onSeasonChange} />);

    const select = screen.getByRole("combobox", { name: "Velg sesongtema" });
    fireEvent.change(select, { target: { value: "christmas" } });

    expect(onSeasonChange).toHaveBeenCalledWith("christmas");
  });

  test("displays current source value", () => {
    render(<ThemeControls {...defaultProps} source="competition" />);

    const select = screen.getByRole("combobox", {
      name: "Velg temakilde",
    }) as HTMLSelectElement;
    expect(select.value).toBe("competition");
  });

  test("displays current season value", () => {
    render(<ThemeControls {...defaultProps} season="winter" />);

    const select = screen.getByRole("combobox", {
      name: "Velg sesongtema",
    }) as HTMLSelectElement;
    expect(select.value).toBe("winter");
  });

  test("renders all season options", () => {
    render(<ThemeControls {...defaultProps} />);

    expect(
      screen.getByRole("option", { name: "Standard" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Jul" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Vinter" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Vår" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sommer" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Høst" })).toBeInTheDocument();
  });
});

describe("ConnectionStatusIndicator", () => {
  test("renders connected status", () => {
    render(<ConnectionStatusIndicator status="connected" lastUpdated={null} />);

    expect(screen.getByText("Tilkoblet")).toBeInTheDocument();
  });

  test("renders connecting status", () => {
    render(
      <ConnectionStatusIndicator status="connecting" lastUpdated={null} />,
    );

    expect(screen.getByText("Kobler til...")).toBeInTheDocument();
  });

  test("renders disconnected status", () => {
    render(
      <ConnectionStatusIndicator status="disconnected" lastUpdated={null} />,
    );

    expect(screen.getByText("Frakoblet")).toBeInTheDocument();
  });

  test("does not render last updated when null", () => {
    render(<ConnectionStatusIndicator status="connected" lastUpdated={null} />);

    expect(screen.queryByText("Sist oppdatert")).not.toBeInTheDocument();
  });

  test("renders last updated timestamp when provided", () => {
    const date = new Date("2025-01-01T14:30:45Z");
    render(<ConnectionStatusIndicator status="connected" lastUpdated={date} />);

    expect(screen.getByText(/Sist oppdatert/)).toBeInTheDocument();
    // Time element should have ISO datetime attribute
    const timeElement = screen.getByRole("time");
    expect(timeElement).toHaveAttribute("dateTime", date.toISOString());
  });

  test("connected status has green indicator", () => {
    const { container } = render(
      <ConnectionStatusIndicator status="connected" lastUpdated={null} />,
    );

    const indicator = container.querySelector(".bg-green-500");
    expect(indicator).toBeInTheDocument();
  });

  test("connecting status has yellow pulsing indicator", () => {
    const { container } = render(
      <ConnectionStatusIndicator status="connecting" lastUpdated={null} />,
    );

    const indicator = container.querySelector(".bg-yellow-500");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass("animate-pulse");
  });

  test("disconnected status has red indicator", () => {
    const { container } = render(
      <ConnectionStatusIndicator status="disconnected" lastUpdated={null} />,
    );

    const indicator = container.querySelector(".bg-red-500");
    expect(indicator).toBeInTheDocument();
  });
});
