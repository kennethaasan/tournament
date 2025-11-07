import { describe, expectTypeOf, it } from "vitest";
import type { components, paths } from "@/lib/api/generated/openapi";

type RegisterEntryPost = NonNullable<
  paths["/api/teams/{team_id}/entries"]["post"]
>;
type RegisterEntryRequest = NonNullable<
  RegisterEntryPost["requestBody"]
>["content"]["application/json"];
type RegisterEntryResponse =
  RegisterEntryPost["responses"]["201"]["content"]["application/json"];
type RegisterEntryProblem =
  RegisterEntryPost["responses"]["400"]["content"]["application/problem+json"];

describe("OpenAPI contract › POST /api/teams/{team_id}/entries", () => {
  it("requires the team_id path parameter", () => {
    expectTypeOf<RegisterEntryPost["parameters"]["path"]>().toEqualTypeOf<{
      team_id: components["parameters"]["TeamId"];
    }>();
  });

  it("relies on the RegisterEntryRequest schema", () => {
    expectTypeOf<RegisterEntryRequest>().toEqualTypeOf<
      components["schemas"]["RegisterEntryRequest"]
    >();
  });

  it("enforces edition_id and optional notes typing", () => {
    expectTypeOf<RegisterEntryRequest>()
      .toHaveProperty("edition_id")
      .toMatchTypeOf<string>();

    expectTypeOf<RegisterEntryRequest>()
      .toHaveProperty("notes")
      .toEqualTypeOf<string | null | undefined>();
  });

  it("returns the Entry payload when creation succeeds", () => {
    expectTypeOf<RegisterEntryResponse>().toEqualTypeOf<
      components["schemas"]["Entry"]
    >();
  });

  it("wraps validation errors in ProblemDetails", () => {
    expectTypeOf<RegisterEntryProblem>().toEqualTypeOf<
      components["schemas"]["ProblemDetails"]
    >();
  });
});
