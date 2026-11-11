import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { mapsUrl } from "../../src/location";
import { itemMedia } from "../../src/server/item-media";
import { connectDatabase, type Connection } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { seedDatabase, seedEntries, type SourceCheck } from "../../src/db/seed";
import { seedImages, seedLocations } from "../../src/db/seed-media";
import { culturalItems, chatMessages } from "../../src/db/schema";
import { createSession, listSaved, saveItem } from "../../src/server/service";
import { chat, chatHistory, classifyIntent } from "../../src/server/ai/chat";
import { encrypt } from "../../src/server/crypto";
import { SourceCarousel } from "../../src/components/source-carousel";
import { MapsLink } from "../../src/components/maps-link";
import { ItemPhoto } from "../../src/components/item-photo";

let connection: Connection;
const checks: SourceCheck[] = seedEntries.map(entry => ({ url: entry.url, finalUrl: entry.url, status: 200, checkedAt: "2026-11-10T12:00:00Z", verified: true }));
const db = () => connection.db;
beforeAll(async () => { connection = await connectDatabase({ memory: true }); await migrateDatabase(db()); await seedDatabase(db(), checks); }, 30000);
beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", ""); vi.stubEnv("AI_GLOBAL_PER_MINUTE", "120"); vi.stubEnv("AI_SESSION_PER_MINUTE", "20");
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected external request"); }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
afterAll(async () => connection.close());

