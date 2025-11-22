"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import {
  fetchPublicScoreboard,
  publicScoreboardQueryKey,
} from "@/lib/api/scoreboard-client";
import {
  buildEditionSlug,
  fromApiScoreboardPayload,
  type ScoreboardData,
} from "@/modules/public/scoreboard-types";

type UseScoreboardPollOptions = {
  competitionSlug: string;
  editionSlug: string;
  initialData: ScoreboardData;
};

export function useScoreboardPoll(options: UseScoreboardPollOptions) {
  const { competitionSlug, editionSlug, initialData } = options;
  const editionPath = buildEditionSlug(competitionSlug, editionSlug);
  const entryDirectory = useRef(
    new Map(initialData.entries.map((entry) => [entry.id, entry.name])),
  );

  return useQuery({
    queryKey: publicScoreboardQueryKey(editionPath),
    queryFn: async ({ signal }) => {
      const payload = await fetchPublicScoreboard(editionPath, { signal });
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
      const rotation =
        query.state.data?.edition.scoreboardRotationSeconds ??
        initialData.edition.scoreboardRotationSeconds;
      return Math.max(rotation * 1000, 2000);
    },
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: true,
  });
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
