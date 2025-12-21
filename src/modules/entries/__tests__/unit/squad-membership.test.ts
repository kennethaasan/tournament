import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { ProblemError } from "@/lib/errors/problem";
import { addSquadMember } from "@/modules/entries/service";
import { db } from "@/server/db/client";
import {
  competitions,
  editions,
  entries,
  persons,
  squads,
  teamMemberships,
  teams,
} from "@/server/db/schema";

async function resetDb() {
  await db.execute(sql`
    TRUNCATE TABLE
      squad_members,
      squads,
      entries,
      team_memberships,
      persons,
      teams,
      editions,
      competitions
    RESTART IDENTITY CASCADE;
  `);
}

describe("addSquadMember", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("rejects adding a membership from another team", async () => {
    const [competition] = await db
      .insert(competitions)
      .values({
        name: "Elite Cup",
        slug: "elite-cup",
        defaultTimezone: "UTC",
      })
      .returning();
    if (!competition) {
      throw new Error("Expected competition to be created.");
    }

    const [edition] = await db
      .insert(editions)
      .values({
        competitionId: competition.id,
        label: "2025",
        slug: "2025",
        format: "round_robin",
        timezone: "UTC",
      })
      .returning();
    if (!edition) {
      throw new Error("Expected edition to be created.");
    }

    const [teamA] = await db
      .insert(teams)
      .values({ name: "Team A", slug: "team-a" })
      .returning();
    const [teamB] = await db
      .insert(teams)
      .values({ name: "Team B", slug: "team-b" })
      .returning();
    if (!teamA || !teamB) {
      throw new Error("Expected teams to be created.");
    }

    const [entry] = await db
      .insert(entries)
      .values({
        editionId: edition.id,
        teamId: teamA.id,
      })
      .returning();
    if (!entry) {
      throw new Error("Expected entry to be created.");
    }

    const [squad] = await db
      .insert(squads)
      .values({ entryId: entry.id })
      .returning();
    if (!squad) {
      throw new Error("Expected squad to be created.");
    }

    const [person] = await db
      .insert(persons)
      .values({ firstName: "Pat", lastName: "Player" })
      .returning();
    if (!person) {
      throw new Error("Expected person to be created.");
    }

    const [membership] = await db
      .insert(teamMemberships)
      .values({
        teamId: teamB.id,
        personId: person.id,
      })
      .returning();
    if (!membership) {
      throw new Error("Expected membership to be created.");
    }

    try {
      await addSquadMember({
        squadId: squad.id,
        membershipId: membership.id,
      });
      throw new Error("expected addSquadMember to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(ProblemError);
      expect((error as ProblemError).problem.status).toBe(409);
    }
  });
});
