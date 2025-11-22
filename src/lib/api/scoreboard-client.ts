import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/openapi";

type RequestOptions = {
  signal?: AbortSignal;
};

export type ScoreboardPayload = components["schemas"]["ScoreboardPayload"];
export type EditionScoreboardView =
  components["schemas"]["EditionScoreboardView"];

export const publicScoreboardQueryKey = (editionSlug: string) =>
  ["scoreboard", editionSlug] as const;

export const editionScoreboardQueryKey = (editionId: string) =>
  ["edition", editionId, "scoreboard"] as const;

export async function fetchPublicScoreboard(
  editionSlug: string,
  options: RequestOptions = {},
): Promise<ScoreboardPayload> {
  const { data, error, response } = await apiClient.GET(
    "/api/public/editions/{edition_slug}/scoreboard",
    {
      params: {
        path: {
          edition_slug: editionSlug,
        },
      },
      signal: options.signal,
    },
  );

  return unwrapResponse({
    data,
    error,
    response,
  });
}

export async function fetchEditionScoreboard(
  editionId: string,
  options: RequestOptions = {},
): Promise<EditionScoreboardView> {
  const { data, error, response } = await apiClient.GET(
    "/api/editions/{edition_id}",
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

  return unwrapResponse({
    data,
    error,
    response,
  });
}

export async function updateEditionScoreboard(
  editionId: string,
  body: components["schemas"]["UpdateEditionRequest"],
): Promise<EditionScoreboardView> {
  const { data, error, response } = await apiClient.PATCH(
    "/api/editions/{edition_id}",
    {
      params: {
        path: {
          edition_id: editionId,
        },
      },
      body,
      credentials: "include",
    },
  );

  return unwrapResponse({
    data,
    error,
    response,
  });
}

export async function triggerScoreboardHighlight(
  editionId: string,
  payload: components["schemas"]["TriggerScoreboardHighlightRequest"],
): Promise<EditionScoreboardView> {
  const { data, error, response } = await apiClient.POST(
    "/api/editions/{edition_id}/scoreboard/highlights",
    {
      params: {
        path: {
          edition_id: editionId,
        },
      },
      body: payload,
      credentials: "include",
    },
  );

  return unwrapResponse({
    data,
    error,
    response,
  });
}

export async function clearScoreboardHighlight(
  editionId: string,
): Promise<EditionScoreboardView> {
  const { data, error, response } = await apiClient.DELETE(
    "/api/editions/{edition_id}/scoreboard/highlights",
    {
      params: {
        path: {
          edition_id: editionId,
        },
      },
      credentials: "include",
    },
  );

  return unwrapResponse({
    data,
    error,
    response,
  });
}
