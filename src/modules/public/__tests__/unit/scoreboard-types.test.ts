import { describe, expect, it } from "vitest";
import {
  DEFAULT_ROTATION,
  buildEditionSlug,
  encodeEditionSlugParam,
  parseCompositeEditionSlug,
  toApiScoreboardPayload,
} from "@/modules/public/scoreboard-types";

describe("scoreboard types helpers", () => {
  it("builds and encodes edition slugs", () => {
    expect(buildEditionSlug("elite", "cup-2025")).toBe("elite/cup-2025");
    expect(buildEditionSlug(null, "solo")).toBe("solo");
    expect(encodeEditionSlugParam("elite", "cup 2025")).toBe("elite%2Fcup%202025");
  });

  it("parses composite slugs", () => {
    expect(parseCompositeEditionSlug("elite/cup-2025")).toEqual({
      competitionSlug: "elite",
      editionSlug: "cup-2025",
    });

    expect(parseCompositeEditionSlug("standalone")).toEqual({
      competitionSlug: null,
      editionSlug: "standalone",
    });
  });

  it("maps scoreboard data to API payloads", () => {
    const payload = toApiScoreboardPayload({
      edition: {
        id: "edition-1",
        competitionId: "comp-1",
        competitionSlug: "elite",
        label: "Elite Cup",
        slug: "elite-cup",
        status: "published",
        format: "round_robin",
        timezone: "UTC",
        publishedAt: new Date("2024-06-01T00:00:00Z"),
        registrationWindow: {
          opensAt: null,
          closesAt: null,
        },
        scoreboardRotationSeconds: 5,
        scoreboardModules: DEFAULT_ROTATION,
        scoreboardTheme: {
          primaryColor: "#0B1F3A",
          secondaryColor: "#FFFFFF",
          backgroundImageUrl: null,
        },
      },
      matches: [
        {
          id: "match-1",
          status: "scheduled",
          kickoffAt: new Date("2024-06-02T12:00:00Z"),
          home: { entryId: "entry-1", name: "Home", score: 1 },
          away: { entryId: "entry-2", name: "Away", score: 0 },
        },
      ],
      standings: [
        {
          entryId: "entry-1",
          position: 1,
          played: 1,
          won: 1,
          drawn: 0,
          lost: 0,
          goalsFor: 1,
          goalsAgainst: 0,
          goalDifference: 1,
          points: 3,
          fairPlayScore: null,
        },
      ],
      tables: [],
      topScorers: [],
      rotation: DEFAULT_ROTATION,
      overlayMessage: null,
      entries: [{ id: "entry-1", name: "Home" }],
    });

    expect(payload.matches[0]?.kickoff_at).toBe("2024-06-02T12:00:00.000Z");
    expect(payload.edition.scoreboard_modules).toEqual(DEFAULT_ROTATION);
    expect(payload.standings[0]?.points).toBe(3);
  });
});
