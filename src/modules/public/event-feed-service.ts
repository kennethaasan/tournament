import { and, asc, eq, gt, or } from "drizzle-orm";
import type { components } from "@/lib/api/generated/openapi";
import { createProblem } from "@/lib/errors/problem";
import { db } from "@/server/db/client";
import { eventFeed } from "@/server/db/schema";

type Cursor = {
  id: string;
  createdAt: Date;
};

type EventFeedRow = {
  id: string;
  createdAt: Date;
  editionId: string | null;
  entityType: string;
  action: string;
  snapshot: Record<string, unknown>;
};

export type EventFeedRowInput = EventFeedRow;

export type EventFeedType =
  | "match_updated"
  | "match_finalized"
  | "schedule_changed"
  | "entry_status_changed"
  | "notification";

export type EventEnvelope = {
  id: string;
  type: EventFeedType;
  occurredAt: Date;
  payload: Record<string, unknown>;
};

export type EventFeedResult = {
  items: EventEnvelope[];
  nextCursor: string | null;
};

type EventFeedDependencies = {
  pageSize: number;
  listEvents: (options: {
    cursor?: Cursor;
    limit: number;
  }) => Promise<EventFeedRow[]>;
};

const DEFAULT_PAGE_SIZE = 50;

const eventFeedDependencies: EventFeedDependencies = {
  pageSize: DEFAULT_PAGE_SIZE,
  listEvents: (options) => listEventsFromDatabase(options),
};

export async function getEventFeed(
  options: { cursor?: string } = {},
  overrides: Partial<EventFeedDependencies> = {},
): Promise<EventFeedResult> {
  const deps = { ...eventFeedDependencies, ...overrides };
  const cursor = options.cursor ? decodeCursor(options.cursor) : null;

  const limit = deps.pageSize + 1;
  const rows = await deps.listEvents({ cursor: cursor ?? undefined, limit });

  const hasMore = rows.length > deps.pageSize;
  const slice = hasMore ? rows.slice(0, deps.pageSize) : rows;
  const lastRow = slice[slice.length - 1];

  return {
    items: slice.map(mapRowToEnvelope),
    nextCursor: hasMore && lastRow ? encodeCursor(lastRow) : null,
  };
}

export function toApiEventFeed(
  result: EventFeedResult,
): components["schemas"]["EventFeed"] {
  return {
    items: result.items.map((item) => ({
      id: item.id,
      type: item.type,
      occurred_at: item.occurredAt.toISOString(),
      payload: item.payload,
    })),
    next_cursor: result.nextCursor,
  };
}

async function listEventsFromDatabase({
  cursor,
  limit,
}: {
  cursor?: Cursor;
  limit: number;
}): Promise<EventFeedRow[]> {
  let query = db
    .select({
      id: eventFeed.id,
      createdAt: eventFeed.createdAt,
      editionId: eventFeed.editionId,
      entityType: eventFeed.entityType,
      action: eventFeed.action,
      snapshot: eventFeed.snapshot,
    })
    .from(eventFeed)
    .orderBy(asc(eventFeed.createdAt), asc(eventFeed.id))
    .limit(limit);

  if (cursor) {
    const condition = or(
      gt(eventFeed.createdAt, cursor.createdAt),
      and(
        eq(eventFeed.createdAt, cursor.createdAt),
        gt(eventFeed.id, cursor.id),
      ),
    );

    query = query.where(condition);
  }

  return query;
}

function mapRowToEnvelope(row: EventFeedRow): EventEnvelope {
  const payload = {
    edition_id: row.editionId,
    entity_type: row.entityType,
    action: row.action,
    ...sanitizeSnapshot(row.snapshot),
  } satisfies Record<string, unknown>;

  return {
    id: row.id,
    type: mapEventType(row),
    occurredAt: row.createdAt,
    payload,
  };
}

function mapEventType(row: EventFeedRow): EventFeedType {
  if (row.entityType === "entry") {
    return "entry_status_changed";
  }

  if (row.entityType === "notification") {
    return "notification";
  }

  if (row.entityType === "match") {
    const snapshot = row.snapshot ?? {};
    const status =
      typeof snapshot.status === "string"
        ? (snapshot.status as string)
        : undefined;

    if (status === "finalized" || status === "disputed") {
      return "match_finalized";
    }

    if (snapshot.schedule_change === true) {
      return "schedule_changed";
    }

    return "match_updated";
  }

  return "schedule_changed";
}

function sanitizeSnapshot(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") {
    return {};
  }

  return input as Record<string, unknown>;
}

function encodeCursor(row: EventFeedRow): string {
  const payload = JSON.stringify({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
  });

  return Buffer.from(payload).toString("base64url");
}

function decodeCursor(token: string): Cursor {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as {
      id?: unknown;
      createdAt?: unknown;
    };

    if (typeof parsed.id !== "string") {
      throw new Error("invalid id");
    }

    if (typeof parsed.createdAt !== "string") {
      throw new Error("invalid timestamp");
    }

    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("invalid date");
    }

    return { id: parsed.id, createdAt };
  } catch {
    throw createProblem({
      type: "https://tournament.app/problems/event-feed/invalid-cursor",
      title: "Invalid event cursor",
      status: 400,
      detail: "Remove the cursor parameter and try again.",
    });
  }
}
