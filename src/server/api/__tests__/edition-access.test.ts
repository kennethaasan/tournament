import { beforeEach, describe, expect, it } from "vitest";
import { assertEditionAdminAccess } from "@/server/api/edition-access";
import type { AuthContext } from "@/server/auth";
import { db } from "@/server/db/client";
import { competitions, editions } from "@/server/db/schema";

const COMPETITION_ID = "00000000-0000-0000-0000-000000000901";
const EDITION_ID = "00000000-0000-0000-0000-000000000902";

const baseAuth = {
  session: {
    id: "session-1",
    userId: "user-1",
    expiresAt: new Date(Date.now() + 3600 * 1000),
    token: "token-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: "127.0.0.1",
    userAgent: "vitest",
  },
  user: {
    id: "user-1",
    email: "user@example.com",
    name: "Test User",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [],
  },
} as AuthContext;

beforeEach(async () => {
  await db.delete(editions);
  await db.delete(competitions);

  await db.insert(competitions).values({
    id: COMPETITION_ID,
    name: "Edition Cup",
    slug: "edition-cup",
    defaultTimezone: "Europe/Oslo",
  });

  await db.insert(editions).values({
    id: EDITION_ID,
    competitionId: COMPETITION_ID,
    label: "2025",
    slug: "2025",
    status: "published",
    format: "round_robin",
    timezone: "Europe/Oslo",
  });
});

describe("assertEditionAdminAccess", () => {
  it("rejects missing edition id and unauthenticated access", async () => {
    await expect(
      assertEditionAdminAccess(undefined, baseAuth),
    ).rejects.toMatchObject({ problem: { status: 400 } });

    await expect(
      assertEditionAdminAccess(EDITION_ID, null),
    ).rejects.toMatchObject({ problem: { status: 401 } });
  });

  it("rejects unknown editions and unauthorized users", async () => {
    const auth = {
      ...baseAuth,
      user: { ...baseAuth.user, roles: [] },
    } as AuthContext;

    await expect(
      assertEditionAdminAccess("00000000-0000-0000-0000-000000000999", auth),
    ).rejects.toMatchObject({ problem: { status: 404 } });

    await expect(
      assertEditionAdminAccess(EDITION_ID, auth),
    ).rejects.toMatchObject({ problem: { status: 403 } });
  });

  it("allows global and scoped competition admins", async () => {
    const globalAdmin = {
      ...baseAuth,
      user: {
        ...baseAuth.user,
        roles: [{ role: "global_admin", scopeType: "global", scopeId: null }],
      },
    } as AuthContext;

    const scopedAdmin = {
      ...baseAuth,
      user: {
        ...baseAuth.user,
        roles: [
          {
            role: "competition_admin",
            scopeType: "competition",
            scopeId: COMPETITION_ID,
          },
        ],
      },
    } as AuthContext;

    const globalResult = await assertEditionAdminAccess(
      EDITION_ID,
      globalAdmin,
    );
    expect(globalResult.id).toBe(EDITION_ID);

    const scopedResult = await assertEditionAdminAccess(
      EDITION_ID,
      scopedAdmin,
    );
    expect(scopedResult.id).toBe(EDITION_ID);
  });
});
