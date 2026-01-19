import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { createProblem } from "@/lib/errors/problem";
import type { Role, RoleScope } from "@/server/auth";
import { db } from "@/server/db/client";
import {
  auditLogs,
  competitions,
  editionSettings,
  editions,
  entries as entriesTable,
  notifications,
  roleInvitations,
  teams,
  userRoles,
  users,
} from "@/server/db/schema";
import type {
  auditActionEnum,
  auditEntityTypeEnum,
  auditScopeTypeEnum,
  editionStatusEnum,
} from "@/server/db/schema/shared";
import {
  type AdminAnalyticsEventName,
  emitAdminEvent,
} from "@/server/observability/events";

type EditionStatus = (typeof editionStatusEnum.enumValues)[number];
type AuditScopeType = (typeof auditScopeTypeEnum.enumValues)[number];
type AuditActionType = (typeof auditActionEnum.enumValues)[number];
type AuditEntityType = (typeof auditEntityTypeEnum.enumValues)[number];

export type ScoreboardTheme = {
  primaryColor: string;
  secondaryColor: string;
  backgroundImageUrl: string | null;
};

export type EditionSummary = {
  id: string;
  competitionId: string;
  label: string;
  slug: string;
  status: EditionStatus;
  format: string;
  timezone: string;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  scoreboardRotationSeconds: number;
  scoreboardTheme: ScoreboardTheme;
};

export type AdminAssignmentSummary = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  scopeType: RoleScope;
  scopeId: string | null;
};

export type CompetitionHealthSummary = {
  lastAuditEventAt: Date | null;
  unresolvedDisputes: number;
  pendingEntries: number;
};

export type AdminCompetitionSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  defaultTimezone: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  createdAt: Date;
  archivedAt: Date | null;
  editions: EditionSummary[];
  administrators: AdminAssignmentSummary[];
  health: CompetitionHealthSummary;
};

export type AdminDashboardOverviewMetrics = {
  totalCompetitions: number;
  publishedEditions: number;
  draftEditions: number;
  pendingInvitations: number;
  unreadNotifications: number;
  totalAdministrators: number;
  unresolvedDisputes: number;
  pendingEntries: number;
};

export type AdminDashboardOverview = {
  metrics: AdminDashboardOverviewMetrics;
  competitions: AdminCompetitionSummary[];
};

export type AuditLogEntry = {
  id: string;
  scopeType: AuditScopeType;
  scopeId: string | null;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditActionType;
  metadata: Record<string, unknown>;
  createdAt: Date;
  actor: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
};

export type AuditLogFilter = {
  scopeType?: AuditScopeType;
  scopeId?: string;
  limit?: number;
};

type CompetitionFilter = {
  competitionIds?: string[];
};

type OverviewDependencies = {
  fetchCompetitions: (
    filter?: CompetitionFilter,
  ) => Promise<AdminCompetitionSummary[]>;
  countPendingInvitations: () => Promise<number>;
  countUnreadNotifications: () => Promise<number>;
  publishEvent: (
    event: AdminAnalyticsEventName,
    payload: Record<string, unknown>,
  ) => void;
};

type CompetitionDetailDependencies = {
  fetchCompetition: (id: string) => Promise<AdminCompetitionSummary | null>;
  publishEvent: OverviewDependencies["publishEvent"];
};

type AuditLogDependencies = {
  fetchAuditLogs: (filter: AuditLogFilter) => Promise<AuditLogEntry[]>;
  publishEvent: OverviewDependencies["publishEvent"];
};

const overviewDependencies: OverviewDependencies = {
  fetchCompetitions: (filter) => fetchCompetitionsFromDatabase(filter),
  countPendingInvitations: () => countPendingInvitationsFromDatabase(),
  countUnreadNotifications: () => countUnreadNotificationsFromDatabase(),
  publishEvent: (event, payload) => emitAdminEvent(event, payload),
};

const competitionDetailDependencies: CompetitionDetailDependencies = {
  fetchCompetition: (id) => fetchCompetitionByIdFromDatabase(id),
  publishEvent: (event, payload) => emitAdminEvent(event, payload),
};

const auditLogDependencies: AuditLogDependencies = {
  fetchAuditLogs: (filter) => fetchAuditLogsFromDatabase(filter),
  publishEvent: (event, payload) => emitAdminEvent(event, payload),
};

const DEFAULT_THEME: ScoreboardTheme = {
  primaryColor: "#0B1F3A",
  secondaryColor: "#FFFFFF",
  backgroundImageUrl: null,
};

