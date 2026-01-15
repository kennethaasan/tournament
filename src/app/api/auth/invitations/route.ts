import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { createProblem } from "@/lib/errors/problem";
import {
  BusinessMetric,
  logger,
  recordBusinessMetric,
} from "@/lib/logger/powertools";
import { createInvitation } from "@/modules/identity/service";
import { createApiHandler } from "@/server/api/handler";
import {
  type AuthContext,
  type Role,
  type RoleScope,
  userHasRole,
} from "@/server/auth";
import { db } from "@/server/db/client";
import { competitions, roleInvitations, teams } from "@/server/db/schema";
import { sendInvitationEmail } from "@/server/email/invitations";

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

    const scope = payload.scope ?? {};
    const scopeType = scope.type as string | undefined;
    const scopeId = scope.id as string | null | undefined;

    enforceInvitationScope({
      auth,
      role: payload.role,
      scopeType,
      scopeId,
    });

    const invitation = await createInvitation({
      email: payload.email,
      role: payload.role,
      scope: {
        type: (scopeType ?? "global") as RoleScope,
        id: scopeId ?? null,
      },
      invitedByUserId: auth.user.id,
      expiresAt: payload.expires_at ? new Date(payload.expires_at) : undefined,
    });

    const acceptUrl = buildAcceptUrl(invitation.token);
    const scopeLabel = await resolveScopeLabel(
      invitation.scopeType as RoleScope,
      invitation.scopeId ?? null,
    );

    try {
      await sendInvitationEmail({
        toEmail: invitation.email,
        acceptUrl,
        role: invitation.role as Role,
        scopeType: invitation.scopeType as RoleScope,
        scopeLabel,
        inviterEmail: auth.user.email ?? null,
        expiresAt: invitation.expiresAt,
      });
      recordBusinessMetric(BusinessMetric.INVITATION_SENT);
      logger.info("invitation_sent", {
        invitationId: invitation.id,
        role: invitation.role,
        scopeType: invitation.scopeType,
      });
    } catch (error) {
      await rollbackInvitation(invitation.id);
      throw error;
    }

    return NextResponse.json(serializeInvitation(invitation), { status: 201 });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin", "team_manager"],
  },
);

type InvitationScopeInput = {
  auth: AuthContext;
  role: string;
  scopeType?: string;
  scopeId?: string | null;
};

function enforceInvitationScope({
  auth,
  role,
  scopeType,
  scopeId,
}: InvitationScopeInput) {
  const isGlobalAdmin = userHasRole(auth, "global_admin");

  if (role === "global_admin") {
    if (!isGlobalAdmin) {
      throw createProblem({
        type: "https://tournament.app/problems/invitations/forbidden",
        title: "Ingen tilgang",
        status: 403,
        detail: "Kun globale administratorer kan invitere andre globale admin.",
      });
    }

    if (scopeType && scopeType !== "global") {
      throw createProblem({
        type: "https://tournament.app/problems/invitations/invalid-scope",
        title: "Ugyldig scope",
        status: 400,
        detail: "Globale administratorer må ha scope type 'global'.",
      });
    }

    return;
  }

  if (role === "competition_admin") {
    if (scopeType !== "competition" || !scopeId) {
      throw createProblem({
        type: "https://tournament.app/problems/invitations/invalid-scope",
        title: "Ugyldig scope",
        status: 400,
        detail: "Invitasjonen må knyttes til en konkurranse.",
      });
    }

    if (isGlobalAdmin) {
      return;
    }

    const hasScope = auth.user.roles.some(
      (assignment) =>
        assignment.role === "competition_admin" &&
        assignment.scopeType === "competition" &&
        assignment.scopeId === scopeId,
    );

    if (!hasScope) {
      throw createProblem({
        type: "https://tournament.app/problems/invitations/forbidden",
        title: "Ingen tilgang",
        status: 403,
        detail:
          "Du kan kun invitere administratorer til konkurranser du allerede administrerer.",
      });
    }

    return;
  }

  if (role === "team_manager") {
    if (scopeType !== "team" || !scopeId) {
      throw createProblem({
        type: "https://tournament.app/problems/invitations/invalid-scope",
        title: "Ugyldig scope",
        status: 400,
        detail: "Invitasjonen må knyttes til et lag.",
      });
    }

    if (isGlobalAdmin) {
      return;
    }

    const hasScope = auth.user.roles.some(
      (assignment) =>
        assignment.role === "team_manager" &&
        assignment.scopeType === "team" &&
        assignment.scopeId === scopeId,
    );

    if (!hasScope) {
      throw createProblem({
        type: "https://tournament.app/problems/invitations/forbidden",
        title: "Ingen tilgang",
        status: 403,
        detail: "Du kan kun invitere lagledere til lag du selv administrerer.",
      });
    }

    return;
  }

  throw createProblem({
    type: "https://tournament.app/problems/invitations/invalid-role",
    title: "Ugyldig rolle",
    status: 400,
    detail: "Rollen som ble forespurt støttes ikke.",
  });
}

function serializeInvitation(
  invitation: Awaited<ReturnType<typeof createInvitation>>,
) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    scope: {
      type: invitation.scopeType,
      id: invitation.scopeId ?? null,
    },
    expires_at: invitation.expiresAt.toISOString(),
    accept_url: null,
  };
}

function buildAcceptUrl(token: string | null) {
  const baseUrl = (env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL).replace(
    /\/$/,
    "",
  );
  if (!token) {
    throw createProblem({
      type: "https://tournament.app/problems/invitations/missing-token",
      title: "Invitasjon mangler token",
      status: 500,
      detail: "Invitasjonstoken mangler for e-postlenken.",
    });
  }

  return `${baseUrl}/auth/invitations/${token}`;
}

async function resolveScopeLabel(
  scopeType: RoleScope,
  scopeId: string | null,
): Promise<string | null> {
  if (!scopeId) {
    return null;
  }

  if (scopeType === "competition") {
    const competition = await db.query.competitions.findFirst({
      columns: { name: true, slug: true },
      where: eq(competitions.id, scopeId),
    });
    if (!competition) {
      return scopeId;
    }
    return `${competition.name} (${competition.slug})`;
  }

  if (scopeType === "team") {
    const team = await db.query.teams.findFirst({
      columns: { name: true, slug: true },
      where: eq(teams.id, scopeId),
    });
    if (!team) {
      return scopeId;
    }
    return `${team.name} (${team.slug})`;
  }

  return scopeId;
}

async function rollbackInvitation(invitationId: string) {
  try {
    await db
      .delete(roleInvitations)
      .where(eq(roleInvitations.id, invitationId));
  } catch (error) {
    // Best effort rollback; log and continue
    const message = error instanceof Error ? error.message : String(error);
    throw createProblem({
      type: "https://tournament.app/problems/invitations/rollback-failed",
      title: "Invitasjonen kunne ikke rulles tilbake",
      status: 500,
      detail: `Invitasjonen ble ikke sendt og sletting feilet: ${message}`,
    });
  }
}
