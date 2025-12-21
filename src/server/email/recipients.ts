import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Role, RoleScope } from "@/server/auth";
import { db } from "@/server/db/client";
import { entries, userRoles, users } from "@/server/db/schema";

export async function getRoleEmails(
  role: Role,
  scope: { type: RoleScope; id: string | null },
): Promise<string[]> {
  const predicate = scope.id
    ? and(
        eq(userRoles.role, role),
        eq(userRoles.scopeType, scope.type),
        eq(userRoles.scopeId, scope.id),
      )
    : and(
        eq(userRoles.role, role),
        eq(userRoles.scopeType, scope.type),
        isNull(userRoles.scopeId),
      );

  const rows = await db
    .select({ email: users.email })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(predicate);

  return uniqueEmails(rows.map((row) => row.email));
}

export async function getTeamManagerEmails(
  teamIds: string[],
): Promise<string[]> {
  if (teamIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ email: users.email })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(
      and(
        eq(userRoles.role, "team_manager"),
        eq(userRoles.scopeType, "team"),
        inArray(userRoles.scopeId, teamIds),
      ),
    );

  return uniqueEmails(rows.map((row) => row.email));
}

export async function getCompetitionAdminEmails(
  competitionId: string,
): Promise<string[]> {
  return getRoleEmails("competition_admin", {
    type: "competition",
    id: competitionId,
  });
}

export async function getGlobalAdminEmails(): Promise<string[]> {
  return getRoleEmails("global_admin", { type: "global", id: null });
}

export async function getEditionTeamManagerEmails(
  editionId: string,
): Promise<string[]> {
  const teamRows = await db
    .select({ teamId: entries.teamId })
    .from(entries)
    .where(eq(entries.editionId, editionId));

  const teamIds = Array.from(
    new Set(teamRows.map((row) => row.teamId).filter(Boolean)),
  );

  return getTeamManagerEmails(teamIds);
}

export function uniqueEmails(
  values: Array<string | null | undefined>,
): string[] {
  const sanitized = values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  return Array.from(new Set(sanitized));
}
