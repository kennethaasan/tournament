import { NextRequest } from "next/server";
import { createProblem } from "@/lib/errors/problem";

export type Role = "admin" | "competition_admin" | "team_manager";

export type AuthenticatedUser = {
  id: string;
  email: string;
  roles: Role[];
};

export type AuthContext = {
  user: AuthenticatedUser;
  sessionId: string;
};

export async function getSession(_request: NextRequest): Promise<AuthContext | null> {
  // TODO: Integrate better-auth session retrieval once adapters and schema are ready.
  return null;
}

export function requireRoles(context: AuthContext, roles: Role[]): void {
  if (roles.length === 0) {
    return;
  }

  const hasRole = roles.some((role) => context.user.roles.includes(role));
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
  return context?.user.roles.includes(role) ?? false;
}
