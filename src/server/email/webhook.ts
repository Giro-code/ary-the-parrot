import { createHmac } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../../db/client.ts";
import * as s from "../../db/schema.ts";
import { AppError } from "../errors.ts";
import { constantEqual, emailHash } from "../crypto.ts";
import { cancelPending } from "./outbox.ts";
export function verifyWebhook(raw: string, headers: Headers, now = Date.now()) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) throw new AppError("webhook_not_configured", 503);
  const id = headers.get("svix-id"), timestamp = headers.get("svix-timestamp"), signature = headers.get("svix-signature");
  if (!id || id.length > 256 || !timestamp || !/^\d+$/.test(timestamp) || !signature || Math.abs(now / 1000 - Number(timestamp)) > 300) throw new AppError("invalid_webhook_signature", 400);
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  if (key.length < 16) throw new AppError("webhook_not_configured", 503);
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${raw}`).digest("base64");
  if (!signature.split(" ").some(part => part.startsWith("v1,") && constantEqual(part.slice(3), expected))) throw new AppError("invalid_webhook_signature", 400);
  return id;
}
const eventSchema = z.object({ type: z.string(), data: z.object({ email_id: z.string().min(1), to: z.array(z.email()).optional() }) });
export async function handleWebhook(db: Database, raw: string, headers: Headers) {
  const id = verifyWebhook(raw, headers);
  let parsed: unknown; try { parsed = JSON.parse(raw); } catch { throw new AppError("invalid_body", 400); }
  const event = eventSchema.safeParse(parsed); if (!event.success) throw new AppError("invalid_body", 400);
  await db.transaction(async tx => {
    const [fresh] = await tx.insert(s.emailWebhookEvents).values({ eventId: id }).onConflictDoNothing().returning();
    if (!fresh) return;
    const state = ({ "email.delivered": "delivered", "email.bounced": "bounced", "email.complained": "complained", "email.failed": "failed" } as Record<string, string>)[event.data.type];
    if (!state) return;
    const [row] = await tx.select().from(s.emailOutbox).where(eq(s.emailOutbox.providerMessageId, event.data.data.email_id));
    // Never downgrade complained/bounced on a delayed delivered webhook.
    if (row && (state === "complained" || (state === "bounced" && row.deliveryState !== "complained") || !["bounced", "complained", "delivered"].includes(row.deliveryState))) {
      await tx.update(s.emailOutbox).set({ deliveryState: state }).where(eq(s.emailOutbox.id, row.id));
    }
    if (["bounced", "complained"].includes(state)) {
      const hashes = new Set([...(event.data.data.to || []).map(emailHash), ...(row?.recipientHash ? [row.recipientHash] : [])]);
      for (const hash of hashes) {
        await tx.insert(s.emailSuppressions).values({ emailHash: hash, reason: state }).onConflictDoUpdate({ target: s.emailSuppressions.emailHash, set: { reason: state } });
        await cancelPending(tx, hash);
        const owners = await tx.select({ id: s.visitorAccounts.id }).from(s.visitorAccounts).where(eq(s.visitorAccounts.emailLookupHash, hash));
        if (owners.length) await tx.update(s.emailSubscriptions).set({ status: "suppressed" }).where(and(inArray(s.emailSubscriptions.visitorId, owners.map(x => x.id)), eq(s.emailSubscriptions.purpose, "marketing_email")));
      }
    }
  });
  return { received: true };
}
