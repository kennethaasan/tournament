import { createProblem } from "@/lib/errors/problem";

export type RoundRobinMode = "single" | "double";

export type RoundRobinGroupInput = {
  id: string;
  entryIds: string[];
  roundRobinMode: RoundRobinMode;
};

export type RoundRobinVenueInput = {
  id: string;
};

export type RoundRobinScheduleOptions = {
  stageId: string;
  groups: RoundRobinGroupInput[];
  venues: RoundRobinVenueInput[];
  startAt: Date;
  matchDurationMinutes: number;
  breakMinutes: number;
};

export type PlannedMatch = {
  stageId: string;
  groupId: string;
  roundNumber: number;
  homeEntryId: string;
  awayEntryId: string;
  kickoffAt: Date;
  venueId: string;
};

export type RoundRobinScheduleResult = {
  matches: PlannedMatch[];
};

const MIN_ENTRIES_PER_GROUP = 2;
const MIN_DURATION_MINUTES = 10;
const MAX_BUFFER_MINUTES = 180;

const BYE_ENTRY_ID = "__bye__";

export function generateRoundRobinSchedule(
  options: RoundRobinScheduleOptions,
): RoundRobinScheduleResult {
  if (!options.groups.length) {
    throw createProblem({
      type: "https://tournament.app/problems/round-robin/no-groups",
      title: "At least one group is required",
      status: 400,
      detail: "Select one or more groups before generating fixtures.",
    });
  }

  if (!options.venues.length) {
    throw createProblem({
      type: "https://tournament.app/problems/round-robin/no-venues",
      title: "No venues available",
      status: 400,
      detail: "Provide at least one venue to allocate matches.",
    });
  }

  if (options.matchDurationMinutes < MIN_DURATION_MINUTES) {
    throw createProblem({
      type: "https://tournament.app/problems/round-robin/invalid-duration",
      title: "Match duration too short",
      status: 400,
      detail: "Matches must last at least 10 minutes.",
    });
  }

  if (options.breakMinutes < 0 || options.breakMinutes > MAX_BUFFER_MINUTES) {
    throw createProblem({
      type: "https://tournament.app/problems/round-robin/invalid-break",
      title: "Break length is invalid",
      status: 400,
      detail: "Breaks must be between 0 and 180 minutes.",
    });
  }

  const startTimestamp = options.startAt.getTime();
  if (Number.isNaN(startTimestamp)) {
    throw createProblem({
      type: "https://tournament.app/problems/round-robin/invalid-start",
      title: "Invalid start time",
      status: 400,
      detail: "Provide a valid start timestamp to seed the schedule.",
    });
  }

  const slotIterator = createSlotIterator({
    startAt: new Date(startTimestamp),
    matchDurationMinutes: options.matchDurationMinutes,
    breakMinutes: options.breakMinutes,
    venues: options.venues,
  });

  const matches: PlannedMatch[] = [];

  for (const group of options.groups) {
    if (group.entryIds.length < MIN_ENTRIES_PER_GROUP) {
      throw createProblem({
        type: "https://tournament.app/problems/round-robin/insufficient-entries",
        title: "Not enough entries",
        status: 400,
        detail: `Group ${group.id} requires at least ${MIN_ENTRIES_PER_GROUP} entries.`,
      });
    }

    const rounds = createRoundRobinRounds(group.entryIds, group.roundRobinMode);

    rounds.forEach((roundMatches) => {
      roundMatches.forEach((pair) => {
        const slot = slotIterator.next().value;
        if (!slot) {
          throw createProblem({
            type: "https://tournament.app/problems/round-robin/slot-generation-failed",
            title: "Unable to assign a match slot",
            status: 500,
            detail:
              "The scheduling wizard could not generate a slot for the requested match.",
          });
        }

        matches.push({
          stageId: options.stageId,
          groupId: group.id,
          roundNumber: 0,
          homeEntryId: pair.home,
          awayEntryId: pair.away,
          kickoffAt: slot.kickoffAt,
          venueId: slot.venueId,
        });
      });
    });
  }

  matches.sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());

  const normalizedMatches = assignRoundNumbers(matches);

  return { matches: normalizedMatches };
}

