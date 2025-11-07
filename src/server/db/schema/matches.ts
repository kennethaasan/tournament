import { integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { editions, venues } from "./competitions";
import { entries } from "./entries";
import {
  createdAtColumn,
  matchDisputeStatusEnum,
  matchEventTypeEnum,
  matchOutcomeEnum,
  matchStatusEnum,
  teamSideEnum,
  timestampTz,
  updatedAtColumn,
  uuidPrimaryKey,
} from "./shared";
import { brackets, groups, rounds, stages } from "./stages";

export const matches = pgTable("matches", {
  id: uuidPrimaryKey(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => editions.id, { onDelete: "cascade" }),
  stageId: uuid("stage_id")
    .notNull()
    .references(() => stages.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").references(() => groups.id, {
    onDelete: "set null",
  }),
  bracketId: uuid("bracket_id").references(() => brackets.id, {
    onDelete: "set null",
  }),
  roundId: uuid("round_id").references(() => rounds.id, {
    onDelete: "set null",
  }),
  homeEntryId: uuid("home_entry_id"),
  awayEntryId: uuid("away_entry_id"),
  venueId: uuid("venue_id").references(() => venues.id, {
    onDelete: "set null",
  }),
  code: text("code"),
  kickoffAt: timestampTz("kickoff_at"),
  status: matchStatusEnum("status").notNull().default("scheduled"),
  homeScore: integer("home_score").notNull().default(0),
  awayScore: integer("away_score").notNull().default(0),
  homeExtraTime: integer("home_extra_time"),
  awayExtraTime: integer("away_extra_time"),
  homePenalties: integer("home_penalties"),
  awayPenalties: integer("away_penalties"),
  outcome: matchOutcomeEnum("outcome"),
  notes: text("notes"),
  metadata: jsonb("metadata").notNull().default({}),
  publishedAt: timestampTz("published_at"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const matchEvents = pgTable("match_events", {
  id: uuidPrimaryKey(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  appearanceId: uuid("appearance_id"),
  teamSide: teamSideEnum("team_side").notNull(),
  eventType: matchEventTypeEnum("event_type").notNull(),
  minute: integer("minute"),
  stoppageTime: integer("stoppage_time"),
  relatedMemberId: uuid("related_member_id"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: createdAtColumn(),
});

export const matchDisputes = pgTable("match_disputes", {
  id: uuidPrimaryKey(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  entryId: uuid("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  status: matchDisputeStatusEnum("status").notNull().default("open"),
  reason: text("reason").notNull(),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestampTz("resolved_at"),
  createdAt: createdAtColumn(),
});

export type Match = typeof matches.$inferSelect;
export type MatchEvent = typeof matchEvents.$inferSelect;
export type MatchDispute = typeof matchDisputes.$inferSelect;
