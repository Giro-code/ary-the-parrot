import { and, eq, gt, lte, desc, inArray } from "drizzle-orm";
import type { Database } from "../../db/client.ts";
import * as s from "../../db/schema.ts";
import { decrypt, emailHash, encrypt, normalizeEmail } from "../crypto.ts";
import { hasConsent } from "../consents.ts";
import { renderEmail, type RenderedEmail, type Template, type TemplateData } from "./templates.ts";
import { DryRunEmailProvider, EmailDeliveryError, isDryRun, ResendEmailProvider, type EmailProvider } from "./providers.ts";
import type { Locale } from "../../i18n/index.ts";
import { baseUrl } from "../config.ts";
export type Category = "transactional" | "confirmation" | "reminder" | "marketing";
export async function marketingAllowed(db: Database, visitorId: string | null, now = new Date()) {
  if (process.env.FEATURE_ENABLE_MARKETING !== "true" || !visitorId || !await hasConsent(db, visitorId, "marketing_email")) return false;
  const [sub] = await db.select().from(s.emailSubscriptions).where(and(eq(s.emailSubscriptions.visitorId, visitorId), eq(s.emailSubscriptions.purpose, "marketing_email"), eq(s.emailSubscriptions.status, "active")));
  if (!sub?.doubleOptInAt) return false;
  const interval = sub.frequency === "weekly" ? 7 : 30;
  return !sub.lastSentAt || +sub.lastSentAt + interval * 86400_000 <= +now;
}
export async function enqueueEmail(db: Database, args: { template: Template; locale: Locale; to: string; idempotencyKey: string; visitorId?: string; inquiryId?: string; category?: Category; data?: TemplateData; scheduledAt?: Date }) {
  const category = args.category || "transactional", hash = emailHash(args.to);
  const [suppressed] = await db.select().from(s.emailSuppressions).where(eq(s.emailSuppressions.emailHash, hash));
  if (suppressed) return null;
  if (["marketing", "reminder"].includes(category) && !await marketingAllowed(db, args.visitorId || null)) return null;
  if (args.template === "marketing_confirmation" && process.env.FEATURE_ENABLE_MARKETING !== "true") return null;
  let data = args.data;
  if (["marketing", "reminder"].includes(category) && args.visitorId) {
    const [sub] = await db.select().from(s.emailSubscriptions).where(and(eq(s.emailSubscriptions.visitorId, args.visitorId), eq(s.emailSubscriptions.purpose, "marketing_email")));
    if (!sub?.unsubscribeTokenHash) return null;
    data = { ...data, unsubscribeUrl: `${baseUrl()}/api/email/unsubscribe?token=${decrypt(sub.addressRef)}`, preferencesUrl: `${baseUrl()}/cuenta/privacidad` };
  }
  const rendered = renderEmail(args.template, args.locale, data);
  const [row] = await db.insert(s.emailOutbox).values({ template: args.template, category, recipientRef: args.visitorId, inquiryId: args.inquiryId, recipientHash: hash, recipientEncrypted: encrypt(normalizeEmail(args.to)), renderedEncrypted: encrypt(JSON.stringify(rendered)), idempotencyKey: args.idempotencyKey, scheduledAt: args.scheduledAt || new Date(), deliveryState: "queued" }).onConflictDoNothing({ target: s.emailOutbox.idempotencyKey }).returning();
  // Demo messages become visible immediately, but ALWAYS pass through the same outbox and policy gate.
  if (row && !immediateTemplates.includes(row.template) && isDryRun() && +row.scheduledAt <= Date.now()) await deliverRow(db, row, new DryRunEmailProvider(db));
  return row?.id || null;
}
type Row = typeof s.emailOutbox.$inferSelect;
async function deliverRow(db: Database, row: Row, provider: EmailProvider) {
  const [suppressed] = row.recipientHash ? await db.select().from(s.emailSuppressions).where(eq(s.emailSuppressions.emailHash, row.recipientHash)) : [];
  const marketing = row.category === "marketing" || row.category === "reminder";
  const denied = suppressed || (marketing && !await marketingAllowed(db, row.recipientRef)) || (row.template === "marketing_confirmation" && (process.env.FEATURE_ENABLE_MARKETING !== "true" || !row.recipientRef || !await hasConsent(db, row.recipientRef, "marketing_email")));
  if (denied || !row.recipientEncrypted || !row.renderedEncrypted) {
    await db.update(s.emailOutbox).set({ deliveryState: "failed", lastError: suppressed ? "recipient_suppressed" : "policy_blocked", renderedEncrypted: null }).where(eq(s.emailOutbox.id, row.id)); return;
  }
  try {
    const rendered = JSON.parse(decrypt(row.renderedEncrypted)) as RenderedEmail;
    const message = { ...rendered, id: row.id, to: decrypt(row.recipientEncrypted), idempotencyKey: row.idempotencyKey };
    const method = row.category === "marketing" ? "sendMarketing" : row.category === "reminder" ? "sendReminder" : row.category === "confirmation" ? "sendConfirmation" : "sendTransactional";
    const result = await provider[method](message);
    await db.update(s.emailOutbox).set({ ...result, sentAt: result.deliveryState === "dry_run" ? null : new Date(), lastError: null }).where(eq(s.emailOutbox.id, row.id));
    if (marketing && row.recipientRef) await db.update(s.emailSubscriptions).set({ lastSentAt: new Date() }).where(eq(s.emailSubscriptions.visitorId, row.recipientRef));
  } catch (error) {
    const retries = row.retries + 1, terminal = retries >= 5 || (error instanceof EmailDeliveryError && !error.retryable);
    // Do not persist provider bodies, email addresses, keys, URLs or arbitrary exception messages.
    await db.update(s.emailOutbox).set({ retries, lastError: error instanceof EmailDeliveryError ? error.safeCode : "delivery_error", deliveryState: terminal ? "failed" : "queued", scheduledAt: new Date(Date.now() + 30_000 * 2 ** retries) }).where(eq(s.emailOutbox.id, row.id));
  }
}
const immediateTemplates = ["recovery", "commercial_receipt", "commercial_admin", "marketing_confirmation"];
export async function dispatchEmails(db: Database, provider?: EmailProvider, ids?: string[]) {
  if (ids && !ids.length) return { processed: 0 };
  let processed = 0;
  // A row lock spans policy evaluation and the send. Concurrent workers skip locked rows.
  // All retry calls reuse the same provider idempotency key (retry horizon <24h).
  for (let i = 0; i < 10; i++) {
    const found = await db.transaction(async tx => {
      const [row] = await tx.select().from(s.emailOutbox).where(and(eq(s.emailOutbox.deliveryState, "queued"), lte(s.emailOutbox.scheduledAt, new Date()), ids ? inArray(s.emailOutbox.id, ids) : undefined)).orderBy(s.emailOutbox.scheduledAt).limit(1).for("update", { skipLocked: true });
      if (!row) return false;
      // Recovery/DOI links must not be sent after their 15-minute lifetime.
      if (["recovery", "marketing_confirmation"].includes(row.template) && +row.createdAt + 900_000 <= Date.now()) {
        await tx.update(s.emailOutbox).set({ deliveryState: "failed", lastError: "link_expired", renderedEncrypted: null }).where(eq(s.emailOutbox.id, row.id));
      } else await deliverRow(tx, row, provider || (isDryRun() ? new DryRunEmailProvider(tx) : new ResendEmailProvider()));
      return true;
    });
    if (!found) break; processed++;
  }
  return { processed };
}
// Call only after commit. Requests dispatch their own rows, at most two concurrently.
// The HTTP provider aborts at 10 s. Locks and provider keys also protect cron races.
export async function dispatchImmediate(db: Database, ids: (string | null)[]) {
  await Promise.allSettled(ids.filter((id): id is string => !!id).map(id => dispatchEmails(db, undefined, [id])));
}
export async function getDryRunMessages(db: Database) {
  if (process.env.NODE_ENV === "production") return [];
  const rows = await db.select().from(s.emailOutbox).where(and(eq(s.emailOutbox.deliveryState, "dry_run"), gt(s.emailOutbox.createdAt, new Date(Date.now() - 86400_000)))).orderBy(desc(s.emailOutbox.createdAt)).limit(30);
  return rows.filter(row => row.renderedEncrypted && row.recipientEncrypted).map(row => ({ id: row.id, template: row.template, createdAt: row.createdAt.toISOString(), to: decrypt(row.recipientEncrypted!), ...JSON.parse(decrypt(row.renderedEncrypted!)) as RenderedEmail }));
}
export async function cancelPending(db: Database, hash: string) {
  await db.update(s.emailOutbox).set({ deliveryState: "failed", lastError: "recipient_suppressed", renderedEncrypted: null }).where(and(eq(s.emailOutbox.recipientHash, hash), eq(s.emailOutbox.deliveryState, "queued")));
}
