import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { eq } from "drizzle-orm";
import { connectDatabase, type Connection } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { seedDatabase, seedEntries } from "../../src/db/seed";
import { catalogMerges, importCatalog, readCatalog, type CatalogCandidate } from "../../src/db/catalog-import";
import * as s from "../../src/db/schema";
import { catalogSearch, createCatalogSearch } from "../../src/server/ai/catalog-search";
import { createSession, findItem, listItems, type CulturalItem } from "../../src/server/service";
import { chat, chatHistory } from "../../src/server/ai/chat";
import { DemoAiProvider, modelContext } from "../../src/server/ai/providers";
import { catalogVisibility, staffCatalog } from "../../src/server/catalog-admin";
import { itemMedia } from "../../src/server/item-media";
let connection: Connection, candidates: CatalogCandidate[], rows: CulturalItem[], original: CulturalItem[];
const db = () => connection.db;
beforeAll(async () => {
  connection = await connectDatabase({ memory: true }); await migrateDatabase(db());
  await seedDatabase(db(), seedEntries.map(entry => ({ url: entry.url, finalUrl: entry.url, status: 200, checkedAt: "2026-11-11T12:00:00Z", verified: true })));
  original = await db().select().from(s.culturalItems);
  candidates = await readCatalog();
  const first = await importCatalog(db(), candidates, { production: true });
  console.log("STAGE10B_IMPORT_FIRST", JSON.stringify(first));
  expect(first).toMatchObject({ inserted: 610, merged: 24, updated: 0, skipped: 0 });
  rows = await db().select().from(s.culturalItems);
}, 60000);
afterAll(async () => { await connection.close(); });
test("import is idempotent, preserving 12 seed identities, reviewed text and sources", async () => {
  expect(rows).toHaveLength(634);
  expect(new Set(rows.map(r => r.contentKey)).size).toBe(317);
  for (const old of original) {
    const item = rows.find(r => r.id === old.id)!;
    expect(catalogMerges[item.contentKey]).toBe(old.contentKey);
    expect(item).toMatchObject({ title: old.title, summary: old.summary, validatedDescription: old.validatedDescription, sourceUrl: old.sourceUrl, origin: "seed", demo: false });
    expect(item.facts.length).toBeGreaterThan(0); expect(item.gallery.length).toBeGreaterThan(0);
    expect(item.tags).not.toContain("whale watching");
  }
  const second = await importCatalog(db(), candidates, { production: true });
  console.log("STAGE10B_IMPORT_SECOND", JSON.stringify(second));
  expect(second).toMatchObject({ inserted: 0, updated: 0, merged: 0, skipped: 634 });
  expect(await db().select().from(s.culturalItems)).toEqual(rows);
});
test("invalid catalog writes nothing", async () => {
  const invalid = structuredClone(candidates); invalid[0].sources[0].httpStatus = 500;
  const before = await db().select().from(s.culturalItems);
  await expect(importCatalog(db(), invalid)).rejects.toThrow("Invalid catalog");
  expect(await db().select().from(s.culturalItems)).toEqual(before);
});
test("every imported gallery exposes its licensed local photo; illustrative food is labelled", () => {
  for (const row of rows) {
    const media = itemMedia(row, row.language === "en" ? "en" : "es");
    expect(media.image, row.contentKey).toBeDefined();
    expect(media.gallery).toHaveLength(row.gallery.length);
    if (row.gallery[0].illustrative) expect(media.image?.illustrative).toBe(true);
    if (row.location) expect(media.mapsUrl).toContain("google.com/maps");
  }
});
test("seed rows outside the merge table remain untouched and published", async () => {
  const [protectedRow] = await db().insert(s.culturalItems).values({ contentKey: "synthetic-protected", language: "es", title: "Synthetic protected seed", summary: "Test", validatedDescription: "Test", type: "history", sourceUrl: "https://example.invalid/article", sourceCheckedAt: new Date(), status: "published", license: "Test", editor: "Test", origin: "seed" }).returning();
  await importCatalog(db(), candidates, { production: true });
  expect((await db().select().from(s.culturalItems).where(eq(s.culturalItems.id, protectedRow.id)))[0]).toEqual(protectedRow);
});
test.each([
  ["es", "bayaibe", /bayahíbe/i], ["es", "salto el limon", /limón/i], ["es", "bahia de las aguilas", /águilas/i], ["es", "samna", /samaná/i],
  ["en", "whale watching", /whale|ballenas/i], ["en", "colonial zone", /colonial/i],
])("search %s %s", async (language, query, expected) => {
  expect((await catalogSearch(db(), language as string)).search(query as string)[0]?.item.title).toMatch(expected as RegExp);
});
test("type and province intent; unrelated question has no citations", async () => {
  const search = await catalogSearch(db(), "es");
  for (const query of ["qué comer", "¿qué puedo comer?"]) expect(search.search(query).map(r => r.item.type)).toEqual(["food", "food", "food", "food"]);
  expect(search.search("dame 5 playas", 5).map(r => r.item.type)).toEqual(Array(5).fill("beach"));
  expect(new Set(search.search("dame 5 playas", 5).map(r => r.item.region)).size).toBeGreaterThan(1);
  expect(search.search("qué hacer en Samaná").every(r => r.item.region === "Samaná")).toBe(true);
  expect(search.search("fiestas dominicanas").every(r => r.item.type === "tradition")).toBe(true);
  expect(search.search("museos de Santiago").every(r => r.item.type === "museum" && r.item.region === "Santiago")).toBe(true);
  expect(search.search("¿qué hora es en Tokio?")).toEqual([]);
  expect(search.search("¿Háblame de Bahía de las Águilas?").map(r => r.item.contentKey)).toEqual(["bahia-de-las-aguilas"]);
});
test("warm search under 20 ms for 317 entries", () => {
  const search = createCatalogSearch(rows.filter(r => r.language === "es"));
  for (let i = 0; i < 20; i++) search.search("playas en Punta Cana");
  const durations = Array.from({ length: 100 }, () => { const start = performance.now(); search.search("bayaibe"); return performance.now() - start; }).sort((a, b) => a - b);
  console.log("STAGE10B_SEARCH_MS", JSON.stringify({ median: durations[50], p95: durations[95], max: durations[99] }));
  // p95 tolerates one-off scheduler/GC pauses; measures a complete warm query.
  expect(durations[95]).toBeLessThan(20);
});
test("model context limits facts, descriptions and item counts; fallback adds a sourced fact", async () => {
  const input = { locale: "es" as const, items: rows, message: "merengue", history: [] };
  expect(modelContext(input)).toHaveLength(4);
  expect(modelContext({ ...input, audio: { bytes: new Uint8Array(), mimeType: "audio/wav" } })).toHaveLength(8);
  for (const item of modelContext(input)) { expect(item.facts.length).toBeGreaterThan(0); expect(item.facts.length).toBeLessThanOrEqual(4); expect(item.description.length).toBeLessThanOrEqual(600); expect(item.summary).toBeTruthy(); }
  const merengue = rows.find(r => r.contentKey === "merengue" && r.language === "es")!;
  const answer = (await new DemoAiProvider().generate({ ...input, items: [merengue] })).answer;
  expect(merengue.facts.some(f => answer.displayText.includes(f.text))).toBe(true);
});
test("gallery, Maps and bilingual moderation, history and importer respect hidden state", async () => {
  vi.stubEnv("GEMINI_API_KEY", "");
  try {
    const session = await createSession(db(), "es");
    const reply = await chat(db(), session.token, { message: "Háblame de Bahía de las Águilas" });
    const source = reply.sources.find(s => /águilas/i.test(s.title))!;
    expect(source.image?.credit).toBeTruthy(); expect(source.mapsUrl).toContain("google.com/maps");
    const photos = await chat(db(), session.token, { message: "muéstrame fotos del Salto El Limón" });
    // The protected source catalog has only one photo for El Limón.
    expect(photos.sources[0].gallery).toHaveLength(candidates.find(c => c.key === "salto-el-limon")!.images.length);
    const [org] = await db().insert(s.organizations).values({ name: "Test", kind: "admin" }).returning();
    const [actor] = await db().insert(s.visitorAccounts).values({}).returning();
    const staff = { userId: actor.id, organizationId: org.id, role: "operator" as const };
    await catalogVisibility(db(), staff, source.id, true);
    expect((await catalogSearch(db(), "es")).search("bahia de las aguilas").some(r => r.item.id === source.id)).toBe(false);
    await expect(findItem(db(), source.id)).rejects.toThrow();
    expect((await listItems(db(), "es", 0, 1000)).some(r => r.id === source.id)).toBe(false);
    expect((await chatHistory(db(), session.session)).flatMap(r => r.reply?.sources || []).some(s => s.id === source.id)).toBe(false);
    await importCatalog(db(), candidates, { production: true });
    const item = rows.find(r => r.id === source.id)!;
    const versions = await db().select().from(s.culturalItems).where(eq(s.culturalItems.contentKey, item.contentKey));
    expect(versions.every(r => !!r.hiddenAt)).toBe(true);
    expect((await staffCatalog(db(), { query: "bahia de las aguilas", visibility: "hidden" })).items.some(r => r.contentKey === item.contentKey)).toBe(true);
    await expect(catalogVisibility(db(), { ...staff, role: "analyst" }, source.id, false)).rejects.toThrow();
    await catalogVisibility(db(), staff, source.id, false);
    expect((await catalogSearch(db(), "en")).search("bahia de las aguilas").some(r => r.item.contentKey === item.contentKey)).toBe(true);
    expect((await db().select().from(s.auditLogs)).map(r => r.action)).toEqual(expect.arrayContaining(["catalog.hide", "catalog.show"]));
  } finally { vi.unstubAllEnvs(); }
}, 30000);
