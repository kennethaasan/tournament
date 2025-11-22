import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import { type DatabaseSchema, schema } from "./schema";

const databaseUrl = env.DATABASE_URL ?? "";

// When skipping validation, env.DATABASE_URL might be undefined or empty if not set in process.env
// However, our env.ts configures it as z.string().url(), so in runtime it should be valid unless mocked.
// But since we handle SKIP_ENV_VALIDATION in env.ts, we might get undefined if not set.
// Actually, createEnv returns typed values. If skipped, it returns process.env values which might be missing.
// But we are forcing a mock url in the postgres constructor if needed.

type SqlClient = ReturnType<typeof postgres>;

function createSqlClient(): SqlClient {
  return postgres(databaseUrl || "postgres://mock:mock@localhost:5432/mock", {
    max: env.DATABASE_POOL_MAX,
    idle_timeout: env.DATABASE_IDLE_TIMEOUT,
    prepare: false,
    onnotice: () => undefined,
  });
}

function createDrizzleClient(sql: SqlClient) {
  return drizzle<DatabaseSchema>(sql, {
    schema,
    logger: env.NODE_ENV === "development",
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