export async function getGlobalAdminOverview(
  overrides: Partial<OverviewDependencies> = {},
): Promise<AdminDashboardOverview> {
  const deps = { ...overviewDependencies, ...overrides };

  const [competitionsSummary, pendingInvitations, unreadNotifications] =
    await Promise.all([
      deps.fetchCompetitions(),
      deps.countPendingInvitations(),
      deps.countUnreadNotifications(),
    ]);

  const competitionsOrdered = [...competitionsSummary].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );

  const metrics: AdminDashboardOverviewMetrics = {
    totalCompetitions: competitionsOrdered.length,
    publishedEditions: 0,
    draftEditions: 0,
    pendingInvitations,
    unreadNotifications,
    totalAdministrators: 0,
    unresolvedDisputes: 0,
    pendingEntries: 0,
  };

  const administratorIds = new Set<string>();

  for (const competition of competitionsOrdered) {
    for (const edition of competition.editions) {
      if (edition.status === "published") {
        metrics.publishedEditions += 1;
      } else if (edition.status === "draft") {
        metrics.draftEditions += 1;
      }
    }

    metrics.unresolvedDisputes += competition.health.unresolvedDisputes;
    metrics.pendingEntries += competition.health.pendingEntries;

    for (const administrator of competition.administrators) {
      administratorIds.add(administrator.userId);
    }
  }

  metrics.totalAdministrators = administratorIds.size;

  deps.publishEvent("admin_dashboard_aggregated", {
    competitionIds: competitionsOrdered.map((item) => item.id),
    metrics,
  });

  return {
    competitions: competitionsOrdered,
    metrics,
  };
}

export async function getCompetitionDetail(
  competitionId: string,
  overrides: Partial<CompetitionDetailDependencies> = {},
): Promise<AdminCompetitionSummary> {
  const deps = { ...competitionDetailDependencies, ...overrides };

  const competition = await deps.fetchCompetition(competitionId);

  if (!competition) {
    throw createProblem({
      type: "https://tournament.app/problems/competition-not-found",
      title: "Konkurranse ikke funnet",
      status: 404,
      detail: `Fant ingen konkurranse med id ${competitionId}.`,
    });
  }

  deps.publishEvent("admin_competition_detail_viewed", {
    competitionId: competition.id,
    administratorCount: competition.administrators.length,
  });

  return competition;
}

export async function listAuditLogs(
  filter: AuditLogFilter = {},
  overrides: Partial<AuditLogDependencies> = {},
): Promise<AuditLogEntry[]> {
  const deps = { ...auditLogDependencies, ...overrides };

  const entries = await deps.fetchAuditLogs(filter);

  deps.publishEvent("admin_audit_log_filtered", {
    scopeType: filter.scopeType ?? null,
    scopeId: filter.scopeId ?? null,
    resultCount: entries.length,
  });

  return entries;
}

export async function getCompetitionsForUser(
  userId: string,
): Promise<AdminCompetitionSummary[]> {
  // Get competition IDs where this user has competition_admin role
  const scopedIds = await db
    .select({ scopeId: userRoles.scopeId })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.role, "competition_admin"),
        eq(userRoles.scopeType, "competition"),
      ),
    );

  const ids = scopedIds
    .map((row) => row.scopeId)
    .filter((id): id is string => Boolean(id));

  if (ids.length === 0) {
    return [];
  }

  const competitions = await fetchCompetitionsFromDatabase({
    competitionIds: ids,
  });

  return [...competitions].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
}

export type AdminTeamSummary = {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  createdAt: Date;
  entries: {
    id: string;
    status: string;
    editionLabel: string;
    editionId: string;
    competitionName: string;
  }[];
};

