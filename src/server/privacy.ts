import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import type { Session } from "./service.ts";
import { decrypt } from "./crypto.ts";
import { requireOwner } from "./auth.ts";
import { listConsents, revokeConsent } from "./consents.ts";
import { AppError } from "./errors.ts";
import { hashToken } from "./tokens.ts";
export async function privacyData(db: Database, session: Session) {
  const account = await requireOwner(db, session);
  const sessions = await db.select().from(s.visitorSessions).where(eq(s.visitorSessions.ownerUserId, account.id));
  const sessionIds = sessions.map(row => row.id);
  const saved = await db.select().from(s.savedExperiences).where(or(eq(s.savedExperiences.visitorId, account.id), inArray(s.savedExperiences.sessionId, sessionIds)));
  const preferences = await db.select().from(s.visitorPreferences).where(or(eq(s.visitorPreferences.visitorId, account.id), inArray(s.visitorPreferences.sessionId, sessionIds)));
  const subscriptions = await db.select({ purpose: s.emailSubscriptions.purpose, status: s.emailSubscriptions.status, frequency: s.emailSubscriptions.frequency, doubleOptInAt: s.emailSubscriptions.doubleOptInAt }).from(s.emailSubscriptions).where(eq(s.emailSubscriptions.visitorId, account.id));
  const emails = await db.select({ template: s.emailOutbox.template, deliveryState: s.emailOutbox.deliveryState, createdAt: s.emailOutbox.createdAt }).from(s.emailOutbox).where(or(eq(s.emailOutbox.recipientRef, account.id), eq(s.emailOutbox.recipientHash, account.emailLookupHash!)));
  const chats = await db.select().from(s.chatMessages).where(or(eq(s.chatMessages.visitorId, account.id), inArray(s.chatMessages.sessionId, sessionIds)));
  const recommendations = await db.select().from(s.recommendations).where(or(eq(s.recommendations.userId, account.id), inArray(s.recommendations.sessionId, sessionIds)));
  const providerLeads = await db.select().from(s.providerLeads).where(eq(s.providerLeads.visitorId, account.id));
  return { exportedAt: new Date().toISOString(), account: { email: decrypt(account.emailEncrypted!), verifiedAt: account.emailVerifiedAt, createdAt: account.createdAt }, sessions: sessions.map(({ id, locale, countryDeclared, interests, status, expiresAt, createdAt }) => ({ id, locale, countryDeclared, interests, status, expiresAt, createdAt })), saved, preferences, consents: await listConsents(db, session), subscriptions, emails, recommendations, providerLeads, chats: chats.map(({ encryptedPayload, ...row }) => ({ ...row, payload: encryptedPayload ? decrypt(encryptedPayload) : null })) };
}
export async function deletePrivateData(db: Database, session: Session) {
  const account = await requireOwner(db, session);
  return deleteAccountData(db, account.id);
}
// Internal retention job entry point; HTTP callers must go through requireOwner above.
export async function deleteAccountData(db: Database, accountId: string) {
  const [account] = await db.select().from(s.visitorAccounts).where(eq(s.visitorAccounts.id, accountId));
  if (!account) throw new AppError("verified_account_required", 401);
  return db.transaction(async tx => {
    // Lock the account in the same order as verification.
    const [locked] = await tx.update(s.visitorAccounts).set({ deletionRequestedAt: new Date() }).where(eq(s.visitorAccounts.id, account.id)).returning();
    if (!locked) throw new AppError("verified_account_required", 401);
    const [job] = await tx.insert(s.deletionJobs).values({ subjectId: account.id, status: "processing" }).returning();
    const sessions = await tx.select({ id: s.visitorSessions.id }).from(s.visitorSessions).where(eq(s.visitorSessions.ownerUserId, account.id));
    const ids = sessions.map(row => row.id);
    // Minimal anonymous consent history remains; no identifiers, email or proofs containing PII.
    await tx.update(s.consentRecords).set({ visitorId: null, sessionId: null, proof: { action: "subject_deleted" }, revokedAt: new Date() }).where(or(eq(s.consentRecords.visitorId, account.id), inArray(s.consentRecords.sessionId, ids)));
    await tx.delete(s.authMagicLinks).where(or(eq(s.authMagicLinks.userId, account.id), eq(s.authMagicLinks.emailLookupHash, account.emailLookupHash!), inArray(s.authMagicLinks.sourceSessionId, ids)));
    // Also remove dev previews and token-bearing rendered payloads, including anonymous requests to this address.
    await tx.update(s.emailOutbox).set({ deliveryState: sql`case when ${s.emailOutbox.deliveryState} = 'queued' then 'failed' else ${s.emailOutbox.deliveryState} end`, lastError: sql`case when ${s.emailOutbox.deliveryState} = 'queued' then 'subject_deleted' else ${s.emailOutbox.lastError} end`, recipientRef: null, recipientHash: null, recipientEncrypted: null, renderedEncrypted: null }).where(or(eq(s.emailOutbox.recipientRef, account.id), eq(s.emailOutbox.recipientHash, account.emailLookupHash!)));
    await tx.delete(s.visitorSessions).where(eq(s.visitorSessions.ownerUserId, account.id));
    await tx.delete(s.visitorAccounts).where(eq(s.visitorAccounts.id, account.id));
    await tx.update(s.deletionJobs).set({ status: "completed", completedAt: new Date() }).where(eq(s.deletionJobs.id, job.id));
    return { deleted: true, reference: job.id, limits: "Backups y datos ya transmitidos a terceros requieren gestión del responsable; no se certifica su borrado desde esta operación." };
  });
}
export async function setEmailPreferences(db: Database, session: Session, data: { frequency?: "weekly" | "monthly"; status?: "paused" | "unsubscribed" | "active" }) {
  const account = await requireOwner(db, session);
  if (data.status === "unsubscribed") { await revokeConsent(db, session, "marketing_email"); return { updated: true }; }
  const [sub] = await db.select().from(s.emailSubscriptions).where(and(eq(s.emailSubscriptions.visitorId, account.id), eq(s.emailSubscriptions.purpose, "marketing_email")));
  if (!sub?.doubleOptInAt || ["unsubscribed", "suppressed"].includes(sub.status)) throw new AppError("marketing_opt_in_required", 403);
  await db.update(s.emailSubscriptions).set(data).where(eq(s.emailSubscriptions.id, sub.id));
  return { updated: true };
}
export async function unsubscribeEmail(db: Database, token: string) {
  const [sub] = await db.select().from(s.emailSubscriptions).where(eq(s.emailSubscriptions.unsubscribeTokenHash, hashToken(token)));
  if (!sub) throw new AppError("link_unavailable", 400);
  const [session] = await db.select().from(s.visitorSessions).where(eq(s.visitorSessions.ownerUserId, sub.visitorId)).limit(1);
  if (session) await revokeConsent(db, session, "marketing_email");
  else await db.transaction(async tx => {
    await tx.update(s.emailSubscriptions).set({ status: "unsubscribed" }).where(eq(s.emailSubscriptions.id, sub.id));
    await tx.update(s.consentRecords).set({ revokedAt: new Date() }).where(and(eq(s.consentRecords.visitorId, sub.visitorId), eq(s.consentRecords.purpose, "marketing_email")));
    await tx.insert(s.consentRecords).values({ visitorId: sub.visitorId, purpose: "marketing_email", granted: false, revokedAt: new Date(), noticeVersion: "2026-11-07.v1", locale: sub.locale, source: "one_click_unsubscribe", proof: { action: "explicit_revoke" } });
    await tx.update(s.authMagicLinks).set({ usedAt: new Date() }).where(and(eq(s.authMagicLinks.userId, sub.visitorId), eq(s.authMagicLinks.purpose, "marketing_opt_in")));
    await tx.update(s.emailOutbox).set({ deliveryState: "failed", lastError: "unsubscribed", renderedEncrypted: null }).where(and(eq(s.emailOutbox.recipientRef, sub.visitorId), eq(s.emailOutbox.deliveryState, "queued"), inArray(s.emailOutbox.category, ["marketing", "reminder"])));
  });
  return { unsubscribed: true };
}
