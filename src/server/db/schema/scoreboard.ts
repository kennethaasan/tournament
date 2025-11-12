import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { editions } from "./competitions";
import { createdAtColumn, timestampTz, uuidPrimaryKey } from "./shared";

export const scoreboardHighlights = pgTable(
  "scoreboard_highlights",
  {
    id: uuidPrimaryKey(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    expiresAt: timestampTz("expires_at").notNull(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAtColumn(),
  },
  (table) => ({
    activeHighlightIdx: index("scoreboard_highlights_active_idx").on(
      table.editionId,
      table.expiresAt,
    ),
  }),
);

export type ScoreboardHighlight = typeof scoreboardHighlights.$inferSelect;
