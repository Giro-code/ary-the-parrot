CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);

--> statement-breakpoint
CREATE TABLE "staff_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "staff_sessions_token_hash_unique" UNIQUE("token_hash")
);

--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "kiosk_device_id" uuid;
--> statement-breakpoint
ALTER TABLE "auth_magic_links" ADD COLUMN "organization_id" uuid;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "demo" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "provider_leads" ADD COLUMN "payload_encrypted" text;
--> statement-breakpoint
ALTER TABLE "provider_leads" ADD COLUMN "idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD COLUMN "origin_kiosk_id" uuid;
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_visitor_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."visitor_accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_user_id_visitor_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "staff_session_expiry" ON "staff_sessions" USING btree ("expires_at");
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_kiosk_device_id_kiosk_devices_id_fk" FOREIGN KEY ("kiosk_device_id") REFERENCES "public"."kiosk_devices"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_magic_links" ADD CONSTRAINT "auth_magic_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_origin_kiosk_id_kiosk_devices_id_fk" FOREIGN KEY ("origin_kiosk_id") REFERENCES "public"."kiosk_devices"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "provider_leads" ADD CONSTRAINT "provider_leads_idempotency_key_unique" UNIQUE("idempotency_key");
