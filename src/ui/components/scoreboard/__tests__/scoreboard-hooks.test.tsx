import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  useAutoHideControls,
  useConnectionStatus,
  useCountdown,
  useHighlightAnimation,
  usePersistedMode,
  usePersistedTheme,
  useUrlParams,
} from "@/ui/components/scoreboard/scoreboard-hooks";
import {
  SEASON_THEME_STORAGE_KEY,
  THEME_SOURCE_STORAGE_KEY,
} from "@/ui/components/scoreboard/scoreboard-ui-types";

describe("useAutoHideControls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns true initially", () => {
    const { result } = renderHook(() => useAutoHideControls("screen"));
    expect(result.current).toBe(true);
  });

  test("always returns true for landing mode", () => {
    const { result } = renderHook(() => useAutoHideControls("landing"));
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current).toBe(true);
  });

  test("hides controls after timeout in screen mode", () => {
    const { result } = renderHook(() => useAutoHideControls("screen"));

    act(() => {
      vi.advanceTimersByTime(5500);
    });

    expect(result.current).toBe(false);
  });

  test("shows controls on mouse move", () => {
    const { result } = renderHook(() => useAutoHideControls("screen"));

    act(() => {
      vi.advanceTimersByTime(5500);
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("mousemove"));
    });
    expect(result.current).toBe(true);
  });

  test("shows controls on touch start", () => {
    const { result } = renderHook(() => useAutoHideControls("screen"));

    act(() => {
      vi.advanceTimersByTime(5500);
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("touchstart"));
    });
    expect(result.current).toBe(true);
  });

  test("shows controls on key down", () => {
    const { result } = renderHook(() => useAutoHideControls("screen"));

    act(() => {
      vi.advanceTimersByTime(5500);
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("keydown"));
    });
    expect(result.current).toBe(true);
  });

  test("hides controls again after user interaction timeout", () => {
    const { result } = renderHook(() => useAutoHideControls("screen"));

    // Initially visible, wait for first hide
    act(() => {
      vi.advanceTimersByTime(5500);
    });
    expect(result.current).toBe(false);

    // User interacts - controls show
    act(() => {
      window.dispatchEvent(new Event("mousemove"));
    });
    expect(result.current).toBe(true);

    // Wait for the reset timeout to hide controls again (covers line 33)
    act(() => {
      vi.advanceTimersByTime(5500);
    });
    expect(result.current).toBe(false);
  });

  test("clears previous timeout when user interacts before hide", () => {
    const { result } = renderHook(() => useAutoHideControls("screen"));

    // Initially visible
    expect(result.current).toBe(true);

    // Wait 1 second (less than the 3 second hide delay)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(true);

    // User interaction resets the timer (clears old timeout, sets new one for 3s from now)
    act(() => {
      window.dispatchEvent(new Event("touchstart"));
    });
    expect(result.current).toBe(true);

    // Wait 2.5 more seconds - total 3.5s from mount but only 2.5s from last interaction
    // Controls should still be visible because timer was reset
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current).toBe(true);

    // Wait 0.6 more seconds (3.1s total from last interaction) - now should hide
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current).toBe(false);
  });
});

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("does nothing when targetDate is null", () => {
    renderHook(() => useCountdown(null));
    // No error should be thrown
  });

  test("sets up interval when targetDate is provided", () => {
    const targetDate = new Date(Date.now() + 60000);
    const { unmount } = renderHook(() => useCountdown(targetDate));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    unmount();
  });
});

describe("useHighlightAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns false initially", () => {
    const { result } = renderHook(() => useHighlightAnimation(""));
    expect(result.current).toBe(false);
  });

  test("returns true when text changes to non-empty", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useHighlightAnimation(text),
      { initialProps: { text: "" } },
    );

    rerender({ text: "New highlight!" });
    expect(result.current).toBe(true);
  });

  test("returns false after animation timeout", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useHighlightAnimation(text),
      { initialProps: { text: "" } },
    );

    rerender({ text: "New highlight!" });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe(false);
  });

  test("does not animate for empty text changes", () => {
    const { result, rerender } = renderHook(
      ({ text }) => useHighlightAnimation(text),
      { initialProps: { text: "Initial" } },
    );

    rerender({ text: "" });
    expect(result.current).toBe(false);
  });
});

