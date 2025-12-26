import { describe, expect, it } from "vitest";
import { ProblemError } from "@/lib/errors/problem";
import { getPublicScoreboard } from "@/modules/public/scoreboard-service";
import {
  DEFAULT_ROTATION,
  type ScoreboardSection,
} from "@/modules/public/scoreboard-types";

type ScoreboardDependencies = Required<
  NonNullable<Parameters<typeof getPublicScoreboard>[1]>
>;
type EditionRow = NonNullable<
  Awaited<ReturnType<ScoreboardDependencies["findEdition"]>>
>;

const baseEdition: EditionRow = {
  id: "edition-1",
  label: "Elite Cup",
  slug: "elite-cup",
  status: "published",
  format: "round_robin",
  timezone: "UTC",
  competitionId: "comp-1",
  competitionSlug: "elite",
  registrationOpensAt: null,
  registrationClosesAt: null,
  rotationSeconds: 5,
  scoreboardModules: ["live_matches", "upcoming", "standings", "top_scorers"],
  scoreboardTheme: {
    primary_color: "#0B1F3A",
    secondary_color: "#FFFFFF",
    background_image_url: null,
  },
  publishedAt: new Date("2024-06-01T00:00:00Z"),
};

describe("getPublicScoreboard", () => {
  it("builds scoreboard data and rotation from provided dependencies", async () => {
    const entries = [
      { id: "entry-1", name: "Nordic FC" },
      { id: "entry-2", name: "Harbor United" },
      { id: "entry-3", name: "Capital City" },
    ];

    const matches = [
      {
        id: "match-1",
        status: "scheduled",
        kickoffAt: new Date("2024-06-02T12:00:00Z"),
        createdAt: new Date("2024-05-31T12:00:00Z"),
        homeEntryId: "entry-1",
        awayEntryId: "entry-2",
        homeScore: 0,
        awayScore: 0,
        venueName: "Main Arena",
        code: "A1",
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
      {
        id: "match-2",
        status: "in_progress",
        kickoffAt: new Date("2024-06-01T10:00:00Z"),
        createdAt: new Date("2024-05-30T11:00:00Z"),
        homeEntryId: "entry-2",
        awayEntryId: "entry-3",
        homeScore: 2,
        awayScore: 1,
        venueName: "Training Ground",
        code: "B2",
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
      {
        id: "match-3",
        status: "finalized",
        kickoffAt: new Date("2024-05-29T16:00:00Z"),
        createdAt: new Date("2024-05-28T16:00:00Z"),
        homeEntryId: "entry-1",
        awayEntryId: "entry-3",
        homeScore: 1,
        awayScore: 0,
        venueName: "Main Arena",
        code: "C3",
        groupId: "group-a",
        groupCode: "A",
        groupName: "Group A",
        bracketId: null,
        metadata: {},
      },
    ];

    const scorerEvents = [
      {
        eventType: "goal",
        personId: "person-1",
        entryId: "entry-2",
        firstName: "Ida",
        lastName: "Strand",
      },
      {
        eventType: "assist",
        personId: "person-1",
        entryId: "entry-2",
        firstName: "Ida",
        lastName: "Strand",
      },
      {
        eventType: "yellow_card",
        personId: "person-1",
        entryId: "entry-2",
        firstName: "Ida",
        lastName: "Strand",
      },
    ];

    const result = await getPublicScoreboard(
      { compositeSlug: "elite/elite-cup" },
      {
        findEdition: async () => ({ ...baseEdition }),
        listEntries: async () => entries,
        listMatches: async () => matches,
        listScorerEvents: async () => scorerEvents,
        findActiveHighlight: async () => "Final whistle in 5 minutes",
        now: () => new Date("2024-06-01T11:00:00Z"),
      },
    );

    expect(result.edition.slug).toBe("elite-cup");
    expect(result.rotation).toEqual<ScoreboardSection[]>([
      "live_matches",
      "upcoming",
      "standings",
      "top_scorers",
    ]);

    expect(result.matches[0]).toMatchObject({
      id: "match-2",
      status: "in_progress",
      highlight: "Final whistle in 5 minutes",
    });

    expect(result.standings[0]).toMatchObject({
      entryId: "entry-1",
      points: 3,
      position: 1,
    });
    expect(result.standings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entryId: "entry-2", points: 0 }),
        expect.objectContaining({ entryId: "entry-3", points: 0 }),
      ]),
    );

    expect(result.tables).toEqual([
      expect.objectContaining({
        groupCode: "A",
        standings: expect.arrayContaining([
          expect.objectContaining({ entryId: "entry-1" }),
        ]),
      }),
    ]);

    expect(result.topScorers).toEqual([
      {
        assists: 1,
        entryId: "entry-2",
        goals: 1,
        name: "Ida Strand",
        personId: "person-1",
        redCards: 0,
        yellowCards: 1,
      },
    ]);
  });

  it("falls back to default rotation when no sections apply", async () => {
    const result = await getPublicScoreboard(
      { editionSlug: "empty-edition", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          id: "edition-empty",
          slug: "empty-edition",
          scoreboardModules: [],
        }),
        listEntries: async () => [],
        listMatches: async () => [],
        listScorerEvents: async () => [],
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-01T11:00:00Z"),
      },
    );

    expect(result.rotation).toEqual(DEFAULT_ROTATION);
    expect(result.matches).toEqual([]);
    expect(result.topScorers).toEqual([]);
  });

  it("rejects requests without an edition slug", async () => {
    await expect(
      getPublicScoreboard(
        { compositeSlug: "" },
        {
          findEdition: async () => ({ ...baseEdition, slug: "" }),
          listEntries: async () => [],
          listMatches: async () => [],
          listScorerEvents: async () => [],
          findActiveHighlight: async () => null,
          now: () => new Date("2024-06-01T11:00:00Z"),
        },
      ),
    ).rejects.toBeInstanceOf(ProblemError);
  });

  it("orders tied standings deterministically and enriches scorer names", async () => {
    const entries = [
      { id: "entry-a", name: "Alpha FC" },
      { id: "entry-b", name: "Bravo FC" },
      { id: "entry-c", name: "Charlie FC" },
    ];

    const matches = [
      {
        id: "match-a",
        status: "finalized",
        kickoffAt: new Date("2024-06-03T12:00:00Z"),
        createdAt: new Date("2024-06-03T11:00:00Z"),
        homeEntryId: "entry-a",
        awayEntryId: "entry-b",
        homeScore: 0,
        awayScore: 0,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
      {
        id: "match-b",
        status: "scheduled",
        kickoffAt: new Date("2024-06-04T12:00:00Z"),
        createdAt: new Date("2024-06-03T10:00:00Z"),
        homeEntryId: "missing-entry",
        awayEntryId: "entry-c",
        homeScore: 0,
        awayScore: 0,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
    ];

    const scorerEvents = [
      {
        eventType: "goal",
        personId: "person-1",
        entryId: "entry-a",
        firstName: null,
        lastName: null,
      },
      {
        eventType: "red_card",
        personId: "person-1",
        entryId: "entry-a",
        firstName: null,
        lastName: null,
      },
      {
        eventType: "assist",
        personId: "person-2",
        entryId: "entry-b",
        firstName: "Bea",
        lastName: "Strand",
      },
      {
        eventType: "substitution",
        personId: "person-3",
        entryId: "entry-b",
        firstName: "Ignore",
        lastName: "Me",
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "tied-edition", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "tied-edition",
          scoreboardModules: ["standings", "top_scorers"],
        }),
        listEntries: async () => entries,
        listMatches: async () => matches,
        listScorerEvents: async () => scorerEvents,
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-03T12:30:00Z"),
      },
    );

    expect(result.standings.map((row) => row.entryId).slice(0, 2)).toEqual([
      "entry-a",
      "entry-b",
    ]);
    expect(result.topScorers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entryId: "entry-a", name: "Alpha FC" }),
        expect.objectContaining({ entryId: "entry-b", name: "Bea Strand" }),
      ]),
    );
    expect(result.rotation).toEqual(["standings", "top_scorers"]);
  });

  it("throws when the edition cannot be found", async () => {
    await expect(
      getPublicScoreboard(
        { editionSlug: "missing", competitionSlug: null },
        {
          findEdition: async () => null,
          listEntries: async () => [],
          listMatches: async () => [],
          listScorerEvents: async () => [],
          findActiveHighlight: async () => null,
          now: () => new Date("2024-06-01T11:00:00Z"),
        },
      ),
    ).rejects.toBeInstanceOf(ProblemError);
  });
});
