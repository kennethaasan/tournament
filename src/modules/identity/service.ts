import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { createProblem } from "@/lib/errors/problem";
import type { Role, RoleScope } from "@/server/auth";
import {
  db,
  type TransactionClient,
  withTransaction,
} from "@/server/db/client";
import {
  type RoleInvitation,
  roleInvitations,
  type User,
  type UserRole,
  userRoles,
} from "@/server/db/schema";

const DEFAULT_INVITATION_TTL_DAYS = 7;

type InvitationScopeInput = {
  type: RoleScope;
  id?: string | null;
};

type NormalizedScope = {
  type: RoleScope;
  id: string | null;
};

export type CreateInvitationInput = {
  email: string;
  role: Role;
  scope: InvitationScopeInput;
  invitedByUserId: string;
  expiresAt?: Date | string;
};

export type AcceptInvitationInput = {
  token: string;
  userId: string;
};

export type GrantRoleInput = {
  userId: string;
  role: Role;
  scope: InvitationScopeInput;
  grantedByUserId?: string | null;
};

export async function createInvitation(
  input: CreateInvitationInput,
): Promise<RoleInvitation> {
  const { role, invitedByUserId } = input;
  const expiresAt = validateExpiry(input.expiresAt);
  const normalizedScope = normalizeScope(input.scope);
  const normalizedEmail = normalizeEmail(input.email);

  const inviter = await db.query.users.findFirst({
    columns: { id: true, email: true },
    where: (table, { eq: eqHelper }) => eqHelper(table.id, invitedByUserId),
  });

  if (!inviter) {
    throw createProblem({
      type: "https://tournament.app/problems/inviter-not-found",
      title: "Inviter not found",
      status: 404,
      detail: "The user attempting to send the invitation could not be found.",
    });
  }

  const inserted = await db
    .insert(roleInvitations)
    .values({
      email: normalizedEmail,
      role,
      scopeType: normalizedScope.type,
      scopeId: normalizedScope.id,
      invitedBy: inviter.id,
      token: randomUUID(),
      expiresAt,
    })
    .returning();

  const invitation = inserted[0];

  if (!invitation) {
    throw createProblem({
      type: "https://tournament.app/problems/invitation-not-created",
      title: "Unable to create invitation",
      status: 500,
      detail: "The invitation could not be created. Please try again.",
    });
  }

  return invitation;
}

export async function grantRole(input: GrantRoleInput): Promise<UserRole> {
  return withTransaction((tx) =>
    ensureRole(tx, { ...input, scope: normalizeScope(input.scope) }),
  );
}

