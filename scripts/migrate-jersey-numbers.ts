import "dotenv/config";
import { eq, isNotNull, sql } from "drizzle-orm";
import { logger } from "@/lib/logger/powertools";
import { db, shutdown } from "@/server/db/client";
import {
  entries,
  squadMembers,
  squads,
  teamMemberships,
} from "@/server/db/schema";

interface MembershipMeta {
  jerseyNumber?: string | number;
}

async function migrate() {
  logger.info(
    "Starting migration of jersey numbers from memberships to squads...",
  );

  // 1. Find all memberships with a jerseyNumber in meta
  const membershipsWithJersey = await db
    .select()
    .from(teamMemberships)
    .where(sql`${teamMemberships.meta}->>'jerseyNumber' IS NOT NULL`);

  logger.info(
    `Found ${membershipsWithJersey.length} memberships with jersey numbers.`,
  );

  let migratedCount = 0;

  for (const membership of membershipsWithJersey) {
    const meta = membership.meta as MembershipMeta;
    const jerseyNumberStr = meta.jerseyNumber?.toString();
    if (!jerseyNumberStr) continue;

    const jerseyNumber = parseInt(jerseyNumberStr, 10);

    if (Number.isNaN(jerseyNumber)) continue;

    // 2. Find all entries for this team
    const teamEntries = await db
      .select()
      .from(entries)
      .where(eq(entries.teamId, membership.teamId));

    for (const entry of teamEntries) {
      // 3. Ensure a squad exists for this entry
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

      // 4. Create or update squad member
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

      migratedCount++;
    }
  }

  logger.info(
    `Migration complete. Updated ${migratedCount} squad member records.`,
  );
}

migrate()
  .catch((err) => {
    logger.error("Migration failed", { error: err });
    process.exit(1);
  })
  .finally(async () => {
    await shutdown();
  });