describe("usePersistedMode", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("returns landing by default", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const { result } = renderHook(() => usePersistedMode());
    expect(result.current[0]).toBe("landing");
  });

  test("loads persisted mode from localStorage", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("screen");
    const { result } = renderHook(() => usePersistedMode());
    expect(result.current[0]).toBe("screen");
  });

  test("persists mode changes to localStorage", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const { result } = renderHook(() => usePersistedMode());

    act(() => {
      result.current[1]("screen");
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "scoreboard-mode",
      "screen",
    );
    expect(result.current[0]).toBe("screen");
  });

  test("ignores invalid stored mode values", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("invalid-mode");
    const { result } = renderHook(() => usePersistedMode());
    expect(result.current[0]).toBe("landing");
  });

  test("loads landing mode from localStorage", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("landing");
    const { result } = renderHook(() => usePersistedMode());
    expect(result.current[0]).toBe("landing");
  });
});

describe("usePersistedTheme", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("returns auto theme by default", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const { result } = renderHook(() => usePersistedTheme(null));
    expect(result.current.themePreference).toBe("auto");
  });

  test("loads persisted theme from localStorage", () => {
    vi.mocked(localStorage.getItem).mockImplementation((key) => {
      if (key === SEASON_THEME_STORAGE_KEY) return "christmas";
      if (key === THEME_SOURCE_STORAGE_KEY) return "competition";
      return null;
    });
    const { result } = renderHook(() => usePersistedTheme(null));
    expect(result.current.themePreference).toBe("christmas");
    expect(result.current.themeSource).toBe("competition");
  });

  test("uses URL override when provided", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("winter");
    const { result } = renderHook(() => usePersistedTheme("summer"));
    expect(result.current.themePreference).toBe("summer");
  });

  test("persists theme preference changes", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const { result } = renderHook(() => usePersistedTheme(null));

    act(() => {
      result.current.setThemePreference("winter");
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      SEASON_THEME_STORAGE_KEY,
      "winter",
    );
  });

  test("persists theme source changes", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const { result } = renderHook(() => usePersistedTheme(null));

    act(() => {
      result.current.setThemeSource("competition");
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      THEME_SOURCE_STORAGE_KEY,
      "competition",
    );
  });

  test("ignores invalid stored theme values", () => {
    vi.mocked(localStorage.getItem).mockImplementation((key) => {
      if (key === SEASON_THEME_STORAGE_KEY) return "invalid-theme";
      return null;
    });
    const { result } = renderHook(() => usePersistedTheme(null));
    expect(result.current.themePreference).toBe("auto");
  });

  test("ignores invalid stored theme source values", () => {
    vi.mocked(localStorage.getItem).mockImplementation((key) => {
      if (key === THEME_SOURCE_STORAGE_KEY) return "invalid-source";
      return null;
    });
    const { result } = renderHook(() => usePersistedTheme(null));
    expect(result.current.themeSource).toBe("season");
  });

  test("ignores invalid URL theme override", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const { result } = renderHook(() => usePersistedTheme("invalid-theme"));
    expect(result.current.themePreference).toBe("auto");
  });
});

