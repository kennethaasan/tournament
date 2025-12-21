import { and, eq, inArray } from "drizzle-orm";
import { createProblem } from "@/lib/errors/problem";
import { type AuthContext, userHasRole } from "@/server/auth";
import { db } from "@/server/db/client";
import { editions, entries, squads, teams } from "@/server/db/schema";

type AccessContext = {
  teamId: string;
  competitionId: string;
};

function requireAuth(auth: AuthContext | null): AuthContext {
  if (!auth) {
    throw createProblem({
      type: "https://httpstatuses.com/401",
      title: "Autentisering kreves",
      status: 401,
      detail: "Du må være innlogget for å utføre denne handlingen.",
    });
  }

  return auth;
}

function getCompetitionScopeIds(auth: AuthContext): string[] {
  return auth.user.roles
    .filter(
      (assignment) =>
        assignment.role === "competition_admin" &&
        assignment.scopeType === "competition" &&
        assignment.scopeId,
    )
    .map((assignment) => assignment.scopeId as string);
}

function hasTeamScope(auth: AuthContext, teamId: string): boolean {
  return auth.user.roles.some(
    (assignment) =>
      assignment.role === "team_manager" &&
      assignment.scopeType === "team" &&
      assignment.scopeId === teamId,
  );
}

function hasCompetitionScope(
  auth: AuthContext,
  competitionId: string,
): boolean {
  return auth.user.roles.some(
    (assignment) =>
      assignment.role === "competition_admin" &&
      assignment.scopeType === "competition" &&
      assignment.scopeId === competitionId,
  );
}

export async function assertCompetitionAdminAccess(
  competitionId: string | undefined,
  auth: AuthContext | null,
): Promise<void> {
  if (!competitionId) {
    throw createProblem({
      type: "https://httpstatuses.com/400",
      title: "Ugyldig forespørsel",
      status: 400,
      detail: "CompetitionId mangler i URLen.",
    });
  }

  const session = requireAuth(auth);

  if (userHasRole(session, "global_admin")) {
    return;
  }

  if (!hasCompetitionScope(session, competitionId)) {
    throw createProblem({
      type: "https://httpstatuses.com/403",
      title: "Ingen tilgang",
      status: 403,
      detail: "Du har ikke rettigheter til å administrere konkurransen.",
    });
  }
}

export async function assertTeamAccess(
  teamId: string | undefined,
  auth: AuthContext | null,
): Promise<void> {
  if (!teamId) {
    throw createProblem({
      type: "https://httpstatuses.com/400",
      title: "Ugyldig forespørsel",
      status: 400,
      detail: "TeamId mangler i URLen.",
    });
  }

  const session = requireAuth(auth);

  const team = await db.query.teams.findFirst({
    columns: { id: true },
    where: eq(teams.id, teamId),
  });

  if (!team) {
    throw createProblem({
      type: "https://tournament.app/problems/team-not-found",
      title: "Teamet ble ikke funnet",
      status: 404,
      detail: "Sjekk at du bruker riktig team-ID.",
    });
  }

  if (userHasRole(session, "global_admin")) {
    return;
  }

  if (hasTeamScope(session, teamId)) {
    return;
  }

  const competitionScopeIds = getCompetitionScopeIds(session);
  if (!competitionScopeIds.length) {
    throw createProblem({
      type: "https://httpstatuses.com/403",
      title: "Ingen tilgang",
      status: 403,
      detail: "Du har ikke tilgang til dette laget.",
    });
  }

  const rows = await db
    .select({ entryId: entries.id })
    .from(entries)
    .innerJoin(editions, eq(entries.editionId, editions.id))
    .where(
      and(
        eq(entries.teamId, teamId),
        inArray(editions.competitionId, competitionScopeIds),
      ),
    )
    .limit(1);

  if (!rows.length) {
    throw createProblem({
      type: "https://httpstatuses.com/403",
      title: "Ingen tilgang",
      status: 403,
      detail: "Du har ikke tilgang til dette laget.",
    });
  }
}

