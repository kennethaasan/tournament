import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  addSquadMember,
  createEntry,
  ensureSquad,
  submitMatchDispute,
} from "@/modules/entries/service";
import {
  addRosterMember,
  createTeam,
  listTeamRoster,
} from "@/modules/teams/service";
import {
  entries as entriesTable,
  matchDisputes,
  matches,
  persons,
  squadMembers,
  squads,
  teamMemberships,
  teams,
} from "@/server/db/schema";

type TableName =
  | "teams"
  | "persons"
  | "teamMemberships"
  | "entries"
  | "squads"
  | "squadMembers"
  | "matches"
  | "matchDisputes";

type Row = Record<string, unknown>;
type TableStore = Record<TableName, Row[]>;

type EqCondition = {
  type: "eq";
  column: string;
  value: unknown;
};

type AndCondition = {
  type: "and";
  conditions: Array<EqCondition | AndCondition>;
};

type FilterCondition = EqCondition | AndCondition | undefined;

type JoinCondition = {
  type: "join";
  leftColumn: string;
  rightColumn: string;
};

const TABLE_NAMES: TableName[] = [
  "teams",
  "persons",
  "teamMemberships",
  "entries",
  "squads",
  "squadMembers",
  "matches",
  "matchDisputes",
];

const TABLE_REGISTRY = new Map<unknown, TableName>([
  [teams, "teams"],
  [persons, "persons"],
  [teamMemberships, "teamMemberships"],
  [entriesTable, "entries"],
  [squads, "squads"],
  [squadMembers, "squadMembers"],
  [matches, "matches"],
  [matchDisputes, "matchDisputes"],
]);

const { tableStore, idCounters } = vi.hoisted(() => {
  const store: TableStore = {
    teams: [],
    persons: [],
    teamMemberships: [],
    entries: [],
    squads: [],
    squadMembers: [],
    matches: [],
    matchDisputes: [],
  };

  const counters: Record<TableName, number> = {
    teams: 0,
    persons: 0,
    teamMemberships: 0,
    entries: 0,
    squads: 0,
    squadMembers: 0,
    matches: 0,
    matchDisputes: 0,
  };

  return { tableStore: store, idCounters: counters };
});

vi.mock("drizzle-orm", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => createEqCondition(column, value),
    and: (...conditions: Array<EqCondition | AndCondition>) => ({
      type: "and",
      conditions,
    }),
  };
});

vi.mock("@/server/db/client", () => {
  const dbClient = createMockDbClient(tableStore);
  return {
    db: dbClient.db,
    withTransaction: dbClient.withTransaction,
    sqlClient: {},
    shutdown: async () => undefined,
  };
});

const EDITION_ID = "edition-2025";
const MATCH_ID = "match-1";

beforeEach(() => {
  resetTableStore();
  seedMatch({
    id: MATCH_ID,
    editionId: EDITION_ID,
    kickoffAt: new Date("2025-05-17T10:00:00Z"),
  });
});

describe("Team manager dashboard flows", () => {
  test("supports roster, entry, squad, and dispute management", async () => {
    const team = await createTeam({
      name: "Oslo Vikinger",
      contactEmail: "lagleder@example.com",
    });

    expect(team.slug).toBe("oslo-vikinger");

    const captain = await addRosterMember({
      teamId: team.id,
      person: {
        firstName: "Kari",
        lastName: "Nordmann",
        preferredName: "Kaptein",
        country: "NO",
      },
      role: "captain",
    });

    await addRosterMember({
      teamId: team.id,
      person: {
        firstName: "Ida",
        lastName: "Keepersen",
      },
    });

    const roster = await listTeamRoster(team.id);
    expect(roster.team.id).toBe(team.id);
    expect(roster.members).toHaveLength(2);
    expect(roster.members.map((member) => member.role)).toEqual(
      expect.arrayContaining(["captain", "player"]),
    );

    const entry = await createEntry({
      editionId: EDITION_ID,
      teamId: team.id,
      notes: "Klar for kamp",
    });

    expect(entry.status).toBe("pending");
    expect(entry.submittedAt).toBeInstanceOf(Date);

    const squad = await ensureSquad(entry.id);
    expect(squad.entryId).toBe(entry.id);

    const squadMember = await addSquadMember({
      squadId: squad.id,
      membershipId: captain.membershipId,
      jerseyNumber: 10,
      position: "Midtbane",
      availability: "available",
      notes: "Kaptein",
    });

    expect(squadMember.jerseyNumber).toBe(10);
    expect(tableStore.squadMembers).toHaveLength(1);

    await submitMatchDispute({
      matchId: MATCH_ID,
      entryId: entry.id,
      reason: "Feil resultat rapportert",
    });

    expect(tableStore.matchDisputes).toHaveLength(1);
    expect(tableStore.matchDisputes[0]).toMatchObject({
      matchId: MATCH_ID,
      entryId: entry.id,
      reason: "Feil resultat rapportert",
      status: "open",
    });
  });
});

