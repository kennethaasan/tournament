import { NextResponse } from "next/server";
import { createProblem } from "@/lib/errors/problem";
import { acceptInvitation } from "@/modules/identity/service";
import { createApiHandler } from "@/server/api/handler";
import { sendInvitationAcceptedEmail } from "@/server/email/action-emails";

type AcceptInvitationBody = {
  token: string;
};

export const POST = createApiHandler(
  async ({ request, auth }) => {
    if (!auth) {
      return NextResponse.json(
        {
          type: "https://httpstatuses.com/401",
          title: "Autentisering kreves",
          status: 401,
          detail: "Du må være innlogget for å godta invitasjonen.",
        },
        { status: 401 },
      );
    }

    const payload = (await request.json()) as AcceptInvitationBody;
    const token = payload.token?.trim();

    if (!token) {
      throw createProblem({
        type: "https://tournament.app/problems/invitations/missing-token",
        title: "Invitasjon mangler",
        status: 400,
        detail: "Invitasjonstoken mangler i forespørselen.",
      });
    }

    const result = await acceptInvitation({
      token,
      userId: auth.user.id,
    });

    await sendInvitationAcceptedEmail({
      invitationId: result.invitation.id,
      inviterId: result.invitation.invitedBy,
      inviteeEmail: result.user.email,
      role: result.invitation.role,
      scopeType: result.invitation.scopeType,
      scopeId: result.invitation.scopeId ?? null,
    });

    return NextResponse.json(
      {
        invitation: {
          id: result.invitation.id,
          email: result.invitation.email,
          role: result.invitation.role,
          scope: {
            type: result.invitation.scopeType,
            id: result.invitation.scopeId ?? null,
          },
          expires_at: result.invitation.expiresAt.toISOString(),
        },
        role: {
          role: result.role.role,
          scope: {
            type: result.role.scopeType,
            id: result.role.scopeId ?? null,
          },
        },
      },
      { status: 200 },
    );
  },
  {
    requireAuth: true,
  },
);
