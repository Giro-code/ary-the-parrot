import { eq } from "drizzle-orm";
import type { Database } from "../../db/client.ts";
import { emailOutbox } from "../../db/schema.ts";
import type { RenderedEmail } from "./templates.ts";
export interface EmailMessage extends RenderedEmail { id: string; to: string; idempotencyKey: string }
export interface EmailResult { deliveryState: "dry_run" | "accepted_by_provider"; providerMessageId?: string }
export interface EmailProvider {
  sendTransactional(message: EmailMessage): Promise<EmailResult>;
  sendConfirmation(message: EmailMessage): Promise<EmailResult>;
  sendReminder(message: EmailMessage): Promise<EmailResult>;
  sendMarketing(message: EmailMessage): Promise<EmailResult>;
}
export const isDryRun = () => process.env.EMAIL_DRY_RUN !== "false" || !process.env.RESEND_API_KEY?.trim() || !process.env.EMAIL_FROM?.trim();
abstract class BaseProvider implements EmailProvider {
  abstract send(message: EmailMessage): Promise<EmailResult>;
  sendTransactional(message: EmailMessage) { return this.send(message); }
  sendConfirmation(message: EmailMessage) { return this.send(message); }
  sendReminder(message: EmailMessage) { return this.send(message); }
  sendMarketing(message: EmailMessage) { return this.send(message); }
}
export class DryRunEmailProvider extends BaseProvider {
  private db: Database;
  constructor(db: Database) { super(); this.db = db; }
  async send(message: EmailMessage): Promise<EmailResult> {
    // The rendered message is already encrypted in this outbox row. No network or file side effect.
    await this.db.update(emailOutbox).set({ deliveryState: "dry_run" }).where(eq(emailOutbox.id, message.id));
    return { deliveryState: "dry_run" };
  }
}
export class EmailDeliveryError extends Error {
  readonly safeCode: string;
  readonly retryable: boolean;
  constructor(safeCode: string, retryable = true) { super(safeCode); this.safeCode = safeCode; this.retryable = retryable; }
}
export class ResendEmailProvider extends BaseProvider {
  async send(message: EmailMessage): Promise<EmailResult> {
    if (isDryRun()) throw new EmailDeliveryError("email_configuration_changed", false);
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(10_000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": message.idempotencyKey }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [message.to], subject: message.subject, html: message.html, text: message.text, headers: message.headers, ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}) }) });
    } catch { throw new EmailDeliveryError("provider_network_error"); }
    if (!response.ok) throw new EmailDeliveryError(`provider_http_${response.status}`, response.status === 429 || response.status >= 500);
    const result = await response.json().catch(() => null);
    if (!result || typeof result.id !== "string") throw new EmailDeliveryError("provider_invalid_response");
    return { deliveryState: "accepted_by_provider", providerMessageId: result.id };
  }
}
