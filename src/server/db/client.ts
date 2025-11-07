import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { type DatabaseSchema, schema } from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialise the database client");
}

type SqlClient = ReturnType<typeof postgres>;

function createSqlClient(): SqlClient {
  const maxPool = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "10", 10);
  const idleTimeout = Number.parseInt(
    process.env.DATABASE_IDLE_TIMEOUT ?? "30",
    10,
  );

  return postgres(databaseUrl, {
    max: Number.isNaN(maxPool) ? 10 : maxPool,
    idle_timeout: Number.isNaN(idleTimeout) ? 30 : idleTimeout,
    prepare: false,
    onnotice: () => undefined,
  });
}

function createDrizzleClient(sql: SqlClient) {
  return drizzle<DatabaseSchema>(sql, {
    schema,
    logger: process.env.NODE_ENV === "development",
  });
}

type DrizzleDatabase = ReturnType<typeof createDrizzleClient>;

type GlobalWithDb = typeof globalThis & {
  __tournamentSql?: SqlClient;
  __tournamentDb?: DrizzleDatabase;
};

const globalState = globalThis as GlobalWithDb;

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
