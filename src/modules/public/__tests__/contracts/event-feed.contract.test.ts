import { describe, expectTypeOf, it } from "vitest";
import type { components, paths } from "@/lib/api/generated/openapi";

type EventFeedGet = NonNullable<paths["/api/public/events"]["get"]>;
type EventFeedResponse = NonNullable<
  EventFeedGet["responses"][200]["content"]["application/json"]
>;

describe("OpenAPI contract › GET /api/public/events", () => {
  it("accepts an optional cursor query parameter", () => {
    expectTypeOf<
      NonNullable<EventFeedGet["parameters"]["query"]>
    >().toEqualTypeOf<{
      cursor?: components["parameters"]["EventCursor"];
    }>();
  });

  it("returns the EventFeed schema", () => {
    expectTypeOf<EventFeedResponse>().toEqualTypeOf<
      components["schemas"]["EventFeed"]
    >();
  });

  it("describes the expected event envelope types", () => {
    expectTypeOf<
      components["schemas"]["EventEnvelope"]["type"]
    >().toEqualTypeOf<
      | "match_updated"
      | "match_finalized"
      | "schedule_changed"
      | "entry_status_changed"
      | "notification"
    >();
  });

  it("uses ProblemDetails for error responses", () => {
    expectTypeOf<EventFeedGet["responses"][400]["content"]>().toEqualTypeOf<{
      "application/problem+json": components["schemas"]["ProblemDetails"];
    }>();
  });
});
