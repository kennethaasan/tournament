"use client";

import type { ScoreboardMatch } from "./scoreboard-ui-types";

type StatusBadgeProps = {
  status: ScoreboardMatch["status"];
  compact?: boolean;
};

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const config = {
    in_progress: {
      label: "Live",
      bgClass: "bg-red-500",
      textClass: "text-white",
      icon: (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
      ),
    },
    extra_time: {
      label: "EEO",
      bgClass: "bg-red-500",
      textClass: "text-white",
      icon: (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
      ),
    },
    penalty_shootout: {
      label: "ESP",
      bgClass: "bg-red-500",
      textClass: "text-white",
      icon: (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
      ),
    },
    disputed: {
      label: "Tvist",
      bgClass: "bg-yellow-500",
      textClass: "text-yellow-900",
      icon: (
        <svg
          className="h-3 w-3"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    finalized: {
      label: "Ferdig",
      bgClass: "bg-green-600",
      textClass: "text-white",
      icon: (
        <svg
          className="h-3 w-3"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    scheduled: {
      label: "Planlagt",
      bgClass: "bg-white/20",
      textClass: "text-white",
      icon: (
        <svg
          className="h-3 w-3"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  };

  const { label, bgClass, textClass, icon } = config[status];

  if (compact) {
    return (
      <output
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase ${bgClass} ${textClass}`}
        aria-label={label}
      >
        {icon}
        <span className="sr-only sm:not-sr-only">{label}</span>
      </output>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${bgClass} ${textClass}`}
    >
      {icon}
      {label}
    </span>
  );
}

type EmptyStateProps = {
  icon?: "matches" | "standings" | "scorers";
  title: string;
  description?: string;
};

export function EmptyState({
  icon = "matches",
  title,
  description,
}: EmptyStateProps) {
  const icons = {
    matches: (
      <svg
        className="h-12 w-12 text-white/30"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
        <path strokeLinecap="round" strokeWidth="1.5" d="M12 6v6l4 2" />
      </svg>
    ),
    standings: (
      <svg
        className="h-12 w-12 text-white/30"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    ),
    scorers: (
      <svg
        className="h-12 w-12 text-white/30"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      {icons[icon]}
      <p className="mt-3 text-sm font-medium text-white/70">{title}</p>
      {description ? (
        <p className="mt-1 text-xs text-white/50">{description}</p>
      ) : null}
    </div>
  );
}

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-white/10 ${className}`}
      aria-hidden="true"
    />
  );
}

export function MatchRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-t border-white/5 px-4 py-3">
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-12" />
    </div>
  );
}

export function StandingsRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-t border-white/5 px-4 py-2">
      <Skeleton className="h-4 w-6" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 w-8" />
    </div>
  );
}

type CountdownBadgeProps = {
  targetDate: Date;
};

export function CountdownBadge({ targetDate }: CountdownBadgeProps) {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-300">
        Starter nå
      </span>
    );
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  let label: string;
  let urgency: "low" | "medium" | "high";

  if (diffMins <= 15) {
    label = `Om ${diffMins} min`;
    urgency = "high";
  } else if (diffMins <= 60) {
    label = `Om ${diffMins} min`;
    urgency = "medium";
  } else if (diffHours < 24) {
    label = `Om ${diffHours}t ${diffMins % 60}m`;
    urgency = "low";
  } else {
    const diffDays = Math.floor(diffHours / 24);
    label = `Om ${diffDays}d ${diffHours % 24}t`;
    urgency = "low";
  }

  const urgencyClasses = {
    high: "bg-orange-500/20 text-orange-300",
    medium: "bg-yellow-500/20 text-yellow-300",
    low: "bg-white/10 text-white/70",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${urgencyClasses[urgency]}`}
    >
      <svg
        className="h-3 w-3"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </span>
  );
}

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder = "Søk...",
}: SearchInputProps) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="scoreboard-search w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-10 pr-4 text-sm text-white outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/20"
        aria-label={placeholder}
      />
    </div>
  );
}

// =============================================================================
// Table Components
// =============================================================================

type TableVariant = "compact" | "normal";

type TableProps = {
  children: React.ReactNode;
  variant?: TableVariant;
  fixed?: boolean;
  className?: string;
};

