import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScoreboardData } from "@/modules/public/scoreboard-types";
import { useScoreboardPoll } from "@/ui/hooks/useScoreboardPoll";

type QueryOptions = {
  queryKey: unknown;
  queryFn: (context: { signal: AbortSignal }) => Promise<ScoreboardData>;
  initialData: ScoreboardData;
  refetchInterval: (query: {
    state: { data?: ScoreboardData };
  }) => number | false;
};

let lastQueryOptions: QueryOptions | null = null;
let parsedPayload: ScoreboardData;

const { fetchPublicScoreboard, publicScoreboardQueryKey } = vi.hoisted(() => ({
  fetchPublicScoreboard: vi.fn(
    async (..._args: unknown[]) => ({}) as ScoreboardData,
  ),
  publicScoreboardQueryKey: vi.fn(
    (competitionSlug: string, editionSlug: string) => [
      "scoreboard",
      competitionSlug,
      editionSlug,
    ],
  ),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: QueryOptions) => {
    lastQueryOptions = options;
    return {
      data: options.initialData,
      dataUpdatedAt: 0,
      state: { data: options.initialData },
    };
  },
}));

vi.mock("@/lib/api/scoreboard-client", () => ({
  fetchPublicScoreboard,
  publicScoreboardQueryKey,
}));

vi.mock("@/modules/public/scoreboard-types", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/public/scoreboard-types")
  >("@/modules/public/scoreboard-types");
  return {
    ...actual,
    fromApiScoreboardPayload: vi.fn(() => parsedPayload),
  };
});

beforeEach(() => {
  lastQueryOptions = null;
  fetchPublicScoreboard.mockClear();
  publicScoreboardQueryKey.mockClear();
});

