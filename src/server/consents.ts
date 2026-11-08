import { and, desc, eq, isNull, or } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import type { Session } from "./service.ts";
import { AppError } from "./errors.ts";
import { noticeVersion, type Purpose } from "../privacy.ts";
export { noticeVersion, purposes, type Purpose } from "../privacy.ts";
export const consentOwner = (session: Session) => session.ownerUserId ? eq(s.consentRecords.visitorId, session.ownerUserId) : eq(s.consentRecords.sessionId, session.id);
export async function listConsents(db: Database, session: Session) {
  return db.select().from(s.consentRecords).where(consentOwner(session)).orderBy(desc(s.consentRecords.collectedAt), desc(s.consentRecords.id));
}
export async function hasConsent(db: Database, visitorId: string, purpose: Purpose) {
  const [row] = await db.select().from(s.consentRecords).where(and(eq(s.consentRecords.visitorId, visitorId), eq(s.consentRecords.purpose, purpose), eq(s.consentRecords.granted, true), isNull(s.consentRecords.revokedAt))).limit(1);
  return !!row;
}
export async function grantConsent(db: Database, session: Session, data: { purpose: Purpose; noticeVersion: string; locale: string }, source: string) {
  if (data.noticeVersion !== noticeVersion) throw new AppError("notice_version_changed", 409);
  if (data.purpose === "marketing_email" && process.env.FEATURE_ENABLE_MARKETING !== "true") throw new AppError("marketing_disabled", 403);
  if (data.purpose === "provider_share" && process.env.FEATURE_ENABLE_PARTNER_SHARING !== "true") throw new AppError("provider_sharing_disabled", 403);
  // A grant expresses intent; marketing still requires a separate double opt-in token.
  const [record] = await db.insert(s.consentRecords).values({ ...data, visitorId: session.ownerUserId, sessionId: session.id, granted: true, source, proof: { action: "explicit_checkbox", noticeVersion: data.noticeVersion } }).returning();
  return record;
}
export async function revokeConsent(db: Database, session: Session, purpose: Purpose) {
  await db.transaction(async tx => {
    const now = new Date();
    if (session.ownerUserId && purpose === "provider_share") {
      await tx.select().from(s.visitorAccounts).where(eq(s.visitorAccounts.id, session.ownerUserId)).for("update");
      await tx.update(s.providerLeads).set({ payloadEncrypted: null, status: "revocado" }).where(eq(s.providerLeads.visitorId, session.ownerUserId));
      await tx.insert(s.auditLogs).values({ action: "lead.revoke_all", targetType: "provider_lead", actor: session.ownerUserId });
    }
    await tx.update(s.consentRecords).set({ revokedAt: now }).where(and(consentOwner(session), eq(s.consentRecords.purpose, purpose), isNull(s.consentRecords.revokedAt)));
    await tx.insert(s.consentRecords).values({ visitorId: session.ownerUserId, sessionId: session.id, purpose, granted: false, revokedAt: now, noticeVersion, locale: session.locale, source: "privacy_revoke", proof: { action: "explicit_revoke" } });
    if (session.ownerUserId && purpose === "marketing_email") {
      await tx.update(s.emailSubscriptions).set({ status: "unsubscribed" }).where(eq(s.emailSubscriptions.visitorId, session.ownerUserId));
      await tx.update(s.authMagicLinks).set({ usedAt: now }).where(and(eq(s.authMagicLinks.userId, session.ownerUserId), eq(s.authMagicLinks.purpose, "marketing_opt_in"), isNull(s.authMagicLinks.usedAt)));
    }
    if (session.ownerUserId && ["marketing_email", "transactional_recovery"].includes(purpose)) {
      const categories = purpose === "marketing_email" ? or(eq(s.emailOutbox.category, "marketing"), eq(s.emailOutbox.category, "reminder"), eq(s.emailOutbox.template, "marketing_confirmation")) : eq(s.emailOutbox.template, "recovery");
      await tx.update(s.emailOutbox).set({ deliveryState: "failed", lastError: "consent_revoked", renderedEncrypted: null }).where(and(eq(s.emailOutbox.recipientRef, session.ownerUserId), eq(s.emailOutbox.deliveryState, "queued"), categories));
    }
    if (purpose === "transactional_recovery") {
      const [account] = session.ownerUserId ? await tx.select().from(s.visitorAccounts).where(eq(s.visitorAccounts.id, session.ownerUserId)) : [];
      await tx.update(s.authMagicLinks).set({ usedAt: now }).where(and(eq(s.authMagicLinks.purpose, "recovery"), isNull(s.authMagicLinks.usedAt), or(eq(s.authMagicLinks.sourceSessionId, session.id), account?.emailLookupHash ? eq(s.authMagicLinks.emailLookupHash, account.emailLookupHash) : undefined)));
      if (account?.emailLookupHash) await tx.update(s.emailOutbox).set({ deliveryState: "failed", lastError: "consent_revoked", renderedEncrypted: null }).where(and(eq(s.emailOutbox.recipientHash, account.emailLookupHash), eq(s.emailOutbox.template, "recovery"), eq(s.emailOutbox.deliveryState, "queued")));
    }
  });
}
