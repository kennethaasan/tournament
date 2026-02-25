import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/openapi";

type RequestOptions = {
  signal?: AbortSignal;
};

export type CompetitionSummary = components["schemas"]["CompetitionSummary"];
export type CompetitionDetail = components["schemas"]["CompetitionDetail"];

export const competitionListQueryKey = () => ["competitions"] as const;

export async function fetchCompetitions(
  options: RequestOptions = {},
): Promise<CompetitionSummary[]> {
  const { data, error, response } = await apiClient.GET("/api/competitions", {
    signal: options.signal,
    credentials: "include",
  });

  const payload = unwrapResponse({ data, error, response });

  return payload.competitions ?? [];
}

export async function setCompetitionArchivedState(
  competitionId: string,
  archived: boolean,
): Promise<CompetitionDetail> {
  const { data, error, response } = await apiClient.PATCH(
    "/api/competitions/{competition_id}",
    {
      params: {
        path: {
          competition_id: competitionId,
        },
      },
      body: { archived },
      credentials: "include",
    },
  );

  return unwrapResponse({ data, error, response });
}

export async function softDeleteCompetition(
  competitionId: string,
): Promise<CompetitionDetail> {
  const { data, error, response } = await apiClient.DELETE(
    "/api/competitions/{competition_id}",
    {
      params: {
        path: {
          competition_id: competitionId,
        },
      },
      credentials: "include",
    },
  );

  return unwrapResponse({ data, error, response });
}
