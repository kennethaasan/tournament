import { apiClient, unwrapResponse } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/openapi";

type FetchRosterOptions = {
  signal?: AbortSignal;
  slug?: string;
};

export type TeamRoster = components["schemas"]["TeamRoster"];
export type TeamMember = components["schemas"]["TeamMember"];
export type Squad = components["schemas"]["Squad"];
export type SquadMember = components["schemas"]["SquadMember"];
export type TeamSummary = components["schemas"]["TeamSummary"];
export type Team = components["schemas"]["Team"];

export type EntryWithSquad = {
  entry: components["schemas"]["Entry"];
  squad: Squad;
};

export const teamRosterQueryKey = (teamId: string) =>
  ["team", teamId, "roster"] as const;

export const teamListQueryKey = () => ["teams"] as const;

export type CreateTeamInput = {
  name: string;
  slug?: string | null;
  editionId?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const { data, error, response } = await apiClient.POST("/api/teams", {
    body: {
      name: input.name,
      slug: input.slug,
      edition_id: input.editionId,
      contact_email: input.contactEmail,
      contact_phone: input.contactPhone,
    },
    credentials: "include",
  });

  return unwrapResponse({ data, error, response });
}

export async function fetchTeams(
  options: FetchRosterOptions = {},
): Promise<TeamSummary[]> {
  const { data, error, response } = await apiClient.GET("/api/teams", {
    params: {
      query: {
        slug: options.slug,
      },
    },
    signal: options.signal,
    credentials: "include",
  });

  const payload = unwrapResponse({ data, error, response });

  return payload.teams ?? [];
}

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

export async function updateTeam(
  teamId: string,
  payload: components["schemas"]["UpdateTeamRequest"],
): Promise<Team> {
  const { data, error, response } = await apiClient.PATCH(
    "/api/teams/{team_id}",
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

export async function updateTeamMember(
  teamId: string,
  membershipId: string,
  payload: components["schemas"]["UpdateTeamMemberRequest"],
): Promise<TeamMember> {
  const { data, error, response } = await apiClient.PATCH(
    "/api/teams/{team_id}/members/{membership_id}",
    {
      params: {
        path: {
          team_id: teamId,
          membership_id: membershipId,
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

export async function removeTeamMember(
  teamId: string,
  membershipId: string,
): Promise<void> {
  const { error, response } = await apiClient.DELETE(
    "/api/teams/{team_id}/members/{membership_id}",
    {
      params: {
        path: {
          team_id: teamId,
          membership_id: membershipId,
        },
      },
      credentials: "include",
    },
  );

  if (error) {
    unwrapResponse({ data: undefined, error, response });
  }
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

  const result = unwrapResponse({
    data,
    error,
    response,
  });

  // The server already creates the squad and returns it
  return {
    entry: result.entry,
    squad: result.squad,
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
