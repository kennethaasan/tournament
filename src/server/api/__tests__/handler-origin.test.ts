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

  it("allows exact origin match without protocol", async () => {
    authMocks.resolveTrustedOrigins.mockReturnValue(["localhost:3000"]);

    const handler = createApiHandler(async () =>
      NextResponse.json({ ok: true }, { status: 200 }),
    );

    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: {
        cookie: "session=1",
        origin: "http://localhost:3000",
      },
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
  });

  it("allows exact origin match with protocol", async () => {
    // Note: Default ports (443 for https, 80 for http) are normalized away by URL.origin
    authMocks.resolveTrustedOrigins.mockReturnValue(["https://example.com"]);

    const handler = createApiHandler(async () =>
      NextResponse.json({ ok: true }, { status: 200 }),
    );

    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: {
        cookie: "session=1",
        origin: "https://example.com",
      },
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
  });

  it("allows wildcard origin with protocol prefix", async () => {
    authMocks.resolveTrustedOrigins.mockReturnValue(["https://*.example.com"]);

    const handler = createApiHandler(async () =>
      NextResponse.json({ ok: true }, { status: 200 }),
    );

    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: {
        cookie: "session=1",
        origin: "https://app.example.com",
      },
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
  });

  it("rejects origin that does not match trusted origins", async () => {
    authMocks.resolveTrustedOrigins.mockReturnValue(["https://example.com"]);

    const handler = createApiHandler(async () =>
      NextResponse.json({ ok: true }),
    );

    const request = new NextRequest("http://localhost/api/test", {
      method: "DELETE",
      headers: {
        cookie: "session=1",
        origin: "https://evil.com",
      },
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.detail).toBe("Origin is not allowed for this request.");
  });

  it("rejects origin string 'null'", async () => {
    authMocks.resolveTrustedOrigins.mockReturnValue(["https://example.com"]);

    const handler = createApiHandler(async () =>
      NextResponse.json({ ok: true }),
    );

    const request = new NextRequest("http://localhost/api/test", {
      method: "PUT",
      headers: {
        cookie: "session=1",
        origin: "null",
      },
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(403);
  });

  it("uses referer header when origin is missing", async () => {
    authMocks.resolveTrustedOrigins.mockReturnValue(["https://example.com"]);

    const handler = createApiHandler(async () =>
      NextResponse.json({ ok: true }, { status: 200 }),
    );

    const request = new NextRequest("http://localhost/api/test", {
      method: "PATCH",
      headers: {
        cookie: "session=1",
        referer: "https://example.com/page",
      },
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
  });

  it("skips origin check for GET requests", async () => {
    const handler = createApiHandler(async () =>
      NextResponse.json({ ok: true }, { status: 200 }),
    );

    const request = new NextRequest("http://localhost/api/test", {
      method: "GET",
      headers: {
        cookie: "session=1",
      },
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
  });

  it("skips origin check when no cookie present", async () => {
    const handler = createApiHandler(async () =>
      NextResponse.json({ ok: true }, { status: 200 }),
    );

    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
  });
});
