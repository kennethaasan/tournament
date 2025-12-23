import type { NextRequest } from "next/server";
import { tooManyRequestsResponse } from "./responses";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * In-memory rate limiter for serverless environments.
 *
 * Note: This implementation uses an in-memory Map which means:
 * - Rate limits are per-instance in serverless (Lambda) deployments
 * - For production at scale, consider using Redis or a distributed store
 * - Memory is automatically cleaned up on each request to prevent leaks
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter({ maxRequests: 100, windowMs: 60_000 });
 *
 * export const GET = createApiHandler(async ({ request }) => {
 *   const result = limiter.check(request);
 *   if (!result.allowed) {
 *     return tooManyRequestsResponse(Math.ceil((result.resetAt - Date.now()) / 1000));
 *   }
 *   // ... handle request
 * });
 * ```
 */
export function createRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, RateLimitEntry>();

  function getClientKey(request: NextRequest): string {
    // Try to get real IP from common proxy headers
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const firstIp = forwarded.split(",")[0]?.trim();
      if (firstIp) return firstIp;
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp;

    // Fallback to a generic key (less accurate but safe)
    return request.headers.get("cf-connecting-ip") ?? "unknown";
  }

  function cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }

  function check(request: NextRequest): RateLimitResult {
    cleanup();

    const key = getClientKey(request);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      const resetAt = now + config.windowMs;
      store.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt,
      };
    }

    entry.count += 1;

    if (entry.count > config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  function reset(request: NextRequest): void {
    const key = getClientKey(request);
    store.delete(key);
  }

  return {
    check,
    reset,
    /** Exposed for testing purposes */
    _store: store,
  };
}

/**
 * Pre-configured rate limiters for common use cases.
 */
export const rateLimiters = {
  /**
   * Standard API rate limiter: 100 requests per minute.
   */
  standard: createRateLimiter({
    maxRequests: 100,
    windowMs: 60_000,
  }),

  /**
   * Auth rate limiter: 10 requests per minute (stricter for auth endpoints).
   */
  auth: createRateLimiter({
    maxRequests: 10,
    windowMs: 60_000,
  }),

  /**
   * Public/scoreboard rate limiter: 300 requests per minute (more lenient for polling).
   */
  public: createRateLimiter({
    maxRequests: 300,
    windowMs: 60_000,
  }),
};

/**
 * Helper to apply rate limiting in API handlers.
 * Returns a 429 response if rate limit is exceeded, otherwise returns null.
 *
 * @example
 * ```ts
 * export const GET = createApiHandler(async ({ request }) => {
 *   const rateLimitResponse = applyRateLimit(request, rateLimiters.standard);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // ... handle request
 * });
 * ```
 */
export function applyRateLimit(
  request: NextRequest,
  limiter: ReturnType<typeof createRateLimiter>,
) {
  const result = limiter.check(request);
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return tooManyRequestsResponse(retryAfter);
  }
  return null;
}
