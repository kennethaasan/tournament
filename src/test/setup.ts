import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/server/db/schema";

// Set baseline environment variables for tests before modules import.
vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/tournament_app");
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-test-secret-test-secret-123");
vi.stubEnv("BETTER_AUTH_EMAIL_SENDER", "no-reply@example.com");
vi.stubEnv("BETTER_AUTH_TRUSTED_ORIGINS", "http://localhost:3000");
vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

// Mock the database client
vi.mock("@/server/db/client", async () => {
  const { createRequire } = await vi.importActual<typeof import("node:module")>("node:module");
  const require = createRequire(import.meta.url);

  const { pushSchema } = require("drizzle-kit/api");

  const client = new PGlite();

  // Mock citext type and polyfill uuid_generate_v7
  // Note: citext as text will not be case-insensitive, but sufficient for schema validation if no case-conflict logic is tested.
  await client.exec(`
    CREATE DOMAIN citext AS text;
    CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS uuid AS 'SELECT gen_random_uuid()' LANGUAGE sql;
  `);

  const db = drizzle(client, {
    schema,
    casing: "snake_case",
  });

  // apply schema to db
  const { apply } = await pushSchema(schema, db);
  await apply();

  return {
    db,
    sqlClient: {},
    withTransaction: async (cb: any) => cb(db),
    shutdown: vi.fn(),
  };
});