export async function getTeamsForUser(
  userId: string,
): Promise<AdminTeamSummary[]> {
  const teamRoles = await db
    .select({ scopeId: userRoles.scopeId })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.role, "team_manager"),
        eq(userRoles.scopeType, "team"),
      ),
    );

  const teamIds = teamRoles
    .map((r) => r.scopeId)
    .filter((id): id is string => Boolean(id));

  if (teamIds.length === 0) return [];

  const teamRows = await db
    .select()
    .from(teams)
    .where(inArray(teams.id, teamIds));

  const entryRows = await db
    .select({
      id: entriesTable.id,
      status: entriesTable.status,
      teamId: entriesTable.teamId,
      editionId: editions.id,
      editionLabel: editions.label,
      competitionName: competitions.name,
    })
    .from(entriesTable)
    .innerJoin(editions, eq(entriesTable.editionId, editions.id))
    .innerJoin(competitions, eq(editions.competitionId, competitions.id))
    .where(inArray(entriesTable.teamId, teamIds));

  return teamRows.map((team) => ({
    id: team.id,
    name: team.name,
    slug: team.slug,
    contactEmail: team.contactEmail,
    createdAt: team.createdAt,
    entries: entryRows
      .filter((e) => e.teamId === team.id)
      .map((e) => ({
        id: e.id,
        status: e.status,
        editionLabel: e.editionLabel,
        editionId: e.editionId,
        competitionName: e.competitionName,
      })),
  }));
}

