import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { eq } from "drizzle-orm";
import { connectDatabase, type Connection } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { seedDatabase, seedEntries } from "../../src/db/seed";
import { importCatalog, readCatalog } from "../../src/db/catalog-import";
import * as s from "../../src/db/schema";
import { createSession as anonymousSession } from "../../src/server/service";
import { grantConsent, noticeVersion } from "../../src/server/consents";
import { textLanguage } from "../../src/i18n";

let connection: Connection;
vi.mock("../../src/db/client", async original => ({ ...await original<typeof import("../../src/db/client")>(), getConnection: async () => connection }));
import { POST as ask } from "../../app/api/voice/ask/route";
const origin = "http://localhost:3000", db = () => connection.db;
async function createSession() {
  const created = await anonymousSession(db());
  const [session] = await db().update(s.visitorSessions).set({ pendingEmailHash: randomUUID() }).where(eq(s.visitorSessions.id, created.session.id)).returning();
  await grantConsent(db(), session, { purpose: "terms", noticeVersion, locale: session.locale }, "synthetic_test");
  return { ...created, session };
}
beforeAll(async () => {
  connection = await connectDatabase({ memory: true }); await migrateDatabase(db());
  await seedDatabase(db(), seedEntries.map(entry => ({ url: entry.url, finalUrl: entry.url, status: 200, checkedAt: "2026-11-11T12:00:00Z", verified: true })));
  await importCatalog(db(), await readCatalog(), { production: true });
}, 60000);
beforeEach(async () => {
  vi.stubEnv("APP_BASE_URL", origin); vi.stubEnv("GEMINI_API_KEY", "synthetic-key-not-real"); vi.stubEnv("AI_MODEL", "gemini-3.5-flash-lite");
  vi.stubEnv("AI_SESSION_PER_MINUTE", "20"); vi.stubEnv("AI_GLOBAL_PER_MINUTE", "120");
  vi.stubGlobal("fetch", vi.fn()); await db().delete(s.rateLimits);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterAll(async () => connection.close());
const webm = () => new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, ...new Array(100).fill(0)]);
const request = (token: string) => new NextRequest(origin + "/api/voice/ask", { method: "POST", headers: { host: "localhost:3000", origin, "x-ary-request": "1", "content-type": "audio/webm;codecs=opus", "x-ary-audio-duration": "1000", cookie: `ary_sid=${token}` }, body: webm() });
// Each call cites the first record it was given; the audio call cites nothing relevant.
function mockGemini(transcript: string) {
  const seen: string[][] = [];
  vi.mocked(fetch).mockImplementation(async (_url, options) => {
    const body = JSON.parse(String(options?.body)), items = JSON.parse(body.contents[0].parts[0].text.split("\n")[1]) as { id: string; title: string }[];
    seen.push(items.map(item => item.title));
    const audio = body.contents[0].parts.some((part: { inlineData?: unknown }) => part.inlineData);
    // Like the real model, cite a supplied record only when the visitor named it.
    const named = items.find(item => transcript.toLowerCase().includes(item.title.toLowerCase())) || (audio ? undefined : items[0]);
    const answer = { detectedLanguage: textLanguage(transcript, "es"), displayText: named ? `Te cuento sobre ${named.title}.` : "Te cuento algo general.", spokenText: "Te cuento.", intent: named ? "culture" : "general", citedItemIds: named ? [named.id] : [], followUps: [], confidence: .9 };
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(audio ? { ...answer, transcript } : answer) }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 } });
  });
  return seen;
}
test("a spoken question about a catalog entry outside the voice shortlist is re-answered with that entry", async () => {
  const seen = mockGemini("Háblame de Bahía de las Águilas"), visitor = await createSession();
  const reply = await (await ask(request(visitor.token))).json();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(seen[0].some(title => /Águilas/.test(title))).toBe(false);
  expect(seen[1][0]).toMatch(/Bahía de las Águilas/);
  expect(reply.sources[0].title).toMatch(/Bahía de las Águilas/);
  expect(reply.sources[0].image).toBeTruthy();
});
test("a spoken question already covered by the shortlist makes a single call", async () => {
  mockGemini("Cuéntame del merengue"); const visitor = await createSession();
  expect((await ask(request(visitor.token))).status).toBe(200);
  expect(fetch).toHaveBeenCalledTimes(1);
});
