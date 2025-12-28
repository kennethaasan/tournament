"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ConnectionStatus,
  ScoreboardMode,
  SeasonTheme,
  ThemeSource,
} from "./scoreboard-ui-types";
import {
  CONTROLS_HIDE_DELAY_MS,
  SEASON_THEME_STORAGE_KEY,
  THEME_SOURCE_STORAGE_KEY,
} from "./scoreboard-ui-types";
import { parseSeasonTheme, parseThemeSource } from "./scoreboard-utils";

export function useAutoHideControls(mode: ScoreboardMode) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode !== "screen") {
      setControlsVisible(true);
      return;
    }

    const showControls = () => {
      setControlsVisible(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, CONTROLS_HIDE_DELAY_MS);
    };

    window.addEventListener("mousemove", showControls);
    window.addEventListener("touchstart", showControls);
    window.addEventListener("keydown", showControls);

    timeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROLS_HIDE_DELAY_MS);

    return () => {
      window.removeEventListener("mousemove", showControls);
      window.removeEventListener("touchstart", showControls);
      window.removeEventListener("keydown", showControls);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [mode]);

  return controlsVisible;
}

export function useCountdown(targetDate: Date | null, intervalMs = 1000) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!targetDate) return;

    const interval = setInterval(() => {
      setTick((t: number) => t + 1);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [targetDate, intervalMs]);
}

export function useHighlightAnimation(overlayText: string) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevTextRef = useRef(overlayText);

  useEffect(() => {
    if (overlayText !== prevTextRef.current && overlayText.length > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      prevTextRef.current = overlayText;
      return () => clearTimeout(timer);
    }
  }, [overlayText]);

  return isAnimating;
}

export function usePersistedMode() {
  const [mode, setModeState] = useState<ScoreboardMode>("landing");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("scoreboard-mode");
    if (stored === "landing" || stored === "screen") {
      setModeState(stored);
    }
  }, []);

  const setMode = useCallback((newMode: ScoreboardMode) => {
    setModeState(newMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("scoreboard-mode", newMode);
    }
  }, []);

  return [mode, setMode] as const;
}

export function usePersistedTheme(themeOverrideParam: string | null) {
  const [themePreference, setThemePreferenceState] =
    useState<SeasonTheme>("auto");
  const [themeSource, setThemeSourceState] = useState<ThemeSource>("season");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const override = parseSeasonTheme(themeOverrideParam);
    const stored = parseSeasonTheme(
      window.localStorage.getItem(SEASON_THEME_STORAGE_KEY),
    );
    setThemePreferenceState(override ?? stored ?? "auto");
  }, [themeOverrideParam]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = parseThemeSource(
      window.localStorage.getItem(THEME_SOURCE_STORAGE_KEY),
    );
    setThemeSourceState(stored ?? "season");
  }, []);

  const setThemePreference = useCallback((value: SeasonTheme) => {
    setThemePreferenceState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SEASON_THEME_STORAGE_KEY, value);
    }
  }, []);

  const setThemeSource = useCallback((value: ThemeSource) => {
    setThemeSourceState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_SOURCE_STORAGE_KEY, value);
    }
  }, []);

  return {
    themePreference,
    setThemePreference,
    themeSource,
    setThemeSource,
  };
}

export function useConnectionStatus(
  isFetching: boolean,
  isError: boolean,
  dataUpdatedAt: number | undefined,
): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>("connected");

  useEffect(() => {
    if (isError) {
      setStatus("disconnected");
    } else if (isFetching) {
      setStatus("connecting");
    } else if (dataUpdatedAt) {
      setStatus("connected");
    }
  }, [isFetching, isError, dataUpdatedAt]);

  return status;
}

export function useUrlParams() {
  const [params, setParams] = useState<{
    mode: ScoreboardMode | null;
    theme: SeasonTheme | null;
    group: string | null;
    team: string | null;
  }>({
    mode: null,
    theme: null,
    group: null,
    team: null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const modeParam = searchParams.get("mode");
    const themeParam = searchParams.get("theme");
    const groupParam = searchParams.get("group");
    const teamParam = searchParams.get("team");

    setParams({
      mode:
        modeParam === "screen" || modeParam === "landing" ? modeParam : null,
      theme: parseSeasonTheme(themeParam),
      group: groupParam,
      team: teamParam,
    });
  }, []);

  return params;
}
