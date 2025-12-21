import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/openapi";

export type CreateInvitationPayload =
  components["schemas"]["CreateInvitationRequest"];
export type InvitationResponse = components["schemas"]["Invitation"];
export type AcceptInvitationResponse =
  components["schemas"]["AcceptInvitationResponse"];

export async function createInvitation(
  payload: CreateInvitationPayload,
): Promise<InvitationResponse> {
  const { data, error, response } = await apiClient.POST(
    "/api/auth/invitations",
    {
      body: payload,
      credentials: "include",
    },
  );

  return unwrapResponse({ data, error, response });
}

export async function acceptInvitation(
  token: string,
): Promise<AcceptInvitationResponse> {
  const { data, error, response } = await apiClient.POST(
    "/api/auth/invitations/accept",
    {
      body: { token },
      credentials: "include",
    },
  );

  return unwrapResponse({ data, error, response });
}
