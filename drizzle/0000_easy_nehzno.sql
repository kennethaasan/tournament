-- Enable citext extension
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE TYPE "public"."audit_action" AS ENUM('created', 'updated', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."audit_entity_type" AS ENUM('match', 'match_event', 'entry', 'notification');--> statement-breakpoint
CREATE TYPE "public"."audit_scope_type" AS ENUM('competition', 'edition', 'team', 'match', 'user');--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('available', 'doubtful', 'injured', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."bracket_side" AS ENUM('winners', 'losers');--> statement-breakpoint
CREATE TYPE "public"."bracket_type" AS ENUM('single_elimination', 'double_elimination');--> statement-breakpoint
CREATE TYPE "public"."edition_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."entry_status" AS ENUM('pending', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."match_dispute_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."match_event_type" AS ENUM('goal', 'own_goal', 'penalty_goal', 'assist', 'yellow_card', 'red_card');--> statement-breakpoint
CREATE TYPE "public"."match_outcome" AS ENUM('home_win', 'away_win', 'draw', 'forfeit_home', 'forfeit_away', 'cancelled', 'postponed');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'in_progress', 'finalized', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('entry_status', 'schedule_change', 'score_finalized', 'score_disputed');--> statement-breakpoint
CREATE TYPE "public"."person_role" AS ENUM('player', 'coach', 'manager', 'staff');--> statement-breakpoint
CREATE TYPE "public"."role_scope" AS ENUM('global', 'competition', 'edition', 'team');--> statement-breakpoint
CREATE TYPE "public"."round_robin_mode" AS ENUM('single', 'double');--> statement-breakpoint
CREATE TYPE "public"."stage_type" AS ENUM('group', 'knockout');--> statement-breakpoint
CREATE TYPE "public"."team_side" AS ENUM('home', 'away');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('global_admin', 'competition_admin', 'team_manager');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"scope_type" "audit_scope_type" NOT NULL,
	"scope_id" uuid,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_feed" (
	"id" uuid PRIMARY KEY NOT NULL,
	"edition_id" uuid,
	"entity_type" "audit_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" "citext" NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"hashed_pwd" text,
	"full_name" text,
	"locale" text DEFAULT 'nb-NO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"default_timezone" text NOT NULL,
	"description" text,
	"primary_color" text,
	"secondary_color" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edition_settings" (
	"edition_id" uuid PRIMARY KEY NOT NULL,
	"scoreboard_theme" jsonb NOT NULL,
	"scoreboard_rotation_seconds" integer DEFAULT 5 NOT NULL,
	"registration_requirements" jsonb,
	"ruleset_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "edition_settings_rotation_seconds_check" CHECK ("edition_settings"."scoreboard_rotation_seconds" >= 2)
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"competition_id" uuid NOT NULL,
	"label" text NOT NULL,
	"slug" text NOT NULL,
	"format" text NOT NULL,
	"timezone" text NOT NULL,
	"status" "edition_status" DEFAULT 'draft' NOT NULL,
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"contact_email" "citext",
	"contact_phone" text,
	"primary_venue_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"edition_id" uuid,
	"competition_id" uuid,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text,
	"notes" text,
	"timezone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"edition_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"status" "entry_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squad_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"squad_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"membership_id" uuid,
	"jersey_number" integer,
	"position" text,
	"availability" "availability" DEFAULT 'available' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entry_id" uuid NOT NULL,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" "citext" NOT NULL,
	"role" "user_role" NOT NULL,
	"scope_type" "role_scope" NOT NULL,
	"scope_id" uuid,
	"invited_by" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"scope_type" "role_scope" NOT NULL,
	"scope_id" uuid,
	"granted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_disputes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"match_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"status" "match_dispute_status" DEFAULT 'open' NOT NULL,
	"reason" text NOT NULL,
	"resolution_notes" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"match_id" uuid NOT NULL,
	"appearance_id" uuid,
	"team_side" "team_side" NOT NULL,
	"event_type" "match_event_type" NOT NULL,
	"minute" integer,
	"stoppage_time" integer,
	"related_member_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"edition_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"group_id" uuid,
	"bracket_id" uuid,
	"round_id" uuid,
	"home_entry_id" uuid,
	"away_entry_id" uuid,
	"venue_id" uuid,
	"code" text,
	"kickoff_at" timestamp with time zone,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"home_score" integer DEFAULT 0 NOT NULL,
	"away_score" integer DEFAULT 0 NOT NULL,
	"home_extra_time" integer,
	"away_extra_time" integer,
	"home_penalties" integer,
	"away_penalties" integer,
	"outcome" "match_outcome",
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoreboard_highlights" (
	"id" uuid PRIMARY KEY NOT NULL,
	"edition_id" uuid NOT NULL,
	"message" text NOT NULL,
	"duration_seconds" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brackets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"stage_id" uuid NOT NULL,
	"bracket_type" "bracket_type" DEFAULT 'single_elimination' NOT NULL,
	"third_place_match" boolean DEFAULT false NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"stage_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text,
	"round_robin_mode" "round_robin_mode" DEFAULT 'single' NOT NULL,
	"advancement_rules" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"stage_id" uuid NOT NULL,
	"group_id" uuid,
	"bracket_side" "bracket_side",
	"label" text NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"edition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"stage_type" "stage_type" NOT NULL,
	"order_index" integer NOT NULL,
	"published_at" timestamp with time zone,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"preferred_name" text,
	"birth_date" timestamp,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"team_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"role" "person_role" DEFAULT 'player' NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_feed" ADD CONSTRAINT "event_feed_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edition_settings" ADD CONSTRAINT "edition_settings_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editions" ADD CONSTRAINT "editions_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_membership_id_team_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."team_memberships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squads" ADD CONSTRAINT "squads_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_invitations" ADD CONSTRAINT "role_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_disputes" ADD CONSTRAINT "match_disputes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_disputes" ADD CONSTRAINT "match_disputes_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_bracket_id_brackets_id_fk" FOREIGN KEY ("bracket_id") REFERENCES "public"."brackets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoreboard_highlights" ADD CONSTRAINT "scoreboard_highlights_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoreboard_highlights" ADD CONSTRAINT "scoreboard_highlights_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_scope_idx" ON "audit_logs" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "event_feed_edition_idx" ON "event_feed" USING btree ("edition_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "competitions_slug_unique" ON "competitions" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "editions_competition_slug_unique" ON "editions" USING btree ("competition_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "venues_scope_slug_unique" ON "venues" USING btree ("competition_id","edition_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "entries_unique_team_edition" ON "entries" USING btree ("edition_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "squad_members_unique_jersey" ON "squad_members" USING btree ("squad_id","jersey_number") WHERE "squad_members"."jersey_number" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "squads_entry_unique" ON "squads" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "scoreboard_highlights_active_idx" ON "scoreboard_highlights" USING btree ("edition_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "brackets_stage_unique" ON "brackets" USING btree ("stage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "groups_stage_code_unique" ON "groups" USING btree ("stage_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "rounds_stage_order_unique" ON "rounds" USING btree ("stage_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "stages_edition_order_unique" ON "stages" USING btree ("edition_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "persons_full_name_idx" ON "persons" USING btree ("first_name","last_name","birth_date");--> statement-breakpoint
CREATE UNIQUE INDEX "team_memberships_unique_active" ON "team_memberships" USING btree ("team_id","person_id") WHERE "team_memberships"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "teams_slug_unique" ON "teams" USING btree ("slug");