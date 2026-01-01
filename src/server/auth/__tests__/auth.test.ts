import { describe, expect, it, vi } from "vitest";
import { ProblemError } from "@/lib/errors/problem";
import type { AuthContext } from "@/server/auth";
import { requireRoles, userHasRole } from "@/server/auth";
import { createTestAuthContext } from "@/test/factories";

vi.mock("@/env", () => ({
  env: {
    BETTER_AUTH_SECRET: "test-secret",
    BETTER_AUTH_EMAIL_SENDER: "no-reply@example.com",
    BETTER_AUTH_TRUSTED_ORIGINS:
      "https://extra.example.com, https://second.test ",
    BETTER_AUTH_URL: "https://auth.example.com",
    NEXT_PUBLIC_APP_URL: "https://app.example.com",
    NODE_ENV: "test",
  },
}));

describe("auth config", () => {
  it("builds trusted origins list with defaults and extra values", async () => {
    const { resolveTrustedOrigins } = await import("@/server/auth");
    const origins = resolveTrustedOrigins();

    expect(origins).toContain("https://auth.example.com");
    expect(origins).toContain("https://app.example.com");
    expect(origins).toContain("https://extra.example.com");
    expect(origins).toContain("https://second.test");
  });

  it("detects roles on the auth context", () => {
    const context = createTestAuthContext({
      roles: [{ role: "global_admin", scopeType: "global", scopeId: null }],
    });

    const authContext = context as unknown as AuthContext;
    expect(userHasRole(authContext, "global_admin")).toBe(true);
    expect(userHasRole(authContext, "team_manager")).toBe(false);
  });

  it("requires roles when configured", () => {
    const context = createTestAuthContext({
      roles: [
        {
          role: "competition_admin",
          scopeType: "competition",
          scopeId: "comp-1",
        },
      ],
    });

    const authContext = context as unknown as AuthContext;
    expect(() =>
      requireRoles(authContext, ["competition_admin"]),
    ).not.toThrow();
    expect(() => requireRoles(authContext, ["global_admin"])).toThrow(
      ProblemError,
    );
  });

  it("returns early when empty roles array is required", () => {
    const context = createTestAuthContext({ roles: [] });
    const authContext = context as unknown as AuthContext;

    // Should not throw even if user has no roles
    expect(() => requireRoles(authContext, [])).not.toThrow();
  });

  it("returns false when context is null", () => {
    expect(userHasRole(null, "global_admin")).toBe(false);
  });

  it("returns false when user has no roles", () => {
    const context = createTestAuthContext({ roles: [] });
    const authContext = context as unknown as AuthContext;

    expect(userHasRole(authContext, "global_admin")).toBe(false);
  });
});
