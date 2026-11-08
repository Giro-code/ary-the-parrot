import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { connectDatabase, getConnection, type Connection } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { seedDatabase, type SourceCheck } from "../../src/db/seed";
import * as s from "../../src/db/schema";
import * as service from "../../src/server/service";
import { hashToken, newToken } from "../../src/server/tokens";
import { readFile } from "node:fs/promises";
import { NextRequest } from "next/server";
import { csrf } from "../../src/server/http";
import { cleanupDatabase } from "../../src/db/cleanup";
import { POST, GET, PATCH } from "../../app/api/[...path]/route";
let connection: Connection;
beforeAll(async () => {
  connection = await connectDatabase({ memory: true }); await migrateDatabase(connection.db);
  await seedDatabase(connection.db, JSON.parse(await readFile("docs/evidence/stage2/seed-sources.json", "utf8")) as SourceCheck[]);
}, 30000);
afterAll(async () => { await connection?.close(); });
afterEach(() => vi.unstubAllEnvs());
async function kiosk(locale: "es" | "en" = "es") {
  const enrolled = await service.enrollKiosk(connection.db, "Synthetic kiosk");
  const deviceToken = await service.activateKiosk(connection.db, enrolled.code);
  const created = await service.createSession(connection.db, locale, enrolled.deviceId);
  await service.setPreferences(connection.db, created.session, { locale, countryDeclared: "BO", interests: ["music", "history"] });
  const session = await service.getSession(connection.db, created.token);
  const qr = await service.createHandoff(connection.db, session, enrolled.deviceId);
  return { ...created, session, qr, enrolled, deviceToken };
}
test("all conceptual tables and real migrations exist; published content has verified sources", async () => {
  const tables = await connection.db.execute(sql`select tablename from pg_tables where schemaname='public'`);
  expect(tables.rows.length).toBe(Object.keys(s).length);
  expect(await connection.db.select().from(s.culturalItems)).toHaveLength(24);
  const published = await service.listItems(connection.db, "es", 0, 50);
  expect(published.length).toBeGreaterThanOrEqual(10);
  expect(published.every(row => row.sourceUrl && row.sourceCheckedAt && row.demo)).toBe(true);
});
test("migration snapshot matches schema and rollback removes the isolated test schema", async () => {
  const { generateDrizzleJson, generateMigration } = await import("drizzle-kit/api");
  const initial = JSON.parse(await readFile("drizzle/meta/0000_snapshot.json", "utf8"));
  const stage3 = JSON.parse(await readFile("drizzle/meta/0001_snapshot.json", "utf8"));
  const stage4a = JSON.parse(await readFile("drizzle/meta/0002_snapshot.json", "utf8"));
  const snapshot = JSON.parse(await readFile("drizzle/meta/0003_snapshot.json", "utf8"));
  expect(initial.prevId).toBe("00000000-0000-0000-0000-000000000000");
  expect(stage3.prevId).toBe(initial.id);
  expect(stage4a.prevId).toBe(stage3.id);
  expect(snapshot.prevId).toBe(stage4a.id);
  expect(await generateMigration(snapshot, generateDrizzleJson(s, snapshot.id))).toEqual([]);
  const isolated = await connectDatabase({ memory: true });
  try {
    await migrateDatabase(isolated.db);
    const stage4bDown = await readFile("drizzle/rollback/0003_stage4b_staff_leads.sql", "utf8");
    for (const statement of stage4bDown.split(";").map(value => value.trim()).filter(Boolean)) await isolated.db.execute(sql.raw(statement));
    const stage4Down = await readFile("drizzle/rollback/0002_stage4a_ai_robot.sql", "utf8");
    for (const statement of stage4Down.split(";").map(value => value.trim()).filter(Boolean)) await isolated.db.execute(sql.raw(statement));
    const stage3Down = await readFile("drizzle/rollback/0001_stage3_email_privacy.sql", "utf8");
    for (const statement of stage3Down.split(";").map(value => value.trim()).filter(Boolean)) await isolated.db.execute(sql.raw(statement));
    const down = await readFile("drizzle/rollback/0000_ary_core.sql", "utf8");
    for (const statement of down.split(";").map(value => value.trim()).filter(Boolean)) await isolated.db.execute(sql.raw(statement));
    const remaining = await isolated.db.execute(sql`select tablename from pg_tables where schemaname='public'`);
    expect(remaining.rows).toEqual([]);
  } finally { await isolated.close(); }
});
test("tokens have 256 random bits; database stores only SHA-256 hashes", async () => {
  const first = newToken(); expect(Buffer.from(first, "base64url")).toHaveLength(32); expect(first).not.toBe(newToken());
  expect(hashToken(first)).toHaveLength(64);
  const k = await kiosk(), [row] = await connection.db.select().from(s.qrHandoffs).where(eq(s.qrHandoffs.id, k.qr.handoffId));
  expect(row.tokenHash).toBe(hashToken(k.qr.token)); expect(JSON.stringify(row)).not.toContain(k.qr.token);
  expect(k.session.tokenHash).toBe(hashToken(k.token)); expect(k.qr.confirmationCode).toMatch(/^\d{2}$/);
});
test("enrollment is single-use, expires, and rotating credentials revokes the old cookie", async () => {
  const now = new Date(), old = await service.enrollKiosk(connection.db, "Rotate", undefined, now);
  const token = await service.activateKiosk(connection.db, old.code, now);
  await expect(service.activateKiosk(connection.db, old.code, now)).rejects.toMatchObject({ code: "activation_unavailable" });
  const rotated = await service.enrollKiosk(connection.db, "Rotate", old.deviceId, now);
  await service.activateKiosk(connection.db, rotated.code, now);
  expect(await service.kioskDevice(connection.db, token, now)).toBeNull();
  const expired = await service.enrollKiosk(connection.db, "Expired", undefined, new Date(+now - 601000));
  await expect(service.activateKiosk(connection.db, expired.code, now)).rejects.toMatchObject({ code: "activation_unavailable" });
});
test("valid redemption creates a fresh mobile session, copies saved state and clears the kiosk", async () => {
  const k = await kiosk("en"), [item] = await service.listItems(connection.db, "en");
  const saved = await service.saveItem(connection.db, k.session.id, item.id);
  await service.updateSaved(connection.db, k.session.id, saved.id, { state: "visited", favorite: true });
  const before = await connection.db.select().from(s.qrHandoffs).where(eq(s.qrHandoffs.id, k.qr.handoffId));
  expect(await service.previewHandoff(connection.db, k.qr.token)).toEqual({ locale: "en", confirmationCode: k.qr.confirmationCode });
  expect(await connection.db.select().from(s.qrHandoffs).where(eq(s.qrHandoffs.id, k.qr.handoffId))).toEqual(before);
  const redeemed = await service.redeemHandoff(connection.db, k.qr.token, k.qr.confirmationCode);
  expect(redeemed.token).not.toBe(k.token); expect(redeemed.session.id).not.toBe(k.session.id); expect(redeemed.session.kioskDeviceId).toBeNull();
  expect(service.publicSession(redeemed.session)).toMatchObject({ locale: "en", countryDeclared: "BO", interests: ["music", "history"] });
  expect(await service.listSaved(connection.db, redeemed.session.id)).toMatchObject([{ saved: { state: "visited", favorite: true }, item: { id: item.id } }]);
  const source = await service.getSession(connection.db, k.token, new Date(), false);
  expect(source).toMatchObject({ status: "transferred", countryDeclared: null, interests: [] });
  expect(await service.listSaved(connection.db, source.id)).toEqual([]);
  expect(await connection.db.select().from(s.visitorPreferences).where(eq(s.visitorPreferences.sessionId, source.id))).toEqual([]);
  await expect(service.redeemHandoff(connection.db, k.qr.token, k.qr.confirmationCode)).rejects.toMatchObject({ code: "handoff_unavailable" });
});
test("Promise.all concurrent redemptions: exactly one wins", async () => {
  const k = await kiosk();
  const result = await Promise.all([1, 2].map(async () => { try { await service.redeemHandoff(connection.db, k.qr.token, k.qr.confirmationCode); return true; } catch { return false; } }));
  expect(result.filter(Boolean)).toHaveLength(1);
  const [qr] = await connection.db.select().from(s.qrHandoffs).where(eq(s.qrHandoffs.id, k.qr.handoffId));
  expect(qr.usedAt).toBeInstanceOf(Date); expect(qr.consumedBySessionId).toBeTruthy();
});
test("a transaction failure rolls back the claim and permits a later redemption", async () => {
  const k = await kiosk();
  await connection.db.execute(sql`create function fail_mobile() returns trigger language plpgsql as $$ begin if NEW.kiosk_device_id IS NULL then raise exception 'synthetic failure'; end if; return NEW; end $$`);
  await connection.db.execute(sql`create trigger fail_mobile before insert on visitor_sessions for each row execute function fail_mobile()`);
  try { await expect(service.redeemHandoff(connection.db, k.qr.token, k.qr.confirmationCode)).rejects.toThrow(); }
  finally { await connection.db.execute(sql`drop trigger fail_mobile on visitor_sessions`); await connection.db.execute(sql`drop function fail_mobile()`); }
  const [qr] = await connection.db.select().from(s.qrHandoffs).where(eq(s.qrHandoffs.id, k.qr.handoffId)); expect(qr.usedAt).toBeNull();
  await expect(service.redeemHandoff(connection.db, k.qr.token, k.qr.confirmationCode)).resolves.toHaveProperty("token");
});
test("expired QR fails; altered and used tokens have the same generic error", async () => {
  const k = await kiosk(), after = new Date(+k.qr.expiresAt + 100);
  await expect(service.previewHandoff(connection.db, k.qr.token, after)).rejects.toMatchObject({ code: "handoff_expired" });
  await expect(service.redeemHandoff(connection.db, k.qr.token, k.qr.confirmationCode, after)).rejects.toMatchObject({ code: "handoff_expired" });
  const altered = (k.qr.token[0] === "A" ? "B" : "A") + k.qr.token.slice(1);
  await expect(service.redeemHandoff(connection.db, altered, k.qr.confirmationCode)).rejects.toMatchObject({ code: "handoff_unavailable" });
  const used = await kiosk(); await service.redeemHandoff(connection.db, used.qr.token, used.qr.confirmationCode);
  await expect(service.previewHandoff(connection.db, used.qr.token)).rejects.toMatchObject({ code: "handoff_unavailable" });
});
test("persistent attempt count and per-token limit reject guessing", async () => {
  const k = await kiosk(), wrong = k.qr.confirmationCode === "00" ? "01" : "00";
  for (let i = 0; i < 5; i++) await expect(service.redeemHandoff(connection.db, k.qr.token, wrong)).rejects.toMatchObject({ code: "handoff_unavailable" });
  const [qr] = await connection.db.select().from(s.qrHandoffs).where(eq(s.qrHandoffs.id, k.qr.handoffId)); expect(qr.attemptCount).toBe(5);
  await expect(service.redeemHandoff(connection.db, k.qr.token, k.qr.confirmationCode)).rejects.toMatchObject({ code: "rate_limited" });
});
test("replacement/cancel invalidate QR; demo sessions cannot generate one", async () => {
  const k = await kiosk(); await service.createHandoff(connection.db, k.session, k.enrolled.deviceId);
  await expect(service.previewHandoff(connection.db, k.qr.token)).rejects.toMatchObject({ code: "handoff_unavailable" });
  await service.endSession(connection.db, k.session.id); expect((await service.handoffStatus(connection.db, k.session.id)).status).toBe("cancelled");
  const demo = await service.createSession(connection.db);
  await expect(service.createHandoff(connection.db, demo.session, k.enrolled.deviceId)).rejects.toMatchObject({ code: "kiosk_required" });
});
test("saved repositories isolate owners and make saving idempotent", async () => {
  const a = await service.createSession(connection.db), b = await service.createSession(connection.db), [item] = await service.listItems(connection.db, "es");
  const first = await service.saveItem(connection.db, a.session.id, item.id), repeat = await service.saveItem(connection.db, a.session.id, item.id);
  expect(repeat.id).toBe(first.id); expect(await service.listSaved(connection.db, b.session.id)).toEqual([]);
  await expect(service.updateSaved(connection.db, b.session.id, first.id, { state: "removed" })).rejects.toMatchObject({ code: "saved_not_found" });
});
test("country never changes ranking; rationales, language and evidence are persisted", async () => {
  const k = await service.createSession(connection.db);
  await service.setPreferences(connection.db, k.session, { locale: "es", countryDeclared: "BO", interests: ["music", "history"] });
  const one = await service.recommend(connection.db, await service.getSession(connection.db, k.token));
  await service.setPreferences(connection.db, k.session, { locale: "es", countryDeclared: "US", interests: ["music", "history"] });
  const two = await service.recommend(connection.db, await service.getSession(connection.db, k.token));
  expect(one.recommendations).toEqual(two.recommendations); expect(one.mode).toBe("rules");
  expect(one.recommendations.every(r => r.evidenceIds.includes(r.item.id) && r.sourceUrl && r.sourceCheckedAt && r.item.language === "es")).toBe(true);
  expect(one.recommendations[0].rationale).toContain("seleccionaste");
  expect(await connection.db.select().from(s.recommendations).where(eq(s.recommendations.sessionId, k.session.id))).toHaveLength(8);
});
test("cleanup removes expired operational data and preserves a fresh mobile session", async () => {
  const k = await kiosk(), mobile = await service.redeemHandoff(connection.db, k.qr.token, k.qr.confirmationCode);
  const now = new Date(), old = await service.createSession(connection.db, "es", null, new Date(+now - 48 * 3600_000));
  await cleanupDatabase(connection.db, now);
  await expect(service.getSession(connection.db, old.token, now)).rejects.toMatchObject({ code: "session_required" });
  await expect(service.getSession(connection.db, mobile.token, now)).resolves.toMatchObject({ status: "active", countryDeclared: "BO" });
});
test("persistent client limits reset; analytics strip fields outside the allowlist", async () => {
  const now = new Date(), key = hashToken(newToken()); await service.rateLimit(connection.db, key, 1, now);
  await expect(service.rateLimit(connection.db, key, 1, now)).rejects.toMatchObject({ code: "rate_limited" });
  await expect(service.rateLimit(connection.db, key, 1, new Date(+now + 61000))).resolves.toBeUndefined();
  await service.recordEvent(connection.db, "preferences_set", { interests: ["music"], countryDeclared: "BO", email: "synthetic@example.invalid", token: "secret", ip: "127.0.0.1" });
  await service.recordEvent(connection.db, "preferences_set", { interests: ["synthetic@example.invalid"] });
  const events = await connection.db.select().from(s.analyticsEvents).where(eq(s.analyticsEvents.eventType, "preferences_set"));
  expect(events.every(row => Object.keys(row.metadata).every(key => key === "interests"))).toBe(true);
  expect(JSON.stringify(events)).not.toContain("synthetic@example.invalid");
});
describe("production failure and CSRF", () => {
  test("production without database returns structured 503 for endpoints", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("DATABASE_URL", ""); vi.stubEnv("APP_BASE_URL", "https://ary.example.invalid");
    await expect(getConnection()).rejects.toMatchObject({ code: "database_not_configured", status: 503 });
    const headers = { origin: "https://ary.example.invalid", host: "ary.example.invalid", "x-ary-request": "1", "content-type": "application/json" };
    for (const path of ["visitor/session", "recommendations", "saved", "visitor/handoff/redeem"]) {
      const response = await POST(new NextRequest(`https://ary.example.invalid/api/${path}`, { method: "POST", headers, body: "{}" }));
      expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ error: "database_not_configured", requestId: expect.any(String) });
    }
    expect((await GET(new NextRequest("https://ary.example.invalid/api/visitor/me"))).status).toBe(503);
    expect((await PATCH(new NextRequest("https://ary.example.invalid/api/visitor/preferences", { method: "PATCH", headers }))).status).toBe(503);
  });
  test("mutations require matching Origin, Host and custom header", () => {
    vi.stubEnv("APP_BASE_URL", "http://localhost:3000");
    const valid = { origin: "http://localhost:3000", host: "localhost:3000", "x-ary-request": "1" };
    expect(() => csrf(new NextRequest("http://localhost:3000/api/saved", { headers: valid }))).not.toThrow();
    for (const headers of [{ ...valid, origin: "https://evil.invalid" }, { ...valid, host: "evil.invalid" }, { ...valid, "x-ary-request": "0" }]) expect(() => csrf(new NextRequest("http://localhost:3000/api/saved", { headers }))).toThrow("csrf_rejected");
  });
});
