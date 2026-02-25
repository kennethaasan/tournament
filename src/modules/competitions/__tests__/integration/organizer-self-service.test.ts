import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";
import {
  createCompetition,
  setCompetitionArchivedState,
} from "@/modules/competitions/service";
import { db } from "@/server/db/client";
import {
  competitions,
  editionSettings,
  editions,
  userRoles,
  users,
} from "@/server/db/schema";

const USER_ID = "00000000-0000-0000-0000-000000000011";

beforeEach(async () => {
  await db.delete(userRoles);
  await db.delete(editionSettings);
  await db.delete(editions);
  await db.delete(competitions);
  await db.delete(users);

  await db.insert(users).values({
    id: USER_ID,
    email: "organizer@example.com",
    emailVerified: true,
    fullName: "Organizer",
  });
});

describe("Organizer self-service onboarding flow", () => {
  test("creates a competition, edition, and assigns competition_admin role", async () => {
    const result = await createCompetition({
      name: "Trondheim Cup",
      slug: "trondheim-cup",
      defaultTimezone: "Europe/Oslo",
      ownerUserId: USER_ID,
      defaultEdition: {
        label: "2025",
        slug: "2025",
        format: "round_robin",
        registrationWindow: {
          opensAt: new Date("2025-01-01T10:00:00Z"),
          closesAt: new Date("2025-02-01T10:00:00Z"),
        },
      },
    });

    expect(result.competition.name).toBe("Trondheim Cup");
    expect(result.edition.competitionId).toBe(result.competition.id);

    const role = await db.query.userRoles.findFirst({
      where: (table, { and, eq: eqHelper }) =>
        and(
          eqHelper(table.userId, USER_ID),
          eqHelper(table.role, "competition_admin"),
          eqHelper(table.scopeType, "competition"),
          eqHelper(table.scopeId, result.competition.id),
        ),
    });

    expect(role).toBeDefined();
    expect(role?.grantedBy).toBe(USER_ID);

    const settings = await db.query.editionSettings.findFirst({
      where: eq(editionSettings.editionId, result.edition.id),
    });
    expect(settings).toBeDefined();
  });

  test("archives and restores a competition through soft delete state", async () => {
    const result = await createCompetition({
      name: "Trondheim Cup",
      slug: "trondheim-cup",
      defaultTimezone: "Europe/Oslo",
      ownerUserId: USER_ID,
      defaultEdition: {
        label: "2025",
        slug: "2025",
        format: "round_robin",
        registrationWindow: {
          opensAt: new Date("2025-01-01T10:00:00Z"),
          closesAt: new Date("2025-02-01T10:00:00Z"),
        },
      },
    });

    const archived = await setCompetitionArchivedState({
      competitionId: result.competition.id,
      archived: true,
    });
    expect(archived.archivedAt).toBeInstanceOf(Date);

    const restored = await setCompetitionArchivedState({
      competitionId: result.competition.id,
      archived: false,
    });
    expect(restored.archivedAt).toBeNull();
  });
});
