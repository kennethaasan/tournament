import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { editions } from "./competitions";
import {
  availabilityEnum,
  createdAtColumn,
  entryStatusEnum,
  timestampTz,
  updatedAtColumn,
  uuidPrimaryKey,
} from "./shared";
import { persons, teamMemberships, teams } from "./teams";

export const entries = pgTable(
  "entries",
  {
    id: uuidPrimaryKey(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    status: entryStatusEnum("status").notNull().default("pending"),
    submittedAt: timestampTz("submitted_at"),
    approvedAt: timestampTz("approved_at"),
    rejectedAt: timestampTz("rejected_at"),
    notes: text("notes"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => ({
    uniqueEntry: uniqueIndex("entries_unique_team_edition").on(
      table.editionId,
      table.teamId,
    ),
  }),
);

export const squads = pgTable(
  "squads",
  {
    id: uuidPrimaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    lockedAt: timestampTz("locked_at"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => ({
    uniqueEntrySquad: uniqueIndex("squads_entry_unique").on(table.entryId),
  }),
);

export const squadMembers = pgTable(
  "squad_members",
  {
    id: uuidPrimaryKey(),
    squadId: uuid("squad_id")
      .notNull()
      .references(() => squads.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id").references(() => teamMemberships.id, {
      onDelete: "set null",
    }),
    jerseyNumber: integer("jersey_number"),
    position: text("position"),
    availability: availabilityEnum("availability")
      .notNull()
      .default("available"),
    notes: text("notes"),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => ({
    uniqueJersey: uniqueIndex("squad_members_unique_jersey")
      .on(table.squadId, table.jerseyNumber)
      .where(sql`${table.jerseyNumber} IS NOT NULL`),
    uniqueMembership: uniqueIndex("squad_members_unique_membership")
      .on(table.squadId, table.membershipId)
      .where(sql`${table.membershipId} IS NOT NULL`),
  }),
);

export type Entry = typeof entries.$inferSelect;
export type Squad = typeof squads.$inferSelect;
export type SquadMember = typeof squadMembers.$inferSelect;
