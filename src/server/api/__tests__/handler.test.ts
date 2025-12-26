import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createProblem } from "@/lib/errors/problem";
import { createApiHandler } from "@/server/api/handler";
import { getSession } from "@/server/auth";
import { createTestAuthContext } from "@/test/factories";

const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  mockGetSession.mockReset();
});

describe("createApiHandler", () => {
  test("returns responses and sets correlation headers", async () => {
    const auth = createTestAuthContext({
      roles: [{ role: "global_admin", scopeType: "global", scopeId: null }],
    });
    mockGetSession.mockResolvedValue(auth as never);

    const handler = createApiHandler(async () => {
      return NextResponse.json({ ok: true }, { status: 200 });
    });

    const request = new NextRequest("http://localhost/api/test", {
      method: "GET",
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBeTruthy();
  });

  test("returns problem details when auth is required", async () => {
    mockGetSession.mockResolvedValue(null);

    const handler = createApiHandler(
      async () => NextResponse.json({ ok: true }),
      { requireAuth: true },
    );

    const request = new NextRequest("http://localhost/api/test", {
      method: "GET",
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(401);
  });

  test("handles thrown errors and returns structured problems", async () => {
    const auth = createTestAuthContext({
      roles: [{ role: "global_admin", scopeType: "global", scopeId: null }],
    });
    mockGetSession.mockResolvedValue(auth as never);

    const handler = createApiHandler(async () => {
      throw createProblem({
        type: "https://httpstatuses.com/400",
        title: "Bad request",
        status: 400,
        detail: "Invalid payload",
      });
    });

    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
    });

    const response = await handler(request, {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("x-correlation-id")).toBeTruthy();
  });
});
