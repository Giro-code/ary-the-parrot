import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { eq } from "drizzle-orm";
import { connectDatabase, type Connection } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { seedDatabase, seedEntries } from "../../src/db/seed";
import { importCatalog, readCatalog, type CatalogCandidate } from "../../src/db/catalog-import";
import * as s from "../../src/db/schema";
import { catalogSearch, grounded, type CatalogSearch } from "../../src/server/ai/catalog-search";
import { createSession as anonymousSession } from "../../src/server/service";
import { grantConsent, noticeVersion } from "../../src/server/consents";
import { chat } from "../../src/server/ai/chat";

// Golden questions: what Ary should find for real visitor questions. Run on every change.
let connection: Connection, catalog: CatalogCandidate[];
const search: Partial<Record<"es" | "en", CatalogSearch>> = {};
const db = () => connection.db;
beforeAll(async () => {
  vi.stubEnv("GEMINI_API_KEY", "");
  connection = await connectDatabase({ memory: true }); await migrateDatabase(db());
  await seedDatabase(db(), seedEntries.map(entry => ({ url: entry.url, finalUrl: entry.url, status: 200, checkedAt: "2026-11-11T12:00:00Z", verified: true })));
  catalog = await readCatalog();
  await importCatalog(db(), catalog, { production: true });
  search.es = await catalogSearch(db(), "es"); search.en = await catalogSearch(db(), "en");
}, 90000);
afterAll(async () => { vi.unstubAllEnvs(); await connection.close(); });

test("every entry is found first, as an exact match, by its own name in both languages", () => {
  const misses: string[] = [];
  for (const entry of catalog) for (const locale of ["es", "en"] as const) {
    const question = locale === "es" ? `Cuéntame sobre ${entry.title.es}` : `Tell me about ${entry.title.en}`;
    const [first] = search[locale]!.search(question, 4);
    if (first?.item.contentKey !== entry.key && first?.item.contentKey !== (entry.key)) misses.push(`${locale}: ${question} → ${first?.item.contentKey || "nothing"}`);
    else if (first.strength !== "exact") misses.push(`${locale}: ${question} → ${first.strength}`);
  }
  expect(misses).toEqual([]);
});

const named: [string, "es" | "en", string][] = [
  ["dónde queda el parque independencia", "es", "altar-de-la-patria"],
  ["¿dónde queda la puerta del conde?", "es", "baluarte-del-conde"],
  ["qué pasó el día de la independencia", "es", "independencia-dominicana"],
  ["cuéntame del merengue", "es", "merengue"],
  ["háblame de la bachata", "es", "bachata"],
  ["zona colonial", "es", "ciudad-colonial"],
  ["tell me about the colonial zone", "en", "ciudad-colonial"],
  ["bahia de las aguilas", "es", "bahia-de-las-aguilas"],
  ["Bahia de las Aguilas beach", "en", "bahia-de-las-aguilas"],
  ["salto el limon", "es", "salto-el-limon"],
  ["los haitises", "es", "haitises"],
  ["lago enriquillo", "es", "lago-enriquillo"],
  ["where is lake enriquillo", "en", "lago-enriquillo"],
  ["mangu", "es", "mangu"],
  ["larimar", "es", "larimar"],
  ["los tres ojos", "es", "los-tres-ojos"],
  ["pico duarte", "es", "pico-duarte"],
  ["isla saona", "es", "isla-saona"],
  ["faro a colón", "es", "faro-a-colon"],
  ["la isabela", "es", "la-isabela"],
  ["hermanas mirabal", "es", "hermanas-mirabal"],
  ["mamajuana", "es", "mamajuana"],
  ["sancocho", "es", "sancocho"],
  ["mofongo", "es", "mofongo"],
  ["teleférico de santo domingo", "es", "teleferico-de-santo-domingo"],
  ["cayo levantado", "es", "cayo-levantado"],
  ["punta cana", "es", "punta-cana"],
  ["jarabacoa", "es", "jarabacoa"],
  ["samaná", "es", "samana"],
  ["altos de chavon", "es", "altos-chavon"],
];
test.each(named)("names an entry: %s", (question, locale, key) => {
  const analysis = search[locale]!.analyze(question, 4);
  expect(analysis.ambiguity).toBeNull();
  expect(analysis.hits[0]?.item.contentKey).toBe(key);
  expect(["exact", "strong"]).toContain(analysis.hits[0].strength);
});