function createEqCondition(
  column: unknown,
  value: unknown,
): EqCondition | JoinCondition {
  const leftColumn = toPropertyKey(column);

  if (
    value &&
    typeof value === "object" &&
    "name" in (value as Record<string, unknown>)
  ) {
    return {
      type: "join",
      leftColumn,
      rightColumn: toPropertyKey(value),
    };
  }

  return {
    type: "eq",
    column: leftColumn,
    value,
  };
}

function toPropertyKey(column: unknown): string {
  if (
    column &&
    typeof column === "object" &&
    "name" in (column as Record<string, unknown>)
  ) {
    const raw = String((column as { name: string }).name);
    return snakeToCamel(raw);
  }

  return snakeToCamel(String(column));
}

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function createMockDbClient(store: TableStore) {
  const insert = (table: unknown) => ({
    values: (values: Row | Row[]) => {
      const tableName = resolveTableName(table);
      const rows = Array.isArray(values) ? values : [values];
      return createInsertBuilder(tableName, rows, store);
    },
  });

  const update = (table: unknown) => ({
    set: (values: Row) => ({
      where: async (condition?: FilterCondition) => {
        const tableName = resolveTableName(table);
        for (const row of store[tableName]) {
          if (matchesCondition(row, condition)) {
            Object.assign(row, values, { updatedAt: new Date() });
          }
        }
      },
    }),
  });

  const query = {
    teams: createQuery("teams", store),
    persons: createQuery("persons", store),
    teamMemberships: createQuery("teamMemberships", store),
    entries: createQuery("entries", store),
    squads: createQuery("squads", store),
    matches: createQuery("matches", store),
  };

  const select = (selection: Record<string, unknown>) =>
    createSelectBuilder(store, selection);

  const db = {
    insert,
    update,
    select,
    query,
  };

  return {
    db,
    withTransaction: async <T>(callback: (tx: typeof db) => Promise<T>) =>
      callback(db),
  };
}

