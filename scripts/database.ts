import nextEnv from "@next/env";
import { connectDatabase } from "../src/db/client.ts";
import { migrateDatabase } from "../src/db/migrate.ts";
import { checkSources, seedDatabase } from "../src/db/seed.ts";
import { enrollKiosk } from "../src/server/service.ts";
import { baseUrl } from "../src/server/config.ts";
import { cleanupDatabase } from "../src/db/cleanup.ts";
import { mkdir, writeFile } from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd());
const connection = await connectDatabase();
try {
  const command = process.argv[2];
  if (command === "migrate") { await migrateDatabase(connection.db); console.log(`Migrations applied (${connection.mode}).`); }
  else if (command === "seed") {
    const checks = await checkSources();
    await seedDatabase(connection.db, checks);
    await mkdir("docs/evidence/stage2", { recursive: true });
    await writeFile("docs/evidence/stage2/seed-sources.json", JSON.stringify(checks, null, 2) + "\n");
    console.log(`Demo seed: ${checks.filter(c => c.verified).length}/12 verified sources; two languages. Unverified content is needs_source.`);
  } else if (command === "enroll") {
    const labelIndex = process.argv.indexOf("--label"), deviceIndex = process.argv.indexOf("--device");
    const label = labelIndex >= 0 ? process.argv[labelIndex + 1]?.trim() : "Demo kiosk";
    if (!label || label.length > 120) throw new Error("Invalid label");
    const deviceId = deviceIndex >= 0 ? process.argv[deviceIndex + 1] : undefined;
    const result = await enrollKiosk(connection.db, label, deviceId);
    // Intentional operator output, never application logging. One use, ten minutes.
    console.log(`Device: ${result.deviceId}\nActivation (private, one use, 10 minutes): ${baseUrl()}/kiosco/activar?code=${result.code}`);
  } else if (command === "cleanup") { await cleanupDatabase(connection.db); console.log("Expired operational data cleaned."); }
  else throw new Error("Use migrate, seed, enroll or cleanup");
} catch { console.error("Database command failed. Check configuration and migrations; credentials omitted."); process.exitCode = 1; }
finally { await connection.close(); }
