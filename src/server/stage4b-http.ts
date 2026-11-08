import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import { body, json, tokenSchema, uuidSchema } from "./http.ts";
import { AppError } from "./errors.ts";
import { clientHash, hashToken } from "./tokens.ts";
import { audit, inviteMember, operators, partners, readers, requestStaffLink, requireStaff, roles, staffMemberships, verifyStaffLink } from "./staff.ts";
import { campaignRecipients, contentAction, contentSchema, deleteOffer, devices, offerSchema, partnerOffers, queueCampaign, saveContent, saveOffer, setLeadStatus } from "./admin.ts";
import { overview, overviewCsv } from "./analytics.ts";
import { leadSchema, partnerLeads, publicOffers, revokeLead, shareLead, sharingEnabled, visitorLeads } from "./leads.ts";
import { enrollKiosk, getSession, rateLimit, recordEvent } from "./service.ts";
import { dispatchImmediate } from "./email/outbox.ts";
import { baseUrl } from "./config.ts";
const empty = z.object({}).strict();
const parseUuid = (value: string) => { const parsed = uuidSchema.safeParse(value); if (!parsed.success) throw new AppError("invalid_id", 400); return parsed.data; };
const text = (max = 200) => z.string().trim().min(1).max(max);
export function staffCookie(response: ReturnType<typeof json>, token: string, maxAge = 8 * 3600) {
  response.cookies.set("ary_staff", token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge });
}
export async function stage4bHttp(request: NextRequest, db: Database) {
  const path = request.nextUrl.pathname, method = request.method, token = request.cookies.get("ary_staff")?.value;
  if (path === "/api/staff/request-link" && method === "POST") {
    const data = await body(request, z.object({ email: z.string().trim().max(254).pipe(z.email()) }).strict());
    return json(await requestStaffLink(db, data.email, clientHash(`staff-client:${request.headers.get("x-forwarded-for") || "local"}`)));
  }
  if (path === "/api/staff/verify" && method === "POST") {
    await rateLimit(db, clientHash(`staff-verify:${request.headers.get("x-forwarded-for") || "local"}`), 20, new Date(), 900_000);
    const data = await body(request, z.object({ token: tokenSchema }).strict());
    const result = await verifyStaffLink(db, data.token, token), response = json({ redirect: result.redirect }); staffCookie(response, result.token); return response;
  }
  if (path === "/api/offers" && method === "GET") return json({ offers: await publicOffers(db) });
  if (path.startsWith("/api/visitor/leads")) {
    if (method === "POST") sharingEnabled();
    const session = await getSession(db, request.cookies.get("ary_sid")?.value);
    if (path === "/api/visitor/leads" && method === "POST") return json(await shareLead(db, session, await body(request, leadSchema)), 201);
    if (path === "/api/visitor/leads" && method === "GET") return json({ leads: await visitorLeads(db, session) });
    const id = path.split("/").at(-1)!;
    if (method === "DELETE" && uuidSchema.safeParse(id).success) { await body(request, empty); await revokeLead(db, session, id); return json({ revoked: true }); }
    throw new AppError("not_found", 404);
  }
  if (path === "/api/offers/event" && method === "POST") {
    sharingEnabled();
    const session = await getSession(db, request.cookies.get("ary_sid")?.value), data = await body(request, z.object({ offerId: z.uuid(), event: z.enum(["offer_viewed", "offer_clicked"]) }).strict());
    const offer = (await publicOffers(db)).find(row => row.id === data.offerId);
    if (!offer) throw new AppError("not_found", 404);
    await recordEvent(db, data.event, {}, session, { providerId: offer.providerId }); return json({ recorded: true });
  }
  if (!path.startsWith("/api/admin/") && !path.startsWith("/api/partner/") && !path.startsWith("/api/analytics/") && !path.startsWith("/api/staff/")) return null;
  const organizationId = request.nextUrl.searchParams.get("organizationId") || undefined;
  if (organizationId && !uuidSchema.safeParse(organizationId).success) throw new AppError("invalid_query", 400);
  const partner = path.startsWith("/api/partner/");
  if (partner && !organizationId) throw new AppError("organization_required", 400);
  const orgManagement = path.startsWith("/api/admin/organizations") || path.startsWith("/api/admin/memberships");
  const allowed = partner ? (method === "DELETE" ? ["provider_admin"] as const : partners) : path.startsWith("/api/staff/") ? roles : orgManagement ? ["superadmin"] as const : method === "GET" && (path.startsWith("/api/analytics/") || path === "/api/admin/devices") ? readers : operators;
  const staff = await requireStaff({ db, token, roles: allowed, organizationId: partner ? organizationId : undefined });
  await audit(db, staff, "staff.access", partner ? "partner_api" : "admin_api", undefined, { path, method });
  if (path === "/api/staff/me" && method === "GET") return json({ staff, memberships: await staffMemberships(db, staff) });
  if (path === "/api/staff/logout" && method === "POST") { await body(request, empty); await db.delete(s.staffSessions).where(eq(s.staffSessions.tokenHash, hashToken(token!))); const response = json({ loggedOut: true }); staffCookie(response, "", 0); return response; }
  if ((path === "/api/analytics/overview" || path === "/api/partner/metrics") && method === "GET") {
    const query = z.object({ from: z.iso.datetime().optional(), to: z.iso.datetime().optional(), kioskId: z.uuid().optional(), format: z.enum(["json", "csv"]).optional(), organizationId: z.uuid().optional() }).safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!query.success) throw new AppError("invalid_query", 400);
    const from = new Date(query.data.from || Date.now() - 30 * 86400_000), to = new Date(query.data.to || Date.now());
    if (+from > +to || +to - +from > 366 * 86400_000) throw new AppError("invalid_period", 400);
    const result = await overview(db, { from, to, kioskId: query.data.kioskId, organizationId: partner ? undefined : query.data.organizationId }, partner ? staff.organizationId : undefined);
    if (query.data.format === "csv") return new Response(overviewCsv(result), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="ary-agregados.csv"', "Cache-Control": "no-store" } });
    return json(result);
  }
  if (path === "/api/partner/providers" && method === "GET") return json({ providers: await db.select({ id: s.providers.id, name: s.providers.name }).from(s.providers).where(eq(s.providers.organizationId, staff.organizationId)) });
  if (path === "/api/partner/leads" && method === "GET") return json({ leads: await partnerLeads(db, staff) });
  const partnerLead = path.match(/^\/api\/partner\/leads\/([\w-]+)$/);
  if (partnerLead && method === "PATCH") { sharingEnabled(); const data = await body(request, z.object({ status: z.enum(["nuevo", "contactado", "cerrado"]) }).strict()); return json(await setLeadStatus(db, staff, parseUuid(partnerLead[1]), data.status)); }
  if (path === "/api/partner/offers" && method === "GET") return json({ offers: await partnerOffers(db, staff.organizationId) });
  if (path === "/api/partner/offers" && method === "POST") return json({ offer: await saveOffer(db, staff, await body(request, offerSchema)) }, 201);
  const partnerOffer = path.match(/^\/api\/partner\/offers\/([\w-]+)$/);
  if (partnerOffer && method === "PATCH") return json({ offer: await saveOffer(db, staff, await body(request, offerSchema), parseUuid(partnerOffer[1])) });
  if (partnerOffer && method === "DELETE") { await body(request, empty); await deleteOffer(db, staff, parseUuid(partnerOffer[1])); return json({ deleted: true }); }
  if (path === "/api/admin/devices" && method === "GET") return json({ devices: await devices(db) });
  if (path === "/api/admin/devices" && method === "POST") {
    const data = await body(request, z.object({ label: text(120), organizationId: z.uuid().optional() }).strict());
    const result = await db.transaction(async tx => { const device = await enrollKiosk(tx, data.label); if (data.organizationId) await tx.update(s.kioskDevices).set({ organizationId: data.organizationId }).where(eq(s.kioskDevices.id, device.deviceId)); await audit(tx, staff, "device.enroll", "kiosk_device", device.deviceId); return device; });
    return json({ activationUrl: `${baseUrl()}/kiosco/activar?code=${result.code}` }, 201);
  }
  const device = path.match(/^\/api\/admin\/devices\/([\w-]+)$/);
  if (device && method === "POST") {
    const id = parseUuid(device[1]), data = await body(request, z.object({ action: z.enum(["rotate", "revoke"]) }).strict());
    return db.transaction(async tx => {
      const [row] = await tx.update(s.kioskDevices).set({ keyHash: null, activationHash: null, activationExpiresAt: null, credentialExpiresAt: null, status: "revoked" }).where(eq(s.kioskDevices.id, id)).returning();
      if (!row) throw new AppError("not_found", 404);
      const result = data.action === "rotate" ? await enrollKiosk(tx, row.locationLabel, id) : null;
      await audit(tx, staff, `device.${data.action}`, "kiosk_device", id);
      return json({ revoked: true, ...(result ? { activationUrl: `${baseUrl()}/kiosco/activar?code=${result.code}` } : {}) });
    });
  }
  if (path === "/api/admin/contents" && method === "GET") return json({ items: await db.select().from(s.culturalItems).orderBy(s.culturalItems.contentKey, s.culturalItems.language), bridges: await db.select().from(s.culturalBridges) });
  if (path === "/api/admin/contents" && method === "POST") return json({ item: await saveContent(db, staff, await body(request, contentSchema)) }, 201);
  const content = path.match(/^\/api\/admin\/contents\/([\w-]+)$/);
  if (content && method === "PATCH") return json({ item: await saveContent(db, staff, await body(request, contentSchema), parseUuid(content[1])) });
  if (content && method === "POST") { const data = await body(request, z.object({ action: z.enum(["review", "publish", "verify_source"]) }).strict()); return json({ item: await contentAction(db, staff, parseUuid(content[1]), data.action) }); }
  if (path === "/api/admin/bridges" && method === "POST") {
    const data = await body(request, z.object({ culturalItemId: z.uuid(), countryCode: z.string().regex(/^[A-Z]{2}$/), relation: text(1500), sourceUrl: text(2000) }).strict());
    const { checkSource } = await import("./source-check.ts"); const checked = await checkSource(data.sourceUrl);
    return db.transaction(async tx => { const [row] = await tx.insert(s.culturalBridges).values({ ...data, sourceCheckedAt: checked }).onConflictDoUpdate({ target: [s.culturalBridges.countryCode, s.culturalBridges.culturalItemId], set: { relation: data.relation, sourceUrl: data.sourceUrl, sourceCheckedAt: checked } }).returning(); await audit(tx, staff, "bridge.save", "cultural_bridge", row.id); return json({ bridge: row }); });
  }
  const bridge = path.match(/^\/api\/admin\/bridges\/([\w-]+)$/);
  if (bridge && method === "DELETE") { await body(request, empty); const id = parseUuid(bridge[1]); await db.transaction(async tx => { await tx.delete(s.culturalBridges).where(eq(s.culturalBridges.id, id)); await audit(tx, staff, "bridge.delete", "cultural_bridge", id); }); return json({ deleted: true }); }
  if (path === "/api/admin/organizations" && method === "GET") return json({ organizations: await db.select().from(s.organizations), memberships: (await db.select({ id: s.memberships.id, organizationId: s.memberships.organizationId, role: s.memberships.role, status: s.memberships.status, emailEncrypted: s.visitorAccounts.emailEncrypted }).from(s.memberships).innerJoin(s.visitorAccounts, eq(s.visitorAccounts.id, s.memberships.userId))).map(({ emailEncrypted, ...member }) => ({ ...member, email: emailEncrypted ? decryptInquiry(emailEncrypted) : null })) });
  if (path === "/api/admin/organizations" && method === "POST") {
    const data = await body(request, z.object({ name: text(), kind: z.enum(["admin", "airport", "provider"]), providerName: text().optional() }).strict());
    return db.transaction(async tx => { const [row] = await tx.insert(s.organizations).values({ name: data.name, kind: data.kind }).returning(); if (data.kind === "provider") await tx.insert(s.providers).values({ organizationId: row.id, name: data.providerName || data.name, approvedStatus: "approved" }); await audit(tx, staff, "organization.create", "organization", row.id); return json({ organization: row }, 201); });
  }
  const org = path.match(/^\/api\/admin\/organizations\/([\w-]+)$/);
  if (org && method === "PATCH") { const data = await body(request, z.object({ status: z.enum(["active", "suspended"]) }).strict()); const id = parseUuid(org[1]); await db.transaction(async tx => { await tx.update(s.organizations).set(data).where(eq(s.organizations.id, id)); await audit(tx, staff, "organization.status", "organization", id, data); }); return json({ updated: true }); }
  if (path === "/api/admin/memberships" && method === "POST") { const data = await body(request, z.object({ email: z.string().max(254).pipe(z.email()), organizationId: z.uuid(), role: z.enum(roles) }).strict()); const id = await inviteMember(db, staff, data.email, data.organizationId, data.role); await dispatchImmediate(db, [id]); return json({ invited: true }); }
  const member = path.match(/^\/api\/admin\/memberships\/([\w-]+)$/);
  if (member && method === "PATCH") {
    const data = await body(request, z.object({ role: z.enum(roles), status: z.enum(["active", "suspended"]) }).strict()), id = parseUuid(member[1]);
    await db.transaction(async tx => { const [row] = await tx.update(s.memberships).set(data).where(eq(s.memberships.id, id)).returning(); if (!row) throw new AppError("not_found", 404); await tx.update(s.authMagicLinks).set({ usedAt: new Date() }).where(and(eq(s.authMagicLinks.userId, row.userId), eq(s.authMagicLinks.organizationId, row.organizationId))); await audit(tx, staff, "membership.update", "membership", id, data); }); return json({ updated: true });
  }
  if (path === "/api/admin/offers" && method === "GET") return json({ offers: await db.select({ offer: s.offers, providerName: s.providers.name }).from(s.offers).innerJoin(s.providers, eq(s.offers.providerId, s.providers.id)) });
  const offer = path.match(/^\/api\/admin\/offers\/([\w-]+)$/);
  if (offer && method === "PATCH") { const data = await body(request, z.object({ status: z.enum(["approved", "rejected"]) }).strict()), id = parseUuid(offer[1]); await db.transaction(async tx => { const [row] = await tx.update(s.offers).set({ approvedStatus: data.status }).where(eq(s.offers.id, id)).returning(); if (!row) throw new AppError("not_found", 404); await audit(tx, staff, "offer.moderate", "offer", id, data); }); return json({ updated: true }); }
  if (path === "/api/admin/campaigns" && method === "GET") return json({ count: (await campaignRecipients(db)).length, campaigns: await db.select({ id: s.campaigns.id, subject: s.campaigns.subject, status: s.campaigns.status, createdAt: s.campaigns.createdAt }).from(s.campaigns) });
  if (path === "/api/admin/campaigns" && method === "POST") return json(await queueCampaign(db, staff, await body(request, z.object({ subject: text(160), message: text(3000), confirm: z.literal(true), id: z.uuid() }).strict())));
  if (path === "/api/admin/inquiries" && method === "GET") return json({ inquiries: (await db.select().from(s.commercialInquiries).orderBy(desc(s.commercialInquiries.createdAt)).limit(200)).map(({ payloadEncrypted, ...row }) => ({ ...row, payload: JSON.parse(decryptInquiry(payloadEncrypted)) })) });
  const inquiry = path.match(/^\/api\/admin\/inquiries\/([\w-]+)$/);
  if (inquiry && method === "PATCH") { const data = await body(request, z.object({ status: z.enum(["nuevo", "en curso", "cerrado"]) }).strict()), id = parseUuid(inquiry[1]); await db.transaction(async tx => { await tx.update(s.commercialInquiries).set(data).where(eq(s.commercialInquiries.id, id)); await audit(tx, staff, "inquiry.status", "commercial_inquiry", id, data); }); return json({ updated: true }); }
  if (path === "/api/admin/deletions" && method === "GET") return json({ jobs: await db.select({ id: s.deletionJobs.id, requestedAt: s.deletionJobs.requestedAt, status: s.deletionJobs.status, completedAt: s.deletionJobs.completedAt, externalProcessorsNotifiedAt: s.deletionJobs.externalProcessorsNotifiedAt }).from(s.deletionJobs).orderBy(desc(s.deletionJobs.requestedAt)).limit(200) });
  throw new AppError("not_found", 404);
}
import { decrypt as decryptInquiry } from "./crypto.ts";
