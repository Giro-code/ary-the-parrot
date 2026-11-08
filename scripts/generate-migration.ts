import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import * as schema from "../src/db/schema.ts";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
// Initial migration only. Subsequent schema changes use drizzle-kit generate.
if (existsSync("drizzle/0000_ary_core.sql")) throw new Error("Initial migration already exists. Use npm run db:generate for future changes.");
const previous = generateDrizzleJson({});
previous.id = "00000000-0000-0000-0000-000000000000";
const current = generateDrizzleJson(schema, previous.id);
const statements = await generateMigration(previous, current);
await mkdir("drizzle/meta", { recursive: true });
await mkdir("drizzle/rollback", { recursive: true });
await writeFile("drizzle/0000_ary_core.sql", statements.join("\n--> statement-breakpoint\n") + "\n");
await writeFile("drizzle/meta/0000_snapshot.json", JSON.stringify(current, null, 2) + "\n");
await writeFile("drizzle/meta/_journal.json", JSON.stringify({ version: "7", dialect: "postgresql", entries: [{ idx: 0, version: "7", when: 1794096000000, tag: "0000_ary_core", breakpoints: true }] }, null, 2) + "\n");
await writeFile("drizzle/rollback/0000_ary_core.sql", "-- DESTRUCTIVE: only on an explicitly approved empty/test database.\n" + Object.values(current.tables).map(table => `DROP TABLE IF EXISTS "${(table as { name: string }).name}" CASCADE;`).join("\n") + "\nDROP SCHEMA IF EXISTS drizzle CASCADE;\n");
console.log(`Generated ${statements.length} migration statements.`);
