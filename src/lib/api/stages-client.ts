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

export async function deleteStage(
  editionId: string,
  stageId: string,
): Promise<void> {
  const { error, response } = await apiClient.DELETE(
    "/api/editions/{edition_id}/stages/{stage_id}",
    {
      params: {
        path: {
          edition_id: editionId,
          stage_id: stageId,
        },
      },
      credentials: "include",
    },
  );

  if (error) {
    unwrapResponse({ data: undefined, error, response });
  }
}

export async function reorderStages(
  editionId: string,
  stageIds: string[],
): Promise<Stage[]> {
  const { data, error, response } = await apiClient.PATCH(
    "/api/editions/{edition_id}/stages",
    {
      params: { path: { edition_id: editionId } },
      body: { stage_ids: stageIds },
      credentials: "include",
    },
  );

  const payload = unwrapResponse({ data, error, response });
  return payload.stages ?? [];
}