type SlotIteratorOptions = {
  startAt: Date;
  matchDurationMinutes: number;
  breakMinutes: number;
  venues: RoundRobinVenueInput[];
};

type MatchSlot = {
  kickoffAt: Date;
  venueId: string;
};

function createSlotIterator(options: SlotIteratorOptions) {
  let currentStart = options.startAt.getTime();
  let venueIndex = 0;

  const increment =
    (options.matchDurationMinutes + options.breakMinutes) * 60 * 1000;

  return {
    next(): IteratorResult<MatchSlot> {
      const venue = options.venues[venueIndex];

      if (!venue) {
        return { done: true, value: undefined };
      }

      const kickoffAt = new Date(currentStart);
      const value: MatchSlot = {
        kickoffAt,
        venueId: venue.id,
      };

      venueIndex += 1;
      if (venueIndex >= options.venues.length) {
        venueIndex = 0;
        currentStart += increment;
      }

      return { done: false, value };
    },

    [Symbol.iterator]() {
      return this;
    },
  };
}

type MatchPair = {
  home: string;
  away: string;
};

function createRoundRobinRounds(
  entryIds: string[],
  mode: RoundRobinMode,
): MatchPair[][] {
  const uniqueEntries = Array.from(new Set(entryIds));

  if (uniqueEntries.length !== entryIds.length) {
    throw createProblem({
      type: "https://tournament.app/problems/round-robin/duplicate-entry",
      title: "Duplicate entries detected",
      status: 400,
      detail: "Each entry can only be scheduled once per group.",
    });
  }

  const hasOddTeams = uniqueEntries.length % 2 !== 0;
  const teams = [...uniqueEntries];

  if (hasOddTeams) {
    teams.push(BYE_ENTRY_ID);
  }

  const totalRounds = teams.length - 1;
  const matchesPerRound = teams.length / 2;
  const rounds: MatchPair[][] = [];

  const rotating = teams.slice(1);
  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const roundTeams = [teams[0], ...rotating];
    const roundMatches: MatchPair[] = [];

    for (let matchIndex = 0; matchIndex < matchesPerRound; matchIndex += 1) {
      const home = roundTeams[matchIndex];
      const away = roundTeams[roundTeams.length - 1 - matchIndex];

      if (home === undefined || away === undefined) {
        continue;
      }

      if (home === BYE_ENTRY_ID || away === BYE_ENTRY_ID) {
        continue;
      }

      const shouldSwapHomeAway = roundIndex % 2 === matchIndex % 2;
      if (shouldSwapHomeAway) {
        roundMatches.push({ home: away, away: home });
      } else {
        roundMatches.push({ home, away });
      }
    }

    rounds.push(roundMatches);

    const rotatedLast = rotating.pop();
    if (rotatedLast !== undefined) {
      rotating.unshift(rotatedLast);
    }
  }

  if (mode === "double") {
    const mirrored = rounds.map((round) =>
      round.map(({ home, away }) => ({ home: away, away: home })),
    );
    return [...rounds, ...mirrored];
  }

  return rounds;
}

function assignRoundNumbers(matches: PlannedMatch[]): PlannedMatch[] {
  if (!matches.length) {
    return matches;
  }

  const sortedMatches = [...matches].sort(
    (a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime(),
  );

  let currentRound = 1;
  let currentTimestamp = sortedMatches[0]?.kickoffAt.getTime() ?? 0;

  return sortedMatches.map((match, index) => {
    const kickoff = match.kickoffAt.getTime();
    if (kickoff > currentTimestamp) {
      currentRound += 1;
      currentTimestamp = kickoff;
    } else if (index === 0) {
      currentTimestamp = kickoff;
    }

    return {
      ...match,
      roundNumber: currentRound,
    };
  });
}
