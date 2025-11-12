import { sql } from "drizzle-orm";
import { customType, pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

type TimestampMode = "date" | "string";

const TIMESTAMP_MODE: TimestampMode = "date";

export const userRoleEnum = pgEnum("user_role", [
  "global_admin",
  "competition_admin",
  "team_manager",
]);
export const roleScopeEnum = pgEnum("role_scope", [
  "global",
  "competition",
  "edition",
  "team",
]);

export const editionStatusEnum = pgEnum("edition_status", [
  "draft",
  "published",
  "archived",
]);
export const stageTypeEnum = pgEnum("stage_type", ["group", "knockout"]);
export const roundRobinModeEnum = pgEnum("round_robin_mode", [
  "single",
  "double",
]);
export const bracketTypeEnum = pgEnum("bracket_type", [
  "single_elimination",
  "double_elimination",
]);
export const bracketSideEnum = pgEnum("bracket_side", ["winners", "losers"]);

export const personRoleEnum = pgEnum("person_role", [
  "player",
  "coach",
  "manager",
  "staff",
]);
export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "inactive",
]);
export const entryStatusEnum = pgEnum("entry_status", [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);
export const availabilityEnum = pgEnum("availability", [
  "available",
  "doubtful",
  "injured",
  "suspended",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "in_progress",
  "finalized",
  "disputed",
]);
export const matchOutcomeEnum = pgEnum("match_outcome", [
  "home_win",
  "away_win",
  "draw",
  "forfeit_home",
  "forfeit_away",
  "cancelled",
  "postponed",
]);
export const matchDisputeStatusEnum = pgEnum("match_dispute_status", [
  "open",
  "resolved",
  "dismissed",
]);
export const teamSideEnum = pgEnum("team_side", ["home", "away"]);
export const matchEventTypeEnum = pgEnum("match_event_type", [
  "goal",
  "own_goal",
  "penalty_goal",
  "assist",
  "yellow_card",
  "red_card",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "entry_status",
  "schedule_change",
  "score_finalized",
  "score_disputed",
]);

export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "match",
  "match_event",
  "entry",
  "notification",
]);
export const auditActionEnum = pgEnum("audit_action", [
  "created",
  "updated",
  "deleted",
]);
export const auditScopeTypeEnum = pgEnum("audit_scope_type", [
  "competition",
  "edition",
  "team",
  "match",
  "user",
]);

export const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return "citext";
  },
});

export const uuidPrimaryKey = (name = "id") =>
  uuid(name).primaryKey().default(sql`uuid_generate_v7()`);

export const timestampTz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: TIMESTAMP_MODE });

export const createdAtColumn = (name = "created_at") =>
  timestampTz(name).notNull().default(sql`now()`);

export const updatedAtColumn = (name = "updated_at") =>
  timestampTz(name)
    .notNull()
    .default(sql`now()`)
    .$onUpdate(() => sql`now()`);

export const deletedAtColumn = (name = "deleted_at") => timestampTz(name);
