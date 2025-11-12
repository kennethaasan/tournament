import { describe, expectTypeOf, it } from "vitest";
import type { components, paths } from "@/lib/api/generated/openapi";

type CreateStagePost = NonNullable<
  paths["/api/editions/{edition_id}/stages"]["post"]
>;
type CreateStageRequest = NonNullable<
  CreateStagePost["requestBody"]
>["content"]["application/json"];
type CreateStageResponse201 =
  CreateStagePost["responses"]["201"]["content"]["application/json"];
type CreateStageProblem =
  CreateStagePost["responses"]["400"]["content"]["application/problem+json"];

describe("OpenAPI contract › POST /api/editions/{edition_id}/stages", () => {
  it("uses the CreateStageRequest payload shape", () => {
    expectTypeOf<CreateStageRequest>().toEqualTypeOf<
      components["schemas"]["CreateStageRequest"]
    >();
  });

  it("enforces stage type enum constraints", () => {
    expectTypeOf<CreateStageRequest>()
      .toHaveProperty("stage_type")
      .toMatchTypeOf<"group" | "bracket">();
  });

  it("requires group payload typing when provided", () => {
    expectTypeOf<CreateStageRequest>()
      .toHaveProperty("groups")
      .toMatchTypeOf<
        Array<components["schemas"]["CreateGroupRequest"]> | undefined
      >();
  });

  it("returns the Stage payload on success", () => {
    expectTypeOf<CreateStageResponse201>().toEqualTypeOf<
      components["schemas"]["Stage"]
    >();
  });

  it("wraps errors in ProblemDetails", () => {
    expectTypeOf<CreateStageProblem>().toEqualTypeOf<
      components["schemas"]["ProblemDetails"]
    >();
  });
});
