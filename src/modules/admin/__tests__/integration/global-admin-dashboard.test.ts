import { describe, expect, test } from "vitest";
import type {
  AdminAssignmentSummary,
  AdminCompetitionSummary,
  AdminDashboardOverviewMetrics,
  EditionSummary,
} from "@/modules/admin/service";
import { getGlobalAdminOverview } from "@/modules/admin/service";

const makeAssignment = (
  overrides: Partial<AdminAssignmentSummary>,
): AdminAssignmentSummary => ({
  userId: "user-id",
  name: "Admin Person",
  email: "admin@example.com",
  role: "global_admin",
  scopeType: "global",
  scopeId: null,
  ...overrides,
});

const makeEdition = (overrides: Partial<EditionSummary>): EditionSummary => ({
  id: "edition-id",
  competitionId: "competition-id",
  label: "Edition",
  slug: "edition",
  status: "draft",
  format: "round_robin",
  timezone: "Europe/Oslo",
  registrationOpensAt: null,
  registrationClosesAt: null,
  createdAt: new Date("2025-01-01T12:00:00Z"),
  updatedAt: new Date("2025-01-01T12:00:00Z"),
  publishedAt: null,
  scoreboardRotationSeconds: 5,
  scoreboardTheme: {
    primaryColor: "#0B1F3A",
    secondaryColor: "#FFFFFF",
    backgroundImageUrl: null,
  },
  ...overrides,
});

const makeCompetition = (
  overrides: Partial<AdminCompetitionSummary>,
): AdminCompetitionSummary => ({
  id: "competition-id",
  name: "Competition",
  slug: "competition",
  description: null,
  defaultTimezone: "Europe/Oslo",
  createdAt: new Date("2025-01-01T14:00:00Z"),
  archivedAt: null,
  primaryColor: "#0B1F3A",
  secondaryColor: "#FFFFFF",
  editions: [makeEdition({ status: "draft" })],
  administrators: [makeAssignment({ role: "global_admin" })],
  health: {
    lastAuditEventAt: null,
    unresolvedDisputes: 0,
    pendingEntries: 0,
  },
  ...overrides,
});

describe("Admin service › global admin dashboard overview", () => {
  test("aggregates competitions and metrics for dashboard rendering", async () => {
    const competitions: AdminCompetitionSummary[] = [
      makeCompetition({
        id: "comp-2",
        name: "Cup 2025",
        slug: "cup-2025",
        createdAt: new Date("2025-02-01T10:00:00Z"),
        editions: [
          makeEdition({
            id: "ed-3",
            label: "2025",
            slug: "2025",
            status: "published",
            publishedAt: new Date("2025-02-10T10:00:00Z"),
          }),
          makeEdition({
            id: "ed-4",
            label: "2026",
            slug: "2026",
            status: "draft",
          }),
        ],
        administrators: [
          makeAssignment({
            userId: "admin-global",
            role: "global_admin",
            scopeType: "global",
          }),
          makeAssignment({
            userId: "admin-competition-2",
            role: "competition_admin",
            scopeType: "competition",
            scopeId: "comp-2",
            email: "comp2@example.com",
          }),
        ],
        health: {
          lastAuditEventAt: new Date("2025-02-12T09:00:00Z"),
          unresolvedDisputes: 1,
          pendingEntries: 2,
        },
      }),
      makeCompetition({
        id: "comp-1",
        name: "Cup 2024",
        slug: "cup-2024",
        createdAt: new Date("2024-11-01T10:00:00Z"),
        editions: [
          makeEdition({
            id: "ed-1",
            label: "2024",
            slug: "2024",
            status: "published",
            publishedAt: new Date("2024-11-20T10:00:00Z"),
          }),
        ],
        administrators: [
          makeAssignment({
            userId: "admin-global",
            role: "global_admin",
            scopeType: "global",
          }),
          makeAssignment({
            userId: "admin-competition-1",
            role: "competition_admin",
            scopeType: "competition",
            scopeId: "comp-1",
            email: "comp1@example.com",
          }),
        ],
        health: {
          lastAuditEventAt: new Date("2024-11-22T09:00:00Z"),
          unresolvedDisputes: 0,
          pendingEntries: 1,
        },
      }),
    ];

    const overview = await getGlobalAdminOverview({
      fetchCompetitions: async () => competitions,
      countPendingInvitations: async () => 3,
      countUnreadNotifications: async () => 5,
    });

    const expectedMetrics: AdminDashboardOverviewMetrics = {
      totalCompetitions: 2,
      publishedEditions: 2,
      draftEditions: 1,
      pendingInvitations: 3,
      unreadNotifications: 5,
      totalAdministrators: 3,
      unresolvedDisputes: 1,
      pendingEntries: 3,
    };

    expect(overview.metrics).toEqual(expectedMetrics);
    expect(overview.competitions.map((item) => item.id)).toEqual([
      "comp-2",
      "comp-1",
    ]);

    expect(overview.competitions).toHaveLength(2);

    const [firstCompetition] = overview.competitions;
    expect(firstCompetition).toBeDefined();
    if (!firstCompetition) {
      throw new Error(
        "Competition overview is expected to contain at least one competition.",
      );
    }

    expect(firstCompetition.health.unresolvedDisputes).toBe(1);
    expect(firstCompetition.health.pendingEntries).toBe(2);
    expect(firstCompetition.administrators).toHaveLength(2);
  });
});
