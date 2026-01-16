import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { ResultsDashboard } from "@/app/(dashboard)/dashboard/editions/[editionId]/results/results-dashboard";
import { ScheduleDashboard } from "@/app/(dashboard)/dashboard/editions/[editionId]/schedule/schedule-dashboard";
import { ScoreboardControl } from "@/app/(dashboard)/dashboard/editions/[editionId]/scoreboard/scoreboard-control";

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/editions/edition-1",
}));

describe("edition dashboards", () => {
  test("renders schedule dashboard shell", () => {
    render(<ScheduleDashboard editionId="edition-1" />);
    expect(
      screen.getByText("Planlegg stadier og kampoppsett"),
    ).toBeInTheDocument();
  });

  test("renders results dashboard shell", () => {
    render(<ResultsDashboard editionId="edition-1" />);
    expect(screen.getByText("Kampadministrasjon")).toBeInTheDocument();
  });

  test("renders scoreboard control shell", () => {
    render(<ScoreboardControl editionId="edition-1" />);
    expect(screen.getByText("Storskjerm")).toBeInTheDocument();
  });
});
