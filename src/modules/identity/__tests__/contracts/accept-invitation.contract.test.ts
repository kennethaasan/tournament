import { describe, expectTypeOf, it } from "vitest";
import type { components, paths } from "@/lib/api/generated/openapi";

type AcceptPost = NonNullable<paths["/api/auth/invitations/accept"]["post"]>;
type AcceptRequest = NonNullable<
  AcceptPost["requestBody"]
>["content"]["application/json"];
type AcceptResponse =
  AcceptPost["responses"]["200"]["content"]["application/json"];

describe("OpenAPI contract › POST /api/auth/invitations/accept", () => {
  it("requires token in the accept request", () => {
    expectTypeOf<AcceptRequest>().toEqualTypeOf<
      components["schemas"]["AcceptInvitationRequest"]
    >();
    expectTypeOf<AcceptRequest>()
      .toHaveProperty("token")
      .toEqualTypeOf<string>();
  });

  it("returns the invitation and role assignment payload", () => {
    expectTypeOf<AcceptResponse>().toEqualTypeOf<
      components["schemas"]["AcceptInvitationResponse"]
    >();
  });
});
