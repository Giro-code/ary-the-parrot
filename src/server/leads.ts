import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import { AppError } from "./errors.ts";
import { decrypt, encrypt, privateHash } from "./crypto.ts";
import { noticeVersion } from "./consents.ts";
import { audit, type Staff } from "./staff.ts";
import { recordEvent, type Session } from "./service.ts";
import { dispatchImmediate, enqueueEmail } from "./email/outbox.ts";
import { numericEnv } from "./config.ts";
export const leadFields = ["name", "email", "message", "approximateDate", "people"] as const;
export const leadSchema = z.object({ offerId: z.uuid(), fields: z.array(z.enum(leadFields)).min(1).max(5).transform(v => [...new Set(v)]), values: z.object({ name: z.string().trim().min(1).max(120).optional(), message: z.string().trim().min(1).max(1500).optional(), approximateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), people: z.number().int().min(1).max(100).optional() }).strict(), noticeVersion: z.literal(noticeVersion), confirm: z.literal(true), idempotencyKey: z.uuid() }).strict();
export const sharingEnabled = () => { if (process.env.FEATURE_ENABLE_PARTNER_SHARING !== "true") throw new AppError("not_found", 404); };
export async function publicOffers(db: Database) {
  sharingEnabled();
  return db.select({ id: s.offers.id, title: s.offers.title, sponsored: s.offers.sponsored, pricingDisclaimer: s.offers.pricingDisclaimer, providerId: s.providers.id, providerName: s.providers.name }).from(s.offers).innerJoin(s.providers, eq(s.offers.providerId, s.providers.id)).innerJoin(s.organizations, eq(s.providers.organizationId, s.organizations.id)).where(and(eq(s.offers.approvedStatus, "approved"), eq(s.providers.approvedStatus, "approved"), eq(s.organizations.status, "active")));
}
export async function shareLead(db: Database, session: Session, data: z.infer<typeof leadSchema>) {
  sharingEnabled();
  if (!session.ownerUserId || session.kioskDeviceId) throw new AppError("verified_account_required", 403);
  const result = await db.transaction(async tx => {
    // Same account lock as deletion and revocation: an in-flight operation cannot restore consent after either.
    const [account] = await tx.select().from(s.visitorAccounts).where(eq(s.visitorAccounts.id, session.ownerUserId!)).for("update");
    if (!account?.emailVerifiedAt || !account.emailEncrypted || account.deletionRequestedAt) throw new AppError("verified_account_required", 403);
    const offer = (await publicOffers(tx)).find(row => row.id === data.offerId);
    if (!offer) throw new AppError("offer_unavailable", 404);
    const key = privateHash(`lead:${account.id}:${data.idempotencyKey}`);
    const [previous] = await tx.select({ id: s.providerLeads.id }).from(s.providerLeads).where(eq(s.providerLeads.idempotencyKey, key));
    if (previous) return { id: previous.id, emailId: null };
    const values: Record<string, string | number> = {};
    for (const field of data.fields) {
      const value = field === "email" ? decrypt(account.emailEncrypted) : data.values[field];
      if (value === undefined) throw new AppError("authorized_field_missing", 400);
      values[field] = value;
    }
    if (!data.fields.includes("email")) throw new AppError("contact_method_required", 400);
    const [consent] = await tx.insert(s.consentRecords).values({ visitorId: account.id, sessionId: session.id, purpose: "provider_share", granted: true, noticeVersion, source: "offer_confirmation", locale: session.locale, proof: { providerId: offer.providerId, offerId: offer.id, fields: data.fields, contactMethod: "email", purpose: "Responder a la solicitud elegida", action: "explicit_confirmation" } }).returning();
    const [lead] = await tx.insert(s.providerLeads).values({ providerId: offer.providerId, visitorId: account.id, purpose: "Responder a la solicitud elegida", consentRecordId: consent.id, userAuthorizedFields: data.fields, payloadEncrypted: encrypt(JSON.stringify(values)), expiresAt: new Date(Date.now() + numericEnv("PROVIDER_LEAD_RETENTION_DAYS", 30, 90) * 86400_000), status: "nuevo", idempotencyKey: key }).returning();
    await audit(tx, null, "lead.shared", "provider_lead", lead.id, { providerId: offer.providerId, fields: data.fields });
    await recordEvent(tx, "lead_shared", {}, session, { providerId: offer.providerId });
    const emailId = await enqueueEmail(tx, { template: "provider_receipt", locale: session.locale as "es" | "en", to: decrypt(account.emailEncrypted), visitorId: account.id, idempotencyKey: `lead-receipt:${lead.id}`, data: { providerName: offer.providerName, sharedFields: data.fields, reference: lead.id } });
    return { id: lead.id, emailId };
  });
  await dispatchImmediate(db, [result.emailId]);
  return { id: result.id, shared: true };
}
export function visibleLeadWhere(organizationId: string, leadId?: string) {
  return and(eq(s.providers.organizationId, organizationId), leadId ? eq(s.providerLeads.id, leadId) : undefined, eq(s.organizations.status, "active"), eq(s.consentRecords.granted, true), isNull(s.consentRecords.revokedAt), gt(s.providerLeads.expiresAt, new Date()));
}
export async function partnerLeads(db: Database, staff: Staff) {
  sharingEnabled();
  const rows = await db.select({ id: s.providerLeads.id, providerName: s.providers.name, status: s.providerLeads.status, fields: s.providerLeads.userAuthorizedFields, payload: s.providerLeads.payloadEncrypted, createdAt: s.providerLeads.createdAt, expiresAt: s.providerLeads.expiresAt }).from(s.providerLeads).innerJoin(s.providers, eq(s.providers.id, s.providerLeads.providerId)).innerJoin(s.organizations, eq(s.organizations.id, s.providers.organizationId)).innerJoin(s.consentRecords, eq(s.consentRecords.id, s.providerLeads.consentRecordId)).where(visibleLeadWhere(staff.organizationId));
  await audit(db, staff, "leads.read", "provider_lead");
  return rows.map(({ payload, ...row }) => ({ ...row, values: payload ? Object.fromEntries(Object.entries(JSON.parse(decrypt(payload)) as Record<string, unknown>).filter(([key]) => Array.isArray(row.fields) && row.fields.includes(key))) : {} }));
}
export async function visitorLeads(db: Database, session: Session) {
  if (!session.ownerUserId) throw new AppError("verified_account_required", 401);
  return db.select({ id: s.providerLeads.id, providerName: s.providers.name, fields: s.providerLeads.userAuthorizedFields, revokedAt: s.consentRecords.revokedAt, expiresAt: s.providerLeads.expiresAt }).from(s.providerLeads).innerJoin(s.providers, eq(s.providers.id, s.providerLeads.providerId)).innerJoin(s.consentRecords, eq(s.consentRecords.id, s.providerLeads.consentRecordId)).where(eq(s.providerLeads.visitorId, session.ownerUserId));
}
export async function revokeLead(db: Database, session: Session, id: string) {
  if (!session.ownerUserId) throw new AppError("verified_account_required", 401);
  await db.transaction(async tx => {
    await tx.select().from(s.visitorAccounts).where(eq(s.visitorAccounts.id, session.ownerUserId!)).for("update");
    const [lead] = await tx.select().from(s.providerLeads).where(and(eq(s.providerLeads.id, id), eq(s.providerLeads.visitorId, session.ownerUserId!)));
    if (!lead) throw new AppError("not_found", 404);
    await tx.update(s.consentRecords).set({ revokedAt: new Date() }).where(eq(s.consentRecords.id, lead.consentRecordId));
    await tx.update(s.providerLeads).set({ payloadEncrypted: null, status: "revocado" }).where(eq(s.providerLeads.id, lead.id));
    await audit(tx, null, "lead.revoked", "provider_lead", lead.id);
  });
}
