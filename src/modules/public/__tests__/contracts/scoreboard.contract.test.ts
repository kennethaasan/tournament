import { describe, expectTypeOf, it } from "vitest";
import type { components, paths } from "@/lib/api/generated/openapi";

type ScoreboardGet = NonNullable<
  paths["/api/public/competitions/{competition_slug}/editions/{edition_slug}/scoreboard"]["get"]
>;
type ScoreboardResponse = NonNullable<
  ScoreboardGet["responses"][200]["content"]["application/json"]
>;

describe("OpenAPI contract › GET /api/public/competitions/{competition_slug}/editions/{edition_slug}/scoreboard", () => {
  it("requires the edition_slug path parameter", () => {
    expectTypeOf<ScoreboardGet["parameters"]["path"]>().toEqualTypeOf<{
      competition_slug: components["parameters"]["CompetitionSlug"];
      edition_slug: components["parameters"]["EditionSlug"];
    }>();
  });

  it("returns the ScoreboardPayload schema", () => {
    expectTypeOf<ScoreboardResponse>().toEqualTypeOf<
      components["schemas"]["ScoreboardPayload"]
    >();
  });

  it("exposes rotation sections with the documented enum", () => {
    expectTypeOf<ScoreboardResponse["rotation"]>().toEqualTypeOf<
      Array<"live_matches" | "upcoming" | "standings" | "top_scorers">
    >();
  });

  it("surfaces ProblemDetails payloads for error responses", () => {
    expectTypeOf<ScoreboardGet["responses"][404]["content"]>().toEqualTypeOf<{
      "application/problem+json": components["schemas"]["ProblemDetails"];
    }>();
  });
});
