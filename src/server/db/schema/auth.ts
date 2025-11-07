import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";
import {
  citext,
  createdAtColumn,
  timestampTz,
  updatedAtColumn,
  uuidPrimaryKey,
} from "./shared";

export const users = pgTable("users", {
  id: uuidPrimaryKey(),
  email: citext("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  hashedPassword: text("hashed_pwd"),
  fullName: text("full_name"),
  locale: text("locale").notNull().default("nb-NO"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const sessions = pgTable("sessions", {
  id: uuidPrimaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestampTz("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const accounts = pgTable("accounts", {
  id: uuidPrimaryKey(),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestampTz("access_token_expires_at"),
  refreshTokenExpiresAt: timestampTz("refresh_token_expires_at"),
  scope: text(),
  password: text(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const verifications = pgTable("verifications", {
  id: uuidPrimaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestampTz("expires_at").notNull(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
