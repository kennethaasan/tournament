import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { env } from "@/env";
import { createProblem } from "@/lib/errors/problem";
import { logger } from "@/lib/logger/pino";
import { db } from "@/server/db/client";
import { type roleScopeEnum, schema } from "@/server/db/schema";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL,
  email: {
    sender: env.BETTER_AUTH_EMAIL_SENDER,
  },
  emailAndPassword: {
    enabled: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    usePlural: true,
  }),
  plugins: [nextCookies()],
  trustedOrigins: () => resolveTrustedOrigins(),
  session: {
    cookieCache: {
      enabled: env.NODE_ENV !== "test",
    },
    expiresIn: 60 * 60 * 24 * 180, // 180 days
  },
});

type BetterAuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export type Role = "global_admin" | "competition_admin" | "team_manager";
export type RoleScope = (typeof roleScopeEnum.enumValues)[number];

export type RoleAssignment = {
  role: Role;
  scopeType: RoleScope;
  scopeId: string | null;
};

export type AuthenticatedUser = BetterAuthSession["user"] & {
  roles: RoleAssignment[];
};

export type AuthContext = {
  session: BetterAuthSession["session"];
  user: AuthenticatedUser;
};

export async function getSession(
  request: NextRequest,
): Promise<AuthContext | null> {
  return resolveSession(request.headers);
}

export async function getSessionFromHeaders(
  headers: Headers,
): Promise<AuthContext | null> {
  return resolveSession(headers);
}

export function requireRoles(context: AuthContext, roles: Role[]): void {
  if (roles.length === 0) {
    return;
  }

  const hasRole = roles.some((role) => userHasRole(context, role));
  if (hasRole) {
    return;
  }

  throw createProblem({
    type: "https://httpstatuses.com/403",
    title: "Insufficient permissions",
    status: 403,
    detail: "You do not have permission to perform this action.",
  });
}

export function userHasRole(context: AuthContext | null, role: Role): boolean {
  return (
    context?.user.roles.some((assignment) => assignment.role === role) ?? false
  );
}

export function resolveTrustedOrigins(): string[] {
  const defaults = [
    "http://localhost:3000",
    env.NEXT_PUBLIC_APP_URL,
    env.BETTER_AUTH_URL,
  ].filter(Boolean) as string[];

  const additional = (env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return Array.from(new Set([...defaults, ...additional]));
}

async function resolveSession(headers: Headers): Promise<AuthContext | null> {
  try {
    const result = await auth.api.getSession({
      headers,
      query: {
        disableRefresh: true,
      },
    });

    if (!result) {
      return null;
    }

    const roles = await resolveUserRoles(result.user.id);

    return {
      session: result.session,
      user: {
        ...result.user,
        roles,
      },
    };
  } catch (error) {
    if (error instanceof APIError) {
      logger.warn({ message: error.message }, "better_auth_session_error");
      return null;
    }

    throw error;
  }
}

async function resolveUserRoles(userId: string): Promise<RoleAssignment[]> {
  const assignments = await db.query.userRoles.findMany({
    where: (table) => eq(table.userId, userId),
  });

  return assignments.map((assignment) => ({
    role: assignment.role,
    scopeType: assignment.scopeType,
    scopeId: assignment.scopeId ?? null,
  }));
}
