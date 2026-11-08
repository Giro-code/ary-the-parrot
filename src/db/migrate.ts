import { migrate } from "drizzle-orm/pglite/migrator";
import type { Database } from "./client.ts";
// Drizzle's migrator uses the shared PgDialect and real driver transactions.
export async function migrateDatabase(db: Database) { await migrate(db, { migrationsFolder: "drizzle" }); }
