import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../db/client.ts";
import * as s from "../db/schema.ts";
import { normalizeEmail, encrypt, privateHash, requirePrivacyKeys } from "./crypto.ts";
import { AppError } from "./errors.ts";
import { rateLimit } from "./service.ts";
import { enqueueEmail } from "./email/outbox.ts";
import { isDryRun } from "./email/providers.ts";
import { noticeVersion } from "./consents.ts";
export const inquirySchema = z.object({ name: z.string().trim().min(1).max(100), org: z.string().trim().min(1).max(150), email: z.string().trim().max(200).pipe(z.email()), place: z.enum(["Aeropuerto o aerolínea", "Restaurante", "Hotel", "Espacio cultural o turístico", "Otro espacio"]), message: z.string().trim().min(10).max(2000), locale: z.enum(["es", "en"]), consentVersion: z.literal(noticeVersion), website: z.string().max(500).default("") }).strict();
export async function createInquiry(db: Database, data: z.infer<typeof inquirySchema>, key: string, client: string) {
  requirePrivacyKeys();
  await rateLimit(db, client, 5, new Date(), 3600_000);
  if (data.website) throw new AppError("invalid_inquiry", 400);
  if (!/^[\w-]{16,100}$/.test(key)) throw new AppError("idempotency_key_required", 400);
  const clean = { ...data, email: normalizeEmail(data.email) }, requestHash = privateHash(JSON.stringify(clean));
  return db.transaction(async tx => {
    const [created] = await tx.insert(s.commercialInquiries).values({ reference: `ARY-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`, idempotencyKey: key, requestHash, payloadEncrypted: encrypt(JSON.stringify(clean)), source: "landing_solicitar", status: "received", locale: data.locale, consentVersion: data.consentVersion }).onConflictDoNothing({ target: s.commercialInquiries.idempotencyKey }).returning();
    const row = created || (await tx.select().from(s.commercialInquiries).where(eq(s.commercialInquiries.idempotencyKey, key)))[0];
    if (row.requestHash !== requestHash) throw new AppError("idempotency_conflict", 409);
    if (created) {
      await tx.insert(s.auditLogs).values({ action: "commercial_inquiry_received", targetType: "commercial_inquiry", targetId: row.id, metadata: { reference: row.reference, source: row.source } });
      await enqueueEmail(tx, { template: "commercial_receipt", locale: data.locale, to: clean.email, inquiryId: row.id, idempotencyKey: `inquiry-receipt:${row.id}`, data: { reference: row.reference } });
      const admin = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
      if (admin && z.email().safeParse(admin).success) await enqueueEmail(tx, { template: "commercial_admin", locale: data.locale, to: admin, inquiryId: row.id, idempotencyKey: `inquiry-admin:${row.id}`, data: { reference: row.reference } });
    }
    return { reference: row.reference, status: row.status, storageMode: process.env.DATABASE_URL?.trim() ? "database" : "local_test", emailState: isDryRun() ? "dry_run" : "queued" };
  });
}
