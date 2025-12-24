import { Logger } from "@aws-lambda-powertools/logger";

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
  serviceName: process.env.POWERTOOLS_SERVICE_NAME ?? "competitions",
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
