import { toNextJsHandler } from "better-auth/next-js";
import type { NextRequest } from "next/server";
import { logger } from "@/lib/logger/powertools";
import { auth } from "@/server/auth";

const betterAuthHandler = toNextJsHandler(auth);

export const dynamic = "force-dynamic";

/**
 * Wrap better-auth handlers with Powertools logging.
 * This ensures auth requests/errors are visible in CloudWatch.
 */
function withLogging(
  handler: (req: NextRequest) => Promise<Response>,
  method: string,
) {
  return async (req: NextRequest): Promise<Response> => {
    const startTime = Date.now();
    const path = req.nextUrl.pathname;

    logger.appendKeys({
      method,
      path,
      authEndpoint: path.replace("/api/auth/", ""),
    });

    try {
      logger.info("auth_request_started");

      const response = await handler(req);

      const durationMs = Date.now() - startTime;
      logger.info("auth_request_completed", {
        durationMs,
        status: response.status,
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      logger.error("auth_request_failed", {
        durationMs,
        error: message,
        stack,
      });

      throw error;
    } finally {
      logger.removeKeys(["method", "path", "authEndpoint"]);
    }
  };
}

export const GET = withLogging(betterAuthHandler.GET, "GET");
export const POST = withLogging(betterAuthHandler.POST, "POST");
