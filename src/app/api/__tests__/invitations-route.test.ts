import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "@/app/api/auth/invitations/route";
import type { AuthContext } from "@/server/auth";
import { getSession } from "@/server/auth";
import { db } from "@/server/db/client";
import { competitions, roleInvitations, users } from "@/server/db/schema";
import { createGlobalAdminContext } from "@/test/factories";

vi.mock("@/server/email/invitations", () => ({
  sendInvitationEmail: vi.fn(async () => ({ status: "sent" })),
}));

const mockGetSession = vi.mocked(getSession);

const COMPETITION_ID = "00000000-0000-0000-0000-000000000701";
const INVITER_ID = "00000000-0000-0000-0000-000000000702";

beforeEach(async () => {
  await db.delete(roleInvitations);
  await db.delete(users);
  await db.delete(competitions);

  await db.insert(competitions).values({
    id: COMPETITION_ID,
    name: "Elite Cup",
    slug: "elite-cup",
    defaultTimezone: "Europe/Oslo",
  });

  await db.insert(users).values({
    id: INVITER_ID,
    email: "admin@example.com",
    emailVerified: true,
    fullName: "Admin User",
  });
});

describe("invitation route", () => {
  test("creates invitations for authorized admins", async () => {
    const auth = createGlobalAdminContext();
    auth.user.id = INVITER_ID;
    auth.user.email = "admin@example.com";
    auth.session.userId = INVITER_ID;
    mockGetSession.mockResolvedValue(auth as unknown as AuthContext);

    const payload = {
      email: "invitee@example.com",
      role: "competition_admin",
      scope: { type: "competition", id: COMPETITION_ID },
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    };

    const request = new NextRequest("http://localhost/api/auth/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await POST(request, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.email).toBe("invitee@example.com");
    expect(body.scope.type).toBe("competition");
  });
});
