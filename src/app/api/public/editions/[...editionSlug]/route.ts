import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getPublicScoreboard } from "@/modules/public/scoreboard-service";
import { toApiScoreboardPayload } from "@/modules/public/scoreboard-types";
import { createApiHandler } from "@/server/api/handler";

type RouteParams = {
  editionSlug: string | string[];
};

export const GET = createApiHandler<RouteParams>(
  async ({ params, request }) => {
    const slugs = Array.isArray(params.editionSlug)
      ? params.editionSlug
      : [params.editionSlug];

    if (slugs[slugs.length - 1] !== "scoreboard") {
      return NextResponse.json(
        { title: "Not found", status: 404, type: "about:blank" },
        { status: 404 },
      );
    }

    const editionSlug = slugs.slice(0, -1).join("/");

    const scoreboard = await getPublicScoreboard({
      compositeSlug: editionSlug,
    });

    const payload = toApiScoreboardPayload(scoreboard);
    const etag = hashPayload(payload);

    if (request.headers.get("if-none-match") === etag) {
      const response = new NextResponse(null, { status: 304 });
      response.headers.set("ETag", etag);
      return response;
    }

    const response = NextResponse.json(payload, { status: 200 });
    response.headers.set("Cache-Control", "public, max-age=5");
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
