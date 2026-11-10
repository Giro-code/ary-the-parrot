import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import { optionalSession, requestLink, requestLinkResult } from "./auth.ts";
import { grantConsent, noticeVersion } from "./consents.ts";
import { createSession, rateLimit, publicSession, type Session } from "./service.ts";
import { emailHash, normalizeEmail } from "./crypto.ts";
import { hashToken } from "./tokens.ts";
import { AppError } from "./errors.ts";
import { dispatchImmediate } from "./email/outbox.ts";

export const onboardingSchema = z.object({ email: z.string().trim().max(254).pipe(z.email()), locale: z.enum(["es", "en"]), consentVersion: z.string().max(50), terms: z.literal(true), marketing: z.boolean().default(false) }).strict();
export async function startRecovery(db: Database, data: Parameters<typeof requestLink>[1], clientKey: string, visitorToken?: string) {
  const prior = await optionalSession(db, visitorToken);
  if (prior?.kioskDeviceId) throw new AppError("personal_device_required", 403);
  const result = await db.transaction(async tx => {
    const created = prior ? { session: prior, token: visitorToken! } : await createSession(tx, data.locale);
    const queued = await requestLink(tx, data, clientKey, created.token, true);
    // The recovery checkbox authorizes storage and recovery only, never terms or marketing.
    if (!created.session.pendingEmailHash && !created.session.ownerUserId) await tx.update(s.visitorSessions).set({ pendingEmailHash: emailHash(normalizeEmail(data.email)) }).where(eq(s.visitorSessions.id, created.session.id));
    return { token: prior ? undefined : created.token, emailId: queued.emailId };
  });
  await dispatchImmediate(db, [result.emailId || null]);
  return { token: result.token, ...requestLinkResult() };
}
export async function startWithEmail(db: Database, raw: unknown, clientKey: string, visitorToken?: string) {
  const parsed = onboardingSchema.safeParse(raw); if (!parsed.success) throw new AppError("invalid_body", 400);
  const data = parsed.data;
  if (data.consentVersion !== noticeVersion) throw new AppError("notice_version_changed", 409);
  const prior = await optionalSession(db, visitorToken);
  if (prior?.kioskDeviceId) throw new AppError("personal_device_required", 403);
  if (prior?.ownerUserId) return { session: publicSession(prior), token: undefined, ...requestLinkResult() };
  // One transaction: rejected/rate-limited attempts cannot leave sessions, grants or outbox rows.
  const result = await db.transaction(async tx => {
    await rateLimit(tx, clientKey, 10, new Date(), 900_000);
    const email = normalizeEmail(data.email), lookup = emailHash(email);
    const created = prior ? { session: prior, token: visitorToken! } : await createSession(tx, data.locale);
    if (prior?.pendingEmailHash && prior.pendingEmailHash !== lookup) throw new AppError("email_already_started", 409);
    const [session] = await tx.update(s.visitorSessions).set({ pendingEmailHash: lookup }).where(eq(s.visitorSessions.id, created.session.id)).returning();
    for (const purpose of ["terms", "conversation_history"] as const) await grantConsent(tx, session, { purpose, noticeVersion, locale: data.locale }, "email_welcome_checkbox");
    if (data.marketing) await grantConsent(tx, session, { purpose: "marketing", noticeVersion, locale: data.locale }, "email_welcome_optional_checkbox");
    const queued = await requestLink(tx, { email, locale: data.locale, consentVersion: noticeVersion, transactionalRecovery: true, marketingEmail: data.marketing }, hashToken(`welcome-mail:${clientKey}`), created.token, true);
    return { session, token: created.token, emailId: queued.emailId };
  });
  // Existing outbox dispatch runs after commit. It remains dry-run in this task.
  await dispatchImmediate(db, [result.emailId || null]);
  return { session: publicSession(result.session), token: result.token, ...requestLinkResult() };
}
export async function consumeProvisionalQuestion(db: Database, session: Session) {
  if (session.kioskDeviceId || session.ownerUserId || session.retentionClass === "kiosk_demo") return;
  if (!session.pendingEmailHash) throw new AppError("email_required", 403);
  // The HMAC mailbox key survives new sessions and resends; atomic upsert prevents concurrent bypass.
  const now = new Date();
  const termsRows = await db.select({ granted: s.consentRecords.granted, revokedAt: s.consentRecords.revokedAt }).from(s.consentRecords).where(and(eq(s.consentRecords.sessionId, session.id), eq(s.consentRecords.purpose, "terms")));
  const terms = termsRows.some(row => row.granted && !row.revokedAt);
  // Recovery-only visitors (never shown the terms) may chat; anyone who withdrew the terms may not.
  if (!terms && (termsRows.length > 0 || !await recoveryAdmission(db, session))) throw new AppError("terms_required", 403);
  try { await rateLimit(db, hashToken(`unverified-questions:${session.pendingEmailHash}`), 5, now, 86400_000); }
  catch (error) { if (error instanceof AppError && error.code === "rate_limited") throw new AppError("email_verification_required", 403); throw error; }
}
export async function emailAdmission(db: Database, session: Session) {
  if (session.ownerUserId) return true;
  if (!session.pendingEmailHash) return false;
  const [terms] = await db.select().from(s.consentRecords).where(and(eq(s.consentRecords.sessionId, session.id), eq(s.consentRecords.purpose, "terms"), eq(s.consentRecords.granted, true), isNull(s.consentRecords.revokedAt)));
  return !!terms || await recoveryAdmission(db, session);
}
async function recoveryAdmission(db: Database, session: Session) {
  const rows = await db.select({ purpose: s.consentRecords.purpose }).from(s.consentRecords).where(and(eq(s.consentRecords.sessionId, session.id), eq(s.consentRecords.granted, true), isNull(s.consentRecords.revokedAt)));
  return ["transactional_recovery", "service_storage"].every(purpose => rows.some(row => row.purpose === purpose));
}
