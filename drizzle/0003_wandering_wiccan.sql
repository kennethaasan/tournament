ALTER TABLE "matches" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "status" SET DEFAULT 'scheduled'::text;--> statement-breakpoint
DROP TYPE "public"."match_status";--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'in_progress', 'finalized', 'disputed');--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "status" SET DEFAULT 'scheduled'::"public"."match_status";--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "status" SET DATA TYPE "public"."match_status" USING "status"::"public"."match_status";