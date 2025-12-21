"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  fetchPublicScoreboard,
  publicScoreboardQueryKey,
} from "@/lib/api/scoreboard-client";
import {
  fromApiScoreboardPayload,
  type ScoreboardData,
} from "@/modules/public/scoreboard-types";

const DEFAULT_MAX_POLLING_AGE_MS = 1000 * 60 * 60 * 18;

type UseScoreboardPollOptions = {
  competitionSlug: string;
  editionSlug: string;
  initialData: ScoreboardData;
  maxPollingAgeMs?: number;
};

export function useScoreboardPoll(options: UseScoreboardPollOptions) {
  const { competitionSlug, editionSlug, initialData, maxPollingAgeMs } =
    options;
  const entryDirectory = useRef(
    new Map(initialData.entries.map((entry) => [entry.id, entry.name])),
  );
  const openedAt = useRef(Date.now());
  const [isWindowVisible, setIsWindowVisible] = useState(true);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const updateVisibility = () => {
      setIsWindowVisible(document.visibilityState === "visible");
    };

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    window.addEventListener("pagehide", updateVisibility);
    window.addEventListener("pageshow", updateVisibility);

    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("pagehide", updateVisibility);
      window.removeEventListener("pageshow", updateVisibility);
    };
  }, []);

  const query = useQuery({
    queryKey: publicScoreboardQueryKey(competitionSlug, editionSlug),
    queryFn: async ({ signal }) => {
      const payload = await fetchPublicScoreboard(
        competitionSlug,
        editionSlug,
        { signal },
      );
      const parsed = fromApiScoreboardPayload(payload);
      mergeEntryDirectory(entryDirectory.current, parsed);
      return {
        ...parsed,
        entries: Array.from(entryDirectory.current, ([id, name]) => ({
          id,
          name,
        })),
      };
    },
    initialData,
    refetchInterval: (query) => {
      const maxAge =
        maxPollingAgeMs === undefined
          ? DEFAULT_MAX_POLLING_AGE_MS
          : maxPollingAgeMs;
      const hasExceededMaxAge = Date.now() - openedAt.current >= maxAge;
      if (!isWindowVisible || hasExceededMaxAge) {
        return false;
      }

      const rotation =
        query.state.data?.edition.scoreboardRotationSeconds ??
        initialData.edition.scoreboardRotationSeconds;
      return Math.max(rotation * 1000, 2000);
    },
    refetchOnMount: "always",
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  return query;
}

function mergeEntryDirectory(
  directory: Map<string, string>,
  data: ScoreboardData,
) {
  for (const entry of data.entries) {
    directory.set(entry.id, entry.name);
  }

  for (const match of data.matches) {
    directory.set(match.home.entryId, match.home.name);
    directory.set(match.away.entryId, match.away.name);
  }
}
