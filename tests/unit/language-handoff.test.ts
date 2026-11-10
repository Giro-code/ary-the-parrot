import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { connectDatabase, type Connection } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { createSession, setPreferences, enrollKiosk, activateKiosk, createHandoff, saveItem, listSaved } from "../../src/server/service";
import { culturalItems } from "../../src/db/schema";
let connection: Connection;
vi.mock("../../src/db/client", async original => ({ ...await original<typeof import("../../src/db/client")>(), getConnection: async () => connection }));
import { POST } from "../../app/api/[...path]/route";
const origin = "http://localhost:3000";
beforeAll(async () => { connection = await connectDatabase({ memory: true }); await migrateDatabase(connection.db); }, 30000);
afterAll(async () => connection.close()); afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
test.each([
  { source: "en", header: "es-ES,en;q=.8", expected: "es" },
  { source: "es", header: "en-US,es;q=.8", expected: "en" },
  { source: "es", header: "fr-FR,es;q=.8", expected: "en" },
  { source: "en", header: "es-ES", cookie: "en", expected: "en" },
  { source: "es", header: "en-US", cookie: "es", expected: "es" },
  { source: "en", header: "en-US", browserLocale: "es", expected: "es" },
] as const)("handoff uses phone policy $header / $cookie with preferences intact", async scenario => {
  vi.stubEnv("APP_BASE_URL", origin); vi.stubEnv("EMAIL_DRY_RUN", "true"); vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network"); }));
  const db = connection.db, device = await enrollKiosk(db, "Synthetic language test"); await activateKiosk(db, device.code);
  const source = await createSession(db, scenario.source, device.deviceId);
  await setPreferences(db, source.session, { locale: scenario.source, countryDeclared: "BO", interests: ["music"] });
  const [item] = await db.insert(culturalItems).values({ contentKey: crypto.randomUUID(), language: "en", title: "Synthetic culture", summary: "Synthetic summary", validatedDescription: "Synthetic summary", sourceUrl: "https://example.invalid", editor: "Test", license: "Synthetic test fixture", sourceCheckedAt: new Date(), status: "published", demo: true, type: "heritage" }).returning();
  await saveItem(db, source.session.id, item.id);
  // The handoff takes its snapshot from the current database session.
  const { getSession } = await import("../../src/server/service");
  const qr = await createHandoff(db, await getSession(db, source.token), device.deviceId);
  const cookie = "cookie" in scenario ? `ary_lang=${scenario.cookie}` : "";
  const response = await POST(new NextRequest(origin + "/api/visitor/handoff/redeem", { method: "POST", headers: { host: "localhost:3000", origin, "x-ary-request": "1", "x-forwarded-for": crypto.randomUUID(), "content-type": "application/json", cookie, "accept-language": scenario.header }, body: JSON.stringify({ token: qr.token, confirmationCode: qr.confirmationCode, ...("browserLocale" in scenario ? { browserLocale: scenario.browserLocale } : {}) }) }));
  expect(response.status).toBe(200); const restored = (await response.json()).session;
  expect(restored).toMatchObject({ locale: scenario.expected, interests: ["music"], countryDeclared: "BO" });
  const token = response.headers.getSetCookie().find(value => value.startsWith("ary_sid="))?.split(";")[0].slice("ary_sid=".length), mobile = await getSession(db, token);
  expect((await listSaved(db, mobile.id))[0].item.id).toBe(item.id);
  expect(response.headers.getSetCookie().find(value => value.startsWith("ary_phone="))).toContain(`ary_phone=${scenario.expected}`);
  expect(response.headers.getSetCookie().find(value => value.startsWith("ary_phone="))).toContain("HttpOnly"); expect(fetch).not.toHaveBeenCalled();
});
