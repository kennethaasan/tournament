import { index, jsonb, pgTable, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { editions } from "./competitions";
import {
  auditActionEnum,
  auditEntityTypeEnum,
  auditScopeTypeEnum,
  createdAtColumn,
  notificationTypeEnum,
  timestampTz,
  uuidPrimaryKey,
} from "./shared";

export const notifications = pgTable("notifications", {
  id: uuidPrimaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  payload: jsonb("payload").notNull(),
  readAt: timestampTz("read_at"),
  createdAt: createdAtColumn(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuidPrimaryKey(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    scopeType: auditScopeTypeEnum("scope_type").notNull(),
    scopeId: uuid("scope_id"),
    entityType: auditEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    metadata: jsonb("metadata").notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => ({
    scopeIdx: index("audit_logs_scope_idx").on(table.scopeType, table.scopeId),
    createdIdx: index("audit_logs_created_idx").on(table.createdAt),
  }),
);

export const eventFeed = pgTable(
  "event_feed",
  {
    id: uuidPrimaryKey(),
    editionId: uuid("edition_id").references(() => editions.id, {
      onDelete: "cascade",
    }),
    entityType: auditEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => ({
    editionIdx: index("event_feed_edition_idx").on(
      table.editionId,
      table.createdAt,
    ),
  }),
);

export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type EventFeedItem = typeof eventFeed.$inferSelect;
