const DEFAULT_LOCALE = "no-NO";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDateTime(
  value: Date,
  options: {
    locale?: string;
    timeZone?: string | null;
    dateStyle?: "full" | "long" | "medium" | "short";
    timeStyle?: "full" | "long" | "medium" | "short";
  } = {},
): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const timeZone = options.timeZone ?? undefined;

  return value.toLocaleString(locale, {
    dateStyle: options.dateStyle ?? "medium",
    timeStyle: options.timeStyle ?? "short",
    timeZone,
  });
}

export function formatDate(
  value: Date,
  options: { locale?: string; timeZone?: string | null } = {},
): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const timeZone = options.timeZone ?? undefined;

  return value.toLocaleDateString(locale, {
    dateStyle: "medium",
    timeZone,
  });
}
