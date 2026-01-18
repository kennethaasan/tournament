import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/openapi";

type RequestOptions = {
  signal?: AbortSignal;
};

export type Squad = components["schemas"]["Squad"];
export type SquadMember = components["schemas"]["SquadMember"];

export const entrySquadQueryKey = (entryId: string) =>
  ["entry", entryId, "squad"] as const;

export const squadMembersQueryKey = (squadId: string) =>
  ["squad", squadId, "members"] as const;

export async function ensureEntrySquad(
  entryId: string,
  options: RequestOptions = {},
): Promise<Squad> {
  const { data, error, response } = await apiClient.PUT(
    "/api/entries/{entry_id}/squads",
    {
      params: {
        path: {
          entry_id: entryId,
        },
      },
      body: {},
      signal: options.signal,
      credentials: "include",
    },
  );

  return unwrapResponse({ data, error, response });
}

export async function fetchSquadMembers(
  squadId: string,
  options: RequestOptions = {},
): Promise<SquadMember[]> {
  const { data, error, response } = await apiClient.GET(
    "/api/squads/{squad_id}/members",
    {
      params: {
        path: {
          squad_id: squadId,
        },
      },
      signal: options.signal,
      credentials: "include",
    },
  );

  const payload = unwrapResponse({ data, error, response });
  return payload.members ?? [];
}

export async function addSquadMember(
  squadId: string,
  payload: {
    membership_id: string;
    jersey_number?: number | null;
    position?: string | null;
  },
): Promise<SquadMember> {
  const { data, error, response } = await apiClient.POST(
    "/api/squads/{squad_id}/members",
    {
      params: { path: { squad_id: squadId } },
      body: payload,
      credentials: "include",
    },
  );

  return unwrapResponse({ data, error, response });
}

export async function updateSquadMember(
  squadId: string,
  memberId: string,
  payload: { jersey_number?: number | null; position?: string | null },
): Promise<SquadMember> {
  const { data, error, response } =
    await /* biome-ignore lint/suspicious/noExplicitAny: typed routes are too strict for dynamic paths */
    (apiClient as any).PATCH("/api/squads/{squad_id}/members/{member_id}", {
      params: { path: { squad_id: squadId, member_id: memberId } },
      body: payload,
      credentials: "include",
    });

  return unwrapResponse({ data, error, response });
}

export async function removeSquadMember(
  squadId: string,
  memberId: string,
): Promise<void> {
  const { error, response } =
    await /* biome-ignore lint/suspicious/noExplicitAny: typed routes are too strict for dynamic paths */
    (apiClient as any).DELETE("/api/squads/{squad_id}/members/{member_id}", {
      params: { path: { squad_id: squadId, member_id: memberId } },
      credentials: "include",
    });

  if (error) {
    unwrapResponse({
      /* biome-ignore lint/suspicious/noExplicitAny: response has no body */
      data: undefined as any,
      error,
      response,
    });
  }
}
