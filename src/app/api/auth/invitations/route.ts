import { NextResponse } from "next/server";
import { createInvitation } from "@/modules/identity/service";
import { createApiHandler } from "@/server/api/handler";

export const POST = createApiHandler(
  async ({ request, auth }) => {
    if (!auth) {
      return NextResponse.json(
        {
          type: "https://tournament.app/problems/unauthorized",
          title: "Authentication required",
          status: 401,
          detail: "You must be authenticated to create invitations.",
        },
        { status: 401 },
      );
    }

    const payload = await request.json();

    const invitation = await createInvitation({
      email: payload.email,
      role: payload.role,
      scope: payload.scope,
      invitedByUserId: auth.user.id,
      expiresAt: payload.expires_at ? new Date(payload.expires_at) : undefined,
    });

    return NextResponse.json(invitation, { status: 201 });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);
