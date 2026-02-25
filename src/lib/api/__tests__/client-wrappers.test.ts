import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  competitionListQueryKey,
  fetchCompetitions,
  setCompetitionArchivedState,
  softDeleteCompetition,
} from "@/lib/api/competitions-client";
import {
  deleteEntry,
  editionEntriesQueryKey,
  fetchEditionEntries,
  updateEntryStatus,
} from "@/lib/api/entries-client";
import {
  acceptInvitation,
  createInvitation,
} from "@/lib/api/invitations-client";
import {
  editionMatchesQueryKey,
  fetchEditionMatches,
  fetchMatch,
  matchDetailQueryKey,
  updateMatch,
} from "@/lib/api/matches-client";
import {
  fetchNotifications,
  notificationsQueryKey,
} from "@/lib/api/notifications-client";
import {
  clearScoreboardHighlight,
  editionScoreboardQueryKey,
  fetchEditionScoreboard,
  fetchPublicScoreboard,
  publicScoreboardQueryKey,
  triggerScoreboardHighlight,
  updateEditionScoreboard,
} from "@/lib/api/scoreboard-client";
import {
  ensureEntrySquad,
  entrySquadQueryKey,
  fetchSquadMembers,
  squadMembersQueryKey,
} from "@/lib/api/squads-client";
import {
  deleteStage,
  editionStagesQueryKey,
  fetchEditionStages,
} from "@/lib/api/stages-client";
import {
  addSquadMember,
  addTeamMember,
  fetchTeamRoster,
  fetchTeams,
  registerTeamEntry,
  teamListQueryKey,
  teamRosterQueryKey,
  updateSquadLock,
} from "@/lib/api/teams-client";
import {
  competitionVenuesQueryKey,
  createVenue,
  deleteVenue,
  editionVenuesQueryKey,
  fetchCompetitionVenues,
  fetchEditionVenues,
  updateVenue,
} from "@/lib/api/venues-client";

const apiMocks = vi.hoisted(() => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PUT: vi.fn(),
    PATCH: vi.fn(),
    DELETE: vi.fn(),
  },
  unwrapResponse: vi.fn(),
}));

vi.mock("@/lib/api/client", () => apiMocks);

