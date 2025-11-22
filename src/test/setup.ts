import { PGlite } from "@electric-sql/pglite";
import "@testing-library/jest-dom/vitest";
import { drizzle } from "drizzle-orm/pglite";
import { vi } from "vitest";
import * as schema from "@/server/db/schema";

// Set baseline environment variables
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-test-secret-test-secret-123");
vi.stubEnv("BETTER_AUTH_EMAIL_SENDER", "test@example.com");

// Mock the database client
vi.mock("@/server/db/client", async () => {
  const { createRequire } = await vi.importActual<typeof import("node:module")>(
    "node:module",
  );
  const require = createRequire(import.meta.url);
  const { pushSchema } = require("drizzle-kit/api") as typeof import("drizzle-kit/api");

  const client = new PGlite();
  const db = drizzle(client, { schema, casing: "snake_case" });

  // Initialize required extensions and functions
  // PGlite might not have citext extension, so we mock it as text domain.
  // Note: This loses case-insensitive behavior of citext but allows schema creation.
  await client.query(`
    DO $$ BEGIN
      CREATE DOMAIN citext AS text;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await client.query(`
    CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS uuid AS $$
    BEGIN
      RETURN gen_random_uuid();
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Apply schema
  const { apply } = await pushSchema(schema, db as any);
  await apply();

  return {
    db,
    sqlClient: {},
    withTransaction: async (cb: any) => cb(db),
    shutdown: async () => undefined,
  };
});

// Mock authentication
const mockUser = {
  user: {
    id: "user-1",
    email: "admin@example.com",
    name: "Admin User",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: "session-1",
    userId: "user-1",
    expiresAt: new Date(Date.now() + 3600 * 1000),
    token: "token-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: "127.0.0.1",
    userAgent: "test-agent",
  },
};

vi.mock("@/server/auth", async () => {
  const actual = await vi.importActual<typeof import("@/server/auth")>(
    "@/server/auth",
  );
  return {
    ...actual,
    getSession: vi.fn().mockResolvedValue({
      session: mockUser.session,
      user: {
        ...mockUser.user,
        roles: [], // Default no roles
      },
    }),
  };
});
