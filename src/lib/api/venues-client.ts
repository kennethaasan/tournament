import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/openapi";

type RequestOptions = {
  signal?: AbortSignal;
};

export type Venue = components["schemas"]["Venue"];

export const competitionVenuesQueryKey = (competitionId: string) =>
  ["competition", competitionId, "venues"] as const;

export const editionVenuesQueryKey = (editionId: string) =>
  ["edition", editionId, "venues"] as const;

export async function fetchCompetitionVenues(
  competitionId: string,
  options: RequestOptions = {},
): Promise<Venue[]> {
  const { data, error, response } = await apiClient.GET(
    "/api/competitions/{competition_id}/venues",
    {
      params: {
        path: {
          competition_id: competitionId,
        },
      },
      signal: options.signal,
      credentials: "include",
    },
  );

  const payload = unwrapResponse({ data, error, response });
  return payload.venues ?? [];
}

export async function fetchEditionVenues(
  editionId: string,
  options: RequestOptions = {},
): Promise<Venue[]> {
  const { data, error, response } = await apiClient.GET(
    "/api/editions/{edition_id}/venues",
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
  return payload.venues ?? [];
}

export async function createVenue(
  competitionId: string,
  payload: components["schemas"]["CreateVenueRequest"],
): Promise<Venue> {
  const { data, error, response } = await apiClient.POST(
    "/api/competitions/{competition_id}/venues",
    {
      params: {
        path: {
          competition_id: competitionId,
        },
      },
      body: payload,
      credentials: "include",
    },
  );

  return unwrapResponse({ data, error, response });
}

export async function updateVenue(
  venueId: string,
  payload: components["schemas"]["UpdateVenueRequest"],
): Promise<Venue> {
  const { data, error, response } = await apiClient.PATCH(
    "/api/venues/{venue_id}",
    {
      params: {
        path: {
          venue_id: venueId,
        },
      },
      body: payload,
      credentials: "include",
    },
  );

  return unwrapResponse({ data, error, response });
}

export async function deleteVenue(venueId: string): Promise<void> {
  const { error, response } = await apiClient.DELETE("/api/venues/{venue_id}", {
    params: {
      path: {
        venue_id: venueId,
      },
    },
    credentials: "include",
  });

  unwrapResponse({ data: undefined, error, response });
}
