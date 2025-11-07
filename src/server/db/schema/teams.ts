import { sql } from "drizzle-orm";
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  createdAtColumn,
  membershipStatusEnum,
  personRoleEnum,
  timestampTz,
  updatedAtColumn,
  uuidPrimaryKey,
} from "./shared";

export const teams = pgTable(
  "teams",
  {
    id: uuidPrimaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => ({
    slugUnique: uniqueIndex("teams_slug_unique").on(table.slug),
  }),
);

export const persons = pgTable(
  "persons",
  {
    id: uuidPrimaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    preferredName: text("preferred_name"),
    birthDate: timestamp("birth_date", {
      withTimezone: false,
      mode: "date",
    }),
    country: text("country"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => ({
    nameIdx: uniqueIndex("persons_full_name_idx").on(
      table.firstName,
      table.lastName,
      table.birthDate,
    ),
  }),
);

export const teamMemberships = pgTable(
  "team_memberships",
  {
    id: uuidPrimaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    role: personRoleEnum("role").notNull().default("player"),
    status: membershipStatusEnum("status").notNull().default("active"),
    joinedAt: timestampTz("joined_at"),
    leftAt: timestampTz("left_at"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => ({
    activeMembershipIdx: uniqueIndex("team_memberships_unique_active")
      .on(table.teamId, table.personId)
      .where(sql`${table.status} = 'active'`),
  }),
);

export type Team = typeof teams.$inferSelect;
export type Person = typeof persons.$inferSelect;
export type TeamMembership = typeof teamMemberships.$inferSelect;
