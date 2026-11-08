// Explicit, one-request live smoke test. Never run from automated test suites.
import nextEnv from "@next/env";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { connectDatabase } from "../src/db/client.ts";
import { migrateDatabase } from "../src/db/migrate.ts";
import { seedDatabase, type SourceCheck } from "../src/db/seed.ts";
import { createSession } from "../src/server/service.ts";
import { chat } from "../src/server/ai/chat.ts";
import { aiUsage } from "../src/db/schema.ts";
if (!process.argv.includes("--live")) throw new Error("An authorized live check requires --live.");
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
if (!process.env.GEMINI_API_KEY?.trim()) {
  console.log("Live AI check skipped: key absent.");
  process.exit(0);
}
const connection = await connectDatabase({ memory: true });
try {
  await migrateDatabase(connection.db);
  await seedDatabase(connection.db, JSON.parse(await readFile("docs/evidence/stage2/seed-sources.json", "utf8")) as SourceCheck[]);
  const visitor = await createSession(connection.db);
  const reply = await chat(connection.db, visitor.token, { message: "Cuéntame en una frase sobre el merengue." });
  const [usage] = await connection.db.select().from(aiUsage);
  const result = { model: usage.model, latencyMs: usage.latencyMs, validated: reply.mode === "gemini", errorCode: usage.errorCode };
  await mkdir("docs/evidence/stage4a", { recursive: true });
  await writeFile("docs/evidence/stage4a/live-ai.json", JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
  if (!result.validated) process.exitCode = 1;
} finally { await connection.close(); }
