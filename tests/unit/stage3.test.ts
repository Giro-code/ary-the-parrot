import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { NextRequest } from "next/server";
import { connectDatabase, type Connection } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { seedDatabase, type SourceCheck } from "../../src/db/seed";
import * as s from "../../src/db/schema";
import { createSession, getSession, listSaved, saveItem, setPreferences } from "../../src/server/service";
import { confirmMarketing, marketingLinks, requestLink, verifyLink } from "../../src/server/auth";
import { decrypt, emailHash, encrypt, normalizeEmail } from "../../src/server/crypto";
import { noticeVersion, revokeConsent } from "../../src/server/consents";
import { dispatchEmails, enqueueEmail, getDryRunMessages } from "../../src/server/email/outbox";
import { renderEmail, type Template } from "../../src/server/email/templates";
import { ResendEmailProvider } from "../../src/server/email/providers";
import { handleWebhook, verifyWebhook } from "../../src/server/email/webhook";
import { deletePrivateData, privacyData, setEmailPreferences, unsubscribeEmail } from "../../src/server/privacy";
import { createInquiry, inquirySchema } from "../../src/server/commercial";
import { hashToken, newToken } from "../../src/server/tokens";
import { cleanupDatabase } from "../../src/db/cleanup";
let connection: Connection;
vi.mock("../../src/db/client", async original => ({ ...await original<typeof import("../../src/db/client")>(), getConnection: async () => connection }));
import { GET, POST, DELETE } from "../../app/api/[...path]/route";
import { POST as dispatch } from "../../app/api/internal/email-dispatch/route";
import { POST as webhookPost } from "../../app/api/email/webhook/route";
import { GET as unsubscribeGet, POST as unsubscribePost } from "../../app/api/email/unsubscribe/route";
let counter = 0;
const email = () => `Stage3.${++counter}@example.invalid`;
const origin = "http://localhost:3000";
const requestData = (address: string, marketingEmail = false) => ({ email: address, locale: "es" as const, consentVersion: noticeVersion, transactionalRecovery: true as const, marketingEmail });
beforeAll(async () => {
  connection = await connectDatabase({ memory: true }); await migrateDatabase(connection.db);
  await seedDatabase(connection.db, JSON.parse(await readFile("docs/evidence/stage2/seed-sources.json", "utf8")) as SourceCheck[]);
}, 30000);
beforeEach(() => { vi.stubEnv("APP_BASE_URL", origin); vi.stubEnv("EMAIL_DRY_RUN", "true"); vi.stubEnv("FEATURE_ENABLE_MARKETING", "false"); vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected external call"); })); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
afterAll(async () => { await connection.close(); });
const db = () => connection.db;
function req(path: string, method = "GET", data?: unknown, token?: string, headers: Record<string, string> = {}) {
  return new NextRequest(`${origin}${path}`, { method, headers: { host: "localhost:3000", origin, "x-ary-request": "1", "content-type": "application/json", "x-forwarded-for": randomUUID(), ...(token ? { cookie: `ary_sid=${token}` } : {}), ...headers }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
}
async function linkFrom(address: string, template = "recovery") {
  const rows = await getDryRunMessages(db());
  const message = rows.find(row => row.to === address && row.template === template)!;
  expect(message).toBeTruthy();
  return new URL(message.text.match(/http:\/\/[^\s]+/)![0]).searchParams.get("token")!;
}
async function recover(address = email(), sourceToken?: string, marketing = false) {
  await requestLink(db(), requestData(address, marketing), hashToken(randomUUID()), sourceToken);
  const token = await linkFrom(address);
  return { ...await verifyLink(db(), token), address, magicToken: token };
}
async function count(table: typeof s.emailOutbox) { return (await db().select().from(table)).length; }
test("email normalization preserves local part; HMAC and authenticated encryption protect storage", () => {
  expect(normalizeEmail("  A.Tag+X@EXAMPLE.INVALID  ")).toBe("A.Tag+X@example.invalid");
  expect(emailHash("A.Tag+X@EXAMPLE.INVALID")).toBe(emailHash("A.Tag+X@example.invalid"));
  expect(emailHash("a.Tag+X@example.invalid")).not.toBe(emailHash("A.Tag+X@example.invalid"));
  const ciphertext = encrypt("synthetic@example.invalid"); expect(ciphertext).not.toContain("synthetic"); expect(decrypt(ciphertext)).toBe("synthetic@example.invalid");
  const pieces = ciphertext.split("."); pieces[2] = Buffer.alloc(16).toString("base64url"); expect(() => decrypt(pieces.join("."))).toThrow();
});
test("enumeration: identical HTTP response for existing and nonexistent account; no ownership before verification", async () => {
  const existing = await recover(); const unknown = email();
  const a = await POST(req("/api/auth/request-link", "POST", requestData(existing.address)));
  const b = await POST(req("/api/auth/request-link", "POST", requestData(unknown)));
  expect(a.status).toBe(200); expect(b.status).toBe(200); expect(await a.json()).toEqual(await b.json());
  expect((await db().select().from(s.visitorAccounts).where(eq(s.visitorAccounts.emailLookupHash, emailHash(unknown)))).length).toBe(0);
  expect((await GET(req("/api/saved"))).status).toBe(401);
});
test("magic token is hashed, single-use, expired or altered tokens fail and GET never consumes", async () => {
  const address = email(); await requestLink(db(), requestData(address), hashToken(randomUUID())); const magic = await linkFrom(address);
  const [row] = await db().select().from(s.authMagicLinks).where(eq(s.authMagicLinks.tokenHash, hashToken(magic)));
  expect(row.tokenHash).not.toBe(magic); expect(+row.expiresAt - +row.createdAt).toBeGreaterThan(890_000);
  expect((await GET(req(`/api/auth/verify-link?token=${magic}`))).status).toBe(401);
  const first = await POST(req("/api/auth/verify-link", "POST", { token: magic })); expect(first.status).toBe(200);
  expect(first.headers.get("set-cookie")).toContain("HttpOnly"); expect((await POST(req("/api/auth/verify-link", "POST", { token: magic }))).status).toBe(400);
  await expect(verifyLink(db(), newToken())).rejects.toMatchObject({ code: "link_unavailable" });
  const expiredEmail = email(); await requestLink(db(), requestData(expiredEmail), hashToken(randomUUID()));
  const expired = await linkFrom(expiredEmail); await db().update(s.authMagicLinks).set({ expiresAt: new Date(0) }).where(eq(s.authMagicLinks.tokenHash, hashToken(expired)));
  await expect(verifyLink(db(), expired)).rejects.toMatchObject({ code: "link_unavailable" });
});
test("two simultaneous verification POSTs have exactly one winner", async () => {
  const address = email(); await requestLink(db(), requestData(address), hashToken(randomUUID())); const token = await linkFrom(address);
  const attempts = await Promise.allSettled([verifyLink(db(), token), verifyLink(db(), token)]);
  expect(attempts.filter(row => row.status === "fulfilled")).toHaveLength(1);
});
test("persistent rate limiting per email hash and per client", async () => {
  const address = email(); for (let i = 0; i < 3; i++) await requestLink(db(), requestData(address), hashToken(randomUUID()));
  await expect(requestLink(db(), requestData(address), hashToken(randomUUID()))).rejects.toMatchObject({ status: 429 });
  const client = hashToken(randomUUID()); for (let i = 0; i < 10; i++) await requestLink(db(), requestData(email()), client);
  await expect(requestLink(db(), requestData(email()), client)).rejects.toMatchObject({ status: 429 });
  expect((await db().select().from(s.rateLimits)).length).toBeGreaterThan(10);
});
test("recovery on another cookie merges saved items without duplicates and rotates/revokes anonymous sessions", async () => {
  const items = await db().select().from(s.culturalItems).where(eq(s.culturalItems.status, "published")).limit(2);
  const first = await createSession(db()); await saveItem(db(), first.session.id, items[0].id);
  await setPreferences(db(), first.session, { locale: "es", countryDeclared: "BO", interests: ["music"] });
  const address = email(); await requestLink(db(), requestData(address), hashToken(randomUUID()), first.token); const link = await linkFrom(address);
  const otherDevice = await createSession(db()); await saveItem(db(), otherDevice.session.id, items[0].id); await saveItem(db(), otherDevice.session.id, items[1].id);
  const verified = await verifyLink(db(), link, otherDevice.token);
  expect(verified.token).not.toBe(first.token); expect(verified.token).not.toBe(otherDevice.token);
  expect((await listSaved(db(), verified.session.id)).map(row => row.item.id).sort()).toEqual(items.map(row => row.id).sort());
  expect(verified.session.countryDeclared).toBe("BO");
  await expect(getSession(db(), first.token)).rejects.toMatchObject({ status: 401 }); await expect(getSession(db(), otherDevice.token)).rejects.toMatchObject({ status: 401 });
  const thirdDevice = await recover(address); expect(await listSaved(db(), thirdDevice.session.id)).toHaveLength(2);
  const stranger = await createSession(db()); await requestLink(db(), requestData(address), hashToken(randomUUID()), stranger.token);
  expect(await listSaved(db(), stranger.session.id)).toHaveLength(0); expect((await getSession(db(), stranger.token)).ownerUserId).toBeNull();
});
test("dry-run never calls Resend even with configured credentials; all messages go through outbox", async () => {
  vi.stubEnv("RESEND_API_KEY", "test-only"); vi.stubEnv("EMAIL_FROM", "Ary <test@example.invalid>");
  const account = await recover(); const rows = await db().select().from(s.emailOutbox).where(eq(s.emailOutbox.recipientHash, emailHash(account.address)));
  expect(rows).toHaveLength(1); expect(rows[0].deliveryState).toBe("dry_run"); expect(rows[0].renderedEncrypted).not.toContain("token=");
  expect(fetch).not.toHaveBeenCalled();
  vi.stubEnv("EMAIL_DRY_RUN", "false"); vi.stubEnv("RESEND_API_KEY", ""); await recover(); expect(fetch).not.toHaveBeenCalled();
});
test("marketing disabled or without opt-in queues zero marketing rows", async () => {
  const account = await recover(undefined, undefined, true); const before = await count(s.emailOutbox);
  expect(await db().select().from(s.emailSubscriptions).where(eq(s.emailSubscriptions.visitorId, account.session.ownerUserId!))).toHaveLength(0);
  expect((await getDryRunMessages(db())).filter(row => row.to === account.address && row.template === "marketing_confirmation")).toHaveLength(0);
  expect(await enqueueEmail(db(), { template: "cultural_reminder", category: "marketing", locale: "es", visitorId: account.session.ownerUserId!, to: account.address, idempotencyKey: randomUUID() })).toBeNull();
  vi.stubEnv("FEATURE_ENABLE_MARKETING", "true");
  expect(await enqueueEmail(db(), { template: "cultural_reminder", category: "marketing", locale: "es", visitorId: account.session.ownerUserId!, to: account.address, idempotencyKey: randomUUID() })).toBeNull();
  expect(await count(s.emailOutbox)).toBe(before);
});
test("double opt-in activates only after confirmation; marketing has unsubscribe headers; pause and unsubscribe stop future sends", async () => {
  vi.stubEnv("FEATURE_ENABLE_MARKETING", "true"); const account = await recover(undefined, undefined, true), owner = account.session.ownerUserId!;
  const pending = (await db().select().from(s.emailSubscriptions).where(eq(s.emailSubscriptions.visitorId, owner)))[0]; expect(pending.status).toBe("pending");
  const send = () => enqueueEmail(db(), { template: "cultural_reminder", category: "marketing", locale: "en", visitorId: owner, to: account.address, idempotencyKey: randomUUID() });
  expect(await send()).toBeNull();
  await confirmMarketing(db(), await linkFrom(account.address, "marketing_confirmation"));
  expect((await db().select().from(s.emailSubscriptions).where(eq(s.emailSubscriptions.visitorId, owner)))[0].status).toBe("active");
  await setEmailPreferences(db(), account.session, { status: "paused" }); expect(await send()).toBeNull();
  await setEmailPreferences(db(), account.session, { status: "active", frequency: "weekly" }); expect(await send()).toEqual(expect.any(String));
  const rendered = (await getDryRunMessages(db())).find(row => row.to === account.address && row.template === "cultural_reminder")!;
  expect(rendered.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  const links = await marketingLinks(db(), owner), token = new URL(links.unsubscribeUrl).searchParams.get("token")!;
  expect((await unsubscribeGet(req(`/api/email/unsubscribe?token=${token}`))).status).toBe(303);
  expect((await db().select().from(s.emailSubscriptions).where(eq(s.emailSubscriptions.visitorId, owner)))[0].status).toBe("active");
  expect((await unsubscribePost(req(`/api/email/unsubscribe?token=${token}`, "POST", {}))).status).toBe(200);
  await unsubscribeEmail(db(), token); expect(await send()).toBeNull();
  expect((await db().select().from(s.consentRecords).where(eq(s.consentRecords.visitorId, owner))).some(row => row.revokedAt)).toBe(true);
});
function signed(raw: string, id = randomUUID(), seconds = Math.floor(Date.now() / 1000)) {
  const secret = Buffer.alloc(32, 9); vi.stubEnv("RESEND_WEBHOOK_SECRET", `whsec_${secret.toString("base64")}`);
  return new Headers({ "svix-id": id, "svix-timestamp": String(seconds), "svix-signature": `v1,${createHmac("sha256", secret).update(`${id}.${seconds}.${raw}`).digest("base64")}` });
}
test("Svix valid/invalid/expired signatures, replay dedupe and bounce suppression", async () => {
  const account = await recover(); const raw = JSON.stringify({ type: "email.bounced", data: { email_id: randomUUID(), to: [account.address] } }), headers = signed(raw);
  expect(verifyWebhook(raw, headers)).toEqual(expect.any(String)); expect(() => verifyWebhook(`${raw} `, headers)).toThrow();
  expect(() => verifyWebhook(raw, signed(raw, randomUUID(), Math.floor(Date.now() / 1000) - 600))).toThrow();
  await handleWebhook(db(), raw, headers); await handleWebhook(db(), raw, headers);
  expect(await enqueueEmail(db(), { template: "saved_places", locale: "es", to: account.address, idempotencyKey: randomUUID() })).toBeNull();
  expect((await db().select().from(s.emailSuppressions).where(eq(s.emailSuppressions.emailHash, emailHash(account.address))))[0].reason).toBe("bounced");
  const invalid = await webhookPost(new NextRequest(`${origin}/api/email/webhook`, { method: "POST", headers, body: raw + " " })); expect(invalid.status).toBe(400);
});
test("delivered is webhook-only and a late delivered event cannot overwrite a complaint", async () => {
  const account = await recover(), providerId = randomUUID();
  const [row] = await db().update(s.emailOutbox).set({ providerMessageId: providerId, deliveryState: "accepted_by_provider" }).where(eq(s.emailOutbox.recipientHash, emailHash(account.address))).returning();
  for (const type of ["email.delivered", "email.complained", "email.delivered"]) { const raw = JSON.stringify({ type, data: { email_id: providerId, to: [account.address] } }); await handleWebhook(db(), raw, signed(raw)); }
  expect((await db().select().from(s.emailOutbox).where(eq(s.emailOutbox.id, row.id)))[0].deliveryState).toBe("complained");
});
test("dispatch secret mandatory, constant auth fails closed; missing webhook secret is 503", async () => {
  vi.stubEnv("CRON_SECRET", ""); expect((await dispatch(req("/api/internal/email-dispatch", "POST", {}))).status).toBe(401);
  vi.stubEnv("CRON_SECRET", "test-secret"); expect((await dispatch(req("/api/internal/email-dispatch", "POST", {}, undefined, { authorization: "Bearer wrong" }))).status).toBe(401);
  vi.stubEnv("RESEND_WEBHOOK_SECRET", ""); expect((await webhookPost(req("/api/email/webhook", "POST", {}))).status).toBe(503);
});
test("Resend HTTP adapter uses idempotency; retries sanitize errors and never equate accepted with delivered", async () => {
  vi.stubEnv("EMAIL_DRY_RUN", "false"); vi.stubEnv("RESEND_API_KEY", "test-only"); vi.stubEnv("EMAIL_FROM", "Ary <test@example.invalid>");
  const address = email(), key = randomUUID(); await enqueueEmail(db(), { template: "saved_places", locale: "es", to: address, idempotencyKey: key });
  const mocked = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ secret: "do-not-log@example.invalid" }), { status: 429 })).mockResolvedValue(new Response(JSON.stringify({ id: "provider-test-id" }), { status: 200 })); vi.stubGlobal("fetch", mocked);
  await dispatchEmails(db(), new ResendEmailProvider());
  const [retry] = await db().select().from(s.emailOutbox).where(eq(s.emailOutbox.idempotencyKey, key)); expect(retry.lastError).toBe("provider_http_429"); expect(retry.retries).toBe(1);
  await db().update(s.emailOutbox).set({ scheduledAt: new Date(0) }).where(eq(s.emailOutbox.id, retry.id));
  await dispatchEmails(db(), new ResendEmailProvider());
  expect((await db().select().from(s.emailOutbox).where(eq(s.emailOutbox.id, retry.id)))[0]).toMatchObject({ deliveryState: "accepted_by_provider", providerMessageId: "provider-test-id" });
  expect(mocked.mock.calls[0][1].headers["Idempotency-Key"]).toBe(key); expect(mocked.mock.calls[1][1].headers["Idempotency-Key"]).toBe(key);
});
test("privacy export and delete are authenticated, owner scoped, cancel links and mail, keep anonymous history", async () => {
  const account = await recover(), stranger = await createSession(db());
  expect((await POST(req("/api/privacy/export", "POST", {}, stranger.token))).status).toBe(401);
  const exported = await POST(req("/api/privacy/export", "POST", {}, account.token)); expect(exported.status).toBe(200); expect(exported.headers.get("content-disposition")).toContain("attachment");
  const payload = await exported.json(); expect(payload.account.email).toBe(account.address); expect(JSON.stringify(payload)).not.toContain(account.magicToken); expect(JSON.stringify(payload)).not.toContain("emailLookupHash");
  expect((await GET(req("/api/consents", "GET", undefined, account.token))).status).toBe(200);
  expect((await DELETE(req("/api/consents/transactional_recovery", "DELETE", {}, account.token))).status).toBe(200);
  expect((await privacyData(db(), account.session)).consents.some(row => row.revokedAt)).toBe(true);
  const result = await POST(req("/api/privacy/delete", "POST", { confirm: true }, account.token)); expect(result.status).toBe(200); expect(result.headers.get("set-cookie")).toContain("Max-Age=0");
  await expect(getSession(db(), account.token)).rejects.toMatchObject({ status: 401 });
  expect(await db().select().from(s.visitorAccounts).where(eq(s.visitorAccounts.id, account.session.ownerUserId!))).toHaveLength(0);
  expect(await db().select().from(s.authMagicLinks).where(eq(s.authMagicLinks.emailLookupHash, emailHash(account.address)))).toHaveLength(0);
  expect((await getDryRunMessages(db())).some(row => row.to === account.address)).toBe(false);
  expect((await db().select().from(s.deletionJobs)).some(row => row.status === "completed" && !row.subjectId)).toBe(true);
});
test("B2B inquiry is idempotent, encrypted, audited, honeypot guarded and never creates visitor data", async () => {
  const data = inquirySchema.parse({ treatmentConsent: true, name: "Synthetic Applicant", org: "Test Hotel", email: email(), place: "Hotel", message: "Synthetic commercial inquiry only.", locale: "es", consentVersion: noticeVersion });
  const before = (await db().select().from(s.visitorAccounts)).length, key = randomUUID();
  const a = await createInquiry(db(), data, key, hashToken(randomUUID())), b = await createInquiry(db(), data, key, hashToken(randomUUID()));
  expect(a).toEqual(b); expect(a.reference).toMatch(/^ARY-\d{4}-[A-F0-9]{8}$/); expect(a.storageMode).toBe("local_test");
  const rows = await db().select().from(s.commercialInquiries).where(eq(s.commercialInquiries.idempotencyKey, key)); expect(rows).toHaveLength(1); expect(rows[0].payloadEncrypted).not.toContain(data.email);
  expect(await db().select().from(s.auditLogs).where(eq(s.auditLogs.targetId, rows[0].id))).toHaveLength(1);
  expect((await db().select().from(s.visitorAccounts)).length).toBe(before);
  await expect(createInquiry(db(), { ...data, website: "bot.invalid" }, randomUUID(), hashToken(randomUUID()))).rejects.toMatchObject({ status: 400 });
  await expect(createInquiry(db(), { ...data, org: "Changed" }, key, hashToken(randomUUID()))).rejects.toMatchObject({ status: 409 });
  expect((await POST(req("/api/commercial/inquiries", "POST", { ...data, ownerUserId: randomUUID() }, undefined, { "idempotency-key": randomUUID() }))).status).toBe(400);
});
test("production without encryption/auth keys returns 503 and sends nothing", async () => {
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("AUTH_SECRET", ""); vi.stubEnv("SESSION_ENCRYPTION_KEY", ""); vi.stubEnv("RATE_LIMIT_SALT", "test-rate-limit-salt"); vi.stubEnv("APP_BASE_URL", "https://localhost:3000");
  const response = await POST(new NextRequest("https://localhost:3000/api/auth/request-link", { method: "POST", headers: { host: "localhost:3000", origin: "https://localhost:3000", "x-ary-request": "1", "content-type": "application/json" }, body: JSON.stringify(requestData(email())) }));
  expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ error: "privacy_keys_not_configured" }); expect(fetch).not.toHaveBeenCalled();
});
test("six required templates render in ES/EN without chat or full-profile data", () => {
  const templates: Template[] = ["recovery", "marketing_confirmation", "saved_places", "cultural_reminder", "preferences_updated", "provider_receipt"];
  for (const locale of ["es", "en"] as const) for (const template of templates) {
    const rendered = renderEmail(template, locale, { url: `${origin}/reingresar`, providerName: "<script>synthetic</script>", sharedFields: ["email"], preferencesUrl: `${origin}/cuenta/privacidad`, unsubscribeUrl: `${origin}/api/email/unsubscribe?token=synthetic` });
    expect(rendered.text.length).toBeGreaterThan(100); expect(rendered.html).toContain(`lang="${locale}"`); expect(rendered.html).not.toContain("<script>"); expect(rendered.html).toContain("&lt;script&gt;");
  }
});
test("revoking storage prevents new persistent saves, and revoking marketing preserves history", async () => {
  const account = await recover(); await revokeConsent(db(), account.session, "service_storage");
  const [item] = await db().select().from(s.culturalItems).where(eq(s.culturalItems.status, "published")).limit(1);
  await expect(saveItem(db(), account.session.id, item.id)).rejects.toMatchObject({ code: "storage_consent_required" });
  expect(await db().select().from(s.consentRecords).where(and(eq(s.consentRecords.visitorId, account.session.ownerUserId!), eq(s.consentRecords.purpose, "service_storage")))).toHaveLength(2);
});
test("deleting a visitor leaves separate business inquiries untouched", async () => {
  const account = await recover(), reference = randomUUID();
  await createInquiry(db(), inquirySchema.parse({ treatmentConsent: true, name: "Separate applicant", org: "Hotel", email: account.address, place: "Hotel", message: "Separate purpose and separate records.", locale: "en", consentVersion: noticeVersion }), reference, hashToken(randomUUID()));
  await deletePrivateData(db(), account.session);
  expect((await db().execute(sql`select count(*)::int as count from commercial_inquiries where idempotency_key = ${reference}`)).rows[0].count).toBe(1);
});
test("verification rolls back token consumption if account creation fails", async () => {
  const address = email(); await requestLink(db(), requestData(address), hashToken(randomUUID())); const token = await linkFrom(address);
  await db().execute(sql`create function stage3_fail_account() returns trigger language plpgsql as $$ begin raise exception 'synthetic rollback'; end $$`);
  await db().execute(sql`create trigger stage3_fail before insert on visitor_accounts for each row execute function stage3_fail_account()`);
  try { await expect(verifyLink(db(), token)).rejects.toThrow(); }
  finally { await db().execute(sql`drop trigger stage3_fail on visitor_accounts`); await db().execute(sql`drop function stage3_fail_account()`); }
  expect((await db().select().from(s.authMagicLinks).where(eq(s.authMagicLinks.tokenHash, hashToken(token))))[0].usedAt).toBeNull();
  expect((await verifyLink(db(), token)).session.ownerUserId).toEqual(expect.any(String));
});
test("revoking recovery invalidates outstanding access tokens; a later explicit request works", async () => {
  const account = await recover();
  await requestLink(db(), requestData(account.address), hashToken(randomUUID()), account.token);
  const old = await linkFrom(account.address);
  await revokeConsent(db(), account.session, "transactional_recovery");
  await expect(verifyLink(db(), old)).rejects.toMatchObject({ code: "link_unavailable" });
  const newAccount = await recover(account.address); expect(newAccount.session.ownerUserId).toBe(account.session.ownerUserId);
});
test("commercial rate limit applies even when bots change their idempotency keys", async () => {
  const client = hashToken(randomUUID()), data = inquirySchema.parse({ treatmentConsent: true, name: "Synthetic", org: "Hotel", email: email(), place: "Hotel", message: "Rate limit synthetic request.", locale: "en", consentVersion: noticeVersion });
  for (let i = 0; i < 5; i++) await createInquiry(db(), data, randomUUID(), client);
  await expect(createInquiry(db(), data, randomUUID(), client)).rejects.toMatchObject({ status: 429 });
});
test("retention cleanup purges inactive accounts and aged email/B2B data", async () => {
  const account = await recover(), old = new Date(Date.now() - 366 * 86400_000), key = randomUUID();
  await db().update(s.visitorAccounts).set({ lastActiveAt: old }).where(eq(s.visitorAccounts.id, account.session.ownerUserId!));
  await createInquiry(db(), inquirySchema.parse({ treatmentConsent: true, name: "Expired inquiry", org: "Hotel", email: email(), place: "Hotel", message: "Synthetic retention test only.", locale: "es", consentVersion: noticeVersion }), key, hashToken(randomUUID()));
  const [inquiry] = await db().update(s.commercialInquiries).set({ createdAt: old }).where(eq(s.commercialInquiries.idempotencyKey, key)).returning();
  await db().update(s.emailOutbox).set({ createdAt: old }).where(eq(s.emailOutbox.inquiryId, inquiry.id));
  await cleanupDatabase(db());
  expect(await db().select().from(s.visitorAccounts).where(eq(s.visitorAccounts.id, account.session.ownerUserId!))).toHaveLength(0);
  expect(await db().select().from(s.commercialInquiries).where(eq(s.commercialInquiries.id, inquiry.id))).toHaveLength(0);
  expect(await db().select().from(s.emailOutbox).where(eq(s.emailOutbox.inquiryId, inquiry.id))).toHaveLength(0);
});
