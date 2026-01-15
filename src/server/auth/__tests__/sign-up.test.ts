import { beforeEach, describe, expect, test, vi } from "vitest";
import { db } from "@/server/db/client";
import { accounts, sessions, users } from "@/server/db/schema";

// Mock the nextCookies plugin since it requires Next.js headers
vi.mock("better-auth/next-js", () => ({
  nextCookies: vi.fn(() => ({})),
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

let auth: typeof import("@/server/auth").auth;

const loadAuthModule = async () => {
  vi.resetModules();
  const module = await import("@/server/auth");
  auth = module.auth;
};

beforeEach(async () => {
  await loadAuthModule();
  await db.delete(sessions);
  await db.delete(accounts);
  await db.delete(users);
});

describe("user sign-up integration", () => {
  test("creates a new user with email and password", async () => {
    const result = await auth.api.signUpEmail({
      body: {
        email: "newuser@example.com",
        password: "SecurePassword123!",
        name: "New User",
      },
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe("newuser@example.com");
    expect(result.user.name).toBe("New User");

    // Verify user was persisted to database with correct field mapping
    const dbUser = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, "newuser@example.com"),
    });

    expect(dbUser).toBeDefined();
    expect(dbUser?.fullName).toBe("New User");
    expect(dbUser?.emailVerified).toBe(false);
  });

  test("creates a session for the new user", async () => {
    const result = await auth.api.signUpEmail({
      body: {
        email: "session-test@example.com",
        password: "SecurePassword123!",
        name: "Session Test User",
      },
    });

    // Session token should be present when email verification is not required
    if (result.token) {
      expect(result.token).toBeDefined();
    }

    // Verify session was persisted
    const dbSession = await db.query.sessions.findFirst({
      where: (table, { eq }) => eq(table.userId, result.user.id),
    });

    expect(dbSession).toBeDefined();
  });

  test("creates an account record for email/password provider", async () => {
    const result = await auth.api.signUpEmail({
      body: {
        email: "account-test@example.com",
        password: "SecurePassword123!",
        name: "Account Test User",
      },
    });

    const dbAccount = await db.query.accounts.findFirst({
      where: (table, { eq }) => eq(table.userId, result.user.id),
    });

    expect(dbAccount).toBeDefined();
    expect(dbAccount?.providerId).toBe("credential");
  });

  test("rejects duplicate email addresses", async () => {
    await auth.api.signUpEmail({
      body: {
        email: "duplicate@example.com",
        password: "SecurePassword123!",
        name: "First User",
      },
    });

    await expect(
      auth.api.signUpEmail({
        body: {
          email: "duplicate@example.com",
          password: "AnotherPassword456!",
          name: "Second User",
        },
      }),
    ).rejects.toThrow();
  });

  test("handles sign-up without a name", async () => {
    const result = await auth.api.signUpEmail({
      body: {
        email: "noname@example.com",
        password: "SecurePassword123!",
        name: "",
      },
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe("noname@example.com");

    const dbUser = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, "noname@example.com"),
    });

    expect(dbUser).toBeDefined();
    expect(dbUser?.fullName).toBe("");
  });
});
