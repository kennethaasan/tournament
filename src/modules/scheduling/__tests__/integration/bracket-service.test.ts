import { describe, expect, it } from "vitest";
import { buildKnockoutBracket } from "@/modules/scheduling/bracket-service";

describe("Scheduling › knockout bracket builder", () => {
  it("creates knockout rounds with winner references for a power-of-two bracket", () => {
    const { matches } = buildKnockoutBracket({
      stageId: "stage-1",
      bracketId: "bracket-1",
      seeds: [
        { seed: 1, entryId: "entry-1" },
        { seed: 2, entryId: "entry-2" },
        { seed: 3, entryId: "entry-3" },
        { seed: 4, entryId: "entry-4" },
      ],
      thirdPlaceMatch: false,
    });

    expect(matches).toHaveLength(3);

    const [semiOne, semiTwo, finalMatch] = matches;

    expect(semiOne).toBeDefined();
    expect(semiTwo).toBeDefined();
    expect(finalMatch).toBeDefined();

    if (!semiOne || !semiTwo || !finalMatch) {
      throw new Error("Brakettgeneratoren returnerte en ufullstendig liste.");
    }

    expect(semiOne.home).toEqual({
      type: "seed",
      seed: 1,
      entryId: "entry-1",
    });
    expect(semiOne.away).toEqual({
      type: "seed",
      seed: 4,
      entryId: "entry-4",
    });

    expect(semiTwo.home).toEqual({
      type: "seed",
      seed: 2,
      entryId: "entry-2",
    });
    expect(semiTwo.away).toEqual({
      type: "seed",
      seed: 3,
      entryId: "entry-3",
    });

    expect(finalMatch.roundNumber).toBe(2);
    expect(finalMatch.home).toEqual({
      type: "winner",
      matchId: semiOne.id,
    });
    expect(finalMatch.away).toEqual({
      type: "winner",
      matchId: semiTwo.id,
    });
  });

  it("fills byes, advances seeds, and adds third-place match when enabled", () => {
    const { matches } = buildKnockoutBracket({
      stageId: "stage-2",
      bracketId: "bracket-2",
      seeds: [
        { seed: 1, entryId: "alpha" },
        { seed: 2, entryId: "beta" },
        { seed: 3, entryId: "gamma" },
        { seed: 4, entryId: "delta" },
        { seed: 5, entryId: "epsilon" },
      ],
      thirdPlaceMatch: true,
    });

    expect(matches).toHaveLength(8);

    const quarterfinals = matches.filter((match) => match.roundNumber === 1);
    expect(quarterfinals).toHaveLength(4);

    const semifinalMatches = matches.filter((match) => match.roundNumber === 2);
    expect(semifinalMatches).toHaveLength(2);

    const finalMatch = matches.find(
      (match) => match.roundNumber === 3 && match.type === "final",
    );
    const thirdPlace = matches.find((match) => match.type === "third_place");

    expect(finalMatch).toBeDefined();
    expect(thirdPlace).toBeDefined();

    if (
      !semifinalMatches[0] ||
      !semifinalMatches[1] ||
      !finalMatch ||
      !thirdPlace
    ) {
      throw new Error("Brakettgeneratoren mangler semifinaler eller finaler.");
    }

    expect(semifinalMatches[0].home).toEqual({
      type: "seed",
      seed: 1,
      entryId: "alpha",
    });
    expect(semifinalMatches[0].away).toEqual({
      type: "winner",
      matchId: quarterfinals[3]?.id as string,
    });

    expect(thirdPlace.home).toEqual({
      type: "loser",
      matchId: semifinalMatches[0].id,
    });
    expect(thirdPlace.away).toEqual({
      type: "loser",
      matchId: semifinalMatches[1].id,
    });
  });
});
