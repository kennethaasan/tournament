import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getEventFeed,
  toApiEventFeed,
} from "@/modules/public/event-feed-service";
import { createApiHandler } from "@/server/api/handler";

export const GET = createApiHandler(
  async ({ request }) => {
    const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
    const feed = await getEventFeed({ cursor });
    const payload = toApiEventFeed(feed);
    const etag = hashPayload(payload);

    if (request.headers.get("if-none-match") === etag) {
      const response = new NextResponse(null, { status: 304 });
      response.headers.set("ETag", etag);
      return response;
    }

    const response = NextResponse.json(payload, { status: 200 });
    response.headers.set("Cache-Control", "public, max-age=3");
    response.headers.set("ETag", etag);
    return response;
  },
  {
    requireAuth: false,
  },
);

function hashPayload(input: unknown): string {
  return createHash("sha1").update(JSON.stringify(input)).digest("base64url");
}
