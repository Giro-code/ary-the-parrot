import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { desc, sql } from "drizzle-orm";
import { connectDatabase, type Database } from "../src/db/client.ts";
import { aiUsage } from "../src/db/schema.ts";
import { migrateDatabase } from "../src/db/migrate.ts";
import { loadCliEnv, option } from "./cli-env.ts";

const label = (value: string) => /^[a-zA-Z0-9_.-]{1,100}$/.test(value) ? value : "[redacted]";
export async function aiUsageReport(db: Database, limit = 20) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) throw new Error("Invalid report limit");
  const rows = await db.transaction(async tx => {
    await tx.execute(sql`SET TRANSACTION READ ONLY`);
    return tx.select().from(aiUsage).orderBy(desc(aiUsage.createdAt), desc(aiUsage.id)).limit(limit);
  });
  const lines = ["date | model | mode | errorCode | latencyMs | inputTokens | outputTokens", ...rows.map(row => `${row.createdAt.toISOString()} | ${label(row.model)} | ${label(row.mode)} | ${row.errorCode ? label(row.errorCode) : "OK"} | ${row.latencyMs} | ${row.inputTokens} | ${row.outputTokens}`), `Summary: ${rows.length} rows (latest ${limit})`];
  const errors = new Map<string, number>();
  for (const row of rows) if (row.errorCode) errors.set(row.errorCode, (errors.get(row.errorCode) || 0) + 1);
  lines.push(`Errors: ${rows.filter(row => row.errorCode).length}/${rows.length} (${rows.length ? (100 * rows.filter(row => row.errorCode).length / rows.length).toFixed(1) : "0.0"}%)`);
  for (const [code, count] of [...errors].sort(([a], [b]) => a.localeCompare(b))) lines.push(`${label(code)}: ${count} (${(100 * count / rows.length).toFixed(1)}% of rows)`);
  for (const model of [...new Set(rows.map(row => row.model))].sort()) {
    const times = rows.filter(row => row.model === model).map(row => row.latencyMs).sort((a, b) => a - b);
    lines.push(`${label(model)}: n=${times.length}, mean=${(times.reduce((sum, value) => sum + value, 0) / times.length).toFixed(1)}ms, p90=${times[Math.ceil(times.length * .9) - 1]}ms`);
  }
  return lines.join("\n");
}
export async function runAiUsageReport(args = process.argv.slice(2), print: (line: string) => void = console.log) {
  const count = Number(option(args, "limit") || "20"), memory = args.includes("--memory");
  if (!Number.isInteger(count) || count < 1 || count > 10_000) throw new Error("Invalid report limit");
  if (!memory) loadCliEnv(args);
  const connection = await connectDatabase({ memory });
  try {
    // Only the explicitly requested disposable test database needs a schema.
    // An existing/local/remote database is queried in a read-only transaction.
    if (memory) await migrateDatabase(connection.db);
    print(await aiUsageReport(connection.db, count));
  } finally { await connection.close(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runAiUsageReport().catch(() => { console.error("AI usage report failed. Check configuration, schema and --limit (1–10000)."); process.exitCode = 1; });
}
