import { useQuery } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { EntryReview } from "@/lib/api/entries-client";
import type { components } from "@/lib/api/generated/openapi";
import { MatchEditorCard } from "../match-editor-card";
import type { Match } from "../results-types";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
}));

const baseMatch: Match = {
  id: "match-1",
  edition_id: "edition-1",
  stage_id: null,
  group_id: null,
  group_code: null,
  code: null,
  status: "scheduled",
  kickoff_at: new Date().toISOString(),
  venue_id: null,
  venue_name: null,
  home_entry_id: "entry-1",
  home_entry_name: "Home",
  away_entry_id: "entry-2",
  away_entry_name: "Away",
  home_score: { regulation: 0 },
  away_score: { regulation: 0 },
  events: [],
};

const entries: EntryReview[] = [
  {
    entry: {
      id: "entry-1",
      team_id: "team-1",
      edition_id: "edition-1",
      status: "approved",
    },
    team: { id: "team-1", name: "Team A", slug: "team-a" },
  },
  {
    entry: {
      id: "entry-2",
      team_id: "team-2",
      edition_id: "edition-1",
      status: "approved",
    },
    team: { id: "team-2", name: "Team B", slug: "team-b" },
  },
];

const emptyRoster = { members: [] };
const emptySquad = { id: "squad-1" };

describe("MatchEditorCard event sync", () => {
  let matchDetailData: Match | null;
  let rosterData: { members: components["schemas"]["TeamMember"][] };
  let squadMembersData: components["schemas"]["SquadMember"][];
  const createQueryResult = (data: unknown) =>
    ({ data, isLoading: false }) as ReturnType<typeof useQuery>;

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    matchDetailData = null;
    rosterData = emptyRoster;
    squadMembersData = [];

    vi.mocked(useQuery).mockImplementation((options) => {
      const queryKey = options.queryKey as string[];
      if (queryKey[0] === "match") {
        return createQueryResult(matchDetailData);
      }
      if (queryKey[0] === "team") {
        return createQueryResult(rosterData);
      }
      if (queryKey[0] === "entry") {
        return createQueryResult(emptySquad);
      }
      if (queryKey[0] === "squad") {
        return createQueryResult(squadMembersData);
      }
      return createQueryResult(null);
    });
  });

  test("refreshes event rows when match detail updates", async () => {
    matchDetailData = {
      ...baseMatch,
      events: [
        {
          id: "event-1",
          match_id: baseMatch.id,
          team_side: "home",
          event_type: "goal",
          minute: 5,
          stoppage_time: null,
          squad_member_id: null,
        },
      ],
    };

    const { rerender } = render(
      <MatchEditorCard
        match={baseMatch}
        entries={entries}
        entryMap={new Map(entries.map((entry) => [entry.entry.id, entry]))}
        venues={[]}
        isSaving={false}
        isDeleting={false}
        onSave={async () => true}
        onDelete={async () => true}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /^Slett$/i }).length,
      ).toBeGreaterThan(0);
    });
    const initialCount = screen.getAllByRole("button", {
      name: /^Slett$/i,
    }).length;

    matchDetailData = {
      ...baseMatch,
      events: [
        {
          id: "event-1",
          match_id: baseMatch.id,
          team_side: "home",
          event_type: "goal",
          minute: 5,
          stoppage_time: null,
          squad_member_id: null,
        },
        {
          id: "event-2",
          match_id: baseMatch.id,
          team_side: "away",
          event_type: "goal",
          minute: 12,
          stoppage_time: null,
          squad_member_id: null,
        },
      ],
    };

    rerender(
      <MatchEditorCard
        match={baseMatch}
        entries={entries}
        entryMap={new Map(entries.map((entry) => [entry.entry.id, entry]))}
        venues={[]}
        isSaving={false}
        isDeleting={false}
        onSave={async () => true}
        onDelete={async () => true}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Slett$/i })).toHaveLength(
        initialCount + 1,
      );
    });
  });

  test("does not override dirty events when match detail updates", async () => {
    matchDetailData = {
      ...baseMatch,
      events: [
        {
          id: "event-1",
          match_id: baseMatch.id,
          team_side: "home",
          event_type: "goal",
          minute: 5,
          stoppage_time: null,
          squad_member_id: null,
        },
      ],
    };

    const { rerender } = render(
      <MatchEditorCard
        match={baseMatch}
        entries={entries}
        entryMap={new Map(entries.map((entry) => [entry.entry.id, entry]))}
        venues={[]}
        isSaving={false}
        isDeleting={false}
        onSave={async () => true}
        onDelete={async () => true}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /^Slett$/i }).length,
      ).toBeGreaterThan(0);
    });
    const initialCount = screen.getAllByRole("button", {
      name: /^Slett$/i,
    }).length;

    const addEventButtons = screen.getAllByRole("button", {
      name: /Annen hendelse/i,
    });
    const addEventButton = addEventButtons[0];
    if (!addEventButton) {
      throw new Error("Expected add event button to be available");
    }
    fireEvent.click(addEventButton);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Slett$/i })).toHaveLength(
        initialCount + 1,
      );
    });

    matchDetailData = {
      ...baseMatch,
      events: [],
    };

    rerender(
      <MatchEditorCard
        match={baseMatch}
        entries={entries}
        entryMap={new Map(entries.map((entry) => [entry.entry.id, entry]))}
        venues={[]}
        isSaving={false}
        isDeleting={false}
        onSave={async () => true}
        onDelete={async () => true}
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Slett$/i })).toHaveLength(
        initialCount + 1,
      );
    });
  });

  test("saves events when saving a match with dirty events", async () => {
    matchDetailData = { ...baseMatch, events: [] };
    rosterData = {
      members: [
        {
          membership_id: "member-1",
          person: {
            id: "person-1",
            full_name: "Player One",
          },
          role: "player",
          status: "active",
          jersey_number: 9,
        },
      ],
    };
    squadMembersData = [
      {
        id: "squad-member-1",
        squad_id: "squad-1",
        membership_id: "member-1",
        person_id: "person-1",
      },
    ];

    const onSave = vi.fn(
      async (_payload: components["schemas"]["UpdateMatchRequest"]) => true,
    );

    render(
      <MatchEditorCard
        match={baseMatch}
        entries={entries}
        entryMap={new Map(entries.map((entry) => [entry.entry.id, entry]))}
        venues={[]}
        isSaving={false}
        isDeleting={false}
        onSave={
          onSave as unknown as (
            payload: components["schemas"]["UpdateMatchRequest"],
          ) => Promise<boolean>
        }
        onDelete={async () => true}
      />,
    );

    const addEventButtons = screen.getAllByRole("button", {
      name: /Annen hendelse/i,
    });
    const addEventButton = addEventButtons[0];
    if (!addEventButton) {
      throw new Error("Expected add event button to be available");
    }
    fireEvent.click(addEventButton);

    const playerOption = await screen.findByRole("option", {
      name: /Velg spiller/i,
    });
    const playerSelect = playerOption.closest("select");
    if (!(playerSelect instanceof HTMLSelectElement)) {
      throw new Error("Expected player select to be available");
    }
    fireEvent.change(playerSelect, { target: { value: "member-1" } });

    fireEvent.click(screen.getByRole("button", { name: /Lagre kamp/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });

    const payload = onSave.mock.calls[0]?.[0] as
      | components["schemas"]["UpdateMatchRequest"]
      | undefined;
    expect(payload?.events).toHaveLength(1);
    expect(payload?.events?.[0]?.squad_member_id).toBe("squad-member-1");
  });
});