describe("useScoreboardPoll", () => {
  it("stops polling when window is not visible", () => {
    const initialData = buildScoreboardData({ scoreboardRotationSeconds: 10 });

    // Simulate hidden visibility
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
      configurable: true,
    });

    renderHook(() =>
      useScoreboardPoll({
        competitionSlug: "trondheim-cup",
        editionSlug: "2025",
        initialData,
      }),
    );

    // Trigger visibility change event
    document.dispatchEvent(new Event("visibilitychange"));

    if (!lastQueryOptions) {
      throw new Error("Expected query options to be captured.");
    }

    const interval = lastQueryOptions.refetchInterval({
      state: { data: initialData },
    });
    // Polling should stop when not visible
    expect(interval).toBe(false);

    // Reset visibility state
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
      configurable: true,
    });
  });

  it("uses fallback rotation from initialData when query data is undefined", () => {
    const initialData = buildScoreboardData({ scoreboardRotationSeconds: 5 });

    renderHook(() =>
      useScoreboardPoll({
        competitionSlug: "trondheim-cup",
        editionSlug: "2025",
        initialData,
      }),
    );

    if (!lastQueryOptions) {
      throw new Error("Expected query options to be captured.");
    }

    // Pass undefined data to test fallback
    const interval = lastQueryOptions.refetchInterval({
      state: { data: undefined },
    });
    // Should use initialData's rotation seconds as fallback
    expect(interval).toBe(5000);
  });

  it("enforces minimum 2000ms polling interval", () => {
    const initialData = buildScoreboardData({ scoreboardRotationSeconds: 1 });

    renderHook(() =>
      useScoreboardPoll({
        competitionSlug: "trondheim-cup",
        editionSlug: "2025",
        initialData,
      }),
    );

    if (!lastQueryOptions) {
      throw new Error("Expected query options to be captured.");
    }

    const interval = lastQueryOptions.refetchInterval({
      state: { data: initialData },
    });
    // Min interval is 2000ms even if rotation is 1 second
    expect(interval).toBe(2000);
  });

  it("uses default max polling age when not provided", () => {
    const initialData = buildScoreboardData({ scoreboardRotationSeconds: 10 });

    renderHook(() =>
      useScoreboardPoll({
        competitionSlug: "trondheim-cup",
        editionSlug: "2025",
        initialData,
        // No maxPollingAgeMs - should use default
      }),
    );

    if (!lastQueryOptions) {
      throw new Error("Expected query options to be captured.");
    }

    // With default max age (18 hours), should still poll
    const interval = lastQueryOptions.refetchInterval({
      state: { data: initialData },
    });
    expect(interval).toBe(10000);
  });

  it("configures polling based on rotation seconds", () => {
    const initialData = buildScoreboardData({ scoreboardRotationSeconds: 3 });

    renderHook(() =>
      useScoreboardPoll({
        competitionSlug: "trondheim-cup",
        editionSlug: "2025",
        initialData,
      }),
    );

    expect(publicScoreboardQueryKey).toHaveBeenCalledWith(
      "trondheim-cup",
      "2025",
    );
    if (!lastQueryOptions) {
      throw new Error("Expected query options to be captured.");
    }

    const interval = lastQueryOptions.refetchInterval({
      state: { data: initialData },
    });
    expect(interval).toBe(3000);
  });

  it("stops polling once the max age is exceeded", () => {
    const initialData = buildScoreboardData({ scoreboardRotationSeconds: 10 });

    renderHook(() =>
      useScoreboardPoll({
        competitionSlug: "trondheim-cup",
        editionSlug: "2025",
        initialData,
        maxPollingAgeMs: 0,
      }),
    );

    if (!lastQueryOptions) {
      throw new Error("Expected query options to be captured.");
    }

    const interval = lastQueryOptions.refetchInterval({
      state: { data: initialData },
    });
    expect(interval).toBe(false);
  });

  it("merges entry names from fetched payloads", async () => {
    const initialData = buildScoreboardData({ scoreboardRotationSeconds: 5 });

    parsedPayload = {
      ...initialData,
      entries: [{ id: "entry-2", name: "Lag B" }],
      matches: [
        {
          id: "match-1",
          status: "scheduled",
          kickoffAt: new Date("2025-01-01T12:00:00Z"),
          home: { entryId: "entry-1", name: "Lag A+", score: 0 },
          away: { entryId: "entry-2", name: "Lag B", score: 0 },
        },
      ],
    };

    renderHook(() =>
      useScoreboardPoll({
        competitionSlug: "trondheim-cup",
        editionSlug: "2025",
        initialData,
      }),
    );

    if (!lastQueryOptions) {
      throw new Error("Expected query options to be captured.");
    }

    const result = await lastQueryOptions.queryFn({
      signal: new AbortController().signal,
    });

    expect(fetchPublicScoreboard).toHaveBeenCalled();
    expect(result.entries).toEqual(
      expect.arrayContaining([
        { id: "entry-1", name: "Lag A+" },
        { id: "entry-2", name: "Lag B" },
      ]),
    );
  });
});

function buildScoreboardData(options: {
  scoreboardRotationSeconds: number;
}): ScoreboardData {
  const kickoff = new Date("2025-01-01T12:00:00Z");

  return {
    edition: {
      id: "edition-1",
      competitionId: "competition-1",
      competitionSlug: "trondheim-cup",
      label: "Trondheim Cup 2025",
      slug: "2025",
      status: "published",
      format: "round_robin",
      timezone: "Europe/Oslo",
      publishedAt: kickoff,
      registrationWindow: {
        opensAt: kickoff,
        closesAt: kickoff,
      },
      scoreboardRotationSeconds: options.scoreboardRotationSeconds,
      scoreboardTheme: {
        primaryColor: "#0B1F3A",
        secondaryColor: "#FFFFFF",
        backgroundImageUrl: null,
      },
    },
    matches: [],
    standings: [],
    tables: [],
    topScorers: [],
    rotation: [],
    overlayMessage: null,
    entries: [{ id: "entry-1", name: "Lag A" }],
  };
}