const makeResponse = () => new Response(null, { status: 200 });
const makeResult = (data: unknown) => ({
  data,
  error: undefined,
  response: makeResponse(),
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("competitions client", () => {
  it("fetches competitions and uses query key", async () => {
    const competitions = [
      {
        id: "comp-1",
        name: "Oslo Cup",
        slug: "oslo-cup",
      },
    ];
    const signal = new AbortController().signal;

    apiMocks.apiClient.GET.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({ competitions });

    const result = await fetchCompetitions({ signal });

    expect(result).toEqual(competitions);
    expect(competitionListQueryKey()).toEqual(["competitions"]);
    expect(apiMocks.apiClient.GET).toHaveBeenCalledWith("/api/competitions", {
      signal,
      credentials: "include",
    });
  });

  it("archives and restores competitions", async () => {
    apiMocks.apiClient.DELETE.mockResolvedValueOnce(makeResult({}));
    apiMocks.apiClient.PATCH.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse
      .mockReturnValueOnce({
        id: "comp-1",
        archived_at: "2026-01-01T00:00:00Z",
      })
      .mockReturnValueOnce({ id: "comp-1", archived_at: null });

    const archived = await softDeleteCompetition("comp-1");
    const restored = await setCompetitionArchivedState("comp-1", false);

    expect(archived).toEqual({
      id: "comp-1",
      archived_at: "2026-01-01T00:00:00Z",
    });
    expect(restored).toEqual({ id: "comp-1", archived_at: null });
    expect(apiMocks.apiClient.DELETE).toHaveBeenCalledWith(
      "/api/competitions/{competition_id}",
      {
        params: {
          path: {
            competition_id: "comp-1",
          },
        },
        credentials: "include",
      },
    );
    expect(apiMocks.apiClient.PATCH).toHaveBeenCalledWith(
      "/api/competitions/{competition_id}",
      {
        params: {
          path: {
            competition_id: "comp-1",
          },
        },
        body: { archived: false },
        credentials: "include",
      },
    );
  });
});

describe("invitations client", () => {
  it("creates and accepts invitations", async () => {
    const createPayload = {
      email: "new-admin@example.com",
      role: "competition_admin",
      scope: {
        type: "competition",
        id: "comp-1",
      },
      message: "Welcome aboard!",
    } as const;

    apiMocks.apiClient.POST.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({ id: "inv-1" });

    const created = await createInvitation(createPayload);

    apiMocks.apiClient.POST.mockResolvedValueOnce(makeResult({}));
    const acceptedPayload = {
      invitation: {
        id: "inv-1",
      },
      role: {
        role: "team_manager",
        scope: {
          type: "team",
          id: "team-1",
        },
      },
    };
    apiMocks.unwrapResponse.mockReturnValueOnce(acceptedPayload);

    const accepted = await acceptInvitation("token-1");

    expect(created).toEqual({ id: "inv-1" });
    expect(accepted).toEqual(acceptedPayload);
    expect(apiMocks.apiClient.POST).toHaveBeenNthCalledWith(
      1,
      "/api/auth/invitations",
      {
        body: createPayload,
        credentials: "include",
      },
    );
    expect(apiMocks.apiClient.POST).toHaveBeenNthCalledWith(
      2,
      "/api/auth/invitations/accept",
      {
        body: { token: "token-1" },
        credentials: "include",
      },
    );
  });
});

describe("notifications client", () => {
  it("returns notifications with empty fallback", async () => {
    apiMocks.apiClient.GET.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({});

    const result = await fetchNotifications();

    expect(result).toEqual([]);
    expect(notificationsQueryKey()).toEqual(["notifications"]);
    expect(apiMocks.apiClient.GET).toHaveBeenCalledWith("/api/notifications", {
      signal: undefined,
      credentials: "include",
    });
  });
});

describe("entries client", () => {
  it("fetches edition entries with query key", async () => {
    const signal = new AbortController().signal;

    apiMocks.apiClient.GET.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({});

    const entries = await fetchEditionEntries("edition-1", { signal });

    expect(entries).toEqual([]);
    expect(editionEntriesQueryKey("edition-1")).toEqual([
      "edition",
      "edition-1",
      "entries",
    ]);
    expect(apiMocks.apiClient.GET).toHaveBeenCalledWith(
      "/api/editions/{edition_id}/entries",
      {
        params: {
          path: {
            edition_id: "edition-1",
          },
        },
        signal,
        credentials: "include",
      },
    );
  });

  it("updates entry status", async () => {
    const payload = {
      status: "approved",
      reason: "Looks good",
    } as const;

    apiMocks.apiClient.PATCH.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({ id: "entry-1" });

    const result = await updateEntryStatus("entry-1", payload);

    expect(result).toEqual({ id: "entry-1" });
    expect(apiMocks.apiClient.PATCH).toHaveBeenCalledWith(
      "/api/entries/{entry_id}",
      {
        params: {
          path: {
            entry_id: "entry-1",
          },
        },
        body: payload,
        credentials: "include",
      },
    );
  });

  it("deletes entries without a response body", async () => {
    const response = new Response(null, { status: 204 });
    apiMocks.apiClient.DELETE.mockResolvedValueOnce({
      error: undefined,
      response,
    });

    await deleteEntry("entry-1");

    expect(apiMocks.apiClient.DELETE).toHaveBeenCalledWith(
      "/api/entries/{entry_id}",
      {
        params: {
          path: {
            entry_id: "entry-1",
          },
        },
        credentials: "include",
      },
    );
    expect(apiMocks.unwrapResponse).not.toHaveBeenCalled();
  });
});

describe("matches client", () => {
  it("fetches edition matches with filters and query key", async () => {
    const signal = new AbortController().signal;

    apiMocks.apiClient.GET.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({ matches: [] });

    const matches = await fetchEditionMatches("edition-1", {
      stageId: "stage-1",
      status: "scheduled",
      signal,
    });

    expect(matches).toEqual([]);
    expect(
      editionMatchesQueryKey("edition-1", {
        stageId: "stage-1",
        status: "scheduled",
      }),
    ).toEqual(["edition", "edition-1", "matches", "stage-1", "scheduled"]);
    expect(apiMocks.apiClient.GET).toHaveBeenCalledWith(
      "/api/editions/{edition_id}/matches",
      {
        params: {
          path: {
            edition_id: "edition-1",
          },
          query: {
            stage_id: "stage-1",
            status: "scheduled",
          },
        },
        signal,
        credentials: "include",
      },
    );
  });

  it("fetches and updates matches", async () => {
    const signal = new AbortController().signal;

    apiMocks.apiClient.GET.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({ id: "match-1" });

    const match = await fetchMatch("match-1", { signal });

    apiMocks.apiClient.PATCH.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({ id: "match-1" });

    const updated = await updateMatch("match-1", {
      status: "finalized",
    });

    expect(match).toEqual({ id: "match-1" });
    expect(updated).toEqual({ id: "match-1" });
    expect(matchDetailQueryKey("match-1")).toEqual(["match", "match-1"]);
    expect(apiMocks.apiClient.GET).toHaveBeenCalledWith(
      "/api/matches/{match_id}",
      {
        params: {
          path: {
            match_id: "match-1",
          },
        },
        signal,
        credentials: "include",
      },
    );
    expect(apiMocks.apiClient.PATCH).toHaveBeenCalledWith(
      "/api/matches/{match_id}",
      {
        params: {
          path: {
            match_id: "match-1",
          },
        },
        body: { status: "finalized" },
        credentials: "include",
      },
    );
  });
});

describe("stages client", () => {
  it("fetches edition stages", async () => {
    const signal = new AbortController().signal;

    apiMocks.apiClient.GET.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({ stages: [] });

    const stages = await fetchEditionStages("edition-1", { signal });

    expect(stages).toEqual([]);
    expect(editionStagesQueryKey("edition-1")).toEqual([
      "edition",
      "edition-1",
      "stages",
    ]);
    expect(apiMocks.apiClient.GET).toHaveBeenCalledWith(
      "/api/editions/{edition_id}/stages",
      {
        params: {
          path: {
            edition_id: "edition-1",
          },
        },
        signal,
        credentials: "include",
      },
    );
  });

  it("deletes a stage without response payload", async () => {
    const response = new Response(null, { status: 204 });
    apiMocks.apiClient.DELETE.mockResolvedValueOnce({
      error: undefined,
      response,
    });

    await deleteStage("edition-1", "stage-1");

    expect(apiMocks.apiClient.DELETE).toHaveBeenCalledWith(
      "/api/editions/{edition_id}/stages/{stage_id}",
      {
        params: {
          path: {
            edition_id: "edition-1",
            stage_id: "stage-1",
          },
        },
        credentials: "include",
      },
    );
    expect(apiMocks.unwrapResponse).not.toHaveBeenCalled();
  });
});

describe("venues client", () => {
  it("fetches venues with query keys", async () => {
    const signal = new AbortController().signal;

    apiMocks.apiClient.GET.mockResolvedValueOnce(
      makeResult({}),
    ).mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({}).mockReturnValueOnce({});

    const competitionVenues = await fetchCompetitionVenues("comp-1", {
      signal,
    });
    const editionVenues = await fetchEditionVenues("edition-1", { signal });

    expect(competitionVenues).toEqual([]);
    expect(editionVenues).toEqual([]);
    expect(competitionVenuesQueryKey("comp-1")).toEqual([
      "competition",
      "comp-1",
      "venues",
    ]);
    expect(editionVenuesQueryKey("edition-1")).toEqual([
      "edition",
      "edition-1",
      "venues",
    ]);
    expect(apiMocks.apiClient.GET).toHaveBeenNthCalledWith(
      1,
      "/api/competitions/{competition_id}/venues",
      {
        params: {
          path: {
            competition_id: "comp-1",
          },
        },
        signal,
        credentials: "include",
      },
    );
    expect(apiMocks.apiClient.GET).toHaveBeenNthCalledWith(
      2,
      "/api/editions/{edition_id}/venues",
      {
        params: {
          path: {
            edition_id: "edition-1",
          },
        },
        signal,
        credentials: "include",
      },
    );
  });

  it("creates, updates, and deletes venues", async () => {
    const createPayload = {
      name: "Main Arena",
      slug: "main-arena",
    };

    apiMocks.apiClient.POST.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({ id: "venue-1" });

    const created = await createVenue("comp-1", createPayload);

    apiMocks.apiClient.PATCH.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({ id: "venue-1" });

    const updated = await updateVenue("venue-1", { name: "Arena Updated" });

    const deleteResponse = makeResponse();
    apiMocks.apiClient.DELETE.mockResolvedValueOnce({
      error: undefined,
      response: deleteResponse,
    });
    apiMocks.unwrapResponse.mockReturnValueOnce({});

    await deleteVenue("venue-1");

    expect(created).toEqual({ id: "venue-1" });
    expect(updated).toEqual({ id: "venue-1" });
    expect(apiMocks.apiClient.POST).toHaveBeenCalledWith(
      "/api/competitions/{competition_id}/venues",
      {
        params: {
          path: {
            competition_id: "comp-1",
          },
        },
        body: createPayload,
        credentials: "include",
      },
    );
    expect(apiMocks.apiClient.PATCH).toHaveBeenCalledWith(
      "/api/venues/{venue_id}",
      {
        params: {
          path: {
            venue_id: "venue-1",
          },
        },
        body: { name: "Arena Updated" },
        credentials: "include",
      },
    );
    expect(apiMocks.apiClient.DELETE).toHaveBeenCalledWith(
      "/api/venues/{venue_id}",
      {
        params: {
          path: {
            venue_id: "venue-1",
          },
        },
        credentials: "include",
      },
    );
    expect(apiMocks.unwrapResponse).toHaveBeenLastCalledWith({
      data: undefined,
      error: undefined,
      response: deleteResponse,
    });
  });
});

describe("squads client", () => {
  it("ensures squads and fetches members", async () => {
    const signal = new AbortController().signal;

    apiMocks.apiClient.PUT.mockResolvedValueOnce(makeResult({}));
    apiMocks.apiClient.GET.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse
      .mockReturnValueOnce({
        id: "squad-1",
        entry_id: "entry-1",
        locked_at: null,
      })
      .mockReturnValueOnce({
        members: [
          {
            id: "member-1",
            squad_id: "squad-1",
            person_id: "person-1",
          },
        ],
      });

    const squad = await ensureEntrySquad("entry-1", { signal });
    const members = await fetchSquadMembers("squad-1", { signal });

    expect(squad).toEqual({
      id: "squad-1",
      entry_id: "entry-1",
      locked_at: null,
    });
    expect(members).toEqual([
      {
        id: "member-1",
        squad_id: "squad-1",
        person_id: "person-1",
      },
    ]);
    expect(entrySquadQueryKey("entry-1")).toEqual([
      "entry",
      "entry-1",
      "squad",
    ]);
    expect(squadMembersQueryKey("squad-1")).toEqual([
      "squad",
      "squad-1",
      "members",
    ]);
    expect(apiMocks.apiClient.PUT).toHaveBeenCalledWith(
      "/api/entries/{entry_id}/squads",
      {
        params: {
          path: {
            entry_id: "entry-1",
          },
        },
        body: {},
        signal,
        credentials: "include",
      },
    );
    expect(apiMocks.apiClient.GET).toHaveBeenCalledWith(
      "/api/squads/{squad_id}/members",
      {
        params: {
          path: {
            squad_id: "squad-1",
          },
        },
        signal,
        credentials: "include",
      },
    );
  });
});

describe("teams client", () => {
  it("fetches teams and rosters", async () => {
    const signal = new AbortController().signal;

    apiMocks.apiClient.GET.mockResolvedValueOnce(
      makeResult({}),
    ).mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse
      .mockReturnValueOnce({
        teams: [
          {
            id: "team-1",
            name: "Tigers",
            slug: "tigers",
          },
        ],
      })
      .mockReturnValueOnce({
        team: {
          id: "team-1",
          name: "Tigers",
          slug: "tigers",
        },
        members: [],
      });

    const teams = await fetchTeams({ signal });
    const roster = await fetchTeamRoster("team-1", { signal });

    expect(teams).toEqual([
      {
        id: "team-1",
        name: "Tigers",
        slug: "tigers",
      },
    ]);
    expect(roster).toEqual({
      team: {
        id: "team-1",
        name: "Tigers",
        slug: "tigers",
      },
      members: [],
    });
    expect(teamListQueryKey()).toEqual(["teams"]);
    expect(teamRosterQueryKey("team-1")).toEqual(["team", "team-1", "roster"]);
    expect(apiMocks.apiClient.GET).toHaveBeenNthCalledWith(1, "/api/teams", {
      signal,
      credentials: "include",
    });
    expect(apiMocks.apiClient.GET).toHaveBeenNthCalledWith(
      2,
      "/api/teams/{team_id}",
      {
        params: {
          path: {
            team_id: "team-1",
          },
        },
        signal,
        credentials: "include",
      },
    );
  });

  it("adds team members and registers entries", async () => {
    const memberPayload = {
      first_name: "Ada",
      last_name: "Lovelace",
      role: "player",
    } as const;

    apiMocks.apiClient.POST.mockResolvedValueOnce(
      makeResult({}),
    ).mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse
      .mockReturnValueOnce({
        membership_id: "membership-1",
        person: {
          id: "person-1",
          full_name: "Ada Lovelace",
        },
        role: "player",
      })
      .mockReturnValueOnce({
        entry: {
          id: "entry-1",
          team_id: "team-1",
          edition_id: "edition-1",
          status: "pending",
        },
        squad: {
          id: "squad-1",
          entry_id: "entry-1",
          locked_at: null,
        },
      });

    const member = await addTeamMember("team-1", memberPayload);
    const registered = await registerTeamEntry("team-1", {
      edition_id: "edition-1",
    });

    expect(member).toEqual({
      membership_id: "membership-1",
      person: {
        id: "person-1",
        full_name: "Ada Lovelace",
      },
      role: "player",
    });
    expect(registered).toEqual({
      entry: {
        id: "entry-1",
        team_id: "team-1",
        edition_id: "edition-1",
        status: "pending",
      },
      squad: {
        id: "squad-1",
        entry_id: "entry-1",
        locked_at: null,
      },
    });
    expect(apiMocks.apiClient.POST).toHaveBeenNthCalledWith(
      1,
      "/api/teams/{team_id}/members",
      {
        params: {
          path: {
            team_id: "team-1",
          },
        },
        body: memberPayload,
        credentials: "include",
      },
    );
    expect(apiMocks.apiClient.POST).toHaveBeenNthCalledWith(
      2,
      "/api/teams/{team_id}/entries",
      {
        params: {
          path: {
            team_id: "team-1",
          },
        },
        body: { edition_id: "edition-1" },
        credentials: "include",
      },
    );
  });

  it("updates squads and adds squad members", async () => {
    const memberPayload = {
      membership_id: "membership-1",
      jersey_number: 9,
    };

    apiMocks.apiClient.PUT.mockResolvedValueOnce(makeResult({}));
    apiMocks.apiClient.POST.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse
      .mockReturnValueOnce({
        id: "squad-1",
        entry_id: "entry-1",
        locked_at: null,
      })
      .mockReturnValueOnce({
        id: "squad-member-1",
        squad_id: "squad-1",
        person_id: "person-1",
      });

    const squad = await updateSquadLock("entry-1", true);
    const member = await addSquadMember("squad-1", memberPayload);

    expect(squad).toEqual({
      id: "squad-1",
      entry_id: "entry-1",
      locked_at: null,
    });
    expect(member).toEqual({
      id: "squad-member-1",
      squad_id: "squad-1",
      person_id: "person-1",
    });
    expect(apiMocks.apiClient.PUT).toHaveBeenCalledWith(
      "/api/entries/{entry_id}/squads",
      {
        params: {
          path: {
            entry_id: "entry-1",
          },
        },
        body: {
          lock: true,
        },
        credentials: "include",
      },
    );
    expect(apiMocks.apiClient.POST).toHaveBeenCalledWith(
      "/api/squads/{squad_id}/members",
      {
        params: {
          path: {
            squad_id: "squad-1",
          },
        },
        body: memberPayload,
        credentials: "include",
      },
    );
  });
});

describe("scoreboard client", () => {
  it("fetches public scoreboard and uses query key", async () => {
    const signal = new AbortController().signal;

    apiMocks.apiClient.GET.mockResolvedValueOnce(makeResult({}));
    apiMocks.unwrapResponse.mockReturnValueOnce({ id: "scoreboard" });

    const result = await fetchPublicScoreboard("comp-1", "ed-1", { signal });

    expect(result).toEqual({ id: "scoreboard" });
    expect(publicScoreboardQueryKey("comp-1", "ed-1")).toEqual([
      "scoreboard",
      "comp-1",
      "ed-1",
    ]);
    expect(apiMocks.apiClient.GET).toHaveBeenCalledWith(
      "/api/public/competitions/{competition_slug}/editions/{edition_slug}/scoreboard",
      {
        params: {
          path: {
            competition_slug: "comp-1",
            edition_slug: "ed-1",
          },
        },
        signal,
      },
    );
  });

  it("updates and clears scoreboard highlights", async () => {
    const signal = new AbortController().signal;
    const scoreboardView = {
      edition: {
        id: "ed-1",
      },
      highlight: {
        message: "Goal!",
        expires_at: "2025-01-01T00:00:00Z",
        remaining_seconds: 30,
      },
    };

    apiMocks.apiClient.GET.mockResolvedValueOnce(makeResult({}));
    apiMocks.apiClient.PATCH.mockResolvedValueOnce(makeResult({}));
    apiMocks.apiClient.POST.mockResolvedValueOnce(makeResult({}));
    apiMocks.apiClient.DELETE.mockResolvedValueOnce({
      error: undefined,
      response: makeResponse(),
    });
    apiMocks.unwrapResponse
      .mockReturnValueOnce(scoreboardView)
      .mockReturnValueOnce(scoreboardView)
      .mockReturnValueOnce(scoreboardView)
      .mockReturnValueOnce(scoreboardView);

    const view = await fetchEditionScoreboard("ed-1", { signal });
    const updated = await updateEditionScoreboard("ed-1", {
      status: "published",
    });
    const highlighted = await triggerScoreboardHighlight("ed-1", {
      message: "Goal!",
      duration_seconds: 30,
    });
    const cleared = await clearScoreboardHighlight("ed-1");

    expect(view).toEqual(scoreboardView);
    expect(updated).toEqual(scoreboardView);
    expect(highlighted).toEqual(scoreboardView);
    expect(cleared).toEqual(scoreboardView);
    expect(editionScoreboardQueryKey("ed-1")).toEqual([
      "edition",
      "ed-1",
      "scoreboard",
    ]);
    expect(apiMocks.apiClient.GET).toHaveBeenCalledWith(
      "/api/editions/{edition_id}",
      {
        params: {
          path: {
            edition_id: "ed-1",
          },
        },
        signal,
        credentials: "include",
      },
    );
    expect(apiMocks.apiClient.PATCH).toHaveBeenCalledWith(
      "/api/editions/{edition_id}",
      {
        params: {
          path: {
            edition_id: "ed-1",
          },
        },
        body: { status: "published" },
        credentials: "include",
      },
    );
    expect(apiMocks.apiClient.POST).toHaveBeenCalledWith(
      "/api/editions/{edition_id}/scoreboard/highlights",
      {
        params: {
          path: {
            edition_id: "ed-1",
          },
        },
        body: {
          message: "Goal!",
          duration_seconds: 30,
        },
        credentials: "include",
      },
    );
    expect(apiMocks.apiClient.DELETE).toHaveBeenCalledWith(
      "/api/editions/{edition_id}/scoreboard/highlights",
      {
        params: {
          path: {
            edition_id: "ed-1",
          },
        },
        credentials: "include",
      },
    );
  });
});
