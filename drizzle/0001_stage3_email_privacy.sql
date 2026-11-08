CREATE TABLE "commercial_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"payload_encrypted" text NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lead_type" text DEFAULT 'b2b_installation' NOT NULL,
	"locale" text NOT NULL,
	"consent_version" text NOT NULL,
	CONSTRAINT "commercial_inquiries_reference_unique" UNIQUE("reference"),
	CONSTRAINT "commercial_inquiries_idempotency_key_unique" UNIQUE("idempotency_key")
);

--> statement-breakpoint
CREATE TABLE "email_suppressions" (
	"email_hash" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "email_webhook_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "email_outbox" ALTER COLUMN "recipient_ref" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "email_outbox" ALTER COLUMN "delivery_state" SET DEFAULT 'queued';
--> statement-breakpoint
UPDATE "email_outbox" SET "delivery_state" = 'failed', "last_error" = 'legacy_unrendered_message' WHERE "delivery_state" = 'pending';
--> statement-breakpoint
ALTER TABLE "auth_magic_links" ADD COLUMN "email_encrypted" text;
--> statement-breakpoint
ALTER TABLE "auth_magic_links" ADD COLUMN "email_lookup_hash" text;
--> statement-breakpoint
ALTER TABLE "auth_magic_links" ADD COLUMN "source_session_id" uuid;
--> statement-breakpoint
ALTER TABLE "auth_magic_links" ADD COLUMN "locale" text DEFAULT 'es' NOT NULL;
--> statement-breakpoint
ALTER TABLE "auth_magic_links" ADD COLUMN "marketing_requested" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "email_outbox" ADD COLUMN "recipient_hash" text;
--> statement-breakpoint
ALTER TABLE "email_outbox" ADD COLUMN "recipient_encrypted" text;
--> statement-breakpoint
ALTER TABLE "email_outbox" ADD COLUMN "rendered_encrypted" text;
--> statement-breakpoint
ALTER TABLE "email_outbox" ADD COLUMN "category" text DEFAULT 'transactional' NOT NULL;
--> statement-breakpoint
ALTER TABLE "email_outbox" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "email_outbox" ADD COLUMN "inquiry_id" uuid;
--> statement-breakpoint
ALTER TABLE "visitor_accounts" ADD COLUMN "last_active_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "auth_magic_links" ADD CONSTRAINT "auth_magic_links_source_session_id_visitor_sessions_id_fk" FOREIGN KEY ("source_session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_inquiry_id_commercial_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."commercial_inquiries"("id") ON DELETE cascade ON UPDATE no action;
