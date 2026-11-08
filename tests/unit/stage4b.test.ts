import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { connectDatabase, type Connection } from "../../src/db/client";
import { migrateDatabase } from "../../src/db/migrate";
import { cleanupDatabase } from "../../src/db/cleanup";
import { demoIds, demoStaff, resetDemo, seedDemo } from "../../src/db/demo";
import * as s from "../../src/db/schema";
import { createMembership, requireStaff, requestStaffLink, verifyStaffLink, type Staff } from "../../src/server/staff";
import { decrypt, emailHash, encrypt } from "../../src/server/crypto";
import { getDryRunMessages, dispatchEmails } from "../../src/server/email/outbox";
import { hashToken, newToken } from "../../src/server/tokens";
import { contentAction, contentSchema, saveContent, queueCampaign } from "../../src/server/admin";
import { checkSource, publicAddress, sourceUrl } from "../../src/server/source-check";
import { createSession, recordEvent } from "../../src/server/service";
import { revokeConsent, noticeVersion } from "../../src/server/consents";
import { leadSchema, shareLead } from "../../src/server/leads";
import { overview, overviewCsv, suppress } from "../../src/server/analytics";
let connection: Connection;
vi.mock("../../src/db/client", async original => ({ ...await original<typeof import("../../src/db/client")>(), getConnection: async () => connection }));
import { GET, POST, PATCH, DELETE } from "../../app/api/[...path]/route";
import { GET as cleanup } from "../../app/api/internal/cleanup/route";
const db = () => connection.db;
const origin = "http://localhost:3000";
let adminToken: string, aToken: string, bToken: string, analystToken: string;
const admin: Staff = { userId: demoStaff[0].id, organizationId: demoIds.airport, role: "superadmin" };
function req(path: string, method = "GET", data?: unknown, staffToken?: string, visitorToken?: string) {
  return new NextRequest(`${origin}${path}`, { method, headers: { host: "localhost:3000", origin, "x-ary-request": "1", "content-type": "application/json", "x-forwarded-for": randomUUID(), cookie: [staffToken ? `ary_staff=${staffToken}` : "", visitorToken ? `ary_sid=${visitorToken}` : ""].filter(Boolean).join("; ") }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
}
async function staffToken(userId: string, expiresAt = new Date(Date.now() + 3600_000)) { const token = newToken(); await db().insert(s.staffSessions).values({ userId, tokenHash: hashToken(token), expiresAt }); return token; }
async function magic(email: string) { const message = (await getDryRunMessages(db())).find(row => row.to === email && row.template === "staff_login")!; expect(message).toBeTruthy(); return new URL(message.text.match(/http:\/\/[^\s]+/)![0]).searchParams.get("token")!; }
beforeAll(async () => { connection = await connectDatabase({ memory: true }); await migrateDatabase(db()); await seedDemo(db()); [adminToken, aToken, bToken, analystToken] = await Promise.all(demoStaff.map(row => staffToken(row.id))); }, 30000);
beforeEach(async () => { vi.stubEnv("APP_BASE_URL", origin); vi.stubEnv("EMAIL_DRY_RUN", "true"); vi.stubEnv("FEATURE_ENABLE_PARTNER_SHARING", "true"); vi.stubEnv("FEATURE_ENABLE_MARKETING", "false"); vi.stubGlobal("fetch", vi.fn(() => { throw new Error("External call forbidden in tests"); })); await db().delete(s.rateLimits); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
afterAll(async () => { await connection.close(); });
test("staff requests give identical responses and issue tokens only for active memberships", async () => {
  const a = await POST(req("/api/staff/request-link", "POST", { email: demoStaff[0].email })), b = await POST(req("/api/staff/request-link", "POST", { email: "unknown@example.invalid" }));
  expect(a.status).toBe(200); expect(await a.json()).toEqual(await b.json());
  expect((await db().select().from(s.authMagicLinks).where(eq(s.authMagicLinks.purpose, "staff_login"))).length).toBe(1);
  expect((await db().select().from(s.authMagicLinks).where(eq(s.authMagicLinks.purpose, "staff_login")))[0].expiresAt.getTime() - Date.now()).toBeGreaterThan(890_000);
});
test("staff magic links are single-use and cookie is separate, HttpOnly, Strict and 8h; login rotates", async () => {
  await requestStaffLink(db(), demoStaff[0].email, hashToken(randomUUID())); const token = await magic(demoStaff[0].email), previous = await staffToken(admin.userId);
  const response = await POST(req("/api/staff/verify", "POST", { token }, previous)); expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toMatch(/ary_staff=.+HttpOnly; SameSite=strict/i); expect(response.headers.get("set-cookie")).toContain("Max-Age=28800"); expect(response.headers.get("set-cookie")).not.toContain("ary_sid");
  await expect(requireStaff({ db: db(), token: previous, roles: ["superadmin"] })).rejects.toMatchObject({ status: 403 });
  expect((await POST(req("/api/staff/verify", "POST", { token }))).status).toBe(400);
});
test("expired, tampered, visitor-purpose and inactive staff links cannot log in", async () => {
  const expired = newToken(), visitor = newToken();
  await db().insert(s.authMagicLinks).values([{ tokenHash: hashToken(expired), purpose: "staff_login", userId: admin.userId, expiresAt: new Date(Date.now() - 1) }, { tokenHash: hashToken(visitor), purpose: "recovery", userId: admin.userId, expiresAt: new Date(Date.now() + 900_000) }]);
  for (const token of [expired, visitor, newToken()]) await expect(verifyStaffLink(db(), token)).rejects.toMatchObject({ code: "link_unavailable" });
  expect((await db().select().from(s.authMagicLinks).where(eq(s.authMagicLinks.tokenHash, hashToken(visitor))))[0].usedAt).toBeNull();
  const address = `${randomUUID()}@example.invalid`, [org] = await db().insert(s.organizations).values({ name: "Suspended", kind: "provider" }).returning(); const member = await createMembership(db(), address, org.id, "provider_admin", "suspended");
  await requestStaffLink(db(), address, hashToken(randomUUID())); expect((await db().select().from(s.authMagicLinks).where(eq(s.authMagicLinks.userId, member.userId))).length).toBe(0);
  const expiredSession = await staffToken(admin.userId, new Date(Date.now() - 1)); await expect(requireStaff({ db: db(), token: expiredSession, roles: ["superadmin"] })).rejects.toMatchObject({ status: 403 });
});
test("staff magic link concurrent redemption has one winner; revoked membership invalidates a live cookie", async () => {
  const address = `${randomUUID()}@example.invalid`, [org] = await db().insert(s.organizations).values({ name: "Staff concurrency", kind: "admin" }).returning();
  const member = await createMembership(db(), address, org.id, "operator"); await requestStaffLink(db(), address, hashToken(randomUUID())); const link = await magic(address);
  const results = await Promise.allSettled([verifyStaffLink(db(), link), verifyStaffLink(db(), link)]); expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
  const token = (results.find(row => row.status === "fulfilled") as PromiseFulfilledResult<{ token: string }>).value.token;
  await db().update(s.memberships).set({ status: "suspended" }).where(eq(s.memberships.id, member.id)); await expect(requireStaff({ db: db(), token, roles: ["operator"] })).rejects.toMatchObject({ status: 403 });
});
test("superadmin invitation is single-use and suspended invitations cannot reactivate memberships", async () => {
  const address = `${randomUUID()}@example.invalid`;
  expect((await POST(req("/api/admin/memberships", "POST", { email: address, organizationId: demoIds.a, role: "provider_editor" }, adminToken))).status).toBe(200);
  const [member] = await db().select().from(s.memberships).innerJoin(s.visitorAccounts, eq(s.memberships.userId, s.visitorAccounts.id)).where(eq(s.visitorAccounts.emailLookupHash, emailHash(address))); expect(member.memberships.status).toBe("invited");
  const link = await magic(address), verified = await verifyStaffLink(db(), link); expect(await requireStaff({ db: db(), token: verified.token, roles: ["provider_editor"], organizationId: demoIds.a })).toMatchObject({ organizationId: demoIds.a });
  await expect(verifyStaffLink(db(), link)).rejects.toThrow();
  expect((await PATCH(req(`/api/admin/memberships/${member.memberships.id}`, "PATCH", { role: "provider_editor", status: "suspended" }, adminToken))).status).toBe(200);
  await expect(requireStaff({ db: db(), token: verified.token, roles: ["provider_editor"] })).rejects.toMatchObject({ status: 403 });
});
test("vertical escalation: provider editor cannot administer, moderate or delete offers; analyst is read only", async () => {
  for (const path of ["/api/admin/organizations", "/api/admin/inquiries", "/api/admin/deletions", "/api/analytics/overview"]) expect((await GET(req(path, "GET", undefined, bToken))).status).toBe(403);
  expect((await PATCH(req(`/api/admin/offers/${demoIds.offerB}`, "PATCH", { status: "approved" }, bToken))).status).toBe(403);
  expect((await DELETE(req(`/api/partner/offers/${demoIds.offerB}?organizationId=${demoIds.b}`, "DELETE", {}, bToken))).status).toBe(403);
  expect((await GET(req("/api/analytics/overview", "GET", undefined, analystToken))).status).toBe(200);
  expect((await POST(req("/api/admin/devices", "POST", { label: "No" }, analystToken))).status).toBe(403);
  expect((await GET(req("/api/admin/devices"))).status).toBe(401);
});
for (const path of ["offers", "providers", "leads", "metrics"]) test(`horizontal isolation of partner ${path} endpoint`, async () => {
  const denied = await GET(req(`/api/partner/${path}?organizationId=${demoIds.b}`, "GET", undefined, aToken)); expect(denied.status).toBe(403);
  const own = await GET(req(`/api/partner/${path}?organizationId=${demoIds.a}`, "GET", undefined, aToken)); expect(own.status).toBe(200); expect(JSON.stringify(await own.json())).not.toContain("Demo Paseo Cultural");
});
const offerData = (providerId = demoIds.providerA) => ({ providerId, title: "DEMO Test", eligibility: "", pricingDisclaimer: "Demo", sourceUrl: null, sponsored: true });
test("partner CRUD SQL rejects foreign provider, offer ID and lead ID", async () => {
  const q = `?organizationId=${demoIds.a}`;
  expect((await POST(req(`/api/partner/offers${q}`, "POST", offerData(demoIds.providerB), aToken))).status).toBe(403);
  expect((await PATCH(req(`/api/partner/offers/${demoIds.offerB}${q}`, "PATCH", offerData(), aToken))).status).toBe(404);
  expect((await DELETE(req(`/api/partner/offers/${demoIds.offerB}${q}`, "DELETE", {}, aToken))).status).toBe(404);
  expect((await PATCH(req(`/api/partner/leads/${randomUUID()}${q}`, "PATCH", { status: "cerrado" }, aToken))).status).toBe(404);
  const created = await POST(req(`/api/partner/offers${q}`, "POST", offerData(), aToken)); expect(created.status).toBe(201); const { offer } = await created.json(); expect(offer.approvedStatus).toBe("pending_review");
  expect((await PATCH(req(`/api/admin/offers/${offer.id}`, "PATCH", { status: "approved" }, adminToken))).status).toBe(200);
  expect((await PATCH(req(`/api/partner/offers/${offer.id}${q}`, "PATCH", offerData(), aToken))).status).toBe(200);
  expect((await db().select().from(s.offers).where(eq(s.offers.id, offer.id)))[0].approvedStatus).toBe("pending_review");
  expect((await DELETE(req(`/api/partner/offers/${offer.id}${q}`, "DELETE", {}, aToken))).status).toBe(200);
});
test("analytics and CSV suppress 0..9 and ratio; sample, periods, kiosk and provider are aggregated", async () => {
  for (const value of [0, 1, 9]) expect(suppress(value)).toBe("<10"); expect(suppress(10)).toBe(10);
  const filter = { from: new Date(Date.now() - 86400_000), to: new Date(Date.now() + 1000), kioskId: demoIds.kiosk };
  const result = await overview(db(), filter); expect(result.sampleSize).toBe(12); expect(result.metrics.find(row => row.key === "chat_asked")?.value).toBe("<10"); expect(result.languages).toContainEqual({ key: "en", value: "<10" }); expect(result.qrRedemptionRatio).toBe("40%");
  const csv = overviewCsv(result); expect(csv).toContain('"chat_asked","<10"'); expect(csv).not.toContain("@example.invalid");
  const empty = await overview(db(), { ...filter, kioskId: randomUUID() }); expect(empty.sampleSize).toBe("<10"); expect(empty.qrRedemptionRatio).toBe("<10");
  const own = await overview(db(), filter, demoIds.b); expect(own.metrics.every(row => row.value === "<10")).toBe(true);
  const exportResponse = await GET(req("/api/analytics/overview?format=csv", "GET", undefined, adminToken)); expect(exportResponse.headers.get("content-type")).toContain("text/csv"); expect(await exportResponse.text()).toContain("<10");
});
test("SSRF blocks localhost, private, link-local, mapped IPv6, schemes, credentials and rebinding", async () => {
  for (const url of ["https://localhost/", "https://127.0.0.1", "https://10.4.2.1", "https://169.254.169.254/latest", "https://[::1]", "https://[::ffff:127.0.0.1]", "http://example.com", "file:///etc/passwd", "https://user:pass@example.com", "https://example.com:8443"]) expect(() => sourceUrl(url)).toThrow();
  expect(publicAddress("192.168.1.1")).toBe(false); expect(publicAddress("fc00::1")).toBe(false); expect(publicAddress("8.8.8.8")).toBe(true);
  const resolve = vi.fn().mockResolvedValue([{ address: "10.0.0.1", family: 4 }]); await expect(checkSource("https://example.com", resolve)).rejects.toMatchObject({ code: "source_blocked" });
});
test("CMS follows draft→review→published, requires checked source and resets on edit", async () => {
  const data = contentSchema.parse({ contentKey: `test-${randomUUID()}`, language: "es", title: "DEMO fixture", type: "history", summary: "Resumen", validatedDescription: "Texto de prueba", sourceUrl: null, license: "Texto propio", editor: "Test" });
  const item = await saveContent(db(), admin, data);
  await expect(contentAction(db(), admin, item.id, "publish")).rejects.toThrow(); await contentAction(db(), admin, item.id, "review"); await expect(contentAction(db(), admin, item.id, "publish")).rejects.toThrow();
  await db().update(s.culturalItems).set({ sourceUrl: "https://example.com", sourceCheckedAt: new Date() }).where(eq(s.culturalItems.id, item.id));
  expect((await contentAction(db(), admin, item.id, "publish")).status).toBe("published");
  const changed = await saveContent(db(), admin, { ...data, sourceUrl: "https://example.com" }, item.id); expect(changed.status).toBe("draft"); expect(changed.sourceCheckedAt).toBeNull();
});
async function visitor() {
  const id = randomUUID(); await db().insert(s.visitorAccounts).values({ id, emailEncrypted: encrypt(`${id}@example.invalid`), emailLookupHash: emailHash(`${id}@example.invalid`), emailVerifiedAt: new Date() });
  const created = await createSession(db()); const [session] = await db().update(s.visitorSessions).set({ ownerUserId: id }).where(eq(s.visitorSessions.id, created.session.id)).returning(); return { session, token: created.token };
}
const leadData = () => leadSchema.parse({ offerId: demoIds.offerA, fields: ["email", "message"], values: { message: "Solo este mensaje", name: "No autorizado" }, noticeVersion, confirm: true, idempotencyKey: randomUUID() });
test("lead contains only authorized fields, one recipient, encrypted payload, proof and immediate receipt; revoke hides it", async () => {
  const v = await visitor(), data = leadData(), shared = await shareLead(db(), v.session, data);
  expect((await shareLead(db(), v.session, data)).id).toBe(shared.id);
  const [row] = await db().select().from(s.providerLeads).where(eq(s.providerLeads.id, shared.id)); expect(row.payloadEncrypted).not.toContain("Solo este mensaje"); expect(row.userAuthorizedFields).toEqual(["email", "message"]); expect(row.providerId).toBe(demoIds.providerA);
  const [consent] = await db().select().from(s.consentRecords).where(eq(s.consentRecords.id, row.consentRecordId)); expect(consent.purpose).toBe("provider_share"); expect(consent.proof).toMatchObject({ providerId: demoIds.providerA, fields: ["email", "message"] });
  const inbox = await GET(req(`/api/partner/leads?organizationId=${demoIds.a}`, "GET", undefined, aToken)); const lead = (await inbox.json()).leads.find((r: { id: string }) => r.id === shared.id); expect(Object.keys(lead.values).sort()).toEqual(["email", "message"]); expect(JSON.stringify(lead)).not.toContain("No autorizado"); expect(JSON.stringify(lead)).not.toContain("session");
  const other = await GET(req(`/api/partner/leads?organizationId=${demoIds.b}`, "GET", undefined, bToken)); expect(JSON.stringify(await other.json())).not.toContain(shared.id);
  const receipts = await db().select().from(s.emailOutbox).where(eq(s.emailOutbox.idempotencyKey, `lead-receipt:${shared.id}`)); expect(receipts).toHaveLength(1); expect(receipts[0].deliveryState).toBe("dry_run"); expect(decrypt(receipts[0].renderedEncrypted!)).toContain("Solicitud enviada a un proveedor");
  expect((await PATCH(req(`/api/partner/leads/${shared.id}?organizationId=${demoIds.b}`, "PATCH", { status: "contactado" }, bToken))).status).toBe(404);
  expect((await DELETE(req(`/api/visitor/leads/${shared.id}`, "DELETE", {}, undefined, v.token))).status).toBe(200);
  const after = await GET(req(`/api/partner/leads?organizationId=${demoIds.a}`, "GET", undefined, aToken)); expect(JSON.stringify(await after.json())).not.toContain(shared.id);
  expect((await PATCH(req(`/api/partner/leads/${shared.id}?organizationId=${demoIds.a}`, "PATCH", { status: "contactado" }, aToken))).status).toBe(404);
});
test("leads require verified email and explicit fields; disabled flag is 404 and revocation remains possible", async () => {
  const anon = await createSession(db()); await expect(shareLead(db(), anon.session, leadData())).rejects.toMatchObject({ code: "verified_account_required" });
  const v = await visitor(), data = leadData(); await expect(shareLead(db(), v.session, { ...data, fields: ["message"] })).rejects.toMatchObject({ code: "contact_method_required" });
  const shared = await shareLead(db(), v.session, data); await revokeConsent(db(), v.session, "provider_share");
  expect((await db().select().from(s.providerLeads).where(eq(s.providerLeads.id, shared.id)))[0].payloadEncrypted).toBeNull();
  vi.stubEnv("FEATURE_ENABLE_PARTNER_SHARING", "false"); expect((await GET(req("/api/offers"))).status).toBe(404); expect((await POST(req("/api/visitor/leads", "POST", leadData()))).status).toBe(404);
  expect((await DELETE(req(`/api/visitor/leads/${shared.id}`, "DELETE", {}, undefined, v.token))).status).toBe(200);
  expect(leadSchema.safeParse({ ...data, values: { chat: "Never" } }).success).toBe(false);
});
test("campaigns disabled create zero campaign/outbox rows and never dispatch", async () => {
  const before = (await db().select().from(s.emailOutbox)).length, count = (await db().select().from(s.campaigns)).length;
  const data = { id: randomUUID(), subject: "Demo", message: "Demo only", confirm: true as const };
  expect((await POST(req("/api/admin/campaigns", "POST", data, adminToken))).status).toBe(404);
  await expect(queueCampaign(db(), admin, data)).rejects.toMatchObject({ status: 404 }); expect((await db().select().from(s.campaigns)).length).toBe(count); expect((await db().select().from(s.emailOutbox)).length).toBe(before);
});
test("campaign eligibility requires DOI, consent and no suppression; queues only, confirms and deduplicates", async () => {
  vi.stubEnv("FEATURE_ENABLE_MARKETING", "true"); const v = await visitor(), [account] = await db().select().from(s.visitorAccounts).where(eq(s.visitorAccounts.id, v.session.ownerUserId!));
  await db().insert(s.emailSubscriptions).values({ visitorId: account.id, purpose: "marketing_email", addressRef: encrypt(newToken()), unsubscribeTokenHash: hashToken(newToken()), locale: "es", status: "active", doubleOptInAt: new Date() });
  const denied = await GET(req("/api/admin/campaigns", "GET", undefined, adminToken)); expect((await denied.json()).count).toBe(0);
  await db().insert(s.consentRecords).values({ visitorId: account.id, purpose: "marketing_email", granted: true, noticeVersion, locale: "es", source: "synthetic" });
  expect((await (await GET(req("/api/admin/campaigns", "GET", undefined, adminToken))).json()).count).toBe(1);
  const data = { id: randomUUID(), subject: "Demo campaña", message: "Demo contenido", confirm: true as const }; expect((await queueCampaign(db(), admin, data))).toMatchObject({ queued: true, count: 1 });
  expect((await queueCampaign(db(), admin, data))).toMatchObject({ duplicate: true });
  const [mail] = await db().select().from(s.emailOutbox).where(eq(s.emailOutbox.campaignId, data.id)); expect(mail.deliveryState).toBe("queued");
  await db().insert(s.emailSuppressions).values({ emailHash: account.emailLookupHash!, reason: "test" });
  expect((await (await GET(req("/api/admin/campaigns", "GET", undefined, adminToken))).json()).count).toBe(0);
  await dispatchEmails(db(), undefined, [mail.id]); expect((await db().select().from(s.emailOutbox).where(eq(s.emailOutbox.id, mail.id)))[0].deliveryState).toBe("failed");
});
test("device activation URLs are returned once; credential hashes never enter list; rotate and revoke audited", async () => {
  const created = await POST(req("/api/admin/devices", "POST", { label: "Synthetic one use" }, adminToken)); expect(created.status).toBe(201); const link = (await created.json()).activationUrl; expect(link).toContain("/kiosco/activar?code=");
  const rows = await (await GET(req("/api/admin/devices", "GET", undefined, adminToken))).json(); expect(JSON.stringify(rows)).not.toContain(new URL(link).searchParams.get("code")); expect(JSON.stringify(rows)).not.toMatch(/keyHash|activationHash/);
  const device = rows.devices.find((row: { locationLabel: string }) => row.locationLabel === "Synthetic one use");
  expect((await POST(req(`/api/admin/devices/${device.id}`, "POST", { action: "rotate" }, adminToken))).status).toBe(200);
  expect((await POST(req(`/api/admin/devices/${device.id}`, "POST", { action: "revoke" }, adminToken))).status).toBe(200);
  expect((await db().select().from(s.auditLogs).where(and(eq(s.auditLogs.targetId, device.id), eq(s.auditLogs.action, "device.revoke")))).length).toBe(1);
});
test("analytics whitelist never stores text, email, chat or profile and retention cleanup is protected", async () => {
  const v = await visitor(); await recordEvent(db(), "chat_asked", { text: "Secret text", email: "no@example.invalid", profile: {} }, v.session);
  const rows = await db().select().from(s.analyticsEvents).where(eq(s.analyticsEvents.eventType, "chat_asked")); expect(JSON.stringify(rows)).not.toContain("Secret text"); expect(rows.at(-1)?.metadata).toEqual({});
  const [old] = await db().insert(s.analyticsEvents).values({ eventType: "chat_asked", createdAt: new Date(Date.now() - 100 * 86400_000) }).returning();
  const [expired] = await db().insert(s.providerLeads).values({ providerId: demoIds.providerA, visitorId: v.session.ownerUserId!, consentRecordId: (await db().insert(s.consentRecords).values({ visitorId: v.session.ownerUserId, purpose: "provider_share", granted: true, noticeVersion, locale: "es", source: "test" }).returning())[0].id, purpose: "test", userAuthorizedFields: [], expiresAt: new Date(Date.now() - 1) }).returning();
  expect((await cleanup(req("/api/internal/cleanup"))).status).toBe(401); await cleanupDatabase(db());
  expect(await db().select().from(s.analyticsEvents).where(eq(s.analyticsEvents.id, old.id))).toHaveLength(0); expect(await db().select().from(s.providerLeads).where(eq(s.providerLeads.id, expired.id))).toHaveLength(0);
  expect((await db().select().from(s.analyticsEvents).where(eq(s.analyticsEvents.eventType, "session_started"))).length).toBeGreaterThan(0);
});
test("demo seed/reset is isolated and idempotent; migrations run twice", async () => {
  const isolated = await connectDatabase({ memory: true });
  try { await migrateDatabase(isolated.db); await migrateDatabase(isolated.db); const [real] = await isolated.db.insert(s.organizations).values({ name: "Preserve", kind: "admin" }).returning(); await seedDemo(isolated.db); await seedDemo(isolated.db); expect((await isolated.db.select().from(s.organizations)).length).toBe(4); const totals = await isolated.db.execute(sql`select count(*)::int as n from analytics_events`); expect(Number(totals.rows[0].n)).toBe(129); await resetDemo(isolated.db); await resetDemo(isolated.db); expect((await isolated.db.select().from(s.organizations)).map(row => row.id)).toEqual([real.id]); expect(await isolated.db.select().from(s.providers)).toHaveLength(0); expect(await isolated.db.select().from(s.analyticsEvents)).toHaveLength(0); } finally { await isolated.close(); }
});
