"use client";

import { useEffect, useRef, useState } from "react";
import { FULL_HD_HEIGHT, FULL_HD_WIDTH } from "./scoreboard-ui-types";

type SnowBackdropProps = {
  variant: "winter" | "christmas";
};

export function SnowBackdrop({ variant }: SnowBackdropProps) {
  return (
    <>
      <style>
        {`
          @keyframes scoreboard-snow {
            0% { background-position: 0 0, 0 0, 0 0; }
            100% { background-position: 400px 900px, 240px 500px, 120px 300px; }
          }
        `}
      </style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80 mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.9) 55%, transparent 60%), radial-gradient(1.5px 1.5px at 120px 80px, rgba(255,255,255,0.8) 55%, transparent 60%), radial-gradient(2px 2px at 60px 140px, rgba(255,255,255,0.6) 55%, transparent 60%)",
          backgroundSize: "180px 180px, 260px 260px, 340px 340px",
          animation:
            variant === "christmas"
              ? "scoreboard-snow 16s linear infinite"
              : "scoreboard-snow 20s linear infinite",
        }}
      />
    </>
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
