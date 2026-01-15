import { describe, expect, it } from "vitest";
import type { components } from "@/lib/api/generated/openapi";
import {
  buildEditionSlug,
  DEFAULT_ROTATION,
  encodeEditionSlugParam,
  fromApiScoreboardPayload,
  parseCompositeEditionSlug,
  toApiScoreboardPayload,
} from "@/modules/public/scoreboard-types";

describe("scoreboard types helpers", () => {
  it("builds and encodes edition slugs", () => {
    expect(buildEditionSlug("elite", "cup-2025")).toBe("elite/cup-2025");
    expect(buildEditionSlug(null, "solo")).toBe("solo");
    expect(encodeEditionSlugParam("elite", "cup 2025")).toBe(
      "elite%2Fcup%202025",
    );
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
        competitionName: "Elite Competition",
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
    expect(payload.edition.competition_slug).toBe("elite");
    expect(payload.edition.scoreboard_modules).toEqual(DEFAULT_ROTATION);
    expect(payload.standings[0]?.points).toBe(3);
  });
});

describe("buildEditionSlug", () => {
  it("returns combined slug when competition slug is provided", () => {
    expect(buildEditionSlug("comp", "edition")).toBe("comp/edition");
  });

  it("returns edition slug only when competition slug is null", () => {
    expect(buildEditionSlug(null, "edition")).toBe("edition");
  });

  it("returns edition slug only when competition slug is undefined", () => {
    expect(buildEditionSlug(undefined, "edition")).toBe("edition");
  });

  it("returns edition slug only when competition slug is empty string", () => {
    expect(buildEditionSlug("", "edition")).toBe("edition");
  });

  it("returns edition slug only when competition slug is whitespace", () => {
    expect(buildEditionSlug("   ", "edition")).toBe("edition");
  });
});

describe("parseCompositeEditionSlug", () => {
  it("parses slug with single slash", () => {
    const result = parseCompositeEditionSlug("comp/edition");
    expect(result).toEqual({
      competitionSlug: "comp",
      editionSlug: "edition",
    });
  });

  it("parses slug with multiple slashes", () => {
    const result = parseCompositeEditionSlug("comp/edition/extra");
    expect(result).toEqual({
      competitionSlug: "comp",
      editionSlug: "edition/extra",
    });
  });

  it("parses standalone slug", () => {
    const result = parseCompositeEditionSlug("standalone");
    expect(result).toEqual({
      competitionSlug: null,
      editionSlug: "standalone",
    });
  });

  it("handles empty string", () => {
    const result = parseCompositeEditionSlug("");
    expect(result).toEqual({
      competitionSlug: null,
      editionSlug: "",
    });
  });

  it("handles URL encoded slugs", () => {
    const result = parseCompositeEditionSlug("comp%2Fedition");
    expect(result).toEqual({
      competitionSlug: "comp",
      editionSlug: "edition",
    });
  });

  it("handles malformed URL encoding gracefully", () => {
    const result = parseCompositeEditionSlug("%E0%A4%A");
    expect(result).toEqual({
      competitionSlug: null,
      editionSlug: "%E0%A4%A",
    });
  });

  it("returns null competitionSlug when first segment is empty", () => {
    const result = parseCompositeEditionSlug("/edition");
    expect(result).toEqual({
      competitionSlug: null,
      editionSlug: "edition",
    });
  });

  it("returns empty editionSlug when second segment is empty", () => {
    const result = parseCompositeEditionSlug("comp/");
    expect(result).toEqual({
      competitionSlug: "comp",
      editionSlug: "",
    });
  });
});

