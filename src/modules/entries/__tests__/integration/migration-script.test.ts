import { eq, isNotNull, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import {
  entries,
  squadMembers,
  squads,
  teamMemberships,
  teams,
  persons,
  competitions,
  editions,
} from "@/server/db/schema";

const COMPETITION_ID = "00000000-0000-0000-0000-000000000501";
const EDITION_ID = "00000000-0000-0000-0000-000000000502";
const TEAM_ID = "00000000-0000-0000-0000-000000000503";
const ENTRY_ID = "00000000-0000-0000-0000-000000000504";

beforeEach(async () => {
  await db.delete(squadMembers);
  await db.delete(squads);
  await db.delete(entries);
  await db.delete(teamMemberships);
  await db.delete(persons);
  await db.delete(teams);
  await db.delete(editions);
  await db.delete(competitions);

  await db.insert(competitions).values({
    id: COMPETITION_ID,
    name: "Migration Test",
    slug: "migration-test",
    defaultTimezone: "UTC",
  });

  await db.insert(editions).values({
    id: EDITION_ID,
    competitionId: COMPETITION_ID,
    label: "2025",
    slug: "2025",
    status: "published",
    format: "round_robin",
    timezone: "UTC",
  });

  await db.insert(teams).values({
    id: TEAM_ID,
    name: "Legacy Team",
    slug: "legacy-team",
  });

  await db.insert(entries).values({
    id: ENTRY_ID,
    editionId: EDITION_ID,
    teamId: TEAM_ID,
    status: "approved",
  });
});

interface LegacyMeta {
  jerseyNumber?: string | number;
}

async function runMigrationLogic() {
  // Logic from scripts/migrate-jersey-numbers.ts
  const membershipsWithJersey = await db
    .select()
    .from(teamMemberships)
    .where(sql`${teamMemberships.meta}->>'jerseyNumber' IS NOT NULL`);

  for (const membership of membershipsWithJersey) {
    const meta = membership.meta as LegacyMeta;
    const jerseyNumberStr = meta.jerseyNumber?.toString();
    if (!jerseyNumberStr) continue;

    const jerseyNumber = parseInt(jerseyNumberStr, 10);
    if (Number.isNaN(jerseyNumber)) continue;

    const teamEntries = await db
      .select()
      .from(entries)
      .where(eq(entries.teamId, membership.teamId));

    for (const entry of teamEntries) {
      let [squad] = await db
        .select()
        .from(squads)
        .where(eq(squads.entryId, entry.id))
        .limit(1);

      if (!squad) {
        const [newSquad] = await db
          .insert(squads)
          .values({ entryId: entry.id })
          .returning();
        squad = newSquad;
      }

      if (!squad) continue;

      await db
        .insert(squadMembers)
        .values({
          squadId: squad.id,
          personId: membership.personId,
          membershipId: membership.id,
          jerseyNumber,
        })
        .onConflictDoUpdate({
          target: [squadMembers.squadId, squadMembers.membershipId],
          targetWhere: isNotNull(squadMembers.membershipId),
          set: {
            jerseyNumber,
            updatedAt: new Date(),
          },
        });
    }
  }
}

describe("jersey number migration logic", () => {
  it("migrates jersey numbers from membership meta to edition squads", async () => {
    // 1. Setup legacy data
    const personId = "00000000-0000-0000-0000-000000000510";
    await db.insert(persons).values({
      id: personId,
      firstName: "Legacy",
      lastName: "Player",
    });

    const membershipId = "00000000-0000-0000-0000-000000000511";
    await db.insert(teamMemberships).values({
      id: membershipId,
      teamId: TEAM_ID,
      personId,
      role: "player",
      meta: { jerseyNumber: "10" },
    });

    // 2. Run migration
    await runMigrationLogic();

    // 3. Verify
    const squadMembersRows = await db.select().from(squadMembers);
    expect(squadMembersRows).toHaveLength(1);
    expect(squadMembersRows[0]?.jerseyNumber).toBe(10);
    expect(squadMembersRows[0]?.membershipId).toBe(membershipId);

    // Verify it handles updates (idempotency)
    await runMigrationLogic();
    const squadMembersRowsAfter = await db.select().from(squadMembers);
    expect(squadMembersRowsAfter).toHaveLength(1);
  });
});