describe("useConnectionStatus", () => {
  test("returns connected when data is updated", () => {
    const { result } = renderHook(() =>
      useConnectionStatus(false, false, Date.now()),
    );
    expect(result.current).toBe("connected");
  });

  test("returns disconnected when error occurs", () => {
    const { result, rerender } = renderHook(
      ({ isError }) => useConnectionStatus(false, isError, Date.now()),
      { initialProps: { isError: false } },
    );

    rerender({ isError: true });
    expect(result.current).toBe("disconnected");
  });

  test("returns connecting when fetching", () => {
    const { result, rerender } = renderHook(
      ({ isFetching }) => useConnectionStatus(isFetching, false, undefined),
      { initialProps: { isFetching: false } },
    );

    rerender({ isFetching: true });
    expect(result.current).toBe("connecting");
  });

  test("remains connected when not fetching, no error, but no data timestamp", () => {
    const { result } = renderHook(() =>
      useConnectionStatus(false, false, undefined),
    );
    expect(result.current).toBe("connected");
  });

  test("error takes precedence over fetching state", () => {
    const { result } = renderHook(() =>
      useConnectionStatus(true, true, Date.now()),
    );
    expect(result.current).toBe("disconnected");
  });

  test("returns connected after error clears and data updates", () => {
    const { result, rerender } = renderHook(
      ({ isError, dataUpdatedAt }) =>
        useConnectionStatus(false, isError, dataUpdatedAt),
      {
        initialProps: {
          isError: true,
          dataUpdatedAt: undefined as number | undefined,
        },
      },
    );

    expect(result.current).toBe("disconnected");

    rerender({ isError: false, dataUpdatedAt: Date.now() });
    expect(result.current).toBe("connected");
  });
});

describe("useUrlParams", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        search: "",
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  test("returns null values when no params", () => {
    const { result } = renderHook(() => useUrlParams());
    expect(result.current).toEqual({
      mode: null,
      theme: null,
      group: null,
      team: null,
    });
  });

  test("parses mode param", () => {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: "?mode=screen" },
      writable: true,
    });

    const { result } = renderHook(() => useUrlParams());
    expect(result.current.mode).toBe("screen");
  });

  test("parses landing mode param", () => {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: "?mode=landing" },
      writable: true,
    });

    const { result } = renderHook(() => useUrlParams());
    expect(result.current.mode).toBe("landing");
  });

  test("parses theme param", () => {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: "?theme=christmas" },
      writable: true,
    });

    const { result } = renderHook(() => useUrlParams());
    expect(result.current.theme).toBe("christmas");
  });

  test("parses winter theme param", () => {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: "?theme=winter" },
      writable: true,
    });

    const { result } = renderHook(() => useUrlParams());
    expect(result.current.theme).toBe("winter");
  });

  test("parses summer theme param", () => {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: "?theme=summer" },
      writable: true,
    });

    const { result } = renderHook(() => useUrlParams());
    expect(result.current.theme).toBe("summer");
  });

  test("parses auto theme param", () => {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: "?theme=auto" },
      writable: true,
    });

    const { result } = renderHook(() => useUrlParams());
    expect(result.current.theme).toBe("auto");
  });

  test("parses group param", () => {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: "?group=A" },
      writable: true,
    });

    const { result } = renderHook(() => useUrlParams());
    expect(result.current.group).toBe("A");
  });

  test("parses team param", () => {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: "?team=vikings" },
      writable: true,
    });

    const { result } = renderHook(() => useUrlParams());
    expect(result.current.team).toBe("vikings");
  });

  test("ignores invalid mode values", () => {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: "?mode=invalid" },
      writable: true,
    });

    const { result } = renderHook(() => useUrlParams());
    expect(result.current.mode).toBeNull();
  });

  test("ignores invalid theme values", () => {
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, search: "?theme=invalid" },
      writable: true,
    });

    const { result } = renderHook(() => useUrlParams());
    expect(result.current.theme).toBeNull();
  });

  test("parses multiple params", () => {
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        search: "?mode=screen&theme=christmas&group=B&team=ravens",
      },
      writable: true,
    });

    const { result } = renderHook(() => useUrlParams());
    expect(result.current.mode).toBe("screen");
    expect(result.current.theme).toBe("christmas");
    expect(result.current.group).toBe("B");
    expect(result.current.team).toBe("ravens");
  });
});
