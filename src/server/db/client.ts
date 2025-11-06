import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

type DrizzleDatabase = PostgresJsDatabase<Record<string, never>>;
type GlobalWithDb = typeof globalThis & {
  __tournamentSql?: Sql<unknown>;
  __tournamentDb?: DrizzleDatabase;
};

const globalState = globalThis as GlobalWithDb;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialise the database client");
}

function createSqlClient(): Sql<unknown> {
  const maxPool = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "10", 10);
  const idleTimeout = Number.parseInt(process.env.DATABASE_IDLE_TIMEOUT ?? "30", 10);

  return postgres(databaseUrl, {
    max: Number.isNaN(maxPool) ? 10 : maxPool,
    idle_timeout: Number.isNaN(idleTimeout) ? 30 : idleTimeout,
    prepare: false,
    onnotice: () => undefined,
  });
}

function createDrizzleClient(sql: Sql<unknown>): DrizzleDatabase {
  return drizzle(sql, {
    logger: process.env.NODE_ENV === "development",
  });
}

const sql = globalState.__tournamentSql ?? createSqlClient();
const db = globalState.__tournamentDb ?? createDrizzleClient(sql);

globalState.__tournamentSql = sql;
globalState.__tournamentDb = db;

type TransactionCallback = Parameters<DrizzleDatabase["transaction"]>[0];
type TransactionOptions = Parameters<DrizzleDatabase["transaction"]>[1];
type TransactionClient = Parameters<TransactionCallback>[0];

export { db };
export type { DrizzleDatabase, TransactionClient, TransactionOptions };

export const sqlClient = sql;

export async function withTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  return db.transaction(async (tx) => callback(tx), options);
}

export async function shutdown(): Promise<void> {
  await sql.end({ timeout: 5 });
  globalState.__tournamentSql = undefined;
  globalState.__tournamentDb = undefined;
}
