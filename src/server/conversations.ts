import { and, desc, eq, gt, inArray } from "drizzle-orm";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import { encrypt, decrypt } from "./crypto.ts";
import { hasConsent } from "./consents.ts";
import { numericEnv } from "./config.ts";
import { AppError } from "./errors.ts";
import type { Session } from "./service.ts";

export type StoredMessage = { id: string; role: "user" | "assistant"; text: string; reply?: unknown };
export const conversationRetentionDays = () => numericEnv("CONVERSATION_RETENTION_DAYS", 90, 365);
async function requireHistory(db: Database, session: Session) {
  if (!session.ownerUserId) throw new AppError("verified_account_required", 401);
  if (!await hasConsent(db, session.ownerUserId, "conversation_history")) throw new AppError("history_consent_required", 403);
  return session.ownerUserId;
}
export async function archiveConversation(db: Database, session: Session) {
  if (!session.ownerUserId || !await hasConsent(db, session.ownerUserId, "conversation_history")) return;
  const rows = await db.select().from(s.chatMessages).where(and(eq(s.chatMessages.sessionId, session.id), gt(s.chatMessages.retentionUntil, new Date()))).orderBy(s.chatMessages.createdAt, s.chatMessages.id);
  const messages: StoredMessage[] = rows.flatMap(row => {
    try { return row.encryptedPayload ? [{ id: row.id, role: row.role as StoredMessage["role"], ...JSON.parse(decrypt(row.encryptedPayload)) }] : []; } catch { return []; }
  });
  if (!messages.some(row => row.role === "user")) return;
  const values = { encryptedPayload: encrypt(JSON.stringify(messages)), updatedAt: new Date() };
  if (session.conversationId) {
    const [updated] = await db.update(s.conversations).set(values).where(and(eq(s.conversations.id, session.conversationId), eq(s.conversations.visitorId, session.ownerUserId), gt(s.conversations.retentionUntil, new Date()))).returning();
    if (updated) return updated.id;
  }
  const [created] = await db.insert(s.conversations).values({ ...values, visitorId: session.ownerUserId, retentionUntil: new Date(Date.now() + conversationRetentionDays() * 86400_000) }).returning();
  await db.update(s.visitorSessions).set({ conversationId: created.id }).where(eq(s.visitorSessions.id, session.id));
  return created.id;
}
export async function listConversations(db: Database, session: Session) {
  const owner = await requireHistory(db, session);
  const rows = await db.select().from(s.conversations).where(and(eq(s.conversations.visitorId, owner), gt(s.conversations.retentionUntil, new Date()))).orderBy(desc(s.conversations.updatedAt)).limit(100);
  return rows.flatMap(({ encryptedPayload, ...row }) => {
    try { const messages = JSON.parse(decrypt(encryptedPayload)) as StoredMessage[]; return [{ ...row, firstMessage: messages.find(message => message.role === "user")?.text.slice(0, 160) || "" }]; } catch { return []; }
  });
}
export async function openConversation(db: Database, session: Session, id: string) {
  const owner = await requireHistory(db, session);
  const [row] = await db.select().from(s.conversations).where(and(eq(s.conversations.id, id), eq(s.conversations.visitorId, owner), gt(s.conversations.retentionUntil, new Date())));
  if (!row) throw new AppError("conversation_not_found", 404);
  return { id: row.id, createdAt: row.createdAt, retentionUntil: row.retentionUntil, messages: JSON.parse(decrypt(row.encryptedPayload)) as StoredMessage[] };
}
export async function continueConversation(db: Database, session: Session, id: string) {
  return db.transaction(async tx => {
    // Same session lock as chat persistence and deletion: late replies cannot overwrite a switch.
    const [active] = await tx.select().from(s.visitorSessions).where(and(eq(s.visitorSessions.id, session.id), eq(s.visitorSessions.status, "active"), gt(s.visitorSessions.expiresAt, new Date()))).for("update");
    if (!active) throw new AppError("session_required", 401);
    const conversation = await openConversation(tx, active, id);
    await archiveConversation(tx, active);
    await tx.delete(s.chatMessages).where(eq(s.chatMessages.sessionId, active.id));
    if (conversation.messages.length) await tx.insert(s.chatMessages).values(conversation.messages.map((row, index) => ({ sessionId: active.id, role: row.role, encryptedPayload: encrypt(JSON.stringify({ text: row.text, reply: row.reply })), retentionUntil: active.expiresAt, createdAt: new Date(Date.now() + index) })));
    await tx.update(s.visitorSessions).set({ conversationId: id }).where(eq(s.visitorSessions.id, active.id));
    return { continued: true, redirect: "/experiencia" };
  });
}
export async function deleteConversation(db: Database, session: Session, id: string) {
  const owner = await requireHistory(db, session);
  return db.transaction(async tx => {
    const sessions = await tx.select().from(s.visitorSessions).where(and(eq(s.visitorSessions.ownerUserId, owner), eq(s.visitorSessions.conversationId, id))).for("update");
    await openConversation(tx, session, id);
    if (sessions.length) await tx.delete(s.chatMessages).where(inArray(s.chatMessages.sessionId, sessions.map(row => row.id)));
    await tx.delete(s.conversations).where(and(eq(s.conversations.id, id), eq(s.conversations.visitorId, owner)));
    return { deleted: true };
  });
}
