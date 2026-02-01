import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";

const serviceName = process.env.POWERTOOLS_SERVICE_NAME ?? "competitions";
const isProduction = process.env.NODE_ENV === "production";

/**
 * AWS Lambda Powertools Logger instance.
 *
 * In production (Lambda), this outputs structured JSON logs that CloudWatch
 * can parse and index. In development, it falls back to a simpler format.
 *
 * Environment variables (set by Terraform):
 * - POWERTOOLS_SERVICE_NAME: Service name for log correlation
 * - POWERTOOLS_LOG_LEVEL: Minimum log level (DEBUG, INFO, WARN, ERROR, CRITICAL)
 */
export const logger = new Logger({
  serviceName,
  logLevel:
    (process.env.POWERTOOLS_LOG_LEVEL as
      | "DEBUG"
      | "INFO"
      | "WARN"
      | "ERROR"
      | "CRITICAL") ?? "INFO",
  // In development, we might want prettier output
  ...(isProduction ? {} : { environment: "development" }),
});

/**
 * AWS Lambda Powertools Metrics instance.
 *
 * Creates CloudWatch metrics asynchronously via Embedded Metric Format (EMF).
 * Metrics are automatically sent to CloudWatch without any custom infrastructure.
 *
 * Environment variables (set by Terraform):
 * - POWERTOOLS_SERVICE_NAME: Service name dimension
 * - POWERTOOLS_METRICS_NAMESPACE: Metrics namespace (defaults to service name)
 *
 * Usage:
 * ```typescript
 * import { metrics, MetricUnit } from "@/lib/logger/powertools";
 *
 * metrics.addMetric("matchUpdated", MetricUnit.Count, 1);
 * metrics.addDimension("environment", "prod");
 * ```
 *
 * Note: Call `metrics.publishStoredMetrics()` at the end of your handler,
 * or use the `logMetrics` middleware for automatic flushing.
 */
export const metrics = new Metrics({
  namespace: process.env.POWERTOOLS_METRICS_NAMESPACE ?? serviceName,
  serviceName,
});

// Re-export MetricUnit for convenience (already imported above)
export { MetricUnit };

/**
 * Business metric names for tracking domain events.
 *
 * AWS Free Tier allows 10 custom metrics per month. Our current usage:
 * - requestCount (1)
 * - requestDuration (1)
 * - requestError (1)
 * - competitionCreated (1)
 * - firstCompetitionCreated (1)
 * - invitationSent (1)
 * - invitationAccepted (1)
 * - matchFinalized (1)
 * Total: 8 metrics (within 10 free tier limit)
 *
 * IMPORTANT: Do NOT add dimensions (like editionId, competitionId) as each
 * unique dimension combination counts as a separate metric and will exceed
 * the free tier. Use logs for detailed breakdowns instead.
 */
export const BusinessMetric = {
  /** A new competition was created */
  COMPETITION_CREATED: "competitionCreated",
  /** A user created their first competition */
  FIRST_COMPETITION_CREATED: "firstCompetitionCreated",
  /** An invitation email was sent */
  INVITATION_SENT: "invitationSent",
  /** An invitation was accepted by a user */
  INVITATION_ACCEPTED: "invitationAccepted",
  /** A match was finalized (score submitted) */
  MATCH_FINALIZED: "matchFinalized",
} as const;

export type BusinessMetricName =
  (typeof BusinessMetric)[keyof typeof BusinessMetric];

/**
 * Record a business metric. All metrics are Count type with value 1.
 *
 * This is a convenience wrapper that ensures we stay within AWS Free Tier
 * by NOT adding dimensions. Use structured logging for detailed breakdowns.
 *
 * @example
 * ```typescript
 * import { recordBusinessMetric, BusinessMetric } from "@/lib/logger/powertools";
 *
 * // In your handler after a successful operation:
 * recordBusinessMetric(BusinessMetric.COMPETITION_CREATED);
 *
 * // For details, use the logger instead:
 * logger.info("competition_created", { competitionId, userId });
 * ```
 */
export function recordBusinessMetric(metricName: BusinessMetricName): void {
  metrics.addMetric(metricName, MetricUnit.Count, 1);
}
