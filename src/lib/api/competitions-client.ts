import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/openapi";

type RequestOptions = {
  signal?: AbortSignal;
};

export type CompetitionSummary = components["schemas"]["CompetitionSummary"];

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
