import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { connectDatabase, type Connection } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { seedDatabase, type SourceCheck } from "../../src/db/seed";
import { readFile } from "node:fs/promises";
import { enrollKiosk, getSession } from "../../src/server/service";
import { setCookie, json } from "../../src/server/http";
let connection: Connection;
vi.mock("../../src/db/client", async importOriginal => ({ ...await importOriginal<typeof import("../../src/db/client")>(), getConnection: async () => connection }));
import { GET, PATCH, POST } from "../../app/api/[...path]/route";
const origin = "http://localhost:3000";
beforeAll(async () => {
  connection = await connectDatabase({ memory: true }); await migrateDatabase(connection.db);
  await seedDatabase(connection.db, JSON.parse(await readFile("docs/evidence/stage2/seed-sources.json", "utf8")) as SourceCheck[]);
}, 30000);
afterAll(async () => { await connection?.close(); });
afterEach(() => vi.unstubAllEnvs());
function req(path: string, method = "GET", data?: unknown, cookie = "", customHeaders: Record<string, string> = {}) {
  vi.stubEnv("APP_BASE_URL", origin);
  return new NextRequest(`${origin}/api/${path}`, { method, headers: { origin, host: "localhost:3000", "content-type": "application/json", "x-ary-request": "1", cookie, ...customHeaders }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
}
function cookieOf(response: Response, name: string) { return response.headers.get("set-cookie")!.match(new RegExp(`${name}=([^;]+)`))![0]; }
test("real API validation, auth, IDOR, preferences, recommendations and cookie flags", async () => {
  expect((await POST(req("saved", "POST", {}, "", { origin: "https://evil.invalid" }))).status).toBe(403);
  const unauth = await GET(req("visitor/me")); expect(unauth.status).toBe(401); expect(await unauth.json()).toMatchObject({ error: "session_required", requestId: expect.any(String) });
  const created = await POST(req("visitor/session", "POST", { locale: "es" })); expect(created.status).toBe(201);
  const cookie = cookieOf(created, "ary_sid"), flags = created.headers.get("set-cookie")!.split(";").slice(1).join(";");
  expect(flags).toContain("HttpOnly"); expect(flags).toMatch(/SameSite=lax/i); expect(flags).toContain("Path=/"); expect(flags).toContain("Max-Age=");
  expect((await POST(req("visitor/session", "POST", { locale: "es", token: "forged" }))).status).toBe(400);
  expect((await PATCH(req("visitor/preferences", "PATCH", { locale: "es", countryDeclared: "BO", interests: ["wealth"] }, cookie))).status).toBe(400);
  const prefs = { locale: "en", countryDeclared: "BO", interests: ["music"] };
  expect((await PATCH(req("visitor/preferences", "PATCH", prefs, cookie))).status).toBe(200);
  expect((await (await GET(req("visitor/me", "GET", undefined, cookie))).json()).session).toMatchObject(prefs);
  const recommendations = await POST(req("recommendations", "POST", {}, cookie));
  const items = await recommendations.json(); expect(items.mode).toBe("rules"); expect(items.recommendations[0].item.language).toBe("en");
  const saved = await POST(req("saved", "POST", { itemId: items.recommendations[0].item.id }, cookie)); expect(saved.status).toBe(201);
  const id = (await saved.json()).saved.id;
  const other = cookieOf(await POST(req("visitor/session", "POST", {})), "ary_sid");
  expect((await (await GET(req("saved", "GET", undefined, other))).json()).items).toEqual([]);
  expect((await PATCH(req(`saved/${id}`, "PATCH", { state: "visited" }, other))).status).toBe(404);
  expect((await PATCH(req(`saved/${id}`, "PATCH", { sessionId: "forged" }, cookie))).status).toBe(400);
  expect((await POST(req("visitor/handoff", "POST", {}, cookie))).status).toBe(403);
  expect((await GET(req("cultural/items?limit=500"))).status).toBe(400);
  expect((await GET(req("cultural/items/not-a-uuid"))).status).toBe(404);
});
test("authorized kiosk API generates real SVG, single-use redeem, source status and cleanup", async () => {
  const enrolled = await enrollKiosk(connection.db, "API synthetic kiosk");
  const activation = await POST(req("kiosk/activate", "POST", { code: enrolled.code })); expect(activation.status).toBe(200);
  const device = cookieOf(activation, "ary_kiosk");
  expect((await POST(req("kiosk/activate", "POST", { code: enrolled.code }))).status).toBe(400);
  const visitor = await POST(req("visitor/session", "POST", { locale: "es" }, device));
  const source = cookieOf(visitor, "ary_sid"), cookies = `${device}; ${source}`;
  await PATCH(req("visitor/preferences", "PATCH", { locale: "es", countryDeclared: "BO", interests: ["music"] }, cookies));
  const qr = await POST(req("visitor/handoff", "POST", {}, cookies)); expect(qr.status).toBe(200);
  const payload = await qr.json(); expect(payload.svg).toContain("<svg"); expect(payload.url).toMatch(/\/q\/[\w-]{43}$/);
  expect(qr.headers.get("cache-control")).toBe("no-store");
  const token = payload.url.split("/").at(-1);
  const redeemed = await POST(req("visitor/handoff/redeem", "POST", { token, confirmationCode: payload.confirmationCode })); expect(redeemed.status).toBe(200);
  expect(cookieOf(redeemed, "ary_sid")).not.toBe(source);
  expect((await (await GET(req("visitor/handoff/status", "GET", undefined, cookies))).json()).status).toBe("redeemed");
  expect((await GET(req("visitor/me", "GET", undefined, source))).status).toBe(401);
  expect((await POST(req("visitor/handoff/redeem", "POST", { token, confirmationCode: payload.confirmationCode }))).status).toBe(400);
  const old = await getSession(connection.db, source.split("=")[1], new Date(), false); expect(old).toMatchObject({ status: "transferred", interests: [], countryDeclared: null });
});
test("production cookies set Secure and request bodies have a real byte cap", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const response = json({}); setCookie(response, "ary_sid", "synthetic"); expect(response.headers.get("set-cookie")).toContain("Secure");
  vi.stubEnv("NODE_ENV", "test");
  expect((await POST(req("visitor/session", "POST", { locale: "x".repeat(9000) }))).status).toBe(413);
});
