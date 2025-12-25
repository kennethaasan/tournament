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
