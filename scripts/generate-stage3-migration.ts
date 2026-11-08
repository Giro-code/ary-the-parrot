import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import { readFile, writeFile } from "node:fs/promises";
import * as schema from "../src/db/schema.ts";
// Native Node entry point for this migration. No project runtime/config workarounds.
const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
if (journal.entries.length !== 1) throw new Error("Stage 3 migration already exists; use db:generate for future migrations.");
const previous = JSON.parse(await readFile("drizzle/meta/0000_snapshot.json", "utf8"));
const current = generateDrizzleJson(schema, previous.id);
const statements = await generateMigration(previous, current);
await writeFile("drizzle/0001_stage3_email_privacy.sql", statements.join("\n--> statement-breakpoint\n") + "\n");
await writeFile("drizzle/meta/0001_snapshot.json", JSON.stringify(current, null, 2) + "\n");
journal.entries.push({ idx: 1, version: "7", when: Math.max(Date.now(), journal.entries[0].when + 1), tag: "0001_stage3_email_privacy", breakpoints: true });
await writeFile("drizzle/meta/_journal.json", JSON.stringify(journal, null, 2) + "\n");
console.log(`Stage 3: ${statements.length} SQL statements generated.`);