/**
 * Base table component with consistent styling for scoreboard tables.
 * - `variant="compact"` for storskjerm mode (smaller text)
 * - `variant="normal"` for landing/publikumsvisning mode
 * - `fixed` enables table-fixed layout
 */
export function Table({
  children,
  variant = "normal",
  fixed = false,
  className = "",
}: TableProps) {
  const baseClasses = "w-full text-left text-white/90 leading-tight";
  const variantClasses = variant === "compact" ? "text-sm" : "text-sm";
  const fixedClass = fixed ? "table-fixed" : "";

  return (
    <table
      className={`${baseClasses} ${variantClasses} ${fixedClass} ${className}`}
    >
      {children}
    </table>
  );
}

type TableHeadProps = {
  children: React.ReactNode;
  sticky?: boolean;
  className?: string;
};

/**
 * Table head with consistent background styling.
 * - `sticky` enables sticky positioning with backdrop blur
 */
export function TableHead({
  children,
  sticky = false,
  className = "",
}: TableHeadProps) {
  const baseClasses = "bg-white/5";
  const stickyClasses = sticky ? "sticky top-0 backdrop-blur" : "";

  return (
    <thead className={`${baseClasses} ${stickyClasses} ${className}`}>
      {children}
    </thead>
  );
}

type TableHeadRowProps = {
  children: React.ReactNode;
  variant?: TableVariant;
  className?: string;
};

/**
 * Table header row with consistent text styling.
 */
export function TableHeadRow({
  children,
  variant = "normal",
  className = "",
}: TableHeadRowProps) {
  const textSize = variant === "compact" ? "text-[0.65rem]" : "text-xs";
  const baseClasses = `${textSize} uppercase tracking-wide text-white/60 leading-tight`;

  return <tr className={`${baseClasses} ${className}`}>{children}</tr>;
}

type TableHeaderCellProps = {
  children: React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  variant?: TableVariant;
  className?: string;
};

/**
 * Table header cell with consistent padding.
 */
export function TableHeaderCell({
  children,
  width,
  align = "left",
  variant = "normal",
  className = "",
}: TableHeaderCellProps) {
  const padding = variant === "compact" ? "px-1.5 py-1.5" : "px-4 py-3";
  const alignClass =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "";
  const widthStyle = width ? { width } : undefined;

  return (
    <th className={`${padding} ${alignClass} ${className}`} style={widthStyle}>
      {children}
    </th>
  );
}

type TableBodyProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Table body wrapper.
 */
export function TableBody({ children, className = "" }: TableBodyProps) {
  return <tbody className={className}>{children}</tbody>;
}

type TableRowProps = {
  children: React.ReactNode;
  index?: number;
  highlight?: boolean;
  current?: boolean;
  className?: string;
};

/**
 * Table row with consistent border and alternating background.
 * - `index` enables zebra striping (even rows get subtle background)
 * - `highlight` adds red highlight for live matches
 * - `current` sets aria-current for accessibility
 */
export function TableRow({
  children,
  index,
  highlight = false,
  current = false,
  className = "",
}: TableRowProps) {
  const borderClass = "border-t border-white/5";
  const zebraClass =
    index !== undefined && index % 2 === 0 ? "bg-white/[0.02]" : "";
  const highlightClass = highlight ? "bg-red-500/15" : "";

  return (
    <tr
      className={`${borderClass} ${zebraClass} ${highlightClass} ${className}`}
      aria-current={current ? "true" : undefined}
    >
      {children}
    </tr>
  );
}

type TableCellProps = {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  variant?: TableVariant;
  muted?: boolean;
  bold?: boolean;
  truncate?: boolean;
  className?: string;
  colSpan?: number;
};

/**
 * Table cell with consistent padding and optional styling.
 * - `muted` applies lighter text color
 * - `bold` applies font-bold
 * - `truncate` enables text truncation
 */
export function TableCell({
  children,
  align = "left",
  variant = "normal",
  muted = false,
  bold = false,
  truncate = false,
  className = "",
  colSpan,
}: TableCellProps) {
  const padding = variant === "compact" ? "px-1.5 py-0.5" : "px-4 py-3";
  const alignClass =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "";
  const mutedClass = muted ? "text-white/70" : "";
  const boldClass = bold ? "font-bold" : "";
  const truncateClass = truncate ? "truncate" : "";

  return (
    <td
      className={`${padding} ${alignClass} ${mutedClass} ${boldClass} ${truncateClass} ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  );
}