describe("fromApiScoreboardPayload", () => {
  const createMinimalPayload = () =>
    ({
      edition: {
        id: "edition-1",
        competition_id: "comp-1",
        competition_slug: "elite",
        label: "Elite Cup",
        slug: "elite-cup",
        status: "published",
        format: "round_robin",
        registration_window: {
          opens_at: null as string | null,
          closes_at: null as string | null,
        },
        scoreboard_rotation_seconds: 10,
        scoreboard_theme: {
          primary_color: "#123456",
          secondary_color: "#ABCDEF",
          background_image_url: "https://example.com/bg.jpg",
        },
        published_at: "2024-06-01T00:00:00Z",
      },
      matches: [],
      standings: [],
      top_scorers: [],
      rotation: [],
    }) as components["schemas"]["ScoreboardPayload"];

  it("converts basic payload correctly", () => {
    const payload = createMinimalPayload();
    const result = fromApiScoreboardPayload(payload);

    expect(result.edition.id).toBe("edition-1");
    expect(result.edition.competitionId).toBe("comp-1");
    expect(result.edition.competitionSlug).toBe("elite");
    expect(result.edition.label).toBe("Elite Cup");
    expect(result.edition.slug).toBe("elite-cup");
    expect(result.edition.status).toBe("published");
    expect(result.edition.format).toBe("round_robin");
    expect(result.edition.timezone).toBe("Europe/Oslo");
    expect(result.edition.scoreboardRotationSeconds).toBe(10);
  });

  it("parses published_at date correctly", () => {
    const payload = createMinimalPayload();
    const result = fromApiScoreboardPayload(payload);

    expect(result.edition.publishedAt).toEqual(
      new Date("2024-06-01T00:00:00Z"),
    );
  });

  it("handles null published_at", () => {
    const payload = createMinimalPayload();
    payload.edition.published_at = null;
    const result = fromApiScoreboardPayload(payload);

    expect(result.edition.publishedAt).toBeNull();
  });

  it("parses registration window dates", () => {
    const payload = createMinimalPayload();
    payload.edition.registration_window = {
      opens_at: "2024-05-01T00:00:00Z",
      closes_at: "2024-05-31T23:59:59Z",
    };
    const result = fromApiScoreboardPayload(payload);

    expect(result.edition.registrationWindow.opensAt).toEqual(
      new Date("2024-05-01T00:00:00Z"),
    );
    expect(result.edition.registrationWindow.closesAt).toEqual(
      new Date("2024-05-31T23:59:59Z"),
    );
  });

  it("handles null registration window dates", () => {
    const payload = createMinimalPayload();
    // The API type requires string, but we test the runtime handling of null
    // @ts-expect-error Testing null value handling at runtime
    payload.edition.registration_window.opens_at = null;
    // @ts-expect-error Testing null value handling at runtime
    payload.edition.registration_window.closes_at = null;
    const result = fromApiScoreboardPayload(payload);

    expect(result.edition.registrationWindow.opensAt).toBeNull();
    expect(result.edition.registrationWindow.closesAt).toBeNull();
  });

  it("uses default values when optional fields are missing", () => {
    const payload = createMinimalPayload();
    payload.edition.format = undefined;
    // @ts-expect-error Testing undefined value for optional field
    payload.edition.scoreboard_rotation_seconds = undefined;
    payload.edition.scoreboard_theme = undefined;
    payload.edition.competition_slug = undefined;
    const result = fromApiScoreboardPayload(payload);

    expect(result.edition.format).toBe("round_robin");
    expect(result.edition.scoreboardRotationSeconds).toBe(5);
    expect(result.edition.competitionSlug).toBe("");
    expect(result.edition.scoreboardTheme).toEqual({
      primaryColor: "#0B1F3A",
      secondaryColor: "#FFFFFF",
      backgroundImageUrl: null,
    });
  });

  it("parses scoreboard theme correctly", () => {
    const payload = createMinimalPayload();
    const result = fromApiScoreboardPayload(payload);

    expect(result.edition.scoreboardTheme).toEqual({
      primaryColor: "#123456",
      secondaryColor: "#ABCDEF",
      backgroundImageUrl: "https://example.com/bg.jpg",
    });
  });

  it("converts matches correctly", () => {
    const payload = createMinimalPayload();
    payload.matches = [
      {
        id: "match-1",
        status: "in_progress",
        kickoff_at: "2024-06-02T14:00:00Z",
        code: "A1",
        group_code: "G1",
        home: { entry_id: "entry-1", name: "Home Team", score: 2 },
        away: { entry_id: "entry-2", name: "Away Team", score: 1 },
        highlight: "Goal!",
        venue_name: "Stadium",
      },
    ];
    const result = fromApiScoreboardPayload(payload);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toEqual({
      id: "match-1",
      status: "in_progress",
      kickoffAt: new Date("2024-06-02T14:00:00Z"),
      code: "A1",
      groupCode: "G1",
      home: { entryId: "entry-1", name: "Home Team", score: 2 },
      away: { entryId: "entry-2", name: "Away Team", score: 1 },
      highlight: "Goal!",
      venueName: "Stadium",
    });
  });

  it("handles null values in matches", () => {
    const payload = createMinimalPayload();
    payload.matches = [
      {
        id: "match-1",
        status: "scheduled",
        kickoff_at: "2024-06-02T14:00:00Z",
        code: null,
        group_code: null,
        home: { entry_id: null, name: "TBD", score: 0 },
        away: { entry_id: null, name: "TBD", score: 0 },
        highlight: null,
        venue_name: null,
      },
    ];
    const result = fromApiScoreboardPayload(payload);

    expect(result.matches[0]?.code).toBeNull();
    expect(result.matches[0]?.groupCode).toBeNull();
    expect(result.matches[0]?.home.entryId).toBeNull();
    expect(result.matches[0]?.highlight).toBeNull();
    expect(result.matches[0]?.venueName).toBeNull();
  });

  it("converts standings correctly", () => {
    const payload = createMinimalPayload();
    payload.standings = [
      {
        entry_id: "entry-1",
        position: 1,
        played: 3,
        won: 2,
        drawn: 1,
        lost: 0,
        goals_for: 7,
        goals_against: 2,
        goal_difference: 5,
        points: 7,
        fair_play_score: -2,
      },
    ];
    const result = fromApiScoreboardPayload(payload);

    expect(result.standings).toHaveLength(1);
    expect(result.standings[0]).toEqual({
      entryId: "entry-1",
      position: 1,
      played: 3,
      won: 2,
      drawn: 1,
      lost: 0,
      goalsFor: 7,
      goalsAgainst: 2,
      goalDifference: 5,
      points: 7,
      fairPlayScore: -2,
    });
  });

  it("calculates goal difference when not provided", () => {
    const payload = createMinimalPayload();
    payload.standings = [
      {
        entry_id: "entry-1",
        position: 1,
        played: 3,
        won: 2,
        drawn: 1,
        lost: 0,
        goals_for: 7,
        goals_against: 2,
        goal_difference: undefined,
        points: 7,
        fair_play_score: null,
      },
    ];
    const result = fromApiScoreboardPayload(payload);

    expect(result.standings[0]?.goalDifference).toBe(5);
  });

  it("uses index as position when not provided", () => {
    const payload = createMinimalPayload();
    payload.standings = [
      {
        entry_id: "entry-1",
        position: undefined,
        played: 3,
        won: 2,
        drawn: 1,
        lost: 0,
        goals_for: 7,
        goals_against: 2,
        points: 7,
      },
      {
        entry_id: "entry-2",
        position: undefined,
        played: 3,
        won: 1,
        drawn: 1,
        lost: 1,
        goals_for: 4,
        goals_against: 4,
        points: 4,
      },
    ];
    const result = fromApiScoreboardPayload(payload);

    expect(result.standings[0]?.position).toBe(1);
    expect(result.standings[1]?.position).toBe(2);
  });

  it("converts top scorers correctly", () => {
    const payload = createMinimalPayload();
    payload.top_scorers = [
      {
        person_id: "person-1",
        entry_id: "entry-1",
        name: "Player One",
        goals: 5,
        assists: 3,
        yellow_cards: 1,
        red_cards: 0,
      },
    ];
    const result = fromApiScoreboardPayload(payload);

    expect(result.topScorers).toHaveLength(1);
    expect(result.topScorers[0]).toEqual({
      personId: "person-1",
      entryId: "entry-1",
      name: "Player One",
      goals: 5,
      assists: 3,
      yellowCards: 1,
      redCards: 0,
    });
  });

  it("uses default values for optional top scorer fields", () => {
    const payload = createMinimalPayload();
    payload.top_scorers = [
      {
        person_id: "person-1",
        entry_id: "entry-1",
        name: undefined,
        goals: 5,
        assists: undefined,
        yellow_cards: undefined,
        red_cards: undefined,
      },
    ];
    const result = fromApiScoreboardPayload(payload);

    expect(result.topScorers[0]?.name).toBe("");
    expect(result.topScorers[0]?.assists).toBe(0);
    expect(result.topScorers[0]?.yellowCards).toBe(0);
    expect(result.topScorers[0]?.redCards).toBe(0);
  });

  it("converts tables correctly", () => {
    const payload = createMinimalPayload();
    payload.tables = [
      {
        group_id: "group-1",
        group_code: "A",
        group_name: "Group A",
        standings: [
          {
            entry_id: "entry-1",
            position: 1,
            played: 2,
            won: 2,
            drawn: 0,
            lost: 0,
            goals_for: 5,
            goals_against: 1,
            goal_difference: 4,
            points: 6,
            fair_play_score: 0,
          },
        ],
      },
    ];
    const result = fromApiScoreboardPayload(payload);

    expect(result.tables).toHaveLength(1);
    expect(result.tables[0]).toEqual({
      groupId: "group-1",
      groupCode: "A",
      groupName: "Group A",
      standings: [
        {
          entryId: "entry-1",
          position: 1,
          played: 2,
          won: 2,
          drawn: 0,
          lost: 0,
          goalsFor: 5,
          goalsAgainst: 1,
          goalDifference: 4,
          points: 6,
          fairPlayScore: 0,
        },
      ],
    });
  });

  it("handles undefined tables", () => {
    const payload = createMinimalPayload();
    payload.tables = undefined;
    const result = fromApiScoreboardPayload(payload);

    expect(result.tables).toEqual([]);
  });

  it("handles null group_name in tables", () => {
    const payload = createMinimalPayload();
    payload.tables = [
      {
        group_id: "group-1",
        group_code: "A",
        group_name: null,
        standings: [],
      },
    ];
    const result = fromApiScoreboardPayload(payload);

    expect(result.tables[0]?.groupName).toBeNull();
  });

  it("uses fallback values for table standings with missing optional fields", () => {
    const payload = createMinimalPayload();
    payload.tables = [
      {
        group_id: "group-1",
        group_code: "A",
        group_name: "Group A",
        standings: [
          {
            entry_id: "entry-1",
            position: undefined,
            played: 2,
            won: 2,
            drawn: 0,
            lost: 0,
            goals_for: 5,
            goals_against: 1,
            goal_difference: undefined,
            points: 6,
            fair_play_score: undefined,
          },
          {
            entry_id: "entry-2",
            position: undefined,
            played: 2,
            won: 1,
            drawn: 0,
            lost: 1,
            goals_for: 3,
            goals_against: 4,
            goal_difference: undefined,
            points: 3,
            fair_play_score: undefined,
          },
        ],
      },
    ];
    const result = fromApiScoreboardPayload(payload);

    // Should use index + 1 for position
    expect(result.tables[0]?.standings[0]?.position).toBe(1);
    expect(result.tables[0]?.standings[1]?.position).toBe(2);

    // Should calculate goal difference from goals_for - goals_against
    expect(result.tables[0]?.standings[0]?.goalDifference).toBe(4); // 5 - 1
    expect(result.tables[0]?.standings[1]?.goalDifference).toBe(-1); // 3 - 4

    // Should use null for fair_play_score
    expect(result.tables[0]?.standings[0]?.fairPlayScore).toBeNull();
    expect(result.tables[0]?.standings[1]?.fairPlayScore).toBeNull();
  });

  it("uses DEFAULT_ROTATION when rotation is empty", () => {
    const payload = createMinimalPayload();
    payload.rotation = [];
    const result = fromApiScoreboardPayload(payload);

    expect(result.rotation).toEqual(DEFAULT_ROTATION);
  });

  it("uses provided rotation when not empty", () => {
    const payload = createMinimalPayload();
    payload.rotation = ["standings", "top_scorers"];
    const result = fromApiScoreboardPayload(payload);

    expect(result.rotation).toEqual(["standings", "top_scorers"]);
  });

  it("extracts overlay message from match highlight", () => {
    const payload = createMinimalPayload();
    payload.matches = [
      {
        id: "match-1",
        status: "scheduled",
        kickoff_at: "2024-06-02T14:00:00Z",
        code: null,
        group_code: null,
        home: { entry_id: null, name: "TBD", score: 0 },
        away: { entry_id: null, name: "TBD", score: 0 },
        highlight: "",
        venue_name: null,
      },
      {
        id: "match-2",
        status: "in_progress",
        kickoff_at: "2024-06-02T15:00:00Z",
        code: null,
        group_code: null,
        home: { entry_id: null, name: "Team A", score: 1 },
        away: { entry_id: null, name: "Team B", score: 0 },
        highlight: "Breaking news!",
        venue_name: null,
      },
    ];
    const result = fromApiScoreboardPayload(payload);

    expect(result.overlayMessage).toBe("Breaking news!");
  });

  it("returns null overlay message when no highlights", () => {
    const payload = createMinimalPayload();
    payload.matches = [
      {
        id: "match-1",
        status: "scheduled",
        kickoff_at: "2024-06-02T14:00:00Z",
        code: null,
        group_code: null,
        home: { entry_id: null, name: "TBD", score: 0 },
        away: { entry_id: null, name: "TBD", score: 0 },
        highlight: null,
        venue_name: null,
      },
    ];
    const result = fromApiScoreboardPayload(payload);

    expect(result.overlayMessage).toBeNull();
  });

  it("returns empty entries array", () => {
    const payload = createMinimalPayload();
    const result = fromApiScoreboardPayload(payload);

    expect(result.entries).toEqual([]);
  });
});