export async function acceptInvitation(
  input: AcceptInvitationInput,
): Promise<{ invitation: RoleInvitation; role: UserRole; user: User }> {
  return withTransaction(async (tx) => {
    const invitation = await tx.query.roleInvitations.findFirst({
      where: (table, { eq: eqHelper }) => eqHelper(table.token, input.token),
    });

    if (!invitation) {
      throw createProblem({
        type: "https://tournament.app/problems/invitation-not-found",
        title: "Invitation not found",
        status: 404,
        detail: "The invitation token is invalid or has already been revoked.",
      });
    }

    if (invitation.acceptedAt) {
      throw createProblem({
        type: "https://tournament.app/problems/invitation-already-accepted",
        title: "Invitation already accepted",
        status: 409,
        detail: "This invitation has already been accepted.",
      });
    }

    if (invitation.expiresAt <= new Date()) {
      throw createProblem({
        type: "https://tournament.app/problems/invitation-expired",
        title: "Invitation expired",
        status: 410,
        detail:
          "This invitation has expired. Request a new invitation to continue.",
      });
    }

    const user = await tx.query.users.findFirst({
      where: (table, { eq: eqHelper }) => eqHelper(table.id, input.userId),
    });

    if (!user) {
      throw createProblem({
        type: "https://tournament.app/problems/user-not-found",
        title: "User not found",
        status: 404,
        detail:
          "Unable to accept invitation because the user account does not exist.",
      });
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw createProblem({
        type: "https://tournament.app/problems/email-mismatch",
        title: "Email mismatch",
        status: 400,
        detail:
          "You must sign in with the same email address the invitation was sent to.",
      });
    }

    const role = await ensureRole(tx, {
      userId: user.id,
      role: invitation.role as Role,
      scope: normalizeScope({
        type: invitation.scopeType,
        id: invitation.scopeId,
      }),
      grantedByUserId: invitation.invitedBy,
    });

    const updatedRows = await tx
      .update(roleInvitations)
      .set({
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(roleInvitations.id, invitation.id))
      .returning();
    const updatedInvitation = updatedRows[0];

    if (!updatedInvitation) {
      throw createProblem({
        type: "https://tournament.app/problems/invitation-update-failed",
        title: "Failed to update invitation",
        status: 500,
        detail: "The invitation could not be updated after acceptance.",
      });
    }

    return {
      invitation: updatedInvitation,
      role,
      user,
    };
  });
}

async function ensureRole(
  client: TransactionClient,
  input: Omit<GrantRoleInput, "scope"> & { scope: NormalizedScope },
): Promise<UserRole> {
  const predicate = buildRoleMatchPredicate(
    input.userId,
    input.role,
    input.scope,
  );

  const existing = await client.query.userRoles.findFirst({
    where: predicate,
  });

  if (existing) {
    return existing;
  }

  const createdRows = await client
    .insert(userRoles)
    .values({
      userId: input.userId,
      role: input.role,
      scopeType: input.scope.type,
      scopeId: input.scope.id ?? null,
      grantedBy: input.grantedByUserId ?? input.userId,
    })
    .returning();
  const created = createdRows[0];

  if (!created) {
    throw createProblem({
      type: "https://tournament.app/problems/role-not-created",
      title: "Unable to grant role",
      status: 500,
      detail: "The role could not be granted. Please try again.",
    });
  }

  return created;
}

function buildRoleMatchPredicate(
  userId: string,
  role: Role,
  scope: NormalizedScope,
) {
  const conditions = [
    eq(userRoles.userId, userId),
    eq(userRoles.role, role),
    eq(userRoles.scopeType, scope.type),
  ];

  if (scope.id) {
    conditions.push(eq(userRoles.scopeId, scope.id));
  } else {
    conditions.push(isNull(userRoles.scopeId));
  }

  return and(...conditions);
}

function validateExpiry(rawExpiry?: Date | string): Date {
  const value =
    rawExpiry instanceof Date
      ? rawExpiry
      : rawExpiry
        ? new Date(rawExpiry)
        : new Date(
            Date.now() + DEFAULT_INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
          );

  if (Number.isNaN(value.getTime())) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-expiry",
      title: "Invalid invitation expiry",
      status: 400,
      detail: "Invitation expiry must be a valid future date.",
    });
  }

  if (value.getTime() <= Date.now()) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-expiry",
      title: "Invalid invitation expiry",
      status: 400,
      detail: "Invitation expiry must be in the future.",
    });
  }

  return value;
}

function normalizeScope(scope: InvitationScopeInput): NormalizedScope {
  const type = scope.type;
  const trimmedId = scope.id ?? null;

  if (type === "global") {
    return { type, id: null };
  }

  if (!trimmedId) {
    throw createProblem({
      type: "https://tournament.app/problems/missing-scope-id",
      title: "Scope identifier required",
      status: 400,
      detail: `Invitations targeting ${type} scopes must include a scope identifier.`,
    });
  }

  return { type, id: trimmedId };
}

function normalizeEmail(email: string): string {
  const trimmed = email.trim();

  if (!trimmed) {
    throw createProblem({
      type: "https://tournament.app/problems/invalid-email",
      title: "Invalid email",
      status: 400,
      detail: "Email address is required for invitations.",
    });
  }

  return trimmed;
}
