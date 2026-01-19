import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addSquadMember,
  createAndAddSquadMember,
  createEntry,
  ensureSquad,
  listSquadMembers,
  removeSquadMember,
  updateSquadMember,
} from "@/modules/entries/service";
import { addRosterMember } from "@/modules/teams/service";
import { db } from "@/server/db/client";
import {
  competitions,
  editions,
  entries,
  persons,
  squadMembers,
  squads,
  teamMemberships,
  teams,
} from "@/server/db/schema";

const COMPETITION_ID = "00000000-0000-0000-0000-000000000401";
const EDITION_ID = "00000000-0000-0000-0000-000000000402";
const TEAM_ID = "00000000-0000-0000-0000-000000000403";

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
    name: "Test Competition",
    slug: "test-competition",
    defaultTimezone: "Europe/Oslo",
  });

  await db.insert(editions).values({
    id: EDITION_ID,
    competitionId: COMPETITION_ID,
    label: "2025",
    slug: "2025",
    status: "published",
    format: "round_robin",
    timezone: "Europe/Oslo",
  });

  await db.insert(teams).values({
    id: TEAM_ID,
    name: "Test Team",
    slug: "test-team",
  });
});

describe("squad service integration", () => {
  it("manages squad members: add, list, update, remove", async () => {
    // 1. Setup entry and squad
    const entry = await createEntry({ editionId: EDITION_ID, teamId: TEAM_ID });
    const squad = await ensureSquad(entry.id);

    // 2. Add roster members to the team
    const member1 = await addRosterMember({
      teamId: TEAM_ID,
      person: { firstName: "Player", lastName: "One" },
    });
    const member2 = await addRosterMember({
      teamId: TEAM_ID,
      person: { firstName: "Player", lastName: "Two" },
    });

    // 3. Add members to squad
    await addSquadMember({
      squadId: squad.id,
      membershipId: member1.membershipId,
      jerseyNumber: 10,
      position: "Forward",
    });

    await addSquadMember({
      squadId: squad.id,
      membershipId: member2.membershipId,
      jerseyNumber: 1,
      position: "Keeper",
    });

    // 4. List members
    const members = await listSquadMembers(squad.id);
    expect(members).toHaveLength(2);

    const sm1 = members.find((m) => m.membershipId === member1.membershipId);
    if (!sm1) throw new Error("Squad member 1 not found");
    expect(sm1.jerseyNumber).toBe(10);
    expect(sm1.position).toBe("Forward");
    expect(sm1.person.firstName).toBe("Player");

    // 5. Update a member
    await updateSquadMember(sm1.id, {
      jerseyNumber: 11,
      position: "Midfielder",
    });

    const updatedMembers = await listSquadMembers(squad.id);
    const updatedSm1 = updatedMembers.find((m) => m.id === sm1.id);
    expect(updatedSm1?.jerseyNumber).toBe(11);
    expect(updatedSm1?.position).toBe("Midfielder");

    // 6. Remove a member
    await removeSquadMember(sm1.id);
    const finalMembers = await listSquadMembers(squad.id);
    expect(finalMembers).toHaveLength(1);
    expect(finalMembers[0]?.membershipId).toBe(member2.membershipId);
  });

  it("handles upsert on addSquadMember", async () => {
    const entry = await createEntry({ editionId: EDITION_ID, teamId: TEAM_ID });
    const squad = await ensureSquad(entry.id);
    const member = await addRosterMember({
      teamId: TEAM_ID,
      person: { firstName: "Upsert", lastName: "Test" },
    });

    await addSquadMember({
      squadId: squad.id,
      membershipId: member.membershipId,
      jerseyNumber: 5,
    });

    // Second call should update
    await addSquadMember({
      squadId: squad.id,
      membershipId: member.membershipId,
      jerseyNumber: 55,
      position: "Defender",
    });

    const members = await listSquadMembers(squad.id);
    expect(members).toHaveLength(1);
    expect(members[0]?.jerseyNumber).toBe(55);
    expect(members[0]?.position).toBe("Defender");
  });

  it("creates a new person and adds them to squad in one go", async () => {
    const entry = await createEntry({ editionId: EDITION_ID, teamId: TEAM_ID });
    const squad = await ensureSquad(entry.id);

    const member = await createAndAddSquadMember({
      squadId: squad.id,
      teamId: TEAM_ID,
      person: {
        firstName: "New",
        lastName: "Person",
      },
      jerseyNumber: 7,
      position: "Winger",
    });

    expect(member.jerseyNumber).toBe(7);
    expect(member.position).toBe("Winger");

    const roster = await db
      .select()
      .from(teamMemberships)
      .where(eq(teamMemberships.teamId, TEAM_ID));
    expect(roster).toHaveLength(1);
    expect(roster[0]?.personId).toBe(member.personId);

    const squadMembersList = await listSquadMembers(squad.id);
    expect(squadMembersList).toHaveLength(1);
    expect(squadMembersList[0]?.person.firstName).toBe("New");
  });
});
