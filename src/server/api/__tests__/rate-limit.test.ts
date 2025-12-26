import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";
import { applyRateLimit, createRateLimiter } from "@/server/api/rate-limit";

describe("rate limiting", () => {
  test("tracks requests within the window", () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 1_000 });
    const request = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });

    const first = limiter.check(request);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);

    const second = limiter.check(request);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);

    const third = limiter.check(request);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  test("applyRateLimit returns 429 responses when exceeded", () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 10_000 });
    const request = new NextRequest("http://localhost/api/test", {
      headers: {
        "x-real-ip": "198.51.100.24",
      },
    });

    expect(applyRateLimit(request, limiter)).toBeNull();

    const response = applyRateLimit(request, limiter);
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBeTruthy();
  });
});
