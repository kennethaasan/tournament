"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  FULL_HD_HEIGHT,
  FULL_HD_WIDTH,
  type SeasonTheme,
} from "./scoreboard-ui-types";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      return;
    }

    const updateScale = () => {
      const availableWidth = Math.min(container.clientWidth, FULL_HD_WIDTH);
      const availableHeight = Math.min(container.clientHeight, FULL_HD_HEIGHT);
      const contentWidth = Math.max(content.scrollWidth, FULL_HD_WIDTH);
      const contentHeight = Math.max(content.scrollHeight, FULL_HD_HEIGHT);
      const widthScale = availableWidth / contentWidth;
      const heightScale = availableHeight / contentHeight;
      const nextScale = Math.min(1, widthScale, heightScale);

      setScale((previous) =>
        Math.abs(previous - nextScale) > 0.001 ? nextScale : previous,
      );
    };

    updateScale();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateScale);
    resizeObserver?.observe(container);
    resizeObserver?.observe(content);
    window.addEventListener("resize", updateScale);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[1080px] w-full items-start justify-center overflow-hidden"
    >
      <div className="origin-top" style={{ transform: `scale(${scale})` }}>
        <div ref={contentRef} className="h-[1080px] w-[1920px]">
          {children}
        </div>
      </div>
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
      className="pointer-events-none absolute inset-0"
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