test.each([undefined, null, {}, "18,-69", { lat: "18", lng: -69 }, { lat: 18 }, { lat: NaN, lng: 0 }, { lat: 0, lng: Infinity }, { lat: 90.01, lng: 0 }, { lat: 0, lng: -180.01 }])("mapsUrl rejects invalid coordinates %j", value => expect(mapsUrl(value)).toBeNull());
test.each([{ lat: 18.4203, lng: -68.8897 }, { lat: -90, lng: 180 }, { lat: 0, lng: 0 }])("mapsUrl builds only from numeric lat/lng %j", value => {
  expect(mapsUrl({ ...value, mapsQuery: "https://evil.invalid", url: "https://evil.invalid" })).toBe(`https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`);
});
test.each(["ubicación", "mapa", "¿dónde queda?", "cómo llego", "location", "Where is Samaná?"])("%s is a directions intent", message => expect(classifyIntent(message)).toBe("directions"));
test("seed twice preserves IDs, updates media on existing rows and keeps null exclusions", async () => {
  const before = await db().select().from(culturalItems).orderBy(culturalItems.id);
  await db().update(culturalItems).set({ image: null, imageAsset: null, location: null });
  await seedDatabase(db(), checks); await seedDatabase(db(), checks);
  const after = await db().select().from(culturalItems).orderBy(culturalItems.id);
  expect(after.map(item => item.id)).toEqual(before.map(item => item.id)); expect(after).toHaveLength(24);
  for (const item of after) {
    expect(item.image).toEqual(seedImages[item.contentKey] || null);
    expect(item.location).toEqual(seedLocations[item.contentKey] || null);
    expect(item.imageAsset).toBe(seedImages[item.contentKey] ? `/assets/items/${item.contentKey}.webp` : null);
  }
});
test("all selected assets have matching WebP dimensions, 480 variants and verified metadata", async () => {
  const sharp = (await import("sharp")).default;
  for (const [key, image] of Object.entries(seedImages)) {
    const main = await sharp(await readFile(`public/assets/items/${key}.webp`)).metadata();
    const thumb = await sharp(await readFile(`public/assets/items/${key}-480.webp`)).metadata();
    expect([main.width, main.height]).toEqual([image.width, image.height]);
    expect(main.format).toBe("webp"); expect(Math.max(thumb.width!, thumb.height!)).toBeLessThanOrEqual(480);
  }
});
test("only published, source-checked records supply media and local asset paths", () => {
  const item = { status: "published", sourceCheckedAt: new Date(), sourceUrl: "https://example.org", imageAsset: "/assets/items/ballenas.webp", image: seedImages.ballenas, location: seedLocations.ballenas };
  expect(itemMedia(item, "en").image?.alt).toBe(seedImages.ballenas.alt.en);
  expect(itemMedia({ ...item, status: "draft" }, "es")).toEqual({});
  expect(itemMedia({ ...item, sourceCheckedAt: null }, "es")).toEqual({});
  expect(itemMedia({ ...item, imageAsset: "https://evil.invalid/pic.webp" }, "es").image).toBeUndefined();
  expect(itemMedia({ ...item, image: { ...seedImages.ballenas, sourceUrl: "https://evil.invalid" } }, "es").image).toBeUndefined();
});
function mockAnswer(text?: string, all = false) {
  vi.stubEnv("GEMINI_API_KEY", "synthetic-stage9-key");
  vi.mocked(fetch).mockImplementation(async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    const records = JSON.parse(body.contents[0].parts[0].text.split("\n")[1]);
    expect(JSON.stringify(records)).not.toContain("/assets/"); expect(JSON.stringify(records)).not.toContain("lat");
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ detectedLanguage: "es", displayText: text || "Descubre estos paisajes dominicanos.", spokenText: text || "Descubre estos paisajes dominicanos.", intent: "culture", citedItemIds: (all ? records.slice(0, 2) : records.slice(0, 1)).map((row: { id: string }) => row.id), followUps: [], confidence: .95 }) }] } }] });
  });
}
test("chat media comes exclusively from cited records and survives a history reload", async () => {
  mockAnswer();
  const visitor = await createSession(db()), reply = await chat(db(), visitor.token, { message: "¿Qué ver en Samaná?" });
  expect(reply.mode).toBe("gemini"); expect(reply.sources).toHaveLength(1);
  const [item] = await db().select().from(culturalItems).where(eq(culturalItems.id, reply.citedItemIds[0]));
  expect(reply.sources[0]).toMatchObject(itemMedia(item, "es"));
  expect(reply.sources[0].image).toBeDefined(); expect(reply.sources[0].mapsUrl).toBeDefined();
  const history = await chatHistory(db(), visitor.session);
  expect(history.at(-1)?.reply?.sources).toEqual(reply.sources);
});
test("two citations each carry their own verified photo and location", async () => {
  mockAnswer(undefined, true);
  const visitor = await createSession(db()), reply = await chat(db(), visitor.token, { message: "Samaná y Los Haitises" });
  expect(reply.sources).toHaveLength(2);
  for (const source of reply.sources) {
    const [item] = await db().select().from(culturalItems).where(eq(culturalItems.id, source.id));
    expect(reply.citedItemIds).toContain(item.id); expect(source).toMatchObject(itemMedia(item, "es"));
  }
});
test.each(["Mira https://evil.invalid/photo.jpg y https://maps.google.com/", "Ve a 12.3456, -45.6789.", "Ve a 19.2, -69.4.", "Ve a 19, -69.", "19° N 69° W", "latitude=12.3456 longitude=-45.6789"])("model URLs and coordinates are discarded %s", async text => {
  mockAnswer(text);
  const visitor = await createSession(db()), reply = await chat(db(), visitor.token, { message: "Samaná" });
  expect(reply.mode).toBe("demo"); expect(reply.displayText).not.toBe(text);
  expect(JSON.stringify(reply)).not.toContain("evil.invalid"); expect(JSON.stringify(reply)).not.toContain("12.3456");
  expect(reply.sources[0].mapsUrl).toBe(mapsUrl(seedLocations.ballenas));
});
test("directions use the last citation, speak the screen cue and cannot reuse it for an unknown place", async () => {
  const visitor = await createSession(db());
  await chat(db(), visitor.token, { message: "Samaná" });
  const reply = await chat(db(), visitor.token, { message: "ubicación" });
  expect(reply.sources[0].location).toBe("Bahía de Samaná"); expect(reply.displayText).toContain("Bahía de Samaná");
  expect(reply.spokenText).toBe("Te dejé la ubicación en pantalla."); expect(reply.spokenText).not.toContain("https");
  const unknown = await chat(db(), visitor.token, { message: "¿Dónde queda Atlantis?" });
  expect(unknown.sources).toEqual([]); expect(unknown.destination).toBe("Atlantis"); expect(fetch).not.toHaveBeenCalled();
});
test("immaterial topic without a linked place has no Maps URL", async () => {
  const visitor = await createSession(db()), reply = await chat(db(), visitor.token, { message: "Merengue" });
  expect(reply.sources[0].image).toBeDefined(); expect(reply.sources[0].mapsUrl).toBeUndefined();
  expect((await chat(db(), visitor.token, { message: "¿Dónde queda el Merengue?" })).sources[0].mapsUrl).toBeUndefined();
});
test.each(["es", "en"] as const)("directions without a verified place refer to the cultural collection in %s", async locale => {
  const visitor = await createSession(db(), locale);
  const reply = await chat(db(), visitor.token, { message: locale === "es" ? "¿Dónde queda Atlantis?" : "Where is Atlantis?" });
  expect(reply.displayText).toContain(locale === "es" ? "Mi cultura" : "My culture");
  expect(reply.displayText).not.toMatch(/Mis viajes|Mi viaje|My trips|My trip/i);
  expect(reply.sources).toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
});
test("withdrawn record loses photo and Maps in previously saved history", async () => {
  const visitor = await createSession(db()), reply = await chat(db(), visitor.token, { message: "Samaná" });
  const id = reply.citedItemIds[0];
  await db().update(culturalItems).set({ status: "draft" }).where(eq(culturalItems.id, id));
  try { expect((await chatHistory(db(), visitor.session)).at(-1)?.reply?.sources).toEqual([]); }
  finally { await db().update(culturalItems).set({ status: "published" }).where(eq(culturalItems.id, id)); }
});
test("legacy history is enriched from its citation and ignores stored media", async () => {
  const visitor = await createSession(db()), reply = await chat(db(), visitor.token, { message: "Samaná" });
  const stored = { ...reply, sources: [] }; delete stored.preferences;
  await db().update(chatMessages).set({ encryptedPayload: encrypt(JSON.stringify({ text: reply.answer, reply: stored })) }).where(and(eq(chatMessages.sessionId, visitor.session.id), eq(chatMessages.role, "assistant")));
  expect((await chatHistory(db(), visitor.session)).at(-1)?.reply?.sources[0].image).toBeDefined();
  await saveItem(db(), visitor.session.id, reply.citedItemIds[0]);
  expect((await listSaved(db(), visitor.session.id))[0].item.image).toEqual(seedImages.ballenas);
});
test.each(["es", "en"] as const)("photo attribution, location and carousel markup in %s and kiosk link suppression", async locale => {
  const visitor = await createSession(db(), locale), reply = await chat(db(), visitor.token, { message: locale === "es" ? "Samaná" : "Tell me about Samaná" });
  const props = { sources: reply.sources, locale, kiosk: false, blocked: false, savedIds: [], onSave: () => {}, directions: true };
  const html = renderToStaticMarkup(<SourceCarousel {...props} />);
  expect(html).toContain(locale === "es" ? "Guardar en Mi cultura" : "Save to My culture");
  expect(html).toContain("Wikimedia Commons"); expect(html).toContain("CC BY-SA 4.0"); expect(html).toContain('target="_blank"');
  expect(html).toContain("noopener noreferrer"); expect(html).toContain("https://www.google.com/maps/search/");
  const kiosk = renderToStaticMarkup(<SourceCarousel {...props} kiosk />);
  expect(kiosk).toContain("Wikimedia Commons"); expect(kiosk).toContain("%2Fassets%2Fitems%2F"); expect(kiosk).not.toContain("<a "); expect(kiosk).not.toContain("maps/search");
  expect(renderToStaticMarkup(<MapsLink url={reply.sources[0].mapsUrl} locale={locale} kiosk />)).toBe("");
  expect(renderToStaticMarkup(<ItemPhoto locale={locale} />)).toBe("");
});
