import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Server-side environment variables.
   */
  server: {
    DATABASE_URL: z.string().url(),
    DATABASE_POOL_MAX: z.coerce.number().optional().default(10),
    DATABASE_IDLE_TIMEOUT: z.coerce.number().optional().default(30),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_EMAIL_SENDER: z.string().email(),
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
    BETTER_AUTH_URL: z.string().url().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    CI: z.coerce.boolean().optional(),
    SES_ENABLED: z.coerce.boolean().optional().default(false),
    SES_REGION: z.string().optional(),
    SES_ACCESS_KEY_ID: z.string().optional(),
    SES_SECRET_ACCESS_KEY: z.string().optional(),
    SES_SOURCE_EMAIL: z.string().email().optional(),
    SES_CONFIGURATION_SET: z.string().optional(),

    // AWS Lambda Powertools
    POWERTOOLS_SERVICE_NAME: z.string().default("competitions"),
    POWERTOOLS_LOG_LEVEL: z
      .enum(["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"])
      .default("INFO"),
    POWERTOOLS_METRICS_NAMESPACE: z.string().default("tournament"),

    // Performance check vars
    PERF_BASE_URL: z.string().url().optional(),
    PERF_COMPETITION_SLUG: z.string().default("trondheim-cup"),
    PERF_EDITION_SLUG: z.string().default("2025"),
    PERF_SCOREBOARD_BUDGET_MS: z.coerce.number().default(250),
    PERF_EVENT_FEED_BUDGET_MS: z.coerce.number().default(200),
    PERF_RUNS: z.coerce.number().default(3),
  },

  /**
   * Client-side environment variables.
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },

  /**
   * Runtime environment variables.
   */
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /**
   * Skip validation for CI/CD or build environments.
   */
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",

  /**
   * Treat empty strings as undefined.
   */
  emptyStringAsUndefined: true,
});