export async function assertEntryAccess(
  entryId: string | undefined,
  auth: AuthContext | null,
): Promise<AccessContext> {
  if (!entryId) {
    throw createProblem({
      type: "https://httpstatuses.com/400",
      title: "Ugyldig forespørsel",
      status: 400,
      detail: "EntryId mangler i forespørselen.",
    });
  }

  const session = requireAuth(auth);

  const rows = await db
    .select({
      entryId: entries.id,
      teamId: entries.teamId,
      competitionId: editions.competitionId,
    })
    .from(entries)
    .innerJoin(editions, eq(entries.editionId, editions.id))
    .where(eq(entries.id, entryId))
    .limit(1);

  const record = rows[0];
  if (!record) {
    throw createProblem({
      type: "https://tournament.app/problems/entry-not-found",
      title: "Påmeldingen ble ikke funnet",
      status: 404,
      detail: "Påmeldingen ble ikke funnet.",
    });
  }

  if (userHasRole(session, "global_admin")) {
    return { teamId: record.teamId, competitionId: record.competitionId };
  }

  if (hasCompetitionScope(session, record.competitionId)) {
    return { teamId: record.teamId, competitionId: record.competitionId };
  }

  if (hasTeamScope(session, record.teamId)) {
    return { teamId: record.teamId, competitionId: record.competitionId };
  }

  throw createProblem({
    type: "https://httpstatuses.com/403",
    title: "Ingen tilgang",
    status: 403,
    detail: "Du har ikke tilgang til denne påmeldingen.",
  });
}

export async function assertSquadAccess(
  squadId: string | undefined,
  auth: AuthContext | null,
): Promise<AccessContext> {
  if (!squadId) {
    throw createProblem({
      type: "https://httpstatuses.com/400",
      title: "Ugyldig forespørsel",
      status: 400,
      detail: "SquadId mangler i URLen.",
    });
  }

  const session = requireAuth(auth);

  const rows = await db
    .select({
      squadId: squads.id,
      teamId: entries.teamId,
      competitionId: editions.competitionId,
    })
    .from(squads)
    .innerJoin(entries, eq(squads.entryId, entries.id))
    .innerJoin(editions, eq(entries.editionId, editions.id))
    .where(eq(squads.id, squadId))
    .limit(1);

  const record = rows[0];
  if (!record) {
    throw createProblem({
      type: "https://tournament.app/problems/squad-not-found",
      title: "Troppen ble ikke funnet",
      status: 404,
      detail: "Oppdater siden og prøv igjen.",
    });
  }

  if (userHasRole(session, "global_admin")) {
    return { teamId: record.teamId, competitionId: record.competitionId };
  }

  if (hasCompetitionScope(session, record.competitionId)) {
    return { teamId: record.teamId, competitionId: record.competitionId };
  }

  if (hasTeamScope(session, record.teamId)) {
    return { teamId: record.teamId, competitionId: record.competitionId };
  }

  throw createProblem({
    type: "https://httpstatuses.com/403",
    title: "Ingen tilgang",
    status: 403,
    detail: "Du har ikke tilgang til denne troppen.",
  });
}

export async function assertTeamEntryCreateAccess(
  teamId: string | undefined,
  editionId: string | undefined,
  auth: AuthContext | null,
): Promise<void> {
  if (!teamId) {
    throw createProblem({
      type: "https://httpstatuses.com/400",
      title: "Ugyldig forespørsel",
      status: 400,
      detail: "TeamId mangler i URLen.",
    });
  }

  if (!editionId) {
    throw createProblem({
      type: "https://httpstatuses.com/400",
      title: "Ugyldig forespørsel",
      status: 400,
      detail: "EditionId mangler i forespørselen.",
    });
  }

  const session = requireAuth(auth);

  const [team, edition] = await Promise.all([
    db.query.teams.findFirst({
      columns: { id: true },
      where: eq(teams.id, teamId),
    }),
    db.query.editions.findFirst({
      columns: { id: true, competitionId: true },
      where: eq(editions.id, editionId),
    }),
  ]);

  if (!team) {
    throw createProblem({
      type: "https://tournament.app/problems/team-not-found",
      title: "Teamet ble ikke funnet",
      status: 404,
      detail: "Sjekk at du bruker riktig team-ID.",
    });
  }

  if (!edition) {
    throw createProblem({
      type: "https://tournament.app/problems/edition-not-found",
      title: "Utgaven ble ikke funnet",
      status: 404,
      detail: "Utgaven du prøver å melde på laget til finnes ikke.",
    });
  }

  if (userHasRole(session, "global_admin")) {
    return;
  }

  if (hasTeamScope(session, teamId)) {
    return;
  }

  if (hasCompetitionScope(session, edition.competitionId)) {
    return;
  }

  throw createProblem({
    type: "https://httpstatuses.com/403",
    title: "Ingen tilgang",
    status: 403,
    detail: "Du har ikke tilgang til å registrere dette laget.",
  });
}
