import { logger } from "@/lib/logger/pino";

export type AdminAnalyticsEventName =
  | "admin_dashboard_aggregated"
  | "admin_competition_detail_viewed"
  | "admin_audit_log_filtered";

export type AdminAnalyticsPayload = Record<string, unknown>;

export function emitAdminEvent(
  event: AdminAnalyticsEventName,
  payload: AdminAnalyticsPayload = {},
): void {
  logger.info({ event, payload }, "admin_analytics_event");
}
