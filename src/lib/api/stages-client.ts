import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/openapi";

type FetchStagesOptions = {
  signal?: AbortSignal;
};

export type Stage = components["schemas"]["Stage"];

export const editionStagesQueryKey = (editionId: string) =>
  ["edition", editionId, "stages"] as const;

export async function fetchEditionStages(
  editionId: string,
  options: FetchStagesOptions = {},
): Promise<Stage[]> {
  const { data, error, response } = await apiClient.GET(
    "/api/editions/{edition_id}/stages",
    {
      params: {
        path: {
          edition_id: editionId,
        },
      },
      signal: options.signal,
      credentials: "include",
    },
  );

  const payload = unwrapResponse({
    data,
    error,
    response,
  });

  return payload.stages ?? [];
}
