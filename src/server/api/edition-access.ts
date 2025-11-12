import { eq } from "drizzle-orm";
import { createProblem } from "@/lib/errors/problem";
import { type AuthContext, userHasRole } from "@/server/auth";
import { db } from "@/server/db/client";
import { editions } from "@/server/db/schema";

export async function assertEditionAdminAccess(
  editionId: string | undefined,
  auth: AuthContext | null,
) {
  if (!editionId) {
    throw createProblem({
      type: "https://httpstatuses.com/400",
      title: "Ugyldig forespørsel",
      status: 400,
      detail: "EditionId mangler i URLen.",
    });
  }

  if (!auth) {
    throw createProblem({
      type: "https://httpstatuses.com/401",
      title: "Autentisering kreves",
      status: 401,
      detail: "Du må være innlogget for å administrere denne utgaven.",
    });
  }

  const edition = await db.query.editions.findFirst({
    columns: {
      id: true,
      competitionId: true,
      label: true,
      status: true,
    },
    where: eq(editions.id, editionId),
  });

  if (!edition) {
    throw createProblem({
      type: "https://httpstatuses.com/404",
      title: "Utgave finnes ikke",
      status: 404,
      detail: "Vi fant ikke utgaven du prøver å administrere.",
    });
  }

  const isGlobalAdmin = userHasRole(auth, "global_admin");
  const hasScopedAdmin = auth.user.roles.some(
    (assignment) =>
      assignment.role === "competition_admin" &&
      assignment.scopeType === "competition" &&
      assignment.scopeId === edition.competitionId,
  );

  if (!isGlobalAdmin && !hasScopedAdmin) {
    throw createProblem({
      type: "https://httpstatuses.com/403",
      title: "Ingen tilgang",
      status: 403,
      detail:
        "Du må være global administrator eller konkurranseadministrator for å administrere denne utgaven.",
    });
  }

  return edition;
}
