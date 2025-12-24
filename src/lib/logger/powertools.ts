import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";

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

// Re-export MetricUnit for convenience
export { MetricUnit } from "@aws-lambda-powertools/metrics";
