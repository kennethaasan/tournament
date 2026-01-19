import { eq, sql } from "drizzle-orm";
import { createProblem } from "@/lib/errors/problem";
import { db, withTransaction } from "@/server/db/client";
import {
  type Entry,
  editionSettings,
  editions,
  entries,
  matchDisputes,
  matches,
  persons,
  type Squad,
  type SquadMember,
  squadMembers,
  squads,
  teamMemberships,
  teams,
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

export type CreateAndAddSquadMemberInput = {
  squadId: string;
  teamId: string;
  person: {
    firstName: string;
    lastName: string;
    preferredName?: string | null;
    birthDate?: string | Date | null;
    country?: string | null;
  };
  role?: "player" | "coach" | "manager" | "staff";
  jerseyNumber?: number | null;
  position?: string | null;
};

export type UpdateSquadMemberInput = {
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
        targetWhere: sql`${squadMembers.membershipId} IS NOT NULL`,
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

export async function createAndAddSquadMember(
  input: CreateAndAddSquadMemberInput,
): Promise<SquadMember> {
  return withTransaction(async (tx) => {
    // 1. Verify squad and team
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

    const team = await tx.query.teams.findFirst({
      where: eq(teams.id, input.teamId),
    });

    if (!team) {
      throw createProblem({
        type: "https://tournament.app/problems/team-not-found",
        title: "Laget ble ikke funnet",
        status: 404,
        detail: "Verifiser at du bruker riktig lag-ID.",
      });
    }

    // 2. Create Person
    const personRecord = await tx
      .insert(persons)
      .values({
        firstName: input.person.firstName.trim(),
        lastName: input.person.lastName.trim(),
        preferredName: input.person.preferredName?.trim() || null,
        birthDate: input.person.birthDate
          ? new Date(input.person.birthDate)
          : null,
        country: input.person.country?.trim() || null,
      })
      .returning();

    const person = personRecord[0];
    if (!person) {
      throw new Error("Person could not be created");
    }

    // 3. Create Team Membership
    const membershipRecord = await tx
      .insert(teamMemberships)
      .values({
        teamId: team.id,
        personId: person.id,
        role: input.role ?? "player",
      })
      .returning();

    const membership = membershipRecord[0];
    if (!membership) {
      throw new Error("Membership could not be created");
    }

    // 4. Add to Squad
    const [member] = await tx
      .insert(squadMembers)
      .values({
        squadId: squad.id,
        personId: person.id,
        membershipId: membership.id,
        jerseyNumber:
          typeof input.jerseyNumber === "number" ? input.jerseyNumber : null,
        position: input.position?.trim() ?? null,
        availability: "available",
      })
      .returning();

    if (!member) {
      throw new Error("Squad member could not be created");
    }

    return member;
  });
}

export async function listSquadMembers(squadId: string) {
  return db
    .select({
      id: squadMembers.id,
      squadId: squadMembers.squadId,
      personId: squadMembers.personId,
      membershipId: squadMembers.membershipId,
      jerseyNumber: squadMembers.jerseyNumber,
      position: squadMembers.position,
      availability: squadMembers.availability,
      notes: squadMembers.notes,
      person: persons,
    })
    .from(squadMembers)
    .where(eq(squadMembers.squadId, squadId))
    .innerJoin(persons, eq(squadMembers.personId, persons.id));
}

export async function updateSquadMember(
  squadMemberId: string,
  input: UpdateSquadMemberInput,
): Promise<SquadMember> {
  const [updated] = await db
    .update(squadMembers)
    .set({
      jerseyNumber:
        input.jerseyNumber !== undefined ? input.jerseyNumber : undefined,
      position: input.position?.trim() ?? undefined,
      availability: input.availability ?? undefined,
      notes: input.notes?.trim() ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(squadMembers.id, squadMemberId))
    .returning();

  if (!updated) {
    throw createProblem({
      type: "https://tournament.app/problems/squad-member-not-found",
      title: "Spilleren ble ikke funnet i troppen",
      status: 404,
      detail: "Spilleren du prøver å oppdatere finnes ikke i denne troppen.",
    });
  }

  return updated;
}

export async function removeSquadMember(squadMemberId: string): Promise<void> {
  await db.delete(squadMembers).where(eq(squadMembers.id, squadMemberId));
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

export async function deleteEntry(entryId: string): Promise<void> {
  return withTransaction(async (tx) => {
    const entry = await tx.query.entries.findFirst({
      where: eq(entries.id, entryId),
    });

    if (!entry) {
      throw createProblem({
        type: "https://tournament.app/problems/entry-not-found",
        title: "Påmeldingen ble ikke funnet",
        status: 404,
        detail: "Påmeldingen finnes ikke lenger.",
      });
    }

    // Only allow deletion of rejected or withdrawn entries
    if (entry.status !== "rejected" && entry.status !== "withdrawn") {
      throw createProblem({
        type: "https://tournament.app/problems/entry-delete-not-allowed",
        title: "Kan ikke slette påmeldingen",
        status: 400,
        detail:
          "Kun avviste eller trukket påmeldinger kan slettes. Avvis påmeldingen først.",
      });
    }

    // Delete related squads first (cascade should handle squad_members)
    const squad = await tx.query.squads.findFirst({
      where: eq(squads.entryId, entryId),
    });

    if (squad) {
      await tx.delete(squadMembers).where(eq(squadMembers.squadId, squad.id));
      await tx.delete(squads).where(eq(squads.id, squad.id));
    }

    // Delete the entry
    await tx.delete(entries).where(eq(entries.id, entryId));
  });
}
