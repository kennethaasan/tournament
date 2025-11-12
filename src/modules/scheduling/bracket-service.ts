import { createProblem } from "@/lib/errors/problem";

export type KnockoutSeed = {
  seed: number;
  entryId: string | null;
};

export type KnockoutParticipant =
  | { type: "seed"; seed: number; entryId: string | null }
  | { type: "winner"; matchId: string }
  | { type: "loser"; matchId: string };

export type KnockoutMatchType = "round" | "final" | "third_place";

export type KnockoutMatchPlan = {
  id: string;
  stageId: string;
  bracketId: string;
  roundNumber: number;
  type: KnockoutMatchType;
  home: KnockoutParticipant;
  away: KnockoutParticipant;
};

export type KnockoutBracketOptions = {
  stageId: string;
  bracketId: string;
  seeds: KnockoutSeed[];
  thirdPlaceMatch?: boolean;
};

type InternalMatchPlan = KnockoutMatchPlan & {
  autoAdvanceParticipant?: KnockoutParticipant;
};

export type KnockoutBracketResult = {
  matches: KnockoutMatchPlan[];
};

const MIN_SEEDS = 2;

export function buildKnockoutBracket(
  options: KnockoutBracketOptions,
): KnockoutBracketResult {
  if (options.seeds.length < MIN_SEEDS) {
    throw createProblem({
      type: "https://tournament.app/problems/bracket/insufficient-seeds",
      title: "Not enough seeds",
      status: 400,
      detail: "Provide at least two seeds to build a knockout bracket.",
    });
  }

  const seedsByNumber = normalizeSeeds(options.seeds);
  const bracketSize = nextPowerOfTwo(seedsByNumber.size);

  const firstRoundPairs = createFirstRoundPairs(bracketSize);
  const rounds: InternalMatchPlan[][] = [];

  const firstRound: InternalMatchPlan[] = firstRoundPairs.map(
    ([homeSeed, awaySeed], index) => {
      const home = createSeedParticipant(seedsByNumber, homeSeed);
      const away = createSeedParticipant(seedsByNumber, awaySeed);
      const autoAdvanceParticipant = deriveAutoAdvance(home, away);

      return {
        id: createMatchId(options.bracketId, 1, index + 1),
        stageId: options.stageId,
        bracketId: options.bracketId,
        roundNumber: 1,
        type: "round",
        home,
        away,
        autoAdvanceParticipant,
      };
    },
  );

  rounds.push(firstRound);

  let previousRound = firstRound;
  let roundNumber = 2;

  while (previousRound.length > 1) {
    const currentRound: InternalMatchPlan[] = [];

    for (let index = 0; index < previousRound.length / 2; index += 1) {
      const left = previousRound[index];
      const right = previousRound[previousRound.length - 1 - index];

      if (!left || !right) {
        throw createProblem({
          type: "https://tournament.app/problems/bracket/pairing-failed",
          title: "Bracket pairing failed",
          status: 500,
          detail:
            "An internal error occurred while pairing knockout matches. Please try again.",
        });
      }

      const home = advanceParticipant(left);
      const away = advanceParticipant(right);
      const autoAdvanceParticipant = deriveAutoAdvance(home, away);

      currentRound.push({
        id: createMatchId(options.bracketId, roundNumber, index + 1),
        stageId: options.stageId,
        bracketId: options.bracketId,
        roundNumber,
        type: previousRound.length === 2 ? "final" : "round",
        home,
        away,
        autoAdvanceParticipant,
      });
    }

    rounds.push(currentRound);
    previousRound = currentRound;
    roundNumber += 1;
  }

  const flattenedMatches = rounds.flat();

  const thirdPlace = maybeCreateThirdPlaceMatch(options, rounds);

  const publishableMatches = thirdPlace
    ? [...flattenedMatches, thirdPlace]
    : flattenedMatches;

  return {
    matches: publishableMatches.map((match) => {
      if ("autoAdvanceParticipant" in match) {
        const { autoAdvanceParticipant: _auto, ...rest } = match;
        return rest;
      }
      return match;
    }),
  };
}

