import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db/client";

type HealthStatus = "ok" | "degraded" | "unhealthy";

type HealthCheckResponse = {
  status: HealthStatus;
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: HealthStatus;
      latencyMs?: number;
      error?: string;
    };
  };
};

/**
 * Health check endpoint for load balancers, monitoring, and orchestration.
 *
 * Returns:
 * - 200: All systems operational
 * - 503: One or more systems are unhealthy
 *
 * @example Response
 * ```json
 * {
 *   "status": "ok",
 *   "timestamp": "2025-01-15T10:30:00.000Z",
 *   "version": "0.1.0",
 *   "checks": {
 *     "database": {
 *       "status": "ok",
 *       "latencyMs": 5
 *     }
 *   }
 * }
 * ```
 */
export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const checks: HealthCheckResponse["checks"] = {
    database: { status: "ok" },
  };

  // Check database connectivity
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = {
      status: "ok",
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "unhealthy",
      latencyMs: Date.now() - dbStart,
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }

  // Determine overall status
  const statuses = Object.values(checks).map((check) => check.status);
  let overallStatus: HealthStatus = "ok";

  if (statuses.includes("unhealthy")) {
    overallStatus = "unhealthy";
  } else if (statuses.includes("degraded")) {
    overallStatus = "degraded";
  }

  const response: HealthCheckResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
    checks,
  };

  const httpStatus = overallStatus === "unhealthy" ? 503 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
