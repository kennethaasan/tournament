import { describe, expect, it, vi } from "vitest";
import {
  type AdminCompetitionSummary,
  type AuditLogEntry,
  getCompetitionDetail,
  getGlobalAdminOverview,
  listAuditLogs,
} from "@/modules/admin/service";

describe("getGlobalAdminOverview", () => {
  const createMockCompetition = (
    overrides: Partial<AdminCompetitionSummary> = {},
  ): AdminCompetitionSummary => ({
    id: "comp-1",
    name: "Test Competition",
    slug: "test-competition",
    description: null,
    defaultTimezone: "Europe/Oslo",
    primaryColor: null,
    secondaryColor: null,
    createdAt: new Date("2024-01-01"),
    archivedAt: null,
    editions: [],
    administrators: [],
    health: {
      lastAuditEventAt: null,
      unresolvedDisputes: 0,
      pendingEntries: 0,
    },
    ...overrides,
  });

  it("returns empty overview when no competitions exist", async () => {
    const overview = await getGlobalAdminOverview({
      fetchCompetitions: async () => [],
      countPendingInvitations: async () => 0,
      countUnreadNotifications: async () => 0,
      publishEvent: vi.fn(),
    });

    expect(overview.competitions).toHaveLength(0);
    expect(overview.metrics.totalCompetitions).toBe(0);
    expect(overview.metrics.publishedEditions).toBe(0);
    expect(overview.metrics.draftEditions).toBe(0);
    expect(overview.metrics.totalAdministrators).toBe(0);
  });

  it("aggregates metrics from competitions", async () => {
    const competitions: AdminCompetitionSummary[] = [
      createMockCompetition({
        id: "comp-1",
        editions: [
          {
            id: "ed-1",
            competitionId: "comp-1",
            label: "Edition 1",
            slug: "edition-1",
            status: "published",
            format: "round_robin",
            timezone: "Europe/Oslo",
            registrationOpensAt: null,
            registrationClosesAt: null,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
            publishedAt: new Date("2024-01-01"),
            scoreboardRotationSeconds: 5,
            scoreboardTheme: {
              primaryColor: "#000",
              secondaryColor: "#FFF",
              backgroundImageUrl: null,
            },
          },
          {
            id: "ed-2",
            competitionId: "comp-1",
            label: "Edition 2",
            slug: "edition-2",
            status: "draft",
            format: "knockout",
            timezone: "Europe/Oslo",
            registrationOpensAt: null,
            registrationClosesAt: null,
            createdAt: new Date("2024-02-01"),
            updatedAt: new Date("2024-02-01"),
            publishedAt: null,
            scoreboardRotationSeconds: 5,
            scoreboardTheme: {
              primaryColor: "#000",
              secondaryColor: "#FFF",
              backgroundImageUrl: null,
            },
          },
        ],
        administrators: [
          {
            userId: "user-1",
            name: "Admin One",
            email: "admin1@test.com",
            role: "global_admin",
            scopeType: "global",
            scopeId: null,
          },
        ],
        health: {
          lastAuditEventAt: null,
          unresolvedDisputes: 2,
          pendingEntries: 3,
        },
      }),
      createMockCompetition({
        id: "comp-2",
        createdAt: new Date("2024-02-01"),
        editions: [
          {
            id: "ed-3",
            competitionId: "comp-2",
            label: "Edition 3",
            slug: "edition-3",
            status: "published",
            format: "hybrid",
            timezone: "Europe/Oslo",
            registrationOpensAt: null,
            registrationClosesAt: null,
            createdAt: new Date("2024-03-01"),
            updatedAt: new Date("2024-03-01"),
            publishedAt: new Date("2024-03-01"),
            scoreboardRotationSeconds: 5,
            scoreboardTheme: {
              primaryColor: "#000",
              secondaryColor: "#FFF",
              backgroundImageUrl: null,
            },
          },
        ],
        administrators: [
          {
            userId: "user-1",
            name: "Admin One",
            email: "admin1@test.com",
            role: "global_admin",
            scopeType: "global",
            scopeId: null,
          },
          {
            userId: "user-2",
            name: "Admin Two",
            email: "admin2@test.com",
            role: "competition_admin",
            scopeType: "competition",
            scopeId: "comp-2",
          },
        ],
        health: {
          lastAuditEventAt: null,
          unresolvedDisputes: 1,
          pendingEntries: 0,
        },
      }),
    ];

    const publishEvent = vi.fn();
    const overview = await getGlobalAdminOverview({
      fetchCompetitions: async () => competitions,
      countPendingInvitations: async () => 5,
      countUnreadNotifications: async () => 10,
      publishEvent,
    });

    expect(overview.metrics.totalCompetitions).toBe(2);
    expect(overview.metrics.publishedEditions).toBe(2);
    expect(overview.metrics.draftEditions).toBe(1);
    expect(overview.metrics.pendingInvitations).toBe(5);
    expect(overview.metrics.unreadNotifications).toBe(10);
    expect(overview.metrics.totalAdministrators).toBe(2);
    expect(overview.metrics.unresolvedDisputes).toBe(3);
    expect(overview.metrics.pendingEntries).toBe(3);

    expect(publishEvent).toHaveBeenCalledWith(
      "admin_dashboard_aggregated",
      expect.objectContaining({
        competitionIds: expect.any(Array),
        metrics: expect.any(Object),
      }),
    );
  });

  it("sorts competitions by creation date descending", async () => {
    const competitions: AdminCompetitionSummary[] = [
      createMockCompetition({ id: "old", createdAt: new Date("2023-01-01") }),
      createMockCompetition({ id: "new", createdAt: new Date("2024-01-01") }),
      createMockCompetition({ id: "mid", createdAt: new Date("2023-06-01") }),
    ];

    const overview = await getGlobalAdminOverview({
      fetchCompetitions: async () => competitions,
      countPendingInvitations: async () => 0,
      countUnreadNotifications: async () => 0,
      publishEvent: vi.fn(),
    });

    expect(overview.competitions[0]?.id).toBe("new");
    expect(overview.competitions[1]?.id).toBe("mid");
    expect(overview.competitions[2]?.id).toBe("old");
  });

  it("handles archived edition status", async () => {
    const competitions: AdminCompetitionSummary[] = [
      createMockCompetition({
        editions: [
          {
            id: "ed-1",
            competitionId: "comp-1",
            label: "Archived Edition",
            slug: "archived",
            status: "archived",
            format: "round_robin",
            timezone: "Europe/Oslo",
            registrationOpensAt: null,
            registrationClosesAt: null,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
            publishedAt: null,
            scoreboardRotationSeconds: 5,
            scoreboardTheme: {
              primaryColor: "#000",
              secondaryColor: "#FFF",
              backgroundImageUrl: null,
            },
          },
        ],
      }),
    ];

    const overview = await getGlobalAdminOverview({
      fetchCompetitions: async () => competitions,
      countPendingInvitations: async () => 0,
      countUnreadNotifications: async () => 0,
      publishEvent: vi.fn(),
    });

    expect(overview.metrics.publishedEditions).toBe(0);
    expect(overview.metrics.draftEditions).toBe(0);
  });
});

