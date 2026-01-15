import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/openapi";

type RequestOptions = {
  signal?: AbortSignal;
};

export type EntryReview = components["schemas"]["EntryReview"];

export const editionEntriesQueryKey = (editionId: string) =>
  ["edition", editionId, "entries"] as const;

export async function fetchEditionEntries(
  editionId: string,
  options: RequestOptions = {},
): Promise<EntryReview[]> {
  const { data, error, response } = await apiClient.GET(
    "/api/editions/{edition_id}/entries",
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

  const payload = unwrapResponse({ data, error, response });
  return payload.entries ?? [];
}

export async function updateEntryStatus(
  entryId: string,
  payload: components["schemas"]["UpdateEntryStatusRequest"],
): Promise<components["schemas"]["Entry"]> {
  const { data, error, response } = await apiClient.PATCH(
    "/api/entries/{entry_id}",
    {
      params: {
        path: {
          entry_id: entryId,
        },
      },
      body: payload,
      credentials: "include",
    },
  );

  return unwrapResponse({ data, error, response });
}

export async function deleteEntry(entryId: string): Promise<void> {
  const { error, response } = await apiClient.DELETE(
    "/api/entries/{entry_id}",
    {
      params: {
        path: {
          entry_id: entryId,
        },
      },
      credentials: "include",
    },
  );

  if (error) {
    unwrapResponse({ data: undefined, error, response });
  }
}