describe("toApiScoreboardPayload", () => {
  it("maps tables with standings correctly", () => {
    const payload = toApiScoreboardPayload({
      edition: {
        id: "edition-1",
        competitionId: "comp-1",
        competitionSlug: "elite",
        competitionName: "Elite Competition",
        label: "Elite Cup",
        slug: "elite-cup",
        status: "published",
        format: "round_robin",
        timezone: "UTC",
        publishedAt: null,
        registrationWindow: {
          opensAt: new Date("2024-05-01T00:00:00Z"),
          closesAt: new Date("2024-05-31T23:59:59Z"),
        },
        scoreboardRotationSeconds: 5,
        scoreboardModules: DEFAULT_ROTATION,
        scoreboardTheme: {
          primaryColor: "#0B1F3A",
          secondaryColor: "#FFFFFF",
          backgroundImageUrl: null,
        },
      },
      matches: [],
      standings: [],
      tables: [
        {
          groupId: "group-1",
          groupCode: "A",
          groupName: "Group A",
          standings: [
            {
              entryId: "entry-1",
              position: 1,
              played: 2,
              won: 2,
              drawn: 0,
              lost: 0,
              goalsFor: 5,
              goalsAgainst: 1,
              goalDifference: 4,
              points: 6,
              fairPlayScore: -1,
            },
          ],
        },
      ],
      topScorers: [
        {
          personId: "person-1",
          entryId: "entry-1",
          name: "Player One",
          goals: 5,
          assists: 2,
          yellowCards: 0,
          redCards: 0,
        },
      ],
      rotation: DEFAULT_ROTATION,
      overlayMessage: "Welcome!",
      entries: [],
    });

    expect(payload.tables).toHaveLength(1);
    expect(payload.tables?.[0]?.group_id).toBe("group-1");
    expect(payload.tables?.[0]?.standings[0]?.fair_play_score).toBe(-1);
    expect(payload.top_scorers[0]?.assists).toBe(2);
    expect(payload.edition.registration_window?.opens_at).toBe(
      "2024-05-01T00:00:00.000Z",
    );
  });

  it("includes overlay message in match highlights", () => {
    const payload = toApiScoreboardPayload({
      edition: {
        id: "edition-1",
        competitionId: "comp-1",
        competitionSlug: "elite",
        competitionName: "Elite Competition",
        label: "Elite Cup",
        slug: "elite-cup",
        status: "published",
        format: "round_robin",
        timezone: "UTC",
        publishedAt: null,
        registrationWindow: { opensAt: null, closesAt: null },
        scoreboardRotationSeconds: 5,
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
          home: { entryId: "entry-1", name: "Home", score: 0 },
          away: { entryId: "entry-2", name: "Away", score: 0 },
          highlight: null,
        },
      ],
      standings: [],
      tables: [],
      topScorers: [],
      rotation: [],
      overlayMessage: "Important announcement",
      entries: [],
    });

    expect(payload.matches[0]?.highlight).toBe("Important announcement");
  });

  it("uses match highlight over overlay message", () => {
    const payload = toApiScoreboardPayload({
      edition: {
        id: "edition-1",
        competitionId: "comp-1",
        competitionSlug: "elite",
        competitionName: "Elite Competition",
        label: "Elite Cup",
        slug: "elite-cup",
        status: "published",
        format: "round_robin",
        timezone: "UTC",
        publishedAt: null,
        registrationWindow: { opensAt: null, closesAt: null },
        scoreboardRotationSeconds: 5,
        scoreboardTheme: {
          primaryColor: "#0B1F3A",
          secondaryColor: "#FFFFFF",
          backgroundImageUrl: null,
        },
      },
      matches: [
        {
          id: "match-1",
          status: "in_progress",
          kickoffAt: new Date("2024-06-02T12:00:00Z"),
          home: { entryId: "entry-1", name: "Home", score: 1 },
          away: { entryId: "entry-2", name: "Away", score: 0 },
          highlight: "GOAL!",
        },
      ],
      standings: [],
      tables: [],
      topScorers: [],
      rotation: [],
      overlayMessage: "Important announcement",
      entries: [],
    });

    expect(payload.matches[0]?.highlight).toBe("GOAL!");
  });
});