const typos: [string, "es" | "en", string][] = [
  ["bayaibe", "es", "bayahibe"],
  ["samna", "es", "samana"],
  ["bahia de las agilas", "es", "bahia-de-las-aguilas"],
  ["enriquilo", "es", "lago-enriquillo"],
];
test.each(typos)("tolerates a typo: %s", (question, locale, key) => {
  const keys = search[locale]!.search(question, 4).map(hit => hit.item.contentKey);
  expect(keys).toContain(key);
});

test.each([
  ["sabes donde queda la independencia", "es"],
  ["independencia", "es"],
  ["¿dónde queda la independencia?", "es"],
] as const)("asks which one when a short name has several meanings: %s", (question, locale) => {
  const { ambiguity } = search[locale]!.analyze(question, 4);
  expect(ambiguity?.options.length).toBeGreaterThanOrEqual(2);
  const labels = ambiguity!.options.map(option => option.label);
  expect(labels).toContain("Independencia");
  expect(labels.some(label => /Independencia dominicana|Altar de la Patria/.test(label))).toBe(true);
});

test.each([
  ["qué comer", "es", "food"],
  ["what should I eat", "en", "food"],
  ["playas", "es", "beach"],
  ["beaches", "en", "beach"],
  ["fiestas dominicanas", "es", "tradition"],
  ["museos", "es", "museum"],
] as const)("lists the requested type: %s", (question, locale, type) => {
  const hits = search[locale]!.search(question, 4);
  expect(hits.length).toBeGreaterThanOrEqual(3);
  expect(hits.every(hit => hit.item.type === type && grounded(hit))).toBe(true);
});

test("a province question lists that province, never a single entry as the answer", () => {
  const hits = search.es!.search("qué ver en la provincia Independencia", 4);
  expect(hits.length).toBeGreaterThan(0);
  expect(hits.every(hit => hit.item.region === "Independencia")).toBe(true);
  expect(search.es!.analyze("qué ver en la provincia Independencia").ambiguity).toBeNull();
});

test("a province only ranks: other provinces are not discarded", () => {
  const keys = search.es!.search("independencia", 6).map(hit => hit.item.contentKey);
  expect(keys).toContain("independencia-dominicana");
});

test.each([
  ["qué hora es en Tokio", "es"],
  ["cuál es el mejor restaurante de Madrid", "es"],
  ["háblame de física cuántica", "es"],
  ["what is the capital of France", "en"],
  ["recomiéndame una película", "es"],
] as const)("an unrelated question has no grounded entry: %s", (question, locale) => {
  const analysis = search[locale]!.analyze(question, 4);
  expect(analysis.hits.filter(grounded)).toEqual([]);
  expect(analysis.ambiguity).toBeNull();
});

async function visitor() {
  const created = await anonymousSession(db());
  const [session] = await db().update(s.visitorSessions).set({ pendingEmailHash: randomUUID() }).where(eq(s.visitorSessions.id, created.session.id)).returning();
  await grantConsent(db(), session, { purpose: "terms", noticeVersion, locale: session.locale }, "synthetic_test");
  return created.token;
}
test("chat asks instead of showing Lago Enriquillo for «la independencia»", async () => {
  const reply = await chat(db(), await visitor(), { message: "sabes donde queda la independencia" });
  expect(reply.sources).toEqual([]);
  expect(reply.displayText).toMatch(/puede ser varias cosas/);
  expect(reply.followUps.length).toBeGreaterThanOrEqual(2);
  expect(reply.followUps.length).toBeLessThanOrEqual(3);
  expect(reply.followUps.join(" ")).toMatch(/provincia Independencia/);
});
test("chat still shows the location card for a named place", async () => {
  const reply = await chat(db(), await visitor(), { message: "¿dónde queda el lago enriquillo?" });
  expect(reply.sources[0]?.title).toBe("Lago Enriquillo");
  expect(reply.displayText).toMatch(/ubicación/);
});
