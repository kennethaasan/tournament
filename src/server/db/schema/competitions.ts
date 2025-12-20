import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  citext,
  createdAtColumn,
  editionStatusEnum,
  timestampTz,
  updatedAtColumn,
  uuidPrimaryKey,
} from "./shared";

export const competitions = pgTable(
  "competitions",
  {
    id: uuidPrimaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    defaultTimezone: text("default_timezone").notNull(),
    description: text("description"),
    primaryColor: text("primary_color"),
    secondaryColor: text("secondary_color"),
    archivedAt: timestampTz("archived_at"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => ({
    slugUnique: uniqueIndex("competitions_slug_unique").on(table.slug),
  }),
);

export const editions = pgTable(
  "editions",
  {
    id: uuidPrimaryKey(),
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    slug: text("slug").notNull(),
    format: text("format").notNull(),
    timezone: text("timezone").notNull(),
    status: editionStatusEnum("status").notNull().default("draft"),
    registrationOpensAt: timestampTz("registration_opens_at"),
    registrationClosesAt: timestampTz("registration_closes_at"),
    contactEmail: citext("contact_email"),
    contactPhone: text("contact_phone"),
    primaryVenueId: uuid("primary_venue_id"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => ({
    slugUnique: uniqueIndex("editions_competition_slug_unique").on(
      table.competitionId,
      table.slug,
    ),
  }),
);

export const editionSettings = pgTable(
  "edition_settings",
  {
    editionId: uuid("edition_id")
      .primaryKey()
      .references(() => editions.id, { onDelete: "cascade" }),
    scoreboardTheme: jsonb("scoreboard_theme").notNull(),
    scoreboardRotationSeconds: integer("scoreboard_rotation_seconds")
      .notNull()
      .default(5),
    registrationRequirements: jsonb("registration_requirements"),
    rulesetNotes: text("ruleset_notes"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => ({
    rotationSecondsCheck: check(
      "edition_settings_rotation_seconds_check",
      sql`${table.scoreboardRotationSeconds} >= 2`,
    ),
  }),
);

export const venues = pgTable(
  "venues",
  {
    id: uuidPrimaryKey(),
    editionId: uuid("edition_id").references(() => editions.id, {
      onDelete: "cascade",
    }),
    competitionId: uuid("competition_id").references(() => competitions.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    address: text("address"),
    notes: text("notes"),
    timezone: text("timezone"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => ({
    slugScopeUnique: uniqueIndex("venues_scope_slug_unique").on(
      table.competitionId,
      table.editionId,
      table.slug,
    ),
  }),
);

export type Competition = typeof competitions.$inferSelect;
export type Edition = typeof editions.$inferSelect;
export type EditionSetting = typeof editionSettings.$inferSelect;
export type Venue = typeof venues.$inferSelect;
