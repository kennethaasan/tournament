import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  type EventFeedRowInput,
  getEventFeed,
  toApiEventFeed,
} from "@/modules/public/event-feed-service";

vi.mock("@/server/db/client", () => ({
  db: {},
  sqlClient: {},
}));

describe("Public event feed service", () => {
  it("paginates results and encodes the next cursor", async () => {
    const rows = [
      createRow({
        id: "evt-1",
        createdAt: new Date("2025-05-17T10:00:00Z"),
        snapshot: { status: "scheduled" },
      }),
      createRow({
        id: "evt-2",
        createdAt: new Date("2025-05-17T10:05:00Z"),
        snapshot: { status: "finalized" },
      }),
      createRow({
        id: "evt-3",
        createdAt: new Date("2025-05-17T10:10:00Z"),
        entityType: "entry",
        snapshot: { status: "approved" },
      }),
    ];

    const result = await getEventFeed(
      {},
      {
        pageSize: 2,
        listEvents: async ({ limit }) => rows.slice(0, limit),
      },
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.type)).toEqual([
      "match_updated",
      "match_finalized",
    ]);
    expect(result.nextCursor).toBeTruthy();

    const apiPayload = toApiEventFeed(result);
    expect(apiPayload.items[0]?.occurred_at).toBe(
      rows[0]?.createdAt.toISOString(),
    );
  });

  it("respects cursor filtering", async () => {
    const seenCursors: Array<string | undefined> = [];
    const rows = [
      createRow({
        id: "evt-10",
        createdAt: new Date("2025-05-17T11:00:00Z"),
        entityType: "match",
      }),
      createRow({
        id: "evt-11",
        createdAt: new Date("2025-05-17T11:05:00Z"),
        entityType: "match",
      }),
    ];

    const stub = async ({
      cursor,
      limit,
    }: {
      cursor?: { id: string; createdAt: Date };
      limit: number;
    }): Promise<EventFeedRowInput[]> => {
      seenCursors.push(cursor ? cursor.id : undefined);
      if (!cursor) {
        return rows.slice(0, limit);
      }

      return rows
        .filter((row) => row.createdAt > cursor.createdAt)
        .slice(0, limit);
    };

    const firstPage = await getEventFeed(
      {},
      {
        pageSize: 1,
        listEvents: stub,
      },
    );

    expect(firstPage.items).toHaveLength(1);
    expect(seenCursors).toEqual([undefined]);
    expect(firstPage.nextCursor).toBeTruthy();

    const secondPage = await getEventFeed(
      { cursor: firstPage.nextCursor ?? undefined },
      {
        pageSize: 1,
        listEvents: stub,
      },
    );

    expect(secondPage.items).toHaveLength(1);
    expect(seenCursors[1]).toBe("evt-10");
  });
});

function createRow(overrides: Partial<EventFeedRowInput>): EventFeedRowInput {
  return {
    id: overrides.id ?? randomUUID(),
    createdAt: overrides.createdAt ?? new Date("2025-05-17T10:00:00Z"),
    editionId: overrides.editionId ?? "edition-123",
    entityType: overrides.entityType ?? "match",
    action: overrides.action ?? "updated",
    snapshot: overrides.snapshot ?? { status: "scheduled" },
  };
}
