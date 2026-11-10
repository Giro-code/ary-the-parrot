import { and, eq, gt, isNull, sql, desc, inArray } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import { AppError } from "./errors.ts";
import { confirmationCode, hashToken, newToken } from "./tokens.ts";
import { handoffTtl, sessionTtl } from "./config.ts";
import { interests as interestKeys, recommendationRationale, type Interest, type Locale } from "../i18n/index.ts";
import { hasConsent } from "./consents.ts";
import { archiveConversation } from "./conversations.ts";

export type Session = typeof s.visitorSessions.$inferSelect;
export type CulturalItem = typeof s.culturalItems.$inferSelect;
export type Preferences = { locale: Locale; countryDeclared: string | null; interests: Interest[] };
type Event = "session_started" | "preferences_set" | "recommendation_shown" | "qr_generated" | "qr_redeemed" | "qr_expired" | "item_saved" | "item_viewed" | "chat_asked" | "offer_viewed" | "offer_clicked" | "lead_shared" | "account_verified";
const eventFields: Record<Event, string[]> = {
  session_started: ["locale"], preferences_set: ["interests"], recommendation_shown: ["count", "mode"],
  qr_generated: [], qr_redeemed: [], qr_expired: [], item_saved: ["state"],
  item_viewed: [], chat_asked: [], offer_viewed: [], offer_clicked: [], lead_shared: [], account_verified: [],
};
export async function recordEvent(db: Database, eventType: Event, metadata: Record<string, unknown> = {}, session?: Session, refs?: { providerId?: string; culturalItemId?: string }) {
  const safe = Object.fromEntries(Object.entries(metadata).filter(([key, value]) => {
    if (!eventFields[eventType].includes(key)) return false;
    if (key === "interests") return Array.isArray(value) && value.length <= 6 && value.every(item => interestKeys.includes(item));
    if (key === "locale") return value === "es" || value === "en";
    if (key === "count") return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100;
    if (key === "mode") return value === "rules";
    return key === "state" && ["saved", "visited", "removed"].includes(String(value));
  }));
  const kioskId = session?.kioskDeviceId || session?.originKioskId;
  const [device] = kioskId ? await db.select({ organizationId: s.kioskDevices.organizationId }).from(s.kioskDevices).where(eq(s.kioskDevices.id, kioskId)) : [];
  await db.insert(s.analyticsEvents).values({ eventType, metadata: safe, kioskDeviceId: kioskId, organizationId: device?.organizationId, providerId: refs?.providerId, culturalItemId: refs?.culturalItemId });
}
export async function rateLimit(db: Database, keyHash: string, limit: number, now = new Date(), windowMs = 60_000) {
  const [row] = await db.insert(s.rateLimits).values({ keyHash, count: 1, resetAt: new Date(+now + windowMs) })
    .onConflictDoUpdate({ target: s.rateLimits.keyHash, set: {
      count: sql`case when ${s.rateLimits.resetAt} <= ${now} then 1 else ${s.rateLimits.count} + 1 end`,
      resetAt: sql`case when ${s.rateLimits.resetAt} <= ${now} then ${new Date(+now + windowMs)} else ${s.rateLimits.resetAt} end`,
    } }).returning();
  if (row.count > limit) throw new AppError("rate_limited", 429);
}
export async function getSession(db: Database, token: string | undefined, now = new Date(), active = true) {
  if (!token || !/^[\w-]{43}$/.test(token)) throw new AppError("session_required", 401);
  const [session] = await db.select().from(s.visitorSessions).where(and(eq(s.visitorSessions.tokenHash, hashToken(token)), gt(s.visitorSessions.expiresAt, now)));
  if (!session || (active && session.status !== "active")) throw new AppError("session_required", 401);
  if (session.ownerUserId && active) await db.update(s.visitorAccounts).set({ lastActiveAt: now }).where(eq(s.visitorAccounts.id, session.ownerUserId));
  return session;
}
export function publicSession(session: Session) {
  return { locale: session.locale as Locale, countryDeclared: session.countryDeclared, interests: session.interests as Interest[], expiresAt: session.expiresAt.toISOString(), accountVerified: !!session.ownerUserId, emailStarted: !!session.pendingEmailHash };
}
export async function createSession(db: Database, locale: Locale = "es", kioskDeviceId: string | null = null, now = new Date()) {
  const token = newToken();
  const [session] = await db.insert(s.visitorSessions).values({ tokenHash: hashToken(token), locale, kioskDeviceId, expiresAt: new Date(+now + sessionTtl()) }).returning();
  await recordEvent(db, "session_started", { locale }, session);
  return { token, session };
}
async function clearOperational(db: Database, sessionId: string, status: string, now = new Date()) {
  await db.update(s.visitorSessions).set({ locale: "es", countryDeclared: null, interests: [], status, lastActiveAt: now }).where(eq(s.visitorSessions.id, sessionId));
  await db.delete(s.visitorPreferences).where(eq(s.visitorPreferences.sessionId, sessionId));
  await db.delete(s.savedExperiences).where(eq(s.savedExperiences.sessionId, sessionId));
  await db.delete(s.recommendations).where(eq(s.recommendations.sessionId, sessionId));
  await db.delete(s.chatMessages).where(eq(s.chatMessages.sessionId, sessionId));
  await db.delete(s.savedPlaces).where(eq(s.savedPlaces.sessionId, sessionId));
}
export async function endSession(db: Database, sessionId: string, now = new Date()) {
  await db.transaction(async tx => {
    // Lock the session first, as redeem and handoff creation do.
    const [session] = await tx.update(s.visitorSessions).set({ lastActiveAt: now }).where(eq(s.visitorSessions.id, sessionId)).returning();
    if (session) await archiveConversation(tx, session);
    const expired = await tx.update(s.qrHandoffs).set({ invalidatedAt: now, status: "cancelled" }).where(and(eq(s.qrHandoffs.sourceSessionId, sessionId), isNull(s.qrHandoffs.usedAt), isNull(s.qrHandoffs.invalidatedAt))).returning();
    for (const qr of expired) if (+qr.expiresAt <= +now) await recordEvent(tx, "qr_expired");
    await clearOperational(tx, sessionId, "ended", now);
  });
}
export async function setPreferences(db: Database, session: Session, prefs: Preferences, now = new Date()) {
  await db.transaction(async tx => {
    const [updated] = await tx.update(s.visitorSessions).set({ ...prefs, lastActiveAt: now }).where(and(eq(s.visitorSessions.id, session.id), eq(s.visitorSessions.status, "active"), gt(s.visitorSessions.expiresAt, now))).returning();
    if (!updated) throw new AppError("session_required", 401);
    const [pending] = await tx.select().from(s.qrHandoffs).where(and(eq(s.qrHandoffs.sourceSessionId, session.id), isNull(s.qrHandoffs.usedAt), isNull(s.qrHandoffs.invalidatedAt), gt(s.qrHandoffs.expiresAt, now)));
    if (pending) throw new AppError("handoff_pending", 409);
    await tx.insert(s.visitorPreferences).values({ sessionId: session.id, ...prefs, updatedAt: now }).onConflictDoUpdate({ target: s.visitorPreferences.sessionId, set: { ...prefs, updatedAt: now } });
    if (session.ownerUserId && await hasConsent(tx, session.ownerUserId, "service_storage")) {
      await tx.delete(s.visitorPreferences).where(eq(s.visitorPreferences.visitorId, session.ownerUserId));
      await tx.insert(s.visitorPreferences).values({ visitorId: session.ownerUserId, ...prefs, updatedAt: now });
    }
    await recordEvent(tx, "preferences_set", { interests: prefs.interests }, session);
  });
}
export async function kioskDevice(db: Database, token: string | undefined, now = new Date()) {
  if (!token || !/^[\w-]{43}$/.test(token)) return null;
  const [device] = await db.select().from(s.kioskDevices).where(and(eq(s.kioskDevices.keyHash, hashToken(token)), eq(s.kioskDevices.status, "active"), gt(s.kioskDevices.credentialExpiresAt, now)));
  return device || null;
}
export async function enrollKiosk(db: Database, label: string, deviceId?: string, now = new Date()) {
  const code = newToken();
  const values = { activationHash: hashToken(code), activationExpiresAt: new Date(+now + 600_000) };
  if (deviceId) {
    const [device] = await db.update(s.kioskDevices).set({ ...values, locationLabel: label }).where(eq(s.kioskDevices.id, deviceId)).returning();
    if (!device) throw new AppError("device_not_found", 404);
    return { code, deviceId: device.id };
  }
  const [device] = await db.insert(s.kioskDevices).values({ ...values, locationLabel: label }).returning();
  return { code, deviceId: device.id };
}
export async function activateKiosk(db: Database, code: string, now = new Date()) {
  const token = newToken();
  const [device] = await db.update(s.kioskDevices).set({ keyHash: hashToken(token), credentialExpiresAt: new Date(+now + 30 * 86400_000), activationHash: null, activationExpiresAt: null, status: "active", lastSeenAt: now })
    .where(and(eq(s.kioskDevices.activationHash, hashToken(code)), gt(s.kioskDevices.activationExpiresAt, now))).returning();
  if (!device) throw new AppError("activation_unavailable", 400);
  return token;
}
export async function createHandoff(db: Database, session: Session, deviceId: string, now = new Date(), ttl = handoffTtl()) {
  if (session.kioskDeviceId !== deviceId) throw new AppError("kiosk_required", 403);
  const token = newToken(), code = confirmationCode();
  const expiresAt = new Date(+now + ttl);
  const qr = await db.transaction(async tx => {
    const [locked] = await tx.update(s.visitorSessions).set({ lastActiveAt: now }).where(and(eq(s.visitorSessions.id, session.id), eq(s.visitorSessions.status, "active"), gt(s.visitorSessions.expiresAt, now))).returning();
    if (!locked) throw new AppError("session_required", 401);
    await tx.update(s.qrHandoffs).set({ invalidatedAt: now, status: "cancelled" }).where(and(eq(s.qrHandoffs.sourceSessionId, session.id), isNull(s.qrHandoffs.usedAt), isNull(s.qrHandoffs.invalidatedAt)));
    const [created] = await tx.insert(s.qrHandoffs).values({ sourceSessionId: session.id, tokenHash: hashToken(token), confirmationCode: code, expiresAt }).returning();
    await recordEvent(tx, "qr_generated", {}, session);
    return created;
  });
  return { token, confirmationCode: code, expiresAt, handoffId: qr.id };
}
export async function previewHandoff(db: Database, token: string, now = new Date()) {
  if (!/^[\w-]{43}$/.test(token)) throw new AppError("handoff_unavailable", 400);
  const [qr] = await db.select().from(s.qrHandoffs).where(eq(s.qrHandoffs.tokenHash, hashToken(token)));
  if (!qr || qr.usedAt || qr.invalidatedAt || qr.attemptCount >= 5) throw new AppError("handoff_unavailable", 400);
  if (+qr.expiresAt <= +now) throw new AppError("handoff_expired", 410);
  const [source] = await db.select().from(s.visitorSessions).where(and(eq(s.visitorSessions.id, qr.sourceSessionId), eq(s.visitorSessions.status, "active"), gt(s.visitorSessions.expiresAt, now)));
  if (!source) throw new AppError("handoff_unavailable", 400);
  // Do not disclose preferences, country, counts or session identifiers before redemption.
  return { locale: source.locale as Locale, confirmationCode: qr.confirmationCode };
}
export async function redeemHandoff(db: Database, token: string, code: string, testClock?: Date, mobileLocale?: Locale) {
  const now = testClock ?? new Date();
  const expiryClock = testClock ?? sql`now()`;
  if (!/^[\w-]{43}$/.test(token)) throw new AppError("handoff_unavailable", 400);
  const tokenHash = hashToken(token);
  await rateLimit(db, hashToken(`redeem:${tokenHash}`), 5, now, 300_000);
  const result = await db.transaction(async tx => {
    const [candidate] = await tx.select().from(s.qrHandoffs).where(eq(s.qrHandoffs.tokenHash, tokenHash));
    if (!candidate) return { error: "handoff_unavailable" } as const;
    // Serialize all mutations of a source session, then conditionally consume the QR.
    const [source] = await tx.update(s.visitorSessions).set({ lastActiveAt: now }).where(and(eq(s.visitorSessions.id, candidate.sourceSessionId), eq(s.visitorSessions.status, "active"), gt(s.visitorSessions.expiresAt, now))).returning();
    if (!source) return { error: "handoff_unavailable" } as const;
    const [attempt] = await tx.update(s.qrHandoffs).set({ attemptCount: sql`${s.qrHandoffs.attemptCount} + 1` }).where(and(eq(s.qrHandoffs.id, candidate.id), isNull(s.qrHandoffs.usedAt), isNull(s.qrHandoffs.invalidatedAt))).returning();
    if (!attempt || attempt.attemptCount > 5 || attempt.confirmationCode !== code) return { error: "handoff_unavailable" } as const;
    if (+attempt.expiresAt <= +now) {
      await tx.update(s.qrHandoffs).set({ invalidatedAt: now, status: "expired" }).where(eq(s.qrHandoffs.id, attempt.id));
      await recordEvent(tx, "qr_expired");
      await clearOperational(tx, source.id, "ended", now);
      return { error: "handoff_expired" } as const;
    }
    // One conditional UPDATE is the single-use boundary, inside the same transaction as the copy.
    const [claimed] = await tx.update(s.qrHandoffs).set({ usedAt: now, status: "redeemed" }).where(and(eq(s.qrHandoffs.id, attempt.id), isNull(s.qrHandoffs.usedAt), isNull(s.qrHandoffs.invalidatedAt), gt(s.qrHandoffs.expiresAt, expiryClock))).returning();
    if (!claimed) return { error: "handoff_unavailable" } as const;
    const mobile = await createSession(tx, mobileLocale || source.locale as Locale, null, now);
    const prefs: Preferences = { locale: mobileLocale || source.locale as Locale, countryDeclared: source.countryDeclared, interests: source.interests as Interest[] };
    const [session] = await tx.update(s.visitorSessions).set({ ...prefs, originKioskId: source.kioskDeviceId || source.originKioskId }).where(eq(s.visitorSessions.id, mobile.session.id)).returning();
    await tx.insert(s.visitorPreferences).values({ sessionId: session.id, ...prefs });
    const saved = await tx.select().from(s.savedExperiences).where(eq(s.savedExperiences.sessionId, source.id));
    if (saved.length) await tx.insert(s.savedExperiences).values(saved.map(item => ({ sessionId: session.id, itemId: item.itemId, state: item.state, favorite: item.favorite, notes: item.notes })));
    const messages = await tx.select().from(s.chatMessages).where(and(eq(s.chatMessages.sessionId, source.id), gt(s.chatMessages.retentionUntil, now)));
    if (messages.length) await tx.insert(s.chatMessages).values(messages.map(({ role, encryptedPayload, provenance, createdAt }) => ({ sessionId: session.id, role, encryptedPayload, provenance, createdAt, retentionUntil: session.expiresAt })));
    const places = await tx.select().from(s.savedPlaces).where(eq(s.savedPlaces.sessionId, source.id));
    if (places.length) await tx.insert(s.savedPlaces).values(places.map(({ encryptedPayload }) => ({ encryptedPayload, sessionId: session.id })));
    await tx.update(s.qrHandoffs).set({ consumedBySessionId: session.id }).where(eq(s.qrHandoffs.id, claimed.id));
    await clearOperational(tx, source.id, "transferred", now);
    await recordEvent(tx, "qr_redeemed", {}, source);
    return { token: mobile.token, session };
  });
  if ("error" in result) throw new AppError(result.error!, result.error === "handoff_expired" ? 410 : 400);
  return result;
}
export async function handoffStatus(db: Database, sourceId: string, now = new Date()) {
  const [qr] = await db.select().from(s.qrHandoffs).where(eq(s.qrHandoffs.sourceSessionId, sourceId)).orderBy(desc(s.qrHandoffs.createdAt)).limit(1);
  return { status: !qr ? "none" : qr.usedAt ? "redeemed" : qr.invalidatedAt ? qr.status : +qr.expiresAt <= +now ? "expired" : "pending" };
}
export async function listItems(db: Database, locale: Locale, offset = 0, limit = 12) {
  return db.select().from(s.culturalItems).where(and(eq(s.culturalItems.status, "published"), eq(s.culturalItems.language, locale))).orderBy(s.culturalItems.contentKey).limit(limit).offset(offset);
}
export async function localizeItems(db: Database, items: CulturalItem[], locale: Locale): Promise<CulturalItem[]> {
  if (!items.length || items.every(item => item.language === locale)) return items;
  const translations = await db.select().from(s.culturalItems).where(and(eq(s.culturalItems.status, "published"), eq(s.culturalItems.language, locale), inArray(s.culturalItems.contentKey, items.map(item => item.contentKey))));
  // Keep IDs stable for saved records, citations and existing public links.
  return items.map(item => ({ ...(translations.find(row => row.contentKey === item.contentKey) || item), id: item.id }));
}
export async function findItem(db: Database, id: string) {
  const [item] = await db.select().from(s.culturalItems).where(and(eq(s.culturalItems.id, id), eq(s.culturalItems.status, "published")));
  if (!item) throw new AppError("item_not_found", 404);
  return item;
}
export function rankItems(items: CulturalItem[], preferences: Pick<Preferences, "locale" | "interests">) {
  return items.filter(item => item.language === preferences.locale).map(item => {
    const matches = preferences.interests.filter(interest => item.tags.includes(interest));
    const rationale = recommendationRationale(preferences.locale, matches);
    return { item, score: matches.length * 10, rationale, evidenceIds: [item.id], sourceUrl: item.sourceUrl, sourceCheckedAt: item.sourceCheckedAt };
  }).sort((a, b) => b.score - a.score || a.item.contentKey.localeCompare(b.item.contentKey)).slice(0, 4);
}
export async function recommend(db: Database, session: Session) {
  return db.transaction(async tx => {
  const [active] = await tx.update(s.visitorSessions).set({ lastActiveAt: new Date() }).where(and(eq(s.visitorSessions.id, session.id), eq(s.visitorSessions.status, "active"), gt(s.visitorSessions.expiresAt, new Date()))).returning();
  if (!active) throw new AppError("session_required", 401);
  const ranked = rankItems(await listItems(tx, active.locale as Locale, 0, 100), { locale: active.locale as Locale, interests: active.interests as Interest[] });
  if (ranked.length) await tx.insert(s.recommendations).values(ranked.map(row => ({ sessionId: session.id, culturalItemId: row.item.id, rationale: row.rationale, evidenceIds: row.evidenceIds })));
  await recordEvent(tx, "recommendation_shown", { count: ranked.length, mode: "rules" }, session);
  // Bridges supply sourced context only. They never affect scores.
  const bridges = active.countryDeclared && ranked.length ? await tx.select().from(s.culturalBridges).where(and(eq(s.culturalBridges.countryCode, active.countryDeclared), inArray(s.culturalBridges.culturalItemId, ranked.map(r => r.item.id)))) : [];
  return { mode: "rules" as const, demo: true, recommendations: ranked, bridges };
  });
}
export async function listSaved(db: Database, sessionId: string) {
  const [session] = await db.select().from(s.visitorSessions).where(eq(s.visitorSessions.id, sessionId));
  const owner = session?.ownerUserId ? eq(s.savedExperiences.visitorId, session.ownerUserId) : eq(s.savedExperiences.sessionId, sessionId);
  return db.select({ saved: s.savedExperiences, item: s.culturalItems }).from(s.savedExperiences).innerJoin(s.culturalItems, eq(s.savedExperiences.itemId, s.culturalItems.id)).where(and(owner, inArray(s.savedExperiences.state, ["saved", "visited"]))).orderBy(desc(s.savedExperiences.createdAt)).limit(100);
}
export async function saveItem(db: Database, sessionId: string, itemId: string) {
  await findItem(db, itemId);
  return db.transaction(async tx => {
    const [session] = await tx.update(s.visitorSessions).set({ lastActiveAt: new Date() }).where(and(eq(s.visitorSessions.id, sessionId), eq(s.visitorSessions.status, "active"), gt(s.visitorSessions.expiresAt, new Date()))).returning();
    if (!session) throw new AppError("session_required", 401);
    if (session.ownerUserId && !await hasConsent(tx, session.ownerUserId, "service_storage")) throw new AppError("storage_consent_required", 403);
    const owner = session.ownerUserId ? { visitorId: session.ownerUserId } : { sessionId };
    const target = session.ownerUserId ? [s.savedExperiences.visitorId, s.savedExperiences.itemId] : [s.savedExperiences.sessionId, s.savedExperiences.itemId];
    const [row] = await tx.insert(s.savedExperiences).values({ ...owner, itemId }).onConflictDoUpdate({ target, set: { state: "saved" } }).returning();
    await recordEvent(tx, "item_saved", { state: "saved" }, session, { culturalItemId: itemId });
    return row;
  });
}
export async function updateSaved(db: Database, sessionId: string, id: string, changes: { state?: "saved" | "visited" | "removed"; favorite?: boolean }) {
  return db.transaction(async tx => {
    const [session] = await tx.update(s.visitorSessions).set({ lastActiveAt: new Date() }).where(and(eq(s.visitorSessions.id, sessionId), eq(s.visitorSessions.status, "active"), gt(s.visitorSessions.expiresAt, new Date()))).returning();
    if (!session) throw new AppError("session_required", 401);
    const owner = session.ownerUserId ? eq(s.savedExperiences.visitorId, session.ownerUserId) : eq(s.savedExperiences.sessionId, sessionId);
    const [row] = await tx.update(s.savedExperiences).set(changes).where(and(eq(s.savedExperiences.id, id), owner)).returning();
    if (!row) throw new AppError("saved_not_found", 404);
    return row;
  });
}
