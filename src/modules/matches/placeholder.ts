export type MatchParticipantSource =
  | { type: "seed"; seed: number; entryId?: string | null }
  | { type: "winner" | "loser"; matchId: string };

export type MatchMetadata = {
  homeSource?: MatchParticipantSource | null;
  awaySource?: MatchParticipantSource | null;
  roundNumber?: number | null;
};

export function parseMatchMetadata(input: unknown): MatchMetadata {
  if (!input || typeof input !== "object") {
    return {};
  }

  const record = input as Record<string, unknown>;

  return {
    homeSource: parseMatchSource(record.homeSource),
    awaySource: parseMatchSource(record.awaySource),
    roundNumber: parseRoundNumber(record.roundNumber),
  };
}

export function buildBracketRoundMap(
  rows: Array<{ bracketId: string | null; metadata: unknown }>,
): Map<string, number> {
  const map = new Map<string, number>();

  for (const row of rows) {
    if (!row.bracketId) {
      continue;
    }
    const metadata = parseMatchMetadata(row.metadata);
    if (!metadata.roundNumber) {
      continue;
    }
    const previous = map.get(row.bracketId) ?? 0;
    if (metadata.roundNumber > previous) {
      map.set(row.bracketId, metadata.roundNumber);
    }
  }

  return map;
}

export function derivePlaceholderName(
  source: MatchParticipantSource | null | undefined,
  bracketRounds: Map<string, number>,
): string | null {
  if (!source) {
    return null;
  }

  if (source.type === "seed") {
    return `Seed ${source.seed}`;
  }

  const matchRef = parseBracketMatchId(source.matchId);
  if (!matchRef) {
    return null;
  }

  const maxRound = bracketRounds.get(matchRef.bracketId);
  const code = formatKnockoutCode(matchRef.roundNumber, maxRound);

  if (source.type === "winner") {
    return `Vinner av ${code}`;
  }

  return `Taper av ${code}`;
}

function parseMatchSource(input: unknown): MatchParticipantSource | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const type = record.type;

  if (type === "seed") {
    const seed = Number(record.seed);
    if (!Number.isFinite(seed) || seed < 1) {
      return null;
    }
    return {
      type: "seed",
      seed: Math.trunc(seed),
      entryId: typeof record.entryId === "string" ? record.entryId : null,
    };
  }

  if (type === "winner" || type === "loser") {
    if (typeof record.matchId !== "string" || record.matchId.length === 0) {
      return null;
    }
    return {
      type,
      matchId: record.matchId,
    };
  }

  return null;
}

function parseRoundNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  const rounded = Math.trunc(value);
  return rounded > 0 ? rounded : null;
}

function parseBracketMatchId(value: string): {
  bracketId: string;
  roundNumber: number;
  matchIndex: number;
} | null {
  const match = /^(.*)-r(\d+)-m(\d+)$/.exec(value);
  if (!match) {
    return null;
  }

  const bracketId = match[1];
  const roundNumber = Number(match[2]);
  const matchIndex = Number(match[3]);

  if (!bracketId || !Number.isFinite(roundNumber)) {
    return null;
  }

  return {
    bracketId,
    roundNumber,
    matchIndex: Number.isFinite(matchIndex) ? matchIndex : 0,
  };
}

function formatKnockoutCode(roundNumber: number, maxRound?: number): string {
  if (maxRound !== undefined && roundNumber === maxRound) {
    return "F";
  }

  if (maxRound !== undefined && roundNumber === maxRound - 1) {
    return `SF${roundNumber}`;
  }

  return `R${roundNumber}`;
}