function createInsertBuilder(
  tableName: TableName,
  rows: Row[],
  store: TableStore,
  conflict?: {
    strategy: "do_nothing" | "do_update";
    targetColumns: string[];
    set?: Row;
  },
) {
  const execute = () => {
    const inserted: Row[] = [];

    for (const rowData of rows) {
      const prepared = buildRow(tableName, rowData);
      const conflictRow = conflict
        ? findConflictRow(store[tableName], conflict.targetColumns, prepared)
        : undefined;

      if (conflict?.strategy === "do_nothing" && conflictRow) {
        continue;
      }

      if (conflict?.strategy === "do_update" && conflictRow) {
        Object.assign(conflictRow, conflict.set ?? {}, {
          updatedAt: new Date(),
        });
        inserted.push({ ...conflictRow });
        continue;
      }

      store[tableName].push(prepared);
      inserted.push(prepared);
    }

    return inserted;
  };

  return {
    returning: async () => execute(),
    onConflictDoNothing: (config: { target: unknown }) =>
      createInsertBuilder(tableName, rows, store, {
        strategy: "do_nothing",
        targetColumns: normalizeTarget(config.target),
      }),
    onConflictDoUpdate: (config: { target: unknown; set: Row }) =>
      createInsertBuilder(tableName, rows, store, {
        strategy: "do_update",
        targetColumns: normalizeTarget(config.target),
        set: config.set,
      }),
    then: (
      resolve: (value: Row[]) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(execute()).then(resolve, reject),
  };
}

function normalizeTarget(target: unknown): string[] {
  if (Array.isArray(target)) {
    return target.map((column) => toPropertyKey(column));
  }
  return [toPropertyKey(target)];
}

function findConflictRow(
  rows: Row[],
  columns: string[],
  candidate: Row,
): Row | undefined {
  return rows.find((existing) =>
    columns.every((column) => existing[column] === candidate[column]),
  );
}

function createQuery(tableName: TableName, store: TableStore) {
  return {
    findFirst: async ({ where }: { where?: FilterCondition }) => {
      if (!where) {
        return store[tableName][0];
      }

      return store[tableName].find((row) => matchesCondition(row, where));
    },
  };
}

function createSelectBuilder(
  store: TableStore,
  selection: Record<string, unknown>,
) {
  return {
    from: (table: unknown) => {
      const fromName = resolveTableName(table);
      return {
        where: (condition?: FilterCondition) => ({
          innerJoin: async (
            joinTable: unknown,
            joinCondition: JoinCondition,
          ) => {
            if (joinCondition.type !== "join") {
              throw new Error("Inner join requires column comparison");
            }

            const joinName = resolveTableName(joinTable);
            const leftRows = store[fromName].filter((row) =>
              matchesCondition(row, condition),
            );
            const results: Array<Record<string, Row>> = [];

            for (const leftRow of leftRows) {
              const rightRow = store[joinName].find(
                (candidate) =>
                  leftRow[joinCondition.leftColumn] ===
                  candidate[joinCondition.rightColumn],
              );

              if (!rightRow) {
                continue;
              }

              const record: Record<string, Row> = {};
              for (const [alias, tableRef] of Object.entries(selection)) {
                const aliasTableName = resolveTableName(tableRef);
                if (aliasTableName === fromName) {
                  record[alias] = leftRow;
                } else if (aliasTableName === joinName) {
                  record[alias] = rightRow;
                }
              }

              results.push(record);
            }

            return results;
          },
        }),
      };
    },
  };
}

function matchesCondition(row: Row, condition?: FilterCondition): boolean {
  if (!condition) {
    return true;
  }

  if (condition.type === "and") {
    return condition.conditions.every((child) =>
      matchesCondition(row, child as FilterCondition),
    );
  }

  if (condition.type === "eq") {
    return row[condition.column] === condition.value;
  }

  return false;
}

function resolveTableName(table: unknown): TableName {
  const tableName = TABLE_REGISTRY.get(table);
  if (!tableName) {
    throw new Error("Unsupported table reference in mock database");
  }
  return tableName;
}

function buildRow(tableName: TableName, values: Row): Row {
  const now = new Date();
  const base: Row = {
    id: values.id ?? createId(tableName),
    createdAt: values.createdAt ?? now,
    updatedAt: values.updatedAt ?? now,
  };

  switch (tableName) {
    case "teams":
      return {
        contactEmail: null,
        contactPhone: null,
        ...base,
        ...values,
      };
    case "persons":
      return {
        preferredName: null,
        birthDate: null,
        country: null,
        ...base,
        ...values,
      };
    case "teamMemberships":
      return {
        role: "player",
        status: "active",
        joinedAt: null,
        leftAt: null,
        meta: {},
        ...base,
        ...values,
      };
    case "entries":
      return {
        status: "pending",
        submittedAt: null,
        notes: null,
        ...base,
        ...values,
      };
    case "squads":
      return {
        lockedAt: null,
        ...base,
        ...values,
      };
    case "squadMembers":
      return {
        membershipId: null,
        jerseyNumber: null,
        position: null,
        availability: "available",
        notes: null,
        ...base,
        ...values,
      };
    case "matches":
      return {
        stageId: values.stageId ?? "stage-main",
        groupId: values.groupId ?? null,
        bracketId: values.bracketId ?? null,
        roundId: values.roundId ?? null,
        homeEntryId: values.homeEntryId ?? null,
        awayEntryId: values.awayEntryId ?? null,
        venueId: values.venueId ?? null,
        code: values.code ?? null,
        kickoffAt: values.kickoffAt ?? null,
        status: values.status ?? "scheduled",
        homeScore: values.homeScore ?? 0,
        awayScore: values.awayScore ?? 0,
        homeExtraTime: values.homeExtraTime ?? null,
        awayExtraTime: values.awayExtraTime ?? null,
        homePenalties: values.homePenalties ?? null,
        awayPenalties: values.awayPenalties ?? null,
        outcome: values.outcome ?? null,
        notes: values.notes ?? null,
        metadata: values.metadata ?? {},
        publishedAt: values.publishedAt ?? null,
        ...base,
        ...values,
      };
    case "matchDisputes":
      return {
        status: "open",
        resolutionNotes: null,
        resolvedAt: null,
        ...base,
        ...values,
      };
    default:
      return {
        ...base,
        ...values,
      };
  }
}

function createId(tableName: TableName): string {
  idCounters[tableName] += 1;
  return `${tableName}-${idCounters[tableName]}`;
}

function resetTableStore(): void {
  for (const name of TABLE_NAMES) {
    tableStore[name] = [];
    idCounters[name] = 0;
  }
}

function seedMatch(values: Row): void {
  tableStore.matches.push(
    buildRow("matches", {
      stageId: "stage-main",
      ...values,
    }),
  );
}
