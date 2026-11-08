import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema.ts";
import { AppError } from "../server/errors.ts";
import { resolve } from "node:path";

// Both drivers implement the same PostgreSQL Drizzle query/transaction API.
export type Database = PgliteDatabase<typeof schema>;
export interface Connection { db: Database; close: () => Promise<void>; mode: "pglite" | "neon" }
export async function connectDatabase(options: { memory?: boolean; dataDir?: string } = {}): Promise<Connection> {
  if (!options.memory && process.env.DATABASE_URL?.trim()) {
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
    return { db: neonDrizzle(pool, { schema }) as unknown as Database, close: () => pool.end(), mode: "neon" };
  }
  if (!options.memory && process.env.NODE_ENV === "production") throw new AppError("database_not_configured", 503);
  // Local data is never a deployable asset; do not trace a developer-controlled directory.
  const client = new PGlite(options.memory ? undefined : resolve(/* turbopackIgnore: true */ options.dataDir || process.env.PGLITE_DATA_DIR || ".pglite"));
  await client.waitReady;
  return { db: drizzle(client, { schema }), close: () => client.close(), mode: "pglite" };
}
const globalDb = globalThis as unknown as { aryConnection?: Promise<Connection> };
export async function getConnection() {
  // Check before the singleton: a dev connection must never become a production fallback.
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL?.trim()) throw new AppError("database_not_configured", 503);
  globalDb.aryConnection ??= connectDatabase().catch(error => { globalDb.aryConnection = undefined; throw error; });
  return globalDb.aryConnection;
}
