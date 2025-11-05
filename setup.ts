import { vi } from "vitest";
import type { SeedDb } from "@/scripts/utils/ensure-basic-user";

// Set baseline environment variables for tests before modules import.
vi.stubEnv("DATABASE_URL", "postgresql://mattis:mattis@localhost:5432/mattis");
vi.stubEnv("BASIC_AUTH_USERNAME", "admin@example.com");
vi.stubEnv("BASIC_AUTH_PASSWORD", "admin");
vi.stubEnv("BASIC_AUTH_USER_ID", "00000000-0000-7000-8000-000000000000");
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-test-secret-test-secret-123");

const mockAuthenticatedUser = {
  user: {
    id: "00000000-0000-7000-8000-000000000000",
    email: "admin@example.com",
    name: "Admin User",
  },
  session: {
    id: "mock-session-id",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  },
};

vi.mock("@/lib/auth/authorize", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/authorize")>(
    "@/lib/auth/authorize"
  );

  return {
    ...actual,
    requireAuthenticatedRequest: vi
      .fn()
      .mockResolvedValue(mockAuthenticatedUser),
  };
});

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/lib/db/schema";

// This is based on https://github.com/drizzle-team/drizzle-orm/issues/4205
vi.mock("@/lib/db/db", async () => {
  const { createRequire } =
    await vi.importActual<typeof import("node:module")>("node:module");

  const require = createRequire(import.meta.url);

  const { pushSchema } =
    require("drizzle-kit/api") as typeof import("drizzle-kit/api");

  const client = new PGlite();
  const db = drizzle({
    client,
    schema,
    casing: "snake_case",
  });

  // apply schema to db
  // biome-ignore lint/suspicious/noExplicitAny: drizzle's helper expects a loosely typed client
  const { apply } = await pushSchema(schema, db as any);
  await apply();

  // now we can seed some data
  const { ensureBasicAuthUser } =
    (await import("@/scripts/utils/ensure-basic-user")) as typeof import(
      "@/scripts/utils/ensure-basic-user"
    );

  await ensureBasicAuthUser(db as unknown as SeedDb);

  return {
    db,
  };
});
