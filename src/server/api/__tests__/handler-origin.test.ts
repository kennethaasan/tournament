import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  resolveTrustedOrigins: vi.fn(),
  requireRoles: vi.fn(),
}));

vi.mock("@/server/auth", () => ({
  getSession: authMocks.getSession,
  resolveTrustedOrigins: authMocks.resolveTrustedOrigins,
  requireRoles: authMocks.requireRoles,
}));

vi.mock("@/env", () => ({
  env: {
    NODE_ENV: "production",
  },
}));

vi.mock("@/lib/logger/powertools", () => ({
  logger: {
    appendKeys: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    removeKeys: vi.fn(),
  },
  metrics: {
    addMetric: vi.fn(),
    publishStoredMetrics: vi.fn(),
  },
  MetricUnit: {
    Count: "Count",
    Milliseconds: "Milliseconds",
  },
}));

import { createApiHandler } from "@/server/api/handler";

beforeEach(() => {
  authMocks.getSession.mockResolvedValue(null);
  authMocks.resolveTrustedOrigins.mockReset();
});

describe("createApiHandler origin enforcement", () => {
  it("rejects state-changing requests without an origin", async () => {
    const handler = createApiHandler(async () =>
      NextResponse.json({ ok: true }),
    );

    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: {
        cookie: "session=1",
      },
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.detail).toBe("Missing or invalid Origin header.");
  });

  it("rejects malformed origins", async () => {
    authMocks.resolveTrustedOrigins.mockReturnValue([
      "https://good.example.com",
    ]);

    const handler = createApiHandler(async () =>
      NextResponse.json({ ok: true }),
    );

    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: {
        cookie: "session=1",
        origin: "not-a-url",
      },
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.detail).toBe("Origin header could not be parsed.");
  });

  it("allows requests that match wildcard origins", async () => {
    authMocks.resolveTrustedOrigins.mockReturnValue(["*.example.com"]);

    const handler = createApiHandler(async () =>
      NextResponse.json({ ok: true }, { status: 200 }),
    );

    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: {
        cookie: "session=1",
        origin: "https://api.example.com",
      },
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
  });
});
