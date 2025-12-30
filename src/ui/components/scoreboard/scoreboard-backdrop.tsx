"use client";

import { memo } from "react";
import type { SeasonTheme } from "./scoreboard-ui-types";
import { deriveSeasonTheme, seasonGradient } from "./scoreboard-utils";

type SnowBackdropProps = {
  variant: "winter" | "christmas";
};

export function SnowBackdrop({ variant }: SnowBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={`scoreboard-snow pointer-events-none absolute inset-0 opacity-80 mix-blend-screen ${
        variant === "christmas" ? "scoreboard-snow--christmas" : ""
      }`}
    />
  );
}

export function HolidayGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08), transparent 55%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.15), transparent 45%), radial-gradient(circle at 50% 90%, rgba(255,200,200,0.15), transparent 50%)",
      }}
    />
  );
}

type FullHdFrameProps = {
  children: React.ReactNode;
};

export function FullHdFrame({ children }: FullHdFrameProps) {
  // For storskjerm mode, we use a fixed width container but allow natural height
  // This enables native browser scrolling while maintaining 1920px max width
  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-[1920px]">{children}</div>
    </div>
  );
}

type ScoreboardBackgroundProps = {
  primaryColor: string;
  secondaryColor: string;
  backgroundImageUrl: string | null;
  useSeasonTheme: boolean;
  season: SeasonTheme;
};

export const ScoreboardBackground = memo(function ScoreboardBackground({
  primaryColor,
  secondaryColor,
  backgroundImageUrl,
  useSeasonTheme,
  season,
}: ScoreboardBackgroundProps) {
  const resolvedSeason =
    season === "auto" ? deriveSeasonTheme(new Date()) : season;
  const backgroundImage = useSeasonTheme
    ? `${seasonGradient(resolvedSeason)}, linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
    : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
  const isSnowing =
    useSeasonTheme &&
    (resolvedSeason === "winter" || resolvedSeason === "christmas");
  const isChristmasTheme = useSeasonTheme && resolvedSeason === "christmas";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{ backgroundImage }}
    >
      {backgroundImageUrl ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        />
      ) : null}

      {isSnowing ? (
        <SnowBackdrop
          variant={resolvedSeason === "christmas" ? "christmas" : "winter"}
        />
      ) : null}
      {isChristmasTheme ? <HolidayGlow /> : null}
    </div>
  );
});
