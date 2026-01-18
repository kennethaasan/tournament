// @ts-nocheck

import { useMutation, useQuery } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { deleteMatch } from "@/lib/api/matches-client";
import { ResultsDashboard } from "../results-dashboard";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock("@/lib/api/matches-client", () => ({
  fetchEditionMatches: vi.fn(),
  deleteMatch: vi.fn(),
  editionMatchesQueryKey: vi.fn(() => ["matches"]),
  matchDetailQueryKey: vi.fn(() => ["match"]),
  updateMatch: vi.fn(),
  fetchMatch: vi.fn(),
}));

vi.mock("@/lib/api/entries-client", () => ({
  fetchEditionEntries: vi.fn(),
  editionEntriesQueryKey: vi.fn(() => ["entries"]),
}));

vi.mock("@/lib/api/venues-client", () => ({
  fetchEditionVenues: vi.fn(),
  editionVenuesQueryKey: vi.fn(() => ["venues"]),
}));

vi.mock("@/lib/api/teams-client", () => ({
  fetchTeamRoster: vi.fn(),
  teamRosterQueryKey: vi.fn(() => ["roster"]),
}));

vi.mock("@/lib/api/squads-client", () => ({
  ensureEntrySquad: vi.fn(),
  entrySquadQueryKey: vi.fn(() => ["squad"]),
  fetchSquadMembers: vi.fn(),
  squadMembersQueryKey: vi.fn(() => ["squad-members"]),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/editions/edition-1/results",
}));

const mockMatches = [
  {
    id: "match-1",
    status: "scheduled",
    home_entry_id: "entry-1",
    away_entry_id: "entry-2",
    home_entry_name: "Team A",
    away_entry_name: "Team B",
    home_score: { regulation: 0 },
    away_score: { regulation: 0 },
    kickoff_at: new Date().toISOString(),
  },
];

describe("ResultsDashboard Delete Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useQuery).mockImplementation((options) => {
      const queryKey = options.queryKey;
      if (queryKey[0] === "matches") {
        return { data: mockMatches, isLoading: false };
      }
      if (queryKey[0] === "entries") {
        return { data: [], isLoading: false };
      }
      if (queryKey[0] === "venues") {
        return { data: [], isLoading: false };
      }
      if (queryKey[0] === "roster") {
        return { data: { members: [] }, isLoading: false };
      }
      if (queryKey[0] === "squad-members") {
        return { data: [], isLoading: false };
      }
      return { data: null, isLoading: false };
    });

    vi.mocked(useMutation).mockImplementation((options) => {
      return {
        mutateAsync: async (variables) => {
          const result = await options.mutationFn(variables);
          if (options.onSuccess) {
            await options.onSuccess(result, variables);
          }
          return result;
        },
        isPending: false,
      };
    });
  });

  test("successfully deletes a match when confirmed", async () => {
    vi.mocked(deleteMatch).mockResolvedValue(undefined);

    render(<ResultsDashboard editionId="edition-1" />);

    // 1. Open the edit modal
    const editButton = screen.getByRole("button", { name: /Rediger/i });
    fireEvent.click(editButton);

    // 2. Click the delete button in the modal
    const deleteButton = screen.getByRole("button", { name: /Slett kamp/i });
    fireEvent.click(deleteButton);

    // 3. Confirm in the AlertDialog
    const confirmButton = screen.getByRole("button", { name: /^Slett kamp$/i });
    fireEvent.click(confirmButton);

    // 4. Verify API call
    await waitFor(() => {
      expect(deleteMatch).toHaveBeenCalledWith("match-1");
    });

    // 5. Verify success message and modal closure
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Kampen er slettet.");
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
