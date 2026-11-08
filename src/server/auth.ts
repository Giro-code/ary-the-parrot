import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import { createSession, getSession, rateLimit, type Session } from "./service.ts";
import { decrypt, emailHash, encrypt, normalizeEmail, requirePrivacyKeys } from "./crypto.ts";
import { hashToken, newToken } from "./tokens.ts";
import { AppError } from "./errors.ts";
import { baseUrl } from "./config.ts";
import { grantConsent, hasConsent, noticeVersion } from "./consents.ts";
import { dispatchImmediate, enqueueEmail } from "./email/outbox.ts";
import { isDryRun } from "./email/providers.ts";
import type { Locale } from "../i18n/index.ts";

export const requestLinkResult = () => ({ accepted: true, deliveryState: isDryRun() ? "dry_run" : "queued", message: isDryRun() ? "Modo prueba: el correo no se envió; en desarrollo puedes ver el enlace en /dev/outbox" : "Solicitud registrada. Si procede, se intenta el envío ahora. La entrega no está confirmada y los fallos quedan para reintento." });
export async function optionalSession(db: Database, token?: string) {
  try { return await getSession(db, token); } catch (error) { if (error instanceof AppError && error.status === 401) return null; throw error; }
}
export async function requestLink(db: Database, data: { email: string; locale: Locale; consentVersion: string; transactionalRecovery: true; marketingEmail: boolean }, clientKey: string, visitorToken?: string) {
  requirePrivacyKeys(); const email = normalizeEmail(data.email), lookup = emailHash(email);
  if (data.consentVersion !== noticeVersion) throw new AppError("notice_version_changed", 409);
  await rateLimit(db, clientKey, 10, new Date(), 900_000);
  await rateLimit(db, hashToken(`request-email:${lookup}`), 3, new Date(), 900_000);
  const session = await optionalSession(db, visitorToken);
  if (session?.kioskDeviceId) throw new AppError("personal_device_required", 403);
  // No visitor account is created or looked up until the mailbox is verified.
  const emailId = await db.transaction(async tx => {
    const token = newToken();
    const [link] = await tx.insert(s.authMagicLinks).values({ tokenHash: hashToken(token), purpose: "recovery", sourceSessionId: session?.id, emailEncrypted: encrypt(email), emailLookupHash: lookup, locale: data.locale, marketingRequested: data.marketingEmail && process.env.FEATURE_ENABLE_MARKETING === "true", expiresAt: new Date(Date.now() + 900_000) }).returning();
    if (session) {
      await grantConsent(tx, session, { purpose: "transactional_recovery", noticeVersion, locale: data.locale }, "recovery_form");
      await grantConsent(tx, session, { purpose: "service_storage", noticeVersion, locale: data.locale }, "recovery_form");
    }
    return enqueueEmail(tx, { template: "recovery", category: "transactional", locale: data.locale, to: email, idempotencyKey: `recovery:${link.id}`, data: { url: `${baseUrl()}/auth/verify?token=${token}` } });
  });
  await dispatchImmediate(db, [emailId]);
  return requestLinkResult();
}
async function mergeSession(db: Database, session: Session | null, owner: string) {
  if (!session || session.kioskDeviceId || (session.ownerUserId && session.ownerUserId !== owner)) return;
  // Lock and re-read to prevent a concurrent handoff/save from racing the merge.
  const [locked] = await db.update(s.visitorSessions).set({ lastActiveAt: new Date() }).where(and(eq(s.visitorSessions.id, session.id), eq(s.visitorSessions.status, "active"))).returning();
  if (!locked || (locked.ownerUserId && locked.ownerUserId !== owner)) return;
  const saved = await db.select().from(s.savedExperiences).where(eq(s.savedExperiences.sessionId, locked.id));
  for (const item of saved) {
    await db.insert(s.savedExperiences).values({ visitorId: owner, itemId: item.itemId, state: item.state, favorite: item.favorite, notes: item.notes }).onConflictDoUpdate({ target: [s.savedExperiences.visitorId, s.savedExperiences.itemId], set: {
      favorite: sql`${s.savedExperiences.favorite} or ${item.favorite}`,
      state: sql`case when ${s.savedExperiences.state} = 'visited' or ${item.state} = 'visited' then 'visited' when ${s.savedExperiences.state} = 'saved' or ${item.state} = 'saved' then 'saved' else 'removed' end`,
    } });
  }
  await db.delete(s.savedExperiences).where(eq(s.savedExperiences.sessionId, locked.id));
  await db.delete(s.chatMessages).where(eq(s.chatMessages.sessionId, locked.id));
  await db.update(s.consentRecords).set({ visitorId: owner }).where(and(eq(s.consentRecords.sessionId, locked.id), isNull(s.consentRecords.visitorId)));
  await db.update(s.visitorSessions).set({ ownerUserId: owner, status: "ended", tokenHash: hashToken(newToken()) }).where(eq(s.visitorSessions.id, locked.id));
  await db.update(s.qrHandoffs).set({ invalidatedAt: new Date(), status: "cancelled" }).where(and(eq(s.qrHandoffs.sourceSessionId, locked.id), isNull(s.qrHandoffs.usedAt)));
}
export async function verifyLink(db: Database, token: string, visitorToken?: string, testClock?: Date) {
  requirePrivacyKeys();
  const now = testClock || new Date(), expiry = testClock || sql`now()`;
  let confirmationId: string | null = null;
  const result = await db.transaction(async tx => {
    const [link] = await tx.update(s.authMagicLinks).set({ usedAt: now }).where(and(eq(s.authMagicLinks.tokenHash, hashToken(token)), eq(s.authMagicLinks.purpose, "recovery"), isNull(s.authMagicLinks.usedAt), gt(s.authMagicLinks.expiresAt, expiry))).returning();
    if (!link?.emailEncrypted || !link.emailLookupHash) throw new AppError("link_unavailable", 400);
    const [account] = await tx.insert(s.visitorAccounts).values({ emailEncrypted: link.emailEncrypted, emailLookupHash: link.emailLookupHash, emailVerifiedAt: now }).onConflictDoUpdate({ target: s.visitorAccounts.emailLookupHash, set: { emailVerifiedAt: now } }).returning();
    const current = await optionalSession(tx, visitorToken);
    const [source] = link.sourceSessionId ? await tx.select().from(s.visitorSessions).where(and(eq(s.visitorSessions.id, link.sourceSessionId), eq(s.visitorSessions.status, "active"), gt(s.visitorSessions.expiresAt, now))) : [];
    await mergeSession(tx, source || null, account.id);
    if (current?.id !== source?.id) await mergeSession(tx, current, account.id);
    const [prior] = await tx.select().from(s.visitorPreferences).where(eq(s.visitorPreferences.visitorId, account.id)).limit(1);
    const candidate = [current, source].find(row => row && !row.kioskDeviceId && (!row.ownerUserId || row.ownerUserId === account.id) && (row.countryDeclared || row.interests.length));
    const preferences = candidate || prior || { locale: link.locale, countryDeclared: null, interests: [] };
    // One canonical preferences row per visitor, protected by the account row lock above.
    await tx.delete(s.visitorPreferences).where(eq(s.visitorPreferences.visitorId, account.id));
    await tx.insert(s.visitorPreferences).values({ visitorId: account.id, locale: preferences.locale, countryDeclared: preferences.countryDeclared, interests: preferences.interests });
    const created = await createSession(tx, preferences.locale as Locale);
    const [session] = await tx.update(s.visitorSessions).set({ ownerUserId: account.id, retentionClass: "verified_optional", locale: preferences.locale, countryDeclared: preferences.countryDeclared, interests: preferences.interests }).where(eq(s.visitorSessions.id, created.session.id)).returning();
    for (const purpose of ["service_storage", "transactional_recovery"] as const) await grantConsent(tx, session, { purpose, noticeVersion, locale: link.locale }, "verified_recovery");
    await tx.update(s.authMagicLinks).set({ userId: account.id }).where(eq(s.authMagicLinks.id, link.id));
    if (link.marketingRequested && process.env.FEATURE_ENABLE_MARKETING === "true") {
      await grantConsent(tx, session, { purpose: "marketing_email", noticeVersion, locale: link.locale }, "verified_recovery_separate_checkbox");
      confirmationId = await requestMarketingConfirmation(tx, session);
    }
    return { token: created.token, session };
  });
  await dispatchImmediate(db, [confirmationId]);
  return result;
}
export async function requireOwner(db: Database, session: Session) {
  if (!session.ownerUserId) throw new AppError("verified_account_required", 401);
  const [account] = await db.select().from(s.visitorAccounts).where(eq(s.visitorAccounts.id, session.ownerUserId));
  if (!account?.emailVerifiedAt || !account.emailEncrypted) throw new AppError("verified_account_required", 401);
  return account;
}
export async function requestMarketingConfirmation(db: Database, session: Session) {
  const account = await requireOwner(db, session);
  if (process.env.FEATURE_ENABLE_MARKETING !== "true" || !await hasConsent(db, account.id, "marketing_email")) throw new AppError("marketing_disabled", 403);
  const token = newToken();
  const [link] = await db.insert(s.authMagicLinks).values({ userId: account.id, purpose: "marketing_opt_in", locale: session.locale, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 900_000) }).returning();
  await db.insert(s.emailSubscriptions).values({ visitorId: account.id, addressRef: account.id, purpose: "marketing_email", status: "pending", locale: session.locale, frequency: "monthly" }).onConflictDoUpdate({ target: [s.emailSubscriptions.visitorId, s.emailSubscriptions.purpose], set: { status: "pending", doubleOptInAt: null } });
  return enqueueEmail(db, { template: "marketing_confirmation", category: "confirmation", locale: session.locale as Locale, visitorId: account.id, to: decrypt(account.emailEncrypted!), idempotencyKey: `doi:${link.id}`, data: { url: `${baseUrl()}/email/confirm?token=${token}` } });
}
export async function confirmMarketing(db: Database, token: string) {
  if (process.env.FEATURE_ENABLE_MARKETING !== "true") throw new AppError("marketing_disabled", 403);
  return db.transaction(async tx => {
    const [link] = await tx.update(s.authMagicLinks).set({ usedAt: new Date() }).where(and(eq(s.authMagicLinks.tokenHash, hashToken(token)), eq(s.authMagicLinks.purpose, "marketing_opt_in"), isNull(s.authMagicLinks.usedAt), gt(s.authMagicLinks.expiresAt, sql`now()`))).returning();
    if (!link?.userId || !await hasConsent(tx, link.userId, "marketing_email")) throw new AppError("link_unavailable", 400);
    const [account] = await tx.select().from(s.visitorAccounts).where(eq(s.visitorAccounts.id, link.userId));
    const [suppressed] = account?.emailLookupHash ? await tx.select().from(s.emailSuppressions).where(eq(s.emailSuppressions.emailHash, account.emailLookupHash)) : [];
    if (suppressed) throw new AppError("link_unavailable", 400);
    const unsubscribeToken = newToken();
    await tx.update(s.emailSubscriptions).set({ status: "active", doubleOptInAt: new Date(), unsubscribeTokenHash: hashToken(unsubscribeToken) }).where(and(eq(s.emailSubscriptions.visitorId, link.userId), eq(s.emailSubscriptions.purpose, "marketing_email")));
    // Durable unsubscribe URL is encrypted with the subscription's addressRef, never returned as an account credential.
    await tx.update(s.emailSubscriptions).set({ addressRef: encrypt(unsubscribeToken) }).where(eq(s.emailSubscriptions.visitorId, link.userId));
    return { confirmed: true };
  });
}
export async function marketingLinks(db: Database, visitorId: string) {
  const [sub] = await db.select().from(s.emailSubscriptions).where(and(eq(s.emailSubscriptions.visitorId, visitorId), eq(s.emailSubscriptions.status, "active")));
  if (!sub?.doubleOptInAt || !sub.unsubscribeTokenHash) throw new AppError("marketing_opt_in_required", 403);
  return { unsubscribeUrl: `${baseUrl()}/api/email/unsubscribe?token=${decrypt(sub.addressRef)}`, preferencesUrl: `${baseUrl()}/cuenta/privacidad` };
}
