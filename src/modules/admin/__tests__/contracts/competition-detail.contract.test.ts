import { describe, expectTypeOf, it } from "vitest";
import type { components, paths } from "@/lib/api/generated/openapi";

type CompetitionGet = NonNullable<
  paths["/api/competitions/{competition_id}"]["get"]
>;
type CompetitionPatch = NonNullable<
  paths["/api/competitions/{competition_id}"]["patch"]
>;
type CompetitionDelete = NonNullable<
  paths["/api/competitions/{competition_id}"]["delete"]
>;
type CompetitionDetail = components["schemas"]["CompetitionDetail"];

describe("OpenAPI contract › GET /api/competitions/{competition_id}", () => {
  it("requires the competition_id path parameter", () => {
    expectTypeOf<CompetitionGet["parameters"]["path"]>().toEqualTypeOf<{
      competition_id: components["parameters"]["CompetitionId"];
    }>();
  });

  it("returns competition detail payloads", () => {
    expectTypeOf<
      CompetitionGet["responses"]["200"]["content"]["application/json"]
    >().toEqualTypeOf<CompetitionDetail>();
  });

  it("declares a forbidden response when caller lacks admin scope", () => {
    expectTypeOf<CompetitionGet["responses"][403]>().toEqualTypeOf<
      components["responses"]["ProblemDetails"]
    >();
  });

  it("supports archive state updates with PATCH", () => {
    expectTypeOf<
      CompetitionPatch["requestBody"]["content"]["application/json"]
    >().toEqualTypeOf<{
      archived?: boolean;
    }>();

    expectTypeOf<
      CompetitionPatch["responses"]["200"]["content"]["application/json"]
    >().toEqualTypeOf<CompetitionDetail>();
  });

  it("supports soft delete with DELETE", () => {
    expectTypeOf<
      CompetitionDelete["responses"]["200"]["content"]["application/json"]
    >().toEqualTypeOf<CompetitionDetail>();
  });

  it("exposes edition and administrator summaries for dashboards", () => {
    expectTypeOf<CompetitionDetail>()
      .toHaveProperty("editions")
      .toMatchTypeOf<components["schemas"]["Edition"][] | undefined>();

    expectTypeOf<CompetitionDetail>()
      .toHaveProperty("administrators")
      .toMatchTypeOf<components["schemas"]["UserSummary"][] | undefined>();
  });
});
