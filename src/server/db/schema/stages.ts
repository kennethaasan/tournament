import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { editions } from "./competitions";
import {
  bracketSideEnum,
  bracketTypeEnum,
  createdAtColumn,
  roundRobinModeEnum,
  stageTypeEnum,
  timestampTz,
  uuidPrimaryKey,
} from "./shared";

export const stages = pgTable(
  "stages",
  {
    id: uuidPrimaryKey(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    stageType: stageTypeEnum("stage_type").notNull(),
    orderIndex: integer("order_index").notNull(),
    publishedAt: timestampTz("published_at"),
    config: jsonb("config"),
    createdAt: createdAtColumn(),
  },
  (table) => ({
    stageOrderUnique: uniqueIndex("stages_edition_order_unique").on(
      table.editionId,
      table.orderIndex,
    ),
  }),
);

export const groups = pgTable(
  "groups",
  {
    id: uuidPrimaryKey(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name"),
    roundRobinMode: roundRobinModeEnum("round_robin_mode")
      .notNull()
      .default("single"),
    advancementRules: jsonb("advancement_rules"),
    createdAt: createdAtColumn(),
  },
  (table) => ({
    groupCodeUnique: uniqueIndex("groups_stage_code_unique").on(
      table.stageId,
      table.code,
    ),
  }),
);

export const brackets = pgTable(
  "brackets",
  {
    id: uuidPrimaryKey(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    bracketType: bracketTypeEnum("bracket_type")
      .notNull()
      .default("single_elimination"),
    thirdPlaceMatch: boolean("third_place_match").notNull().default(false),
    config: jsonb("config"),
    createdAt: createdAtColumn(),
  },
  (table) => ({
    bracketStageUnique: uniqueIndex("brackets_stage_unique").on(table.stageId),
  }),
);

export const rounds = pgTable(
  "rounds",
  {
    id: uuidPrimaryKey(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").references(() => groups.id, {
      onDelete: "cascade",
    }),
    bracketSide: bracketSideEnum("bracket_side"),
    label: text("label").notNull(),
    orderIndex: integer("order_index").notNull(),
    createdAt: createdAtColumn(),
  },
  (table) => ({
    roundOrderUnique: uniqueIndex("rounds_stage_order_unique").on(
      table.stageId,
      table.orderIndex,
    ),
  }),
);

export type Stage = typeof stages.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Bracket = typeof brackets.$inferSelect;
export type Round = typeof rounds.$inferSelect;