describe("getCompetitionDetail", () => {
  it("throws ProblemError when competition not found", async () => {
    await expect(
      getCompetitionDetail("non-existent", {
        fetchCompetition: async () => null,
        publishEvent: vi.fn(),
      }),
    ).rejects.toThrow("Konkurranse ikke funnet");
  });

  it("returns competition and publishes event when found", async () => {
    const mockCompetition: AdminCompetitionSummary = {
      id: "comp-1",
      name: "Test Competition",
      slug: "test-competition",
      description: "A test competition",
      defaultTimezone: "Europe/Oslo",
      primaryColor: "#123456",
      secondaryColor: "#ABCDEF",
      createdAt: new Date("2024-01-01"),
      archivedAt: null,
      editions: [],
      administrators: [
        {
          userId: "user-1",
          name: "Admin",
          email: "admin@test.com",
          role: "global_admin",
          scopeType: "global",
          scopeId: null,
        },
      ],
      health: {
        lastAuditEventAt: new Date("2024-06-01"),
        unresolvedDisputes: 0,
        pendingEntries: 0,
      },
    };

    const publishEvent = vi.fn();
    const result = await getCompetitionDetail("comp-1", {
      fetchCompetition: async () => mockCompetition,
      publishEvent,
    });

    expect(result).toEqual(mockCompetition);
    expect(publishEvent).toHaveBeenCalledWith(
      "admin_competition_detail_viewed",
      {
        competitionId: "comp-1",
        administratorCount: 1,
      },
    );
  });
});

describe("listAuditLogs", () => {
  const createMockAuditLog = (
    overrides: Partial<AuditLogEntry> = {},
  ): AuditLogEntry => ({
    id: "log-1",
    scopeType: "competition",
    scopeId: "comp-1",
    entityType: "match",
    entityId: "match-1",
    action: "created",
    metadata: {},
    createdAt: new Date("2024-06-01"),
    actor: {
      id: "user-1",
      name: "Admin",
      email: "admin@test.com",
    },
    ...overrides,
  });

  it("returns audit logs and publishes event", async () => {
    const mockLogs = [
      createMockAuditLog({ id: "log-1" }),
      createMockAuditLog({ id: "log-2" }),
    ];

    const publishEvent = vi.fn();
    const result = await listAuditLogs(
      {},
      {
        fetchAuditLogs: async () => mockLogs,
        publishEvent,
      },
    );

    expect(result).toHaveLength(2);
    expect(publishEvent).toHaveBeenCalledWith("admin_audit_log_filtered", {
      scopeType: null,
      scopeId: null,
      resultCount: 2,
    });
  });

  it("passes filter parameters to event", async () => {
    const publishEvent = vi.fn();
    await listAuditLogs(
      { scopeType: "edition", scopeId: "ed-1", limit: 10 },
      {
        fetchAuditLogs: async () => [],
        publishEvent,
      },
    );

    expect(publishEvent).toHaveBeenCalledWith("admin_audit_log_filtered", {
      scopeType: "edition",
      scopeId: "ed-1",
      resultCount: 0,
    });
  });

  it("returns empty array when no logs found", async () => {
    const result = await listAuditLogs(
      {},
      {
        fetchAuditLogs: async () => [],
        publishEvent: vi.fn(),
      },
    );

    expect(result).toHaveLength(0);
  });
});
