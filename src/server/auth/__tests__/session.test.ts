import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db/client";
import { userRoles, users } from "@/server/db/schema";

const authMocks = vi.hoisted(() => {
  class APIError extends Error {}
  return {
    APIError,
    getSession: vi.fn(),
  };
});

vi.mock("better-auth", () => ({
  APIError: authMocks.APIError,
  betterAuth: vi.fn(() => ({
    api: {
      getSession: authMocks.getSession,
    },
  })),
}));

vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: vi.fn(),
}));

vi.mock("better-auth/next-js", () => ({
  nextCookies: vi.fn(),
}));

vi.mock("@/lib/logger/powertools", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    appendKeys: vi.fn(),
    removeKeys: vi.fn(),
  },
}));

let getSession: typeof import("@/server/auth").getSession;
let getSessionFromHeaders: typeof import("@/server/auth").getSessionFromHeaders;

const USER_ID = "00000000-0000-0000-0000-000000000911";

const loadAuthModule = async () => {
  vi.resetModules();
  vi.unmock("@/server/auth");
  const module = await import("@/server/auth");
  getSession = module.getSession;
  getSessionFromHeaders = module.getSessionFromHeaders;
};

beforeEach(async () => {
  await loadAuthModule();
  authMocks.getSession.mockReset();
  await db.delete(userRoles);
  await db.delete(users);
});

describe("session resolution", () => {
  it("returns null when no session is present", async () => {
    authMocks.getSession.mockResolvedValue(null);

    const result = await getSessionFromHeaders(new Headers());

    expect(result).toBeNull();
  });

  it("resolves roles for authenticated users", async () => {
    await db.insert(users).values({
      id: USER_ID,
      email: "user@example.com",
      emailVerified: true,
      fullName: "Test User",
    });
    const scopeId = "00000000-0000-0000-0000-000000009112";
    await db.insert(userRoles).values({
      userId: USER_ID,
      role: "competition_admin",
      scopeType: "competition",
      scopeId,
    });

    authMocks.getSession.mockResolvedValue({
      session: {
        id: "session-1",
        userId: USER_ID,
        expiresAt: new Date(Date.now() + 60_000),
        token: "token",
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
      },
      user: {
        id: USER_ID,
        email: "user@example.com",
        name: "Test User",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const result = await getSessionFromHeaders(new Headers());

    expect(result?.user.roles).toEqual([
      {
        role: "competition_admin",
        scopeType: "competition",
        scopeId,
      },
    ]);
  });

  it("handles APIError failures by returning null", async () => {
    authMocks.getSession.mockRejectedValue(
      new authMocks.APIError("Invalid session"),
    );

    const result = await getSessionFromHeaders(new Headers());

    expect(result).toBeNull();
  });

  it("rethrows unexpected errors", async () => {
    authMocks.getSession.mockRejectedValue(new Error("Network down"));

    await expect(getSessionFromHeaders(new Headers())).rejects.toThrow(
      "Network down",
    );
  });

  it("reads headers from NextRequest", async () => {
    authMocks.getSession.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/test", {
      method: "GET",
    });

    const result = await getSession(request);

    expect(result).toBeNull();
  });
});
