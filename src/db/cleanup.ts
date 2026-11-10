import { and, eq, isNull, lte } from "drizzle-orm";
import type { Database } from "./client.ts";
import * as s from "./schema.ts";
import { endSession } from "../server/service.ts";
import { numericEnv } from "../server/config.ts";
import { deleteAccountData } from "../server/privacy.ts";
export async function cleanupDatabase(db: Database, now = new Date()) {
  const inactiveAccounts = await db.select({ id: s.visitorAccounts.id }).from(s.visitorAccounts).where(lte(s.visitorAccounts.lastActiveAt, new Date(+now - 365 * 86400_000)));
  for (const account of inactiveAccounts) await deleteAccountData(db, account.id);
  const expired = await db.select().from(s.qrHandoffs).where(and(lte(s.qrHandoffs.expiresAt, now), isNull(s.qrHandoffs.usedAt), isNull(s.qrHandoffs.invalidatedAt)));
  for (const qr of expired) await endSession(db, qr.sourceSessionId, now);
  return db.transaction(async tx => {
    await tx.delete(s.chatMessages).where(lte(s.chatMessages.retentionUntil, now));
    await tx.delete(s.conversations).where(lte(s.conversations.retentionUntil, now));
    await tx.delete(s.staffSessions).where(lte(s.staffSessions.expiresAt, now));
    await tx.delete(s.providerLeads).where(lte(s.providerLeads.expiresAt, now));
    await tx.delete(s.aiUsage).where(lte(s.aiUsage.createdAt, new Date(+now - 30 * 86400_000)));
    await tx.delete(s.robotEvents).where(lte(s.robotEvents.createdAt, new Date(+now - 30 * 86400_000)));
    await tx.delete(s.robotCommands).where(lte(s.robotCommands.expiresAt, now));
    await tx.delete(s.qrHandoffs).where(lte(s.qrHandoffs.expiresAt, now));
    await tx.delete(s.visitorSessions).where(lte(s.visitorSessions.expiresAt, now));
    await tx.delete(s.rateLimits).where(lte(s.rateLimits.resetAt, now));
    await tx.delete(s.authMagicLinks).where(lte(s.authMagicLinks.expiresAt, now));
    await tx.delete(s.emailOutbox).where(lte(s.emailOutbox.createdAt, new Date(+now - 30 * 86400_000)));
    await tx.delete(s.emailWebhookEvents).where(lte(s.emailWebhookEvents.createdAt, new Date(+now - 30 * 86400_000)));
    await tx.delete(s.commercialInquiries).where(lte(s.commercialInquiries.createdAt, new Date(+now - 180 * 86400_000)));
    await tx.delete(s.analyticsEvents).where(lte(s.analyticsEvents.createdAt, new Date(+now - numericEnv("ANALYTICS_RETENTION_DAYS", 90, 365) * 86400_000)));
    await tx.update(s.kioskDevices).set({ activationHash: null, activationExpiresAt: null }).where(lte(s.kioskDevices.activationExpiresAt, now));
    await tx.update(s.kioskDevices).set({ keyHash: null, status: "expired" }).where(and(eq(s.kioskDevices.status, "active"), lte(s.kioskDevices.credentialExpiresAt, now)));
  });
}
