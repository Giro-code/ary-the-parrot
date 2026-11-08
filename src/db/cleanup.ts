import { and, eq, isNull, lte } from "drizzle-orm";
import type { Database } from "./client.ts";
import * as s from "./schema.ts";
import { endSession } from "../server/service.ts";
import { numericEnv } from "../server/config.ts";
export async function cleanupDatabase(db: Database, now = new Date()) {
  const expired = await db.select().from(s.qrHandoffs).where(and(lte(s.qrHandoffs.expiresAt, now), isNull(s.qrHandoffs.usedAt), isNull(s.qrHandoffs.invalidatedAt)));
  for (const qr of expired) await endSession(db, qr.sourceSessionId, now);
  return db.transaction(async tx => {
    await tx.delete(s.chatMessages).where(lte(s.chatMessages.retentionUntil, now));
    await tx.delete(s.qrHandoffs).where(lte(s.qrHandoffs.expiresAt, now));
    await tx.delete(s.visitorSessions).where(lte(s.visitorSessions.expiresAt, now));
    await tx.delete(s.rateLimits).where(lte(s.rateLimits.resetAt, now));
    await tx.delete(s.analyticsEvents).where(lte(s.analyticsEvents.createdAt, new Date(+now - numericEnv("ANALYTICS_RETENTION_DAYS", 90, 365) * 86400_000)));
    await tx.update(s.kioskDevices).set({ activationHash: null, activationExpiresAt: null }).where(lte(s.kioskDevices.activationExpiresAt, now));
    await tx.update(s.kioskDevices).set({ keyHash: null, status: "expired" }).where(and(eq(s.kioskDevices.status, "active"), lte(s.kioskDevices.credentialExpiresAt, now)));
  });
}
