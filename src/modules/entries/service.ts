import { eq } from "drizzle-orm";
import { createProblem } from "@/lib/errors/problem";
import { db, withTransaction } from "@/server/db/client";
import {
  type Entry,
  entries,
  matchDisputes,
  matches,
  type Squad,
  type SquadMember,
  squadMembers,
  squads,
  teamMemberships,
} from "@/server/db/schema";

export type CreateEntryInput = {
  editionId: string;
  teamId: string;
  notes?: string | null;
};

export type SquadMemberInput = {
  squadId: string;
  membershipId: string;
  jerseyNumber?: number | null;
  position?: string | null;
  availability?: SquadMember["availability"];
  notes?: string | null;
};

export type MatchDisputeInput = {
  matchId: string;
  entryId: string;
  reason: string;
};

export async function createEntry(input: CreateEntryInput): Promise<Entry> {
  const [entry] = await db
    .insert(entries)
    .values({
      editionId: input.editionId,
      teamId: input.teamId,
      status: "pending",
      notes: input.notes?.trim() ?? null,
      submittedAt: new Date(),
    })
    .onConflictDoNothing({
      target: [entries.editionId, entries.teamId],
    })
    .returning();

  if (!entry) {
    throw createProblem({
      type: "https://tournament.app/problems/entry-existing",
      title: "Påmeldingen finnes allerede",
      status: 409,
      detail: "Laget er allerede registrert i denne utgaven.",
    });
  }

  return entry;
}

export async function ensureSquad(entryId: string): Promise<Squad> {
  const existing = await db.query.squads.findFirst({
    where: eq(squads.entryId, entryId),
  });

  if (existing) {
    return existing;
  }

  const [squad] = await db
    .insert(squads)
    .values({
      entryId,
    })
    .returning();

  if (!squad) {
    throw createProblem({
      type: "https://tournament.app/problems/squad-not-created",
      title: "Troppen kunne ikke opprettes",
      status: 500,
      detail: "Prøv igjen for å sette opp troppen.",
    });
  }

  return squad;
}

export async function addSquadMember(
  input: SquadMemberInput,
): Promise<SquadMember> {
  return withTransaction(async (tx) => {
    const squad = await tx.query.squads.findFirst({
      where: eq(squads.id, input.squadId),
    });

    if (!squad) {
      throw createProblem({
        type: "https://tournament.app/problems/squad-not-found",
        title: "Troppen ble ikke funnet",
        status: 404,
        detail: "Oppdater siden og prøv igjen.",
      });
    }

    const membership = await tx.query.teamMemberships.findFirst({
      where: eq(teamMemberships.id, input.membershipId),
    });

    if (!membership) {
      throw createProblem({
        type: "https://tournament.app/problems/membership-not-found",
        title: "Medlemskapet ble ikke funnet",
        status: 404,
        detail: "Velg en spiller fra laglisten.",
      });
    }

    const [member] = await tx
      .insert(squadMembers)
      .values({
        squadId: squad.id,
        personId: membership.personId,
        membershipId: membership.id,
        jerseyNumber:
          typeof input.jerseyNumber === "number" ? input.jerseyNumber : null,
        position: input.position?.trim() ?? null,
        availability: input.availability ?? "available",
        notes: input.notes?.trim() ?? null,
      })
      .onConflictDoUpdate({
        target: squadMembers.membershipId,
        set: {
          jerseyNumber:
            typeof input.jerseyNumber === "number" ? input.jerseyNumber : null,
          position: input.position?.trim() ?? null,
          availability: input.availability ?? "available",
          notes: input.notes?.trim() ?? null,
        },
      })
      .returning();

    if (!member) {
      throw createProblem({
        type: "https://tournament.app/problems/squad-member-not-created",
        title: "Spilleren kunne ikke legges til",
        status: 500,
        detail: "Prøv igjen for å legge spilleren i troppen.",
      });
    }

    return member;
  });
}

export async function submitMatchDispute(
  input: MatchDisputeInput,
): Promise<void> {
  const matchRecord = await db.query.matches.findFirst({
    where: eq(matches.id, input.matchId),
  });

  if (!matchRecord) {
    throw createProblem({
      type: "https://tournament.app/problems/match-not-found",
      title: "Kampen ble ikke funnet",
      status: 404,
      detail: "Sjekk at du valgte riktig kamp.",
    });
  }

  const entry = await db.query.entries.findFirst({
    where: eq(entries.id, input.entryId),
  });

  if (!entry) {
    throw createProblem({
      type: "https://tournament.app/problems/entry-not-found",
      title: "Påmeldingen ble ikke funnet",
      status: 404,
      detail: "Lagets påmelding ble ikke funnet.",
    });
  }

  if (entry.editionId !== matchRecord.editionId) {
    throw createProblem({
      type: "https://tournament.app/problems/dispute-invalid-entry",
      title: "Lagets påmelding er ikke knyttet til denne kampen",
      status: 409,
      detail:
        "Du kan kun sende inn tvister for kamper som tilhører samme utgave som laget er registrert i.",
    });
  }

  await db.insert(matchDisputes).values({
    matchId: input.matchId,
    entryId: input.entryId,
    reason: input.reason.trim(),
  });
}
