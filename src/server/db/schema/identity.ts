import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import {
  citext,
  createdAtColumn,
  roleScopeEnum,
  timestampTz,
  updatedAtColumn,
  userRoleEnum,
  uuidPrimaryKey,
} from "./shared";

export const roleInvitations = pgTable("role_invitations", {
  id: uuidPrimaryKey(),
  email: citext("email").notNull(),
  role: userRoleEnum("role").notNull(),
  scopeType: roleScopeEnum("scope_type").notNull(),
  scopeId: uuid("scope_id"),
  invitedBy: uuid("invited_by")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestampTz("expires_at").notNull(),
  acceptedAt: timestampTz("accepted_at"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const userRoles = pgTable("user_roles", {
  id: uuidPrimaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  role: userRoleEnum("role").notNull(),
  scopeType: roleScopeEnum("scope_type").notNull(),
  scopeId: uuid("scope_id"),
  grantedBy: uuid("granted_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: createdAtColumn(),
});

export type RoleInvitation = typeof roleInvitations.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
