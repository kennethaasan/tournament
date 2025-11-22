import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/openapi";

type FetchRosterOptions = {
  signal?: AbortSignal;
};

export type TeamRoster = components["schemas"]["TeamRoster"];
export type TeamMember = components["schemas"]["TeamMember"];
export type Squad = components["schemas"]["Squad"];
export type SquadMember = components["schemas"]["SquadMember"];

export type EntryWithSquad = {
  entry: components["schemas"]["Entry"];
  squad: Squad;
};

export const teamRosterQueryKey = (teamId: string) =>
  ["team", teamId, "roster"] as const;

export async function fetchTeamRoster(
  teamId: string,
  options: FetchRosterOptions = {},
): Promise<TeamRoster> {
  const { data, error, response } = await apiClient.GET(
    "/api/teams/{team_id}",
    {
      params: {
        path: {
          team_id: teamId,
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

export async function addTeamMember(
  teamId: string,
  payload: components["schemas"]["AddTeamMemberRequest"],
): Promise<TeamMember> {
  const { data, error, response } = await apiClient.POST(
    "/api/teams/{team_id}/members",
    {
      params: {
        path: {
          team_id: teamId,
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

export async function registerTeamEntry(
  teamId: string,
  payload: components["schemas"]["RegisterEntryRequest"],
): Promise<EntryWithSquad> {
  const { data, error, response } = await apiClient.POST(
    "/api/teams/{team_id}/entries",
    {
      params: {
        path: {
          team_id: teamId,
        },
      },
      body: payload,
      credentials: "include",
    },
  );

  const entry = unwrapResponse({
    data,
    error,
    response,
  });

  const squad = await ensureSquad(entry.id);

  return {
    entry,
    squad,
  };
}

export async function updateSquadLock(
  entryId: string,
  lock: boolean,
): Promise<Squad> {
  const { data, error, response } = await apiClient.PUT(
    "/api/entries/{entry_id}/squads",
    {
      params: {
        path: {
          entry_id: entryId,
        },
      },
      body: {
        lock,
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

export async function addSquadMember(
  squadId: string,
  payload: components["schemas"]["AddSquadMemberRequest"],
): Promise<SquadMember> {
  const { data, error, response } = await apiClient.POST(
    "/api/squads/{squad_id}/members",
    {
      params: {
        path: {
          squad_id: squadId,
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

async function ensureSquad(entryId: string): Promise<Squad> {
  const { data, error, response } = await apiClient.PUT(
    "/api/entries/{entry_id}/squads",
    {
      params: {
        path: {
          entry_id: entryId,
        },
      },
      body: {},
      credentials: "include",
    },
  );

  return unwrapResponse({
    data,
    error,
    response,
  });
}
