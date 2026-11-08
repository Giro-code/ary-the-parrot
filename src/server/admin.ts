import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import { AppError } from "./errors.ts";
import { checkSource, sourceUrl } from "./source-check.ts";
import { audit, type Staff } from "./staff.ts";
import { decrypt } from "./crypto.ts";
import { enqueueEmail, marketingAllowed } from "./email/outbox.ts";
import { interests } from "../i18n/index.ts";
export const contentSchema = z.object({ contentKey: z.string().regex(/^[a-z0-9-]{1,80}$/), language: z.enum(["es", "en"]), title: z.string().trim().min(1).max(200), type: z.enum(["history", "food", "music", "nature", "art", "traditions"]), tags: z.array(z.enum(interests)).max(6).default([]), summary: z.string().trim().min(1).max(2000), validatedDescription: z.string().trim().min(1).max(8000), sourceUrl: z.string().max(2000).nullable(), license: z.string().trim().min(1).max(300), editor: z.string().trim().min(1).max(200) }).strict();
export async function saveContent(db: Database, staff: Staff, data: z.infer<typeof contentSchema>, id?: string) {
  if (data.sourceUrl) sourceUrl(data.sourceUrl);
  return db.transaction(async tx => {
    const values = { ...data, status: "draft", sourceCheckedAt: null, lastReviewedAt: null, publishedAt: null };
    const [row] = id ? await tx.update(s.culturalItems).set(values).where(eq(s.culturalItems.id, id)).returning() : await tx.insert(s.culturalItems).values({ ...values, demo: false }).returning();
    if (!row) throw new AppError("not_found", 404);
    await audit(tx, staff, "content.save_draft", "cultural_item", row.id); return row;
  });
}
export async function contentAction(db: Database, staff: Staff, id: string, action: "review" | "publish" | "verify_source") {
  const [item] = await db.select().from(s.culturalItems).where(eq(s.culturalItems.id, id));
  if (!item) throw new AppError("not_found", 404);
  if (action === "verify_source") {
    if (!item.sourceUrl) throw new AppError("source_required", 400);
    const checked = await checkSource(item.sourceUrl);
    return db.transaction(async tx => {
      // Avoid certifying a URL edited while the HTTP request was in flight.
      const [row] = await tx.update(s.culturalItems).set({ sourceCheckedAt: checked }).where(and(eq(s.culturalItems.id, id), eq(s.culturalItems.sourceUrl, item.sourceUrl!))).returning();
      if (!row) throw new AppError("content_changed", 409);
      await audit(tx, staff, "content.source_verified", "cultural_item", id); return row;
    });
  }
  return db.transaction(async tx => {
    const [current] = await tx.select().from(s.culturalItems).where(eq(s.culturalItems.id, id)).for("update");
    if (!current || (action === "publish" && (current.status !== "review" || !current.sourceUrl || !current.sourceCheckedAt))) throw new AppError("reviewed_source_required", 400);
    if (action === "review" && current.status !== "draft") throw new AppError("draft_required", 409);
    const [row] = await tx.update(s.culturalItems).set(action === "review" ? { status: "review", lastReviewedAt: new Date() } : { status: "published", publishedAt: new Date(), lastReviewedAt: new Date() }).where(eq(s.culturalItems.id, id)).returning();
    await audit(tx, staff, `content.${action}`, "cultural_item", id); return row;
  });
}
export const offerSchema = z.object({ providerId: z.uuid(), title: z.string().trim().min(1).max(200), eligibility: z.string().max(1000), pricingDisclaimer: z.string().max(1000), sourceUrl: z.string().max(2000).nullable(), sponsored: z.boolean() }).strict();
export async function partnerOffers(db: Database, organizationId: string) {
  return db.select({ offer: s.offers, providerName: s.providers.name }).from(s.offers).innerJoin(s.providers, eq(s.providers.id, s.offers.providerId)).where(eq(s.providers.organizationId, organizationId));
}
export async function saveOffer(db: Database, staff: Staff, data: z.infer<typeof offerSchema>, id?: string) {
  if (data.sourceUrl) sourceUrl(data.sourceUrl);
  return db.transaction(async tx => {
    const [provider] = await tx.select().from(s.providers).where(and(eq(s.providers.id, data.providerId), eq(s.providers.organizationId, staff.organizationId)));
    if (!provider) throw new AppError("staff_forbidden", 403);
    const predicate = and(id ? eq(s.offers.id, id) : undefined, sql`${s.offers.providerId} in (select id from providers where organization_id = ${staff.organizationId})`);
    const [row] = id ? await tx.update(s.offers).set({ ...data, approvedStatus: "pending_review", sourceCheckedAt: null }).where(predicate).returning() : await tx.insert(s.offers).values({ ...data, approvedStatus: "pending_review" }).returning();
    if (!row) throw new AppError("not_found", 404);
    await audit(tx, staff, "offer.submit_review", "offer", row.id); return row;
  });
}
export async function deleteOffer(db: Database, staff: Staff, id: string) {
  return db.transaction(async tx => {
    const [row] = await tx.delete(s.offers).where(and(eq(s.offers.id, id), sql`${s.offers.providerId} in (select id from providers where organization_id = ${staff.organizationId})`)).returning();
    if (!row) throw new AppError("not_found", 404);
    await audit(tx, staff, "offer.delete", "offer", id);
  });
}
export async function campaignRecipients(db: Database) {
  if (process.env.FEATURE_ENABLE_MARKETING !== "true") throw new AppError("not_found", 404);
  const rows = await db.select({ id: s.visitorAccounts.id, email: s.visitorAccounts.emailEncrypted, locale: s.emailSubscriptions.locale }).from(s.emailSubscriptions).innerJoin(s.visitorAccounts, eq(s.visitorAccounts.id, s.emailSubscriptions.visitorId))
    .where(and(eq(s.emailSubscriptions.status, "active"), eq(s.emailSubscriptions.purpose, "marketing_email"), sql`${s.emailSubscriptions.doubleOptInAt} is not null`, sql`${s.visitorAccounts.emailVerifiedAt} is not null`, isNull(s.visitorAccounts.deletionRequestedAt), sql`not exists (select 1 from email_suppressions where email_hash = ${s.visitorAccounts.emailLookupHash})`));
  const eligible = [];
  for (const row of rows) if (row.email && await marketingAllowed(db, row.id)) eligible.push(row);
  return eligible;
}
export async function queueCampaign(db: Database, staff: Staff, data: { subject: string; message: string; confirm: true; id: string }) {
  if (process.env.FEATURE_ENABLE_MARKETING !== "true") throw new AppError("not_found", 404);
  return db.transaction(async tx => {
    const [created] = await tx.insert(s.campaigns).values({ id: data.id, subject: data.subject, message: data.message, createdBy: staff.userId }).onConflictDoNothing().returning();
    if (!created) return { queued: true, duplicate: true };
    const recipients = await campaignRecipients(tx);
    let count = 0;
    for (const row of recipients) {
      const id = await enqueueEmail(tx, { template: "campaign", category: "marketing", locale: row.locale === "en" ? "en" : "es", visitorId: row.id, to: decrypt(row.email!), idempotencyKey: `campaign:${created.id}:${row.id}`, deferDelivery: true, data: { campaignSubject: data.subject, campaignMessage: data.message } });
      if (id) { count++; await tx.update(s.emailOutbox).set({ campaignId: created.id }).where(eq(s.emailOutbox.id, id)); }
    }
    await audit(tx, staff, "campaign.queued", "campaign", created.id, { count });
    return { queued: true, count };
  });
}
export async function devices(db: Database) {
  const rows = await db.select().from(s.kioskDevices).orderBy(desc(s.kioskDevices.createdAt));
  const result = [];
  for (const row of rows) {
    const [event] = await db.select({ state: s.robotEvents.state, hardware: s.robotEvents.hardware, createdAt: s.robotEvents.createdAt }).from(s.robotEvents).where(eq(s.robotEvents.deviceId, row.id)).orderBy(desc(s.robotEvents.createdAt)).limit(1);
    result.push({ id: row.id, organizationId: row.organizationId, locationLabel: row.locationLabel, status: row.status, lastSeenAt: row.lastSeenAt, firmwareVersion: row.firmwareVersion, lastRobotEvent: event || null });
  }
  return result;
}
export async function setLeadStatus(db: Database, staff: Staff, id: string, status: string) {
  return db.transaction(async tx => {
    const [row] = await tx.update(s.providerLeads).set({ status }).where(and(eq(s.providerLeads.id, id), gt(s.providerLeads.expiresAt, new Date()), sql`${s.providerLeads.providerId} in (select id from providers where organization_id = ${staff.organizationId})`, sql`${s.providerLeads.consentRecordId} in (select id from consent_records where granted = true and revoked_at is null)`)).returning({ id: s.providerLeads.id });
    if (!row) throw new AppError("not_found", 404);
    await audit(tx, staff, "lead.status", "provider_lead", id, { status }); return row;
  });
}
