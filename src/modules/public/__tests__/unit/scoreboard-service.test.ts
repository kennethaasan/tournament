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
  competitionName: "Elite Competition",
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
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
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
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
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
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
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
        jerseyNumber: null,
        membershipMeta: {},
      },
      {
        eventType: "assist",
        personId: "person-1",
        entryId: "entry-2",
        firstName: "Ida",
        lastName: "Strand",
        jerseyNumber: null,
        membershipMeta: {},
      },
      {
        eventType: "yellow_card",
        personId: "person-1",
        entryId: "entry-2",
        firstName: "Ida",
        lastName: "Strand",
        jerseyNumber: null,
        membershipMeta: {},
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
        jerseyNumber: null,
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
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
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
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
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
        jerseyNumber: null,
        membershipMeta: {},
      },
      {
        eventType: "red_card",
        personId: "person-1",
        entryId: "entry-a",
        firstName: null,
        lastName: null,
        jerseyNumber: null,
        membershipMeta: {},
      },
      {
        eventType: "assist",
        personId: "person-2",
        entryId: "entry-b",
        firstName: "Bea",
        lastName: "Strand",
        jerseyNumber: null,
        membershipMeta: {},
      },
      {
        eventType: "substitution",
        personId: "person-3",
        entryId: "entry-b",
        firstName: "Ignore",
        lastName: "Me",
        jerseyNumber: null,
        membershipMeta: {},
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

  it("supports placeholder participants for knockout matches", async () => {
    const entries = [
      {
        id: "entry-1",
        name: "Ravens",
      },
    ];

    const matches = [
      {
        id: "match-placeholder",
        status: "scheduled",
        kickoffAt: new Date("2024-06-05T12:00:00Z"),
        createdAt: new Date("2024-06-05T11:00:00Z"),
        homeEntryId: null,
        awayEntryId: "entry-1",
        homeScore: 0,
        awayScore: 0,
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
        venueName: "Main Arena",
        code: "SF1",
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: "bracket-1",
        metadata: {
          roundNumber: 1,
          homeSource: { type: "seed", seed: 1, entryId: null },
          awaySource: { type: "seed", seed: 2, entryId: "entry-1" },
        },
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "knockout", competitionSlug: null },
      {
        findEdition: async () => ({ ...baseEdition, slug: "knockout" }),
        listEntries: async () => entries,
        listMatches: async () => matches,
        listScorerEvents: async () => [],
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-05T12:00:00Z"),
      },
    );

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.home.name).toBe("Seed 1");
    expect(result.matches[0]?.home.entryId).toBeNull();
    expect(result.matches[0]?.away.name).toBe("Ravens");
  });

  it("includes matches that only contain placeholders", async () => {
    const matches = [
      {
        id: "match-empty",
        status: "scheduled",
        kickoffAt: new Date("2024-06-06T12:00:00Z"),
        createdAt: new Date("2024-06-06T10:00:00Z"),
        homeEntryId: null,
        awayEntryId: null,
        homeScore: 0,
        awayScore: 0,
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "placeholder-only", competitionSlug: null },
      {
        findEdition: async () => ({ ...baseEdition, slug: "placeholder-only" }),
        listEntries: async () => [],
        listMatches: async () => matches,
        listScorerEvents: async () => [],
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-06T10:00:00Z"),
      },
    );

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.home.name).toBe("TBD");
    expect(result.matches[0]?.away.name).toBe("TBD");
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

  it("handles disputed match status for standings", async () => {
    const entries = [
      { id: "entry-1", name: "Team A" },
      { id: "entry-2", name: "Team B" },
    ];

    const matches = [
      {
        id: "match-1",
        status: "disputed",
        kickoffAt: new Date("2024-06-01T10:00:00Z"),
        createdAt: new Date("2024-05-30T11:00:00Z"),
        homeEntryId: "entry-1",
        awayEntryId: "entry-2",
        homeScore: 2,
        awayScore: 1,
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "disputed-edition", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "disputed-edition",
        }),
        listEntries: async () => entries,
        listMatches: async () => matches,
        listScorerEvents: async () => [],
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-01T12:00:00Z"),
      },
    );

    expect(result.standings[0]?.points).toBe(3);
    expect(result.standings[0]?.entryId).toBe("entry-1");
  });

  it("skips matches with missing entry IDs in standings", async () => {
    const entries = [
      { id: "entry-1", name: "Team A" },
      { id: "entry-2", name: "Team B" },
    ];

    const matches = [
      {
        id: "match-1",
        status: "finalized",
        kickoffAt: new Date("2024-06-01T10:00:00Z"),
        createdAt: new Date("2024-05-30T11:00:00Z"),
        homeEntryId: null,
        awayEntryId: "entry-2",
        homeScore: 0,
        awayScore: 0,
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "missing-entries", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "missing-entries",
        }),
        listEntries: async () => entries,
        listMatches: async () => matches,
        listScorerEvents: async () => [],
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-01T12:00:00Z"),
      },
    );

    expect(result.standings.every((s) => s.played === 0)).toBe(true);
  });

  it("handles draw match results correctly", async () => {
    const entries = [
      { id: "entry-1", name: "Team A" },
      { id: "entry-2", name: "Team B" },
    ];

    const matches = [
      {
        id: "match-1",
        status: "finalized",
        kickoffAt: new Date("2024-06-01T10:00:00Z"),
        createdAt: new Date("2024-05-30T11:00:00Z"),
        homeEntryId: "entry-1",
        awayEntryId: "entry-2",
        homeScore: 1,
        awayScore: 1,
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "draw-edition", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "draw-edition",
        }),
        listEntries: async () => entries,
        listMatches: async () => matches,
        listScorerEvents: async () => [],
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-01T12:00:00Z"),
      },
    );

    expect(result.standings[0]?.drawn).toBe(1);
    expect(result.standings[0]?.points).toBe(1);
    expect(result.standings[1]?.drawn).toBe(1);
    expect(result.standings[1]?.points).toBe(1);
  });

  it("handles away win correctly", async () => {
    const entries = [
      { id: "entry-1", name: "Team A" },
      { id: "entry-2", name: "Team B" },
    ];

    const matches = [
      {
        id: "match-1",
        status: "finalized",
        kickoffAt: new Date("2024-06-01T10:00:00Z"),
        createdAt: new Date("2024-05-30T11:00:00Z"),
        homeEntryId: "entry-1",
        awayEntryId: "entry-2",
        homeScore: 0,
        awayScore: 2,
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "away-win", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "away-win",
        }),
        listEntries: async () => entries,
        listMatches: async () => matches,
        listScorerEvents: async () => [],
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-01T12:00:00Z"),
      },
    );

    const awayTeam = result.standings.find((s) => s.entryId === "entry-2");
    const homeTeam = result.standings.find((s) => s.entryId === "entry-1");
    expect(awayTeam?.won).toBe(1);
    expect(awayTeam?.points).toBe(3);
    expect(homeTeam?.lost).toBe(1);
    expect(homeTeam?.points).toBe(0);
  });

  it("skips scorer events without personId or entryId", async () => {
    const entries = [{ id: "entry-1", name: "Team A" }];

    const scorerEvents = [
      {
        eventType: "goal",
        personId: null,
        entryId: "entry-1",
        firstName: "Unknown",
        lastName: "Player",
        jerseyNumber: null,
        membershipMeta: {},
      },
      {
        eventType: "goal",
        personId: "person-1",
        entryId: null,
        firstName: "No",
        lastName: "Entry",
        jerseyNumber: null,
        membershipMeta: {},
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "no-scorers", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "no-scorers",
        }),
        listEntries: async () => entries,
        listMatches: async () => [],
        listScorerEvents: async () => scorerEvents,
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-01T12:00:00Z"),
      },
    );

    expect(result.topScorers).toEqual([]);
  });

  it("handles penalty goals in top scorers", async () => {
    const entries = [{ id: "entry-1", name: "Team A" }];

    const scorerEvents = [
      {
        eventType: "penalty_goal",
        personId: "person-1",
        entryId: "entry-1",
        firstName: "Penalty",
        lastName: "King",
        jerseyNumber: null,
        membershipMeta: {},
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "penalty", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "penalty",
        }),
        listEntries: async () => entries,
        listMatches: async () => [],
        listScorerEvents: async () => scorerEvents,
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-01T12:00:00Z"),
      },
    );

    expect(result.topScorers[0]?.goals).toBe(1);
    expect(result.topScorers[0]?.name).toBe("Penalty King");
  });

  it("uses createdAt as kickoffAt fallback", async () => {
    const entries = [
      { id: "entry-1", name: "Team A" },
      { id: "entry-2", name: "Team B" },
    ];

    const matches = [
      {
        id: "match-1",
        status: "scheduled",
        kickoffAt: null,
        createdAt: new Date("2024-06-01T10:00:00Z"),
        homeEntryId: "entry-1",
        awayEntryId: "entry-2",
        homeScore: 0,
        awayScore: 0,
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "no-kickoff", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "no-kickoff",
        }),
        listEntries: async () => entries,
        listMatches: async () => matches,
        listScorerEvents: async () => [],
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-01T12:00:00Z"),
      },
    );

    expect(result.matches[0]?.kickoffAt).toEqual(
      new Date("2024-06-01T10:00:00Z"),
    );
  });

  it("uses awayLabel from metadata when no entry", async () => {
    const entries = [{ id: "entry-1", name: "Team A" }];

    const matches = [
      {
        id: "match-1",
        status: "scheduled",
        kickoffAt: new Date("2024-06-01T10:00:00Z"),
        createdAt: new Date("2024-05-30T11:00:00Z"),
        homeEntryId: "entry-1",
        awayEntryId: null,
        homeScore: 0,
        awayScore: 0,
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {
          awayLabel: "Winner of Match 2",
        },
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "away-label", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "away-label",
        }),
        listEntries: async () => entries,
        listMatches: async () => matches,
        listScorerEvents: async () => [],
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-01T12:00:00Z"),
      },
    );

    expect(result.matches[0]?.away.name).toBe("Winner of Match 2");
  });

  it("sorts top scorers by goals and name", async () => {
    const entries = [
      { id: "entry-1", name: "Team A" },
      { id: "entry-2", name: "Team B" },
    ];

    const scorerEvents = [
      {
        eventType: "goal",
        personId: "person-1",
        entryId: "entry-1",
        firstName: "Zoe",
        lastName: "Scorer",
        jerseyNumber: null,
        membershipMeta: {},
      },
      {
        eventType: "goal",
        personId: "person-2",
        entryId: "entry-2",
        firstName: "Anna",
        lastName: "Player",
        jerseyNumber: null,
        membershipMeta: {},
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "sorted-scorers", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "sorted-scorers",
        }),
        listEntries: async () => entries,
        listMatches: async () => [],
        listScorerEvents: async () => scorerEvents,
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-01T12:00:00Z"),
      },
    );

    expect(result.topScorers[0]?.name).toBe("Anna Player");
    expect(result.topScorers[1]?.name).toBe("Zoe Scorer");
  });

  it("does not duplicate jersey number in top scorer names", async () => {
    const entries = [{ id: "entry-1", name: "Team A" }];
    const scorerEvents = [
      {
        eventType: "goal",
        personId: "person-1",
        entryId: "entry-1",
        firstName: "Ida",
        lastName: "Strand",
        jerseyNumber: 10,
        membershipMeta: {},
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "jersey-test", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "jersey-test",
        }),
        listEntries: async () => entries,
        listMatches: async () => [],
        listScorerEvents: async () => scorerEvents,
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-01T12:00:00Z"),
      },
    );

    expect(result.topScorers[0]?.name).toBe("Ida Strand (#10)");
  });

  it("applies head-to-head tiebreaker when teams are tied", async () => {
    const entries = [
      { id: "entry-1", name: "Alpha" },
      { id: "entry-2", name: "Beta" },
      { id: "entry-3", name: "Gamma" },
    ];

    const matches = [
      {
        id: "match-1",
        status: "finalized",
        kickoffAt: new Date("2024-06-01T10:00:00Z"),
        createdAt: new Date("2024-05-30T11:00:00Z"),
        homeEntryId: "entry-1",
        awayEntryId: "entry-2",
        homeScore: 1,
        awayScore: 0,
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
      {
        id: "match-2",
        status: "finalized",
        kickoffAt: new Date("2024-06-01T12:00:00Z"),
        createdAt: new Date("2024-05-30T12:00:00Z"),
        homeEntryId: "entry-2",
        awayEntryId: "entry-3",
        homeScore: 1,
        awayScore: 0,
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
      {
        id: "match-3",
        status: "finalized",
        kickoffAt: new Date("2024-06-01T14:00:00Z"),
        createdAt: new Date("2024-05-30T13:00:00Z"),
        homeEntryId: "entry-3",
        awayEntryId: "entry-1",
        homeScore: 1,
        awayScore: 0,
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "tiebreaker", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "tiebreaker",
        }),
        listEntries: async () => entries,
        listMatches: async () => matches,
        listScorerEvents: async () => [],
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-02T12:00:00Z"),
      },
    );

    expect(result.standings.every((s) => s.points === 3)).toBe(true);
    expect(result.standings).toHaveLength(3);
  });

  it("includes live_matches section for extra_time and penalty_shootout", async () => {
    const entries = [
      { id: "entry-1", name: "Team A" },
      { id: "entry-2", name: "Team B" },
    ];

    const matches = [
      {
        id: "match-1",
        status: "extra_time",
        kickoffAt: new Date("2024-06-01T10:00:00Z"),
        createdAt: new Date("2024-05-30T11:00:00Z"),
        homeEntryId: "entry-1",
        awayEntryId: "entry-2",
        homeScore: 1,
        awayScore: 1,
        homeExtraTime: null,
        awayExtraTime: null,
        homePenalties: null,
        awayPenalties: null,
        venueName: null,
        code: null,
        groupId: null,
        groupCode: null,
        groupName: null,
        bracketId: null,
        metadata: {},
      },
    ];

    const result = await getPublicScoreboard(
      { editionSlug: "eeo-esp", competitionSlug: null },
      {
        findEdition: async () => ({
          ...baseEdition,
          slug: "eeo-esp",
          scoreboardModules: ["live_matches"],
        }),
        listEntries: async () => entries,
        listMatches: async () => matches,
        listScorerEvents: async () => [],
        findActiveHighlight: async () => null,
        now: () => new Date("2024-06-01T11:00:00Z"),
      },
    );

    expect(result.rotation).toContain("live_matches");
  });
});
