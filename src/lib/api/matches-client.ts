import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/openapi";

type RequestOptions = {
  signal?: AbortSignal;
};

export type Match = components["schemas"]["Match"];

export const editionMatchesQueryKey = (
  editionId: string,
  filters?: { stageId?: string | null; status?: string | null },
) =>
  [
    "edition",
    editionId,
    "matches",
    filters?.stageId ?? "all",
    filters?.status ?? "all",
  ] as const;

export const matchDetailQueryKey = (matchId: string) =>
  ["match", matchId] as const;

export async function fetchEditionMatches(
  editionId: string,
  options: RequestOptions & { stageId?: string; status?: string } = {},
): Promise<Match[]> {
  const { data, error, response } = await apiClient.GET(
    "/api/editions/{edition_id}/matches",
    {
      params: {
        path: {
          edition_id: editionId,
        },
        query: {
          stage_id: options.stageId,
          status: options.status as components["schemas"]["MatchStatus"],
        },
      },
      signal: options.signal,
      credentials: "include",
    },
  );

  const payload = unwrapResponse({ data, error, response });
  return payload.matches ?? [];
}

export async function fetchMatch(
  matchId: string,
  options: RequestOptions = {},
): Promise<Match> {
  const { data, error, response } = await apiClient.GET(
    "/api/matches/{match_id}",
    {
      params: {
        path: {
          match_id: matchId,
        },
      },
      signal: options.signal,
      credentials: "include",
    },
  );

  return unwrapResponse({ data, error, response });
}

export async function updateMatch(
  matchId: string,
  payload: components["schemas"]["UpdateMatchRequest"],
): Promise<Match> {
  const { data, error, response } = await apiClient.PATCH(
    "/api/matches/{match_id}",
    {
      params: {
        path: {
          match_id: matchId,
        },
      },
      body: payload,
      credentials: "include",
    },
  );

  return unwrapResponse({ data, error, response });
}

export type CreateMatchInput = {
  stageId: string;
  kickoffAt: string;
  homeEntryId?: string | null;
  awayEntryId?: string | null;
  venueId?: string | null;
  groupId?: string | null;
  code?: string | null;
};

export async function createMatch(
  editionId: string,
  input: CreateMatchInput,
): Promise<Match> {
  const { data, error, response } = await apiClient.POST(
    "/api/editions/{edition_id}/matches",
    {
      params: {
        path: {
          edition_id: editionId,
        },
      },
      body: {
        stage_id: input.stageId,
        kickoff_at: input.kickoffAt,
        home_entry_id: input.homeEntryId,
        away_entry_id: input.awayEntryId,
        venue_id: input.venueId,
        group_id: input.groupId,
        code: input.code,
      },
      credentials: "include",
    },
  );

  return unwrapResponse({ data, error, response });
}
