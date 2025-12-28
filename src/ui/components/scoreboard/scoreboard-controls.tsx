"use client";

import type {
  ConnectionStatus,
  ScoreboardMode,
  SeasonTheme,
  ThemeSource,
} from "./scoreboard-ui-types";

type ModeToggleProps = {
  mode: ScoreboardMode;
  onChange: (mode: ScoreboardMode) => void;
};

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 p-1 text-xs font-semibold"
      role="tablist"
      aria-label="Velg visningsmodus"
    >
      <button
        type="button"
        role="tab"
        onClick={() => onChange("landing")}
        aria-selected={mode === "landing"}
        aria-controls="landing-panel"
        tabIndex={mode === "landing" ? 0 : -1}
        className={`rounded-lg px-3 py-1.5 transition focus:outline-none focus:ring-2 focus:ring-white/50 ${
          mode === "landing"
            ? "bg-white text-slate-900"
            : "text-white/80 hover:text-white"
        }`}
      >
        Publikumsvisning
      </button>
      <button
        type="button"
        role="tab"
        onClick={() => onChange("screen")}
        aria-selected={mode === "screen"}
        aria-controls="screen-panel"
        tabIndex={mode === "screen" ? 0 : -1}
        className={`rounded-lg px-3 py-1.5 transition focus:outline-none focus:ring-2 focus:ring-white/50 ${
          mode === "screen"
            ? "bg-white text-slate-900"
            : "text-white/80 hover:text-white"
        }`}
      >
        Storskjerm
      </button>
    </div>
  );
}

type ThemeControlsProps = {
  source: ThemeSource;
  onSourceChange: (value: ThemeSource) => void;
  season: SeasonTheme;
  onSeasonChange: (value: SeasonTheme) => void;
  showSeason: boolean;
};

export function ThemeControls({
  source,
  onSourceChange,
  season,
  onSeasonChange,
  showSeason,
}: ThemeControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold">
      <ThemeSourceSelect value={source} onChange={onSourceChange} />
      {showSeason ? (
        <SeasonSelect value={season} onChange={onSeasonChange} />
      ) : null}
    </div>
  );
}

type ThemeSourceSelectProps = {
  value: ThemeSource;
  onChange: (value: ThemeSource) => void;
};

function ThemeSourceSelect({ value, onChange }: ThemeSourceSelectProps) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[0.65rem] uppercase tracking-wide text-white/70">
        Tema
      </span>
      <select
        aria-label="Velg temakilde"
        value={value}
        onChange={(event) => onChange(event.target.value as ThemeSource)}
        className="rounded-lg border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-white/50"
      >
        <option value="season">Sesong</option>
        <option value="competition">Konkurranse</option>
      </select>
    </label>
  );
}

type SeasonSelectProps = {
  value: SeasonTheme;
  onChange: (value: SeasonTheme) => void;
};

function SeasonSelect({ value, onChange }: SeasonSelectProps) {
  const options: Array<{ value: SeasonTheme; label: string }> = [
    { value: "auto", label: "Standard" },
    { value: "christmas", label: "Jul" },
    { value: "winter", label: "Vinter" },
    { value: "spring", label: "Vår" },
    { value: "summer", label: "Sommer" },
    { value: "fall", label: "Høst" },
  ];

  return (
    <label className="flex items-center gap-2">
      <span className="text-[0.65rem] uppercase tracking-wide text-white/70">
        Sesong
      </span>
      <select
        aria-label="Velg sesongtema"
        value={value}
        onChange={(event) => onChange(event.target.value as SeasonTheme)}
        className="rounded-lg border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-white/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type ConnectionStatusIndicatorProps = {
  status: ConnectionStatus;
  lastUpdated: Date | null;
};

export function ConnectionStatusIndicator({
  status,
  lastUpdated,
}: ConnectionStatusIndicatorProps) {
  const statusConfig = {
    connected: { color: "bg-green-500", label: "Tilkoblet" },
    connecting: {
      color: "bg-yellow-500 animate-pulse",
      label: "Kobler til...",
    },
    disconnected: { color: "bg-red-500", label: "Frakoblet" },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-xs text-white/70">
      <span
        className={`h-2 w-2 rounded-full ${config.color}`}
        aria-hidden="true"
      />
      <span className="sr-only">{config.label}</span>
      {lastUpdated ? (
        <span>
          Sist oppdatert{" "}
          <time dateTime={lastUpdated.toISOString()}>
            {new Intl.DateTimeFormat("nb-NO", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).format(lastUpdated)}
          </time>
        </span>
      ) : null}
    </div>
  );
}
