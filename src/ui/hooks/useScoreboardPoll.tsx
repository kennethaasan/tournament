"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import type { components } from "@/lib/api/generated/openapi";
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
    queryKey: ["scoreboard", editionPath],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/public/editions/${editionPath}/scoreboard`,
        {
          signal,
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        const detail = await safeRead(response);
        throw new Error(
          detail ||
            "Kunne ikke hente scoreboard-data. Prøv å laste siden på nytt.",
        );
      }

      const payload =
        (await response.json()) as components["schemas"]["ScoreboardPayload"];
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

async function safeRead(response: Response): Promise<string | null> {
  try {
    const body = await response.clone().json();
    if (body && typeof body === "object" && "detail" in body) {
      return (
        ((body as { detail?: unknown }).detail as string | undefined) ?? null
      );
    }
    return await response.text();
  } catch {
    return null;
  }
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