async function fetchCompetitionsFromDatabase(
  filter?: CompetitionFilter,
): Promise<AdminCompetitionSummary[]> {
  const baseCompetitionsQuery = db
    .select({
      id: competitions.id,
      name: competitions.name,
      slug: competitions.slug,
      description: competitions.description,
      defaultTimezone: competitions.defaultTimezone,
      primaryColor: competitions.primaryColor,
      secondaryColor: competitions.secondaryColor,
      createdAt: competitions.createdAt,
      archivedAt: competitions.archivedAt,
      updatedAt: competitions.updatedAt,
    })
    .from(competitions);

  const competitionIds = filter?.competitionIds ?? [];

  type CompetitionRows = Awaited<
    ReturnType<(typeof baseCompetitionsQuery)["execute"]>
  >;
  let competitionRows: CompetitionRows;
  if (competitionIds.length === 1) {
    const [onlyCompetitionId] = competitionIds;
    if (!onlyCompetitionId) {
      return [];
    }

    competitionRows = await baseCompetitionsQuery.where(
      eq(competitions.id, onlyCompetitionId),
    );
  } else if (competitionIds.length > 1) {
    competitionRows = await baseCompetitionsQuery.where(
      inArray(competitions.id, competitionIds),
    );
  } else {
    competitionRows = await baseCompetitionsQuery;
  }

  if (competitionRows.length === 0) {
    return [];
  }

  const ids = competitionRows.map((row) => row.id);

  const baseEditionsQuery = db
    .select({
      id: editions.id,
      competitionId: editions.competitionId,
      label: editions.label,
      slug: editions.slug,
      status: editions.status,
      format: editions.format,
      timezone: editions.timezone,
      registrationOpensAt: editions.registrationOpensAt,
      registrationClosesAt: editions.registrationClosesAt,
      createdAt: editions.createdAt,
      updatedAt: editions.updatedAt,
    })
    .from(editions);

  const editionRows = ids.length
    ? await baseEditionsQuery.where(inArray(editions.competitionId, ids))
    : [];
  const editionIds = editionRows.map((edition) => edition.id);

  const settingsRows = editionIds.length
    ? await db
        .select({
          editionId: editionSettings.editionId,
          scoreboardTheme: editionSettings.scoreboardTheme,
          rotationSeconds: editionSettings.scoreboardRotationSeconds,
        })
        .from(editionSettings)
        .where(inArray(editionSettings.editionId, editionIds))
    : [];

  const editionSettingsMap = new Map<
    string,
    {
      scoreboardTheme: ScoreboardTheme;
      rotationSeconds: number;
    }
  >();

  for (const setting of settingsRows) {
    editionSettingsMap.set(setting.editionId, {
      scoreboardTheme: normalizeScoreboardTheme(setting.scoreboardTheme),
      rotationSeconds: setting.rotationSeconds ?? 5,
    });
  }

  const editionMap = new Map<string, EditionSummary[]>();
  const editionToCompetition = new Map<string, string>();

  for (const edition of editionRows) {
    const settings = editionSettingsMap.get(edition.id) ?? {
      scoreboardTheme: DEFAULT_THEME,
      rotationSeconds: 5,
    };

    const summary: EditionSummary = {
      id: edition.id,
      competitionId: edition.competitionId,
      label: edition.label,
      slug: edition.slug,
      status: edition.status as EditionStatus,
      format: edition.format,
      timezone: edition.timezone,
      registrationOpensAt: edition.registrationOpensAt ?? null,
      registrationClosesAt: edition.registrationClosesAt ?? null,
      createdAt: edition.createdAt,
      updatedAt: edition.updatedAt,
      publishedAt: edition.status === "published" ? edition.updatedAt : null,
      scoreboardRotationSeconds: settings.rotationSeconds,
      scoreboardTheme: settings.scoreboardTheme,
    };

    const list = editionMap.get(edition.competitionId);
    if (list) {
      list.push(summary);
    } else {
      editionMap.set(edition.competitionId, [summary]);
    }

    editionToCompetition.set(edition.id, edition.competitionId);
  }

  for (const editionsList of editionMap.values()) {
    editionsList.sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );
  }

  const globalAdminRows = await db
    .select({
      userId: userRoles.userId,
      role: userRoles.role,
      scopeType: userRoles.scopeType,
      scopeId: userRoles.scopeId,
      email: users.email,
      fullName: users.fullName,
    })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(eq(userRoles.role, "global_admin"));

  const competitionAdminRows = await db
    .select({
      userId: userRoles.userId,
      role: userRoles.role,
      scopeType: userRoles.scopeType,
      scopeId: userRoles.scopeId,
      email: users.email,
      fullName: users.fullName,
    })
    .from(userRoles)
    .innerJoin(users, eq(users.id, userRoles.userId))
    .where(
      ids.length
        ? and(
            eq(userRoles.role, "competition_admin"),
            eq(userRoles.scopeType, "competition"),
            inArray(userRoles.scopeId, ids),
          )
        : and(
            eq(userRoles.role, "competition_admin"),
            eq(userRoles.scopeType, "competition"),
          ),
    );

  const globalAdmins = globalAdminRows.map(convertAssignmentRow);
  const adminsByCompetition = new Map<string, AdminAssignmentSummary[]>();

  for (const assignment of competitionAdminRows.map(convertAssignmentRow)) {
    if (!assignment.scopeId) {
      continue;
    }

    const list = adminsByCompetition.get(assignment.scopeId);
    if (list) {
      list.push(assignment);
    } else {
      adminsByCompetition.set(assignment.scopeId, [assignment]);
    }
  }

  const auditConditions: ReturnType<typeof and>[] = [];

  if (ids.length) {
    auditConditions.push(
      and(
        eq(auditLogs.scopeType, "competition"),
        inArray(auditLogs.scopeId, ids),
      ),
    );
  }

  const editionIdList = Array.from(editionToCompetition.keys());
  if (editionIdList.length) {
    auditConditions.push(
      and(
        eq(auditLogs.scopeType, "edition"),
        inArray(auditLogs.scopeId, editionIdList),
      ),
    );
  }

  const latestAuditByCompetition = new Map<string, Date>();

  if (auditConditions.length) {
    const auditBaseQuery = db
      .select({
        scopeType: auditLogs.scopeType,
        scopeId: auditLogs.scopeId,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(200);

    type AuditRows = Awaited<ReturnType<(typeof auditBaseQuery)["execute"]>>;
    let auditRows: AuditRows;
    if (auditConditions.length === 1) {
      const [singleCondition] = auditConditions;
      auditRows = await auditBaseQuery.where(singleCondition);
    } else {
      auditRows = await auditBaseQuery.where(or(...auditConditions));
    }

    for (const audit of auditRows) {
      if (!audit.scopeId) {
        continue;
      }

      if (audit.scopeType === "competition") {
        updateLatestAudit(
          latestAuditByCompetition,
          audit.scopeId,
          audit.createdAt,
        );
      } else if (audit.scopeType === "edition") {
        const competitionId = editionToCompetition.get(audit.scopeId);
        if (competitionId) {
          updateLatestAudit(
            latestAuditByCompetition,
            competitionId,
            audit.createdAt,
          );
        }
      }
    }
  }

  return competitionRows.map((competition) => {
    const editionsForCompetition = editionMap.get(competition.id) ?? [];
    const administrators = dedupeAssignments([
      ...globalAdmins,
      ...(adminsByCompetition.get(competition.id) ?? []),
    ]);

    const health: CompetitionHealthSummary = {
      lastAuditEventAt: latestAuditByCompetition.get(competition.id) ?? null,
      unresolvedDisputes: 0,
      pendingEntries: 0,
    };

    return {
      id: competition.id,
      name: competition.name,
      slug: competition.slug,
      description: competition.description ?? null,
      defaultTimezone: competition.defaultTimezone,
      primaryColor: competition.primaryColor ?? null,
      secondaryColor: competition.secondaryColor ?? null,
      createdAt: competition.createdAt,
      archivedAt: competition.archivedAt ?? null,
      editions: editionsForCompetition,
      administrators,
      health,
    };
  });
}

async function fetchCompetitionByIdFromDatabase(
  id: string,
): Promise<AdminCompetitionSummary | null> {
  const [competition] = await fetchCompetitionsFromDatabase({
    competitionIds: [id],
  });
  return competition ?? null;
}

async function countPendingInvitationsFromDatabase(): Promise<number> {
  const result = await db
    .select({ value: sql<number>`count(*)` })
    .from(roleInvitations)
    .where(isNull(roleInvitations.acceptedAt));

  return result[0]?.value ?? 0;
}

async function countUnreadNotificationsFromDatabase(): Promise<number> {
  const result = await db
    .select({ value: sql<number>`count(*)` })
    .from(notifications)
    .where(isNull(notifications.readAt));

  return result[0]?.value ?? 0;
}

async function fetchAuditLogsFromDatabase(
  filter: AuditLogFilter,
): Promise<AuditLogEntry[]> {
  const limit = filter.limit ?? 50;

  const baseQuery = db
    .select({
      id: auditLogs.id,
      scopeType: auditLogs.scopeType,
      scopeId: auditLogs.scopeId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      actorId: auditLogs.actorId,
      actorEmail: users.email,
      actorName: users.fullName,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  const rows = await (filter.scopeType && filter.scopeId
    ? baseQuery.where(
        and(
          eq(auditLogs.scopeType, filter.scopeType),
          eq(auditLogs.scopeId, filter.scopeId),
        ),
      )
    : filter.scopeType
      ? baseQuery.where(eq(auditLogs.scopeType, filter.scopeType))
      : filter.scopeId
        ? baseQuery.where(eq(auditLogs.scopeId, filter.scopeId))
        : baseQuery);

  return rows.map((row) => ({
    id: row.id,
    scopeType: row.scopeType as AuditScopeType,
    scopeId: row.scopeId ?? null,
    entityType: row.entityType as AuditEntityType,
    entityId: row.entityId,
    action: row.action as AuditActionType,
    metadata: normalizeMetadata(row.metadata),
    createdAt: row.createdAt,
    actor: {
      id: row.actorId ?? null,
      name: row.actorName ?? null,
      email: row.actorEmail ?? null,
    },
  }));
}

type AssignmentRow = {
  userId: string;
  role: Role;
  scopeType: RoleScope;
  scopeId: string | null;
  email: string | null;
  fullName: string | null;
};

function convertAssignmentRow(row: AssignmentRow): AdminAssignmentSummary {
  const email = row.email ?? "ukjent@tournament.app";
  const name = (row.fullName ?? email).trim();

  return {
    userId: row.userId,
    name,
    email,
    role: row.role,
    scopeType: row.scopeType,
    scopeId: row.scopeId,
  };
}

function dedupeAssignments(
  assignments: AdminAssignmentSummary[],
): AdminAssignmentSummary[] {
  const seen = new Set<string>();
  const result: AdminAssignmentSummary[] = [];

  for (const assignment of assignments) {
    if (seen.has(assignment.userId)) {
      continue;
    }

    seen.add(assignment.userId);
    result.push(assignment);
  }

  return result;
}

function normalizeScoreboardTheme(payload: unknown): ScoreboardTheme {
  if (!payload || typeof payload !== "object") {
    return DEFAULT_THEME;
  }

  const record = payload as Record<string, unknown>;

  const primary =
    typeof record.primary_color === "string"
      ? record.primary_color
      : typeof record.primaryColor === "string"
        ? record.primaryColor
        : DEFAULT_THEME.primaryColor;

  const secondary =
    typeof record.secondary_color === "string"
      ? record.secondary_color
      : typeof record.secondaryColor === "string"
        ? record.secondaryColor
        : DEFAULT_THEME.secondaryColor;

  const background =
    typeof record.background_image_url === "string"
      ? record.background_image_url
      : typeof record.backgroundImageUrl === "string"
        ? record.backgroundImageUrl
        : null;

  return {
    primaryColor: primary,
    secondaryColor: secondary,
    backgroundImageUrl: background,
  };
}

function normalizeMetadata(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object") {
    return payload as Record<string, unknown>;
  }

  return {};
}

function updateLatestAudit(
  target: Map<string, Date>,
  competitionId: string,
  createdAt: Date,
): void {
  const current = target.get(competitionId);

  if (!current || createdAt > current) {
    target.set(competitionId, createdAt);
  }
}
