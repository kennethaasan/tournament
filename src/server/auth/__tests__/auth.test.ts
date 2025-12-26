import { describe, expect, it } from "vitest";
import { resolveTrustedOrigins } from "@/server/auth";

describe("auth config", () => {
  const originalEnv = process.env;

  it("builds trusted origins list with defaults and extra values", () => {
    process.env = {
      ...originalEnv,
      BETTER_AUTH_TRUSTED_ORIGINS: "https://extra.example.com, https://second.test ",
      BETTER_AUTH_URL: "https://auth.example.com",
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
    };

    const origins = resolveTrustedOrigins();

    expect(origins).toContain("https://auth.example.com");
    expect(origins).toContain("https://app.example.com");
    expect(origins).toContain("https://extra.example.com");
    expect(origins).toContain("https://second.test");
  });

  afterEach(() => {
    process.env = originalEnv;
  });
});
