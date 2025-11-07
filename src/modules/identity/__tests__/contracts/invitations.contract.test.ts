import { describe, expectTypeOf, it } from "vitest";
import type { components, paths } from "@/lib/api/generated/openapi";

type InvitationPost = NonNullable<paths["/api/auth/invitations"]["post"]>;
type InvitationRequest = NonNullable<
  InvitationPost["requestBody"]
>["content"]["application/json"];
type InvitationResponse201 =
  InvitationPost["responses"]["201"]["content"]["application/json"];
type InvitationProblem =
  InvitationPost["responses"]["400"]["content"]["application/problem+json"];
type CompetitionPost = NonNullable<paths["/api/competitions"]["post"]>;
type CompetitionRequest = NonNullable<
  CompetitionPost["requestBody"]
>["content"]["application/json"];
type CompetitionResponse201 =
  CompetitionPost["responses"]["201"]["content"]["application/json"];
type CompetitionProblem422 =
  CompetitionPost["responses"]["422"]["content"]["application/problem+json"];

describe("OpenAPI contract › POST /api/auth/invitations", () => {
  it("requires the CreateInvitationRequest payload", () => {
    expectTypeOf<InvitationRequest>().toEqualTypeOf<
      components["schemas"]["CreateInvitationRequest"]
    >();
  });

  it("enforces invitation role and scope enumerations", () => {
    expectTypeOf<InvitationRequest>()
      .toHaveProperty("role")
      .toMatchTypeOf<"global_admin" | "competition_admin" | "team_manager">();
    expectTypeOf<InvitationRequest>()
      .toHaveProperty("scope")
      .toMatchTypeOf<components["schemas"]["InvitationScope"]>();
    expectTypeOf<components["schemas"]["InvitationScope"]>()
      .toHaveProperty("type")
      .toMatchTypeOf<"global" | "competition" | "edition" | "team">();
  });

  it("exposes optional invitation message and scope id", () => {
    expectTypeOf<InvitationRequest>()
      .toHaveProperty("message")
      .toEqualTypeOf<string | undefined>();
    expectTypeOf<components["schemas"]["InvitationScope"]>()
      .toHaveProperty("id")
      .toEqualTypeOf<string | null | undefined>();
  });

  it("returns the Invitation payload on success", () => {
    expectTypeOf<InvitationResponse201>().toEqualTypeOf<
      components["schemas"]["Invitation"]
    >();
  });

  it("surfaced errors via ProblemDetails payload", () => {
    expectTypeOf<InvitationProblem>().toEqualTypeOf<
      components["schemas"]["ProblemDetails"]
    >();
  });
});

describe("OpenAPI contract › POST /api/competitions", () => {
  it("requires the CreateCompetitionRequest payload", () => {
    expectTypeOf<CompetitionRequest>().toEqualTypeOf<
      components["schemas"]["CreateCompetitionRequest"]
    >();
  });

  it("enforces nested edition requirements", () => {
    expectTypeOf<CompetitionRequest>()
      .toHaveProperty("default_edition")
      .toMatchTypeOf<components["schemas"]["CreateEditionRequest"]>();
    expectTypeOf<components["schemas"]["CreateEditionRequest"]>()
      .toHaveProperty("registration_window")
      .toMatchTypeOf<components["schemas"]["RegistrationWindow"]>();
  });

  it("returns the combined competition and draft edition payload", () => {
    expectTypeOf<CompetitionResponse201>().toEqualTypeOf<
      components["schemas"]["CompetitionWithEdition"]
    >();
  });

  it("uses ProblemDetails for validation failures", () => {
    expectTypeOf<CompetitionProblem422>().toEqualTypeOf<
      components["schemas"]["ProblemDetails"]
    >();
  });
});
