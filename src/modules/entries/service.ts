import { eq } from "drizzle-orm";
import { createProblem } from "@/lib/errors/problem";
import { db, withTransaction } from "@/server/db/client";
import {
  type Entry,
  editionSettings,
  editions,
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

export type ReviewEntryInput = {
  entryId: string;
  status: "approved" | "rejected";
  reason?: string | null;
  actorId: string;
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
  const [edition, settings] = await Promise.all([
    db.query.editions.findFirst({
      columns: {
        id: true,
        registrationOpensAt: true,
        registrationClosesAt: true,
      },
      where: eq(editions.id, input.editionId),
    }),
    db.query.editionSettings.findFirst({
      columns: {
        editionId: true,
        registrationRequirements: true,
      },
      where: eq(editionSettings.editionId, input.editionId),
    }),
  ]);

  if (!edition) {
    throw createProblem({
      type: "https://tournament.app/problems/edition-not-found",
      title: "Utgaven ble ikke funnet",
      status: 404,
      detail: "Utgaven du prøver å melde på laget til finnes ikke.",
    });
  }

  const now = new Date();
  if (edition.registrationOpensAt && now < edition.registrationOpensAt) {
    throw createProblem({
      type: "https://tournament.app/problems/entry/registration-not-open",
      title: "Påmeldingen har ikke åpnet",
      status: 400,
      detail: "Påmeldingene er ikke åpne enda.",
    });
  }

  if (edition.registrationClosesAt && now > edition.registrationClosesAt) {
    throw createProblem({
      type: "https://tournament.app/problems/entry/registration-closed",
      title: "Påmeldingen er stengt",
      status: 400,
      detail: "Påmeldingsfristen er utløpt for denne utgaven.",
    });
  }

  const entriesLockedAt = extractEntriesLockedAt(
    settings?.registrationRequirements,
  );
  if (entriesLockedAt) {
    throw createProblem({
      type: "https://tournament.app/problems/entry/entries-locked",
      title: "Påmeldinger er låst",
      status: 400,
      detail:
        "Påmeldinger er låst for denne utgaven. Kontakt administrator om du trenger hjelp.",
    });
  }

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

function extractEntriesLockedAt(input: unknown): Date | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const value = record.entries_locked_at ?? record.entriesLockedAt ?? null;

  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function reviewEntry(input: ReviewEntryInput): Promise<Entry> {
  return withTransaction(async (tx) => {
    const entry = await tx.query.entries.findFirst({
      where: eq(entries.id, input.entryId),
    });

    if (!entry) {
      throw createProblem({
        type: "https://tournament.app/problems/entry-not-found",
        title: "Påmeldingen ble ikke funnet",
        status: 404,
        detail: "Påmeldingen finnes ikke lenger.",
      });
    }

    if (entry.status !== "pending") {
      return entry;
    }

    const status = input.status;
    const now = new Date();

    const metadata = {
      ...(entry.metadata ?? {}),
      decision_reason: input.reason?.trim() || null,
      decided_by: input.actorId,
      decided_at: now.toISOString(),
    };

    const [updated] = await tx
      .update(entries)
      .set({
        status,
        approvedAt: status === "approved" ? now : entry.approvedAt,
        rejectedAt: status === "rejected" ? now : entry.rejectedAt,
        metadata,
      })
      .where(eq(entries.id, entry.id))
      .returning();

    if (!updated) {
      throw createProblem({
        type: "https://tournament.app/problems/entry-not-updated",
        title: "Kunne ikke oppdatere påmeldingen",
        status: 500,
        detail: "Prøv igjen eller kontakt support.",
      });
    }

    return updated;
  });
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

    const entry = await tx.query.entries.findFirst({
      columns: { teamId: true },
      where: eq(entries.id, squad.entryId),
    });

    if (!entry) {
      throw createProblem({
        type: "https://tournament.app/problems/entry-not-found",
        title: "Påmeldingen ble ikke funnet",
        status: 404,
        detail: "Påmeldingen ble ikke funnet.",
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

    if (membership.teamId !== entry.teamId) {
      throw createProblem({
        type: "https://tournament.app/problems/squad-member-team-mismatch",
        title: "Ugyldig lag",
        status: 409,
        detail: "Spilleren tilhører ikke laget som er registrert i troppen.",
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
        target: [squadMembers.squadId, squadMembers.membershipId],
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