function normalizeSeeds(
  seeds: KnockoutSeed[],
): Map<number, KnockoutParticipant & { type: "seed" }> {
  const seedMap = new Map<number, KnockoutParticipant & { type: "seed" }>();

  for (const seed of seeds) {
    if (seed.seed < 1) {
      throw createProblem({
        type: "https://tournament.app/problems/bracket/invalid-seed",
        title: "Invalid seed number",
        status: 400,
        detail: "Seed numbers must be positive integers.",
      });
    }

    if (seedMap.has(seed.seed)) {
      throw createProblem({
        type: "https://tournament.app/problems/bracket/duplicate-seed",
        title: "Duplicate seed number",
        status: 400,
        detail: `Seed ${seed.seed} is defined more than once.`,
      });
    }

    seedMap.set(seed.seed, {
      type: "seed",
      seed: seed.seed,
      entryId: seed.entryId,
    });
  }

  const targetSize = nextPowerOfTwo(seedMap.size);
  for (let seed = 1; seed <= targetSize; seed += 1) {
    if (!seedMap.has(seed)) {
      seedMap.set(seed, {
        type: "seed",
        seed,
        entryId: null,
      });
    }
  }

  return seedMap;
}

function createFirstRoundPairs(bracketSize: number): Array<[number, number]> {
  const seeds: number[] = Array.from(
    { length: bracketSize },
    (_, index) => index + 1,
  );

  const pairs: Array<[number, number]> = [];
  while (seeds.length > 1) {
    const first = seeds.shift();
    const last = seeds.pop();
    if (first !== undefined && last !== undefined) {
      pairs.push([first, last]);
    }
  }

  return pairs;
}

function nextPowerOfTwo(value: number): number {
  let power = 1;
  while (power < value) {
    power *= 2;
  }
  return power;
}

function createSeedParticipant(
  seedsByNumber: Map<number, KnockoutParticipant & { type: "seed" }>,
  seed: number,
): KnockoutParticipant {
  const participant = seedsByNumber.get(seed);
  if (!participant) {
    return { type: "seed", seed, entryId: null };
  }

  return participant;
}

function deriveAutoAdvance(
  home: KnockoutParticipant,
  away: KnockoutParticipant,
): KnockoutParticipant | undefined {
  if (home.type === "seed" && away.type === "seed") {
    if (home.entryId && !away.entryId) {
      return home;
    }

    if (!home.entryId && away.entryId) {
      return away;
    }
  }

  return undefined;
}

function advanceParticipant(match: InternalMatchPlan): KnockoutParticipant {
  if (match.autoAdvanceParticipant) {
    return match.autoAdvanceParticipant;
  }

  return {
    type: "winner",
    matchId: match.id,
  };
}

function maybeCreateThirdPlaceMatch(
  options: KnockoutBracketOptions,
  rounds: InternalMatchPlan[][],
): KnockoutMatchPlan | undefined {
  if (!options.thirdPlaceMatch) {
    return undefined;
  }

  if (rounds.length < 2) {
    return undefined;
  }

  const semifinalRound = rounds[rounds.length - 2];
  if (!semifinalRound || semifinalRound.length !== 2) {
    return undefined;
  }

  const finalRound = rounds[rounds.length - 1];
  const finalRoundNumber = finalRound?.[0]?.roundNumber ?? rounds.length;

  const [firstSemifinal, secondSemifinal] = semifinalRound;

  if (!firstSemifinal || !secondSemifinal) {
    return undefined;
  }

  return {
    id: `${options.bracketId}-third-place`,
    stageId: options.stageId,
    bracketId: options.bracketId,
    roundNumber: finalRoundNumber,
    type: "third_place",
    home: {
      type: "loser",
      matchId: firstSemifinal.id,
    },
    away: {
      type: "loser",
      matchId: secondSemifinal.id,
    },
  };
}

function createMatchId(
  bracketId: string,
  roundNumber: number,
  index: number,
): string {
  return `${bracketId}-r${roundNumber}-m${index}`;
}
