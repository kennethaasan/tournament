import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  ScoreboardThemeForm,
  type ScoreboardThemeFormValue,
} from "@/ui/components/scoreboard/theme-form";

describe("ScoreboardThemeForm", () => {
  const defaultValue: ScoreboardThemeFormValue = {
    primaryColor: "#0B1F3A",
    secondaryColor: "#FFFFFF",
    backgroundImageUrl: null,
  };

  afterEach(() => {
    cleanup();
  });

  test("renders with initial values", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ScoreboardThemeForm value={defaultValue} onChange={onChange} />,
    );

    const primaryHexInput = container.querySelector<HTMLInputElement>(
      "#scoreboard-primary-color-hex",
    );
    const secondaryHexInput = container.querySelector<HTMLInputElement>(
      "#scoreboard-secondary-color-hex",
    );

    expect(primaryHexInput).toHaveValue("#0B1F3A");
    expect(secondaryHexInput).toHaveValue("#FFFFFF");
  });

  test("calls onChange when primary color hex input changes", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ScoreboardThemeForm value={defaultValue} onChange={onChange} />,
    );

    const primaryHexInput = container.querySelector<HTMLInputElement>(
      "#scoreboard-primary-color-hex",
    );
    fireEvent.change(primaryHexInput!, { target: { value: "#FF0000" } });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultValue,
      primaryColor: "#FF0000",
    });
  });

  test("calls onChange when secondary color hex input changes", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ScoreboardThemeForm value={defaultValue} onChange={onChange} />,
    );

    const secondaryHexInput = container.querySelector<HTMLInputElement>(
      "#scoreboard-secondary-color-hex",
    );
    fireEvent.change(secondaryHexInput!, { target: { value: "#000000" } });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultValue,
      secondaryColor: "#000000",
    });
  });

  test("calls onChange when background URL changes", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ScoreboardThemeForm value={defaultValue} onChange={onChange} />,
    );

    const urlInput = container.querySelector<HTMLInputElement>(
      "#scoreboard-background-url",
    );
    fireEvent.change(urlInput!, {
      target: { value: "https://example.com/image.png" },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultValue,
      backgroundImageUrl: "https://example.com/image.png",
    });
  });

  test("sets backgroundImageUrl to null when empty", () => {
    const onChange = vi.fn();
    const valueWithUrl: ScoreboardThemeFormValue = {
      ...defaultValue,
      backgroundImageUrl: "https://example.com/image.png",
    };
    const { container } = render(
      <ScoreboardThemeForm value={valueWithUrl} onChange={onChange} />,
    );

    const urlInput = container.querySelector<HTMLInputElement>(
      "#scoreboard-background-url",
    );
    fireEvent.change(urlInput!, { target: { value: "" } });

    expect(onChange).toHaveBeenCalledWith({
      ...valueWithUrl,
      backgroundImageUrl: null,
    });
  });

  test("sets backgroundImageUrl to null when whitespace only", () => {
    const onChange = vi.fn();
    const valueWithUrl: ScoreboardThemeFormValue = {
      ...defaultValue,
      backgroundImageUrl: "https://example.com/image.png",
    };
    const { container } = render(
      <ScoreboardThemeForm value={valueWithUrl} onChange={onChange} />,
    );

    const urlInput = container.querySelector<HTMLInputElement>(
      "#scoreboard-background-url",
    );
    fireEvent.change(urlInput!, { target: { value: "   " } });

    expect(onChange).toHaveBeenCalledWith({
      ...valueWithUrl,
      backgroundImageUrl: null,
    });
  });

  test("shows insufficient contrast warning for low contrast colors", () => {
    const lowContrastValue: ScoreboardThemeFormValue = {
      primaryColor: "#808080",
      secondaryColor: "#909090",
      backgroundImageUrl: null,
    };
    const onChange = vi.fn();
    const { container } = render(
      <ScoreboardThemeForm value={lowContrastValue} onChange={onChange} />,
    );

    const output = container.querySelector("output");
    expect(output?.textContent).toMatch(/kontrasten er for lav/i);
  });

  test("shows sufficient contrast message for high contrast colors", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ScoreboardThemeForm value={defaultValue} onChange={onChange} />,
    );

    const output = container.querySelector("output");
    expect(output?.textContent).toMatch(/kontrasten oppfyller wcag/i);
  });

  test("handles disabled state", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ScoreboardThemeForm
        value={defaultValue}
        onChange={onChange}
        disabled={true}
      />,
    );

    const primaryHexInput = container.querySelector<HTMLInputElement>(
      "#scoreboard-primary-color-hex",
    );
    const secondaryHexInput = container.querySelector<HTMLInputElement>(
      "#scoreboard-secondary-color-hex",
    );
    const urlInput = container.querySelector<HTMLInputElement>(
      "#scoreboard-background-url",
    );

    expect(primaryHexInput).toBeDisabled();
    expect(secondaryHexInput).toBeDisabled();
    expect(urlInput).toBeDisabled();
  });

  test("normalizes hex values without hash", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ScoreboardThemeForm value={defaultValue} onChange={onChange} />,
    );

    const primaryHexInput = container.querySelector<HTMLInputElement>(
      "#scoreboard-primary-color-hex",
    );
    fireEvent.change(primaryHexInput!, { target: { value: "ff0000" } });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultValue,
      primaryColor: "#FF0000",
    });
  });

  test("handles invalid color gracefully", () => {
    const invalidValue: ScoreboardThemeFormValue = {
      primaryColor: "invalid",
      secondaryColor: "#FFFFFF",
      backgroundImageUrl: null,
    };
    const onChange = vi.fn();

    // Should render without throwing
    const { container } = render(
      <ScoreboardThemeForm value={invalidValue} onChange={onChange} />,
    );

    // The component catches the error and returns 0 for ratio
    const ratioDisplay = container.querySelector(
      ".rounded.bg-card\\/20.px-2.py-1",
    );
    expect(ratioDisplay?.textContent).toContain("0.00");
  });

  test("displays current contrast ratio", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ScoreboardThemeForm value={defaultValue} onChange={onChange} />,
    );

    // Should display a ratio
    const ratioDisplay = container.querySelector(
      ".rounded.bg-card\\/20.px-2.py-1",
    );
    expect(ratioDisplay?.textContent).toContain(": 1");
  });

  test("renders preview section with colors applied", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ScoreboardThemeForm value={defaultValue} onChange={onChange} />,
    );

    const previewDiv = container.querySelector('[style*="background"]');
    expect(previewDiv).toBeInTheDocument();
  });

  test("handles color picker input for primary color", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ScoreboardThemeForm value={defaultValue} onChange={onChange} />,
    );

    const colorPicker = container.querySelector<HTMLInputElement>(
      "#scoreboard-primary-color",
    );
    fireEvent.change(colorPicker!, { target: { value: "#00FF00" } });

    expect(onChange).toHaveBeenCalled();
  });

  test("handles color picker input for secondary color", () => {
    const onChange = vi.fn();
    const { container } = render(
      <ScoreboardThemeForm value={defaultValue} onChange={onChange} />,
    );

    const colorPicker = container.querySelector<HTMLInputElement>(
      "#scoreboard-secondary-color",
    );
    fireEvent.change(colorPicker!, { target: { value: "#0000FF" } });

    expect(onChange).toHaveBeenCalled();
  });
});
