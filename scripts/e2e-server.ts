import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { connectDatabase } from "../src/db/client.ts";
import { migrateDatabase } from "../src/db/migrate.ts";
import { seedDatabase, type SourceCheck } from "../src/db/seed.ts";
import { activateKiosk, createHandoff, createSession, enrollKiosk, setPreferences } from "../src/server/service.ts";
import { seedDemo } from "../src/db/demo.ts";
import { culturalItems } from "../src/db/schema.ts";
// Dedicated synthetic DB: never touches DATABASE_URL or the developer's .pglite.
process.env.DATABASE_URL = "";
process.env.APP_BASE_URL = "http://127.0.0.1:3002";
process.env.EMAIL_DRY_RUN = "true";
// Never call a real AI provider from automated/browser tests, even if .env.local has a key.
process.env.GEMINI_API_KEY = "";
process.env.ROBOT_BRIDGE_SECRET = "synthetic-e2e-bridge-secret-32-characters";
process.env.FEATURE_ENABLE_MARKETING = "false";
process.env.FEATURE_ENABLE_PARTNER_SHARING = "true";
Object.assign(process.env, { NODE_ENV: "development" });
await mkdir(".cache", { recursive: true });
process.env.PGLITE_DATA_DIR = await mkdtemp(resolve(".cache/ary-e2e-"));
const connection = await connectDatabase();
const activationCodes: string[] = [];
let expiredToken: string;
try {
  await migrateDatabase(connection.db);
  await seedDatabase(connection.db, JSON.parse(await readFile("docs/evidence/stage2/seed-sources.json", "utf8")) as SourceCheck[]);
  await seedDemo(connection.db);
  // Historical, synthetic source fixture: CMS workflow E2E does not claim live source HTTP.
  await connection.db.insert(culturalItems).values({ id: "4b000000-0000-4000-8000-000000000020", contentKey: "demo-e2e-cms", title: "DEMO · Borrador CMS de prueba", type: "history", summary: "Contenido sintético para probar la revisión.", validatedDescription: "Solo fixture de pruebas, no una afirmación cultural.", language: "es", sourceUrl: "https://example.com", license: "Fixture propio", editor: "Synthetic E2E", sourceCheckedAt: new Date(), status: "draft", demo: true });
  for (let i = 0; i < 8; i++) activationCodes.push((await enrollKiosk(connection.db, `Synthetic E2E ${i}`)).code);
  const kiosk = await enrollKiosk(connection.db, "Expired fixture");
  await activateKiosk(connection.db, kiosk.code);
  const visitor = await createSession(connection.db, "es", kiosk.deviceId);
  await setPreferences(connection.db, visitor.session, { locale: "es", interests: ["music"], countryDeclared: "BO" });
  expiredToken = (await createHandoff(connection.db, visitor.session, kiosk.deviceId, new Date(), -1000)).token;
} finally { await connection.close(); }
await writeFile(".cache/stage2-fixture.json", JSON.stringify({ activationCodes, expiredToken, dataDir: process.env.PGLITE_DATA_DIR }));
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3002"], { stdio: "inherit", env: process.env });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
child.on("error", () => { console.error("E2E server could not start (subprocess launch blocked)."); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code || 0; });
