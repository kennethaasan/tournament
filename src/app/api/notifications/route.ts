import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createApiHandler } from "@/server/api/handler";
import { db } from "@/server/db/client";
import { notifications } from "@/server/db/schema";

export const GET = createApiHandler(
  async ({ auth }) => {
    if (!auth) {
      return NextResponse.json(
        {
          type: "https://httpstatuses.com/401",
          title: "Autentisering kreves",
          status: 401,
        },
        { status: 401 },
      );
    }

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, auth.user.id))
      .orderBy(notifications.createdAt);

    return NextResponse.json(
      {
        items: rows.map((row) => ({
          id: row.id,
          type: row.type,
          payload: row.payload,
          read_at: row.readAt?.toISOString() ?? null,
          created_at: row.createdAt?.toISOString() ?? null,
        })),
        next_cursor: null,
      },
      { status: 200 },
    );
  },
  {
    requireAuth: true,
  },
);
