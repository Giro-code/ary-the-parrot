CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" uuid,
	"aggregation_key" text,
	"event_type" text NOT NULL,
	"cultural_item_id" uuid,
	"provider_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);

--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"organization_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);

--> statement-breakpoint
CREATE TABLE "auth_magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_magic_links_token_hash_unique" UNIQUE("token_hash")
);

--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"visitor_id" uuid,
	"role" text NOT NULL,
	"encrypted_payload" text,
	"provenance" jsonb,
	"retention_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" uuid,
	"session_id" uuid,
	"purpose" text NOT NULL,
	"granted" boolean NOT NULL,
	"notice_version" text NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"source" text NOT NULL,
	"proof" jsonb,
	"locale" text NOT NULL
);

--> statement-breakpoint
CREATE TABLE "cultural_bridges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" text NOT NULL,
	"cultural_item_id" uuid NOT NULL,
	"relation" text NOT NULL,
	"source_url" text NOT NULL,
	"source_checked_at" timestamp with time zone NOT NULL
);

--> statement-breakpoint
CREATE TABLE "cultural_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_key" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"validated_description" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"language" text NOT NULL,
	"country" text DEFAULT 'DO' NOT NULL,
	"region" text,
	"location" jsonb,
	"image_asset" text,
	"source_url" text,
	"license" text NOT NULL,
	"editor" text NOT NULL,
	"source_checked_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"status" text DEFAULT 'needs_source' NOT NULL,
	"demo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "published_has_source" CHECK ("cultural_items"."status" != 'published' or ("cultural_items"."source_url" is not null and "cultural_items"."source_checked_at" is not null))
);

--> statement-breakpoint
CREATE TABLE "deletion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"external_processors_notified_at" timestamp with time zone
);

--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template" text NOT NULL,
	"recipient_ref" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"provider_message_id" text,
	"delivery_state" text DEFAULT 'pending' NOT NULL,
	"retries" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"campaign_id" uuid,
	CONSTRAINT "email_outbox_idempotency_key_unique" UNIQUE("idempotency_key")
);

--> statement-breakpoint
CREATE TABLE "email_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" uuid NOT NULL,
	"address_ref" text NOT NULL,
	"purpose" text NOT NULL,
	"double_opt_in_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"frequency" text,
	"locale" text NOT NULL,
	"timezone" text,
	"last_sent_at" timestamp with time zone,
	"unsubscribe_token_hash" text,
	CONSTRAINT "email_subscriptions_unsubscribe_token_hash_unique" UNIQUE("unsubscribe_token_hash")
);

--> statement-breakpoint
CREATE TABLE "kiosk_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"location_label" text NOT NULL,
	"public_device_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" text,
	"activation_hash" text,
	"activation_expires_at" timestamp with time zone,
	"credential_expires_at" timestamp with time zone,
	"firmware_version" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kiosk_devices_public_device_id_unique" UNIQUE("public_device_id"),
	CONSTRAINT "kiosk_devices_key_hash_unique" UNIQUE("key_hash"),
	CONSTRAINT "kiosk_devices_activation_hash_unique" UNIQUE("activation_hash")
);

--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);

--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"title" text NOT NULL,
	"eligibility" text,
	"approved_status" text DEFAULT 'pending' NOT NULL,
	"categories" jsonb,
	"pricing_disclaimer" text,
	"source_url" text,
	"source_checked_at" timestamp with time zone,
	"sponsored" boolean DEFAULT false NOT NULL
);

--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "provider_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"visitor_id" uuid NOT NULL,
	"user_authorized_fields" jsonb NOT NULL,
	"purpose" text NOT NULL,
	"consent_record_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"audit_reference" text
);

--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"services" jsonb,
	"approved_status" text DEFAULT 'pending' NOT NULL
);

--> statement-breakpoint
CREATE TABLE "qr_handoffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_session_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"confirmation_code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"invalidated_at" timestamp with time zone,
	"consumed_by_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "qr_handoffs_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "handoff_attempts" CHECK ("qr_handoffs"."attempt_count" >= 0)
);

--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);

--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"user_id" uuid,
	"cultural_item_id" uuid,
	"offer_id" uuid,
	"rationale" text NOT NULL,
	"evidence_ids" jsonb NOT NULL,
	"mode" text DEFAULT 'rules' NOT NULL,
	"status" text DEFAULT 'shown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recommendations_owner" CHECK ("recommendations"."session_id" is not null or "recommendations"."user_id" is not null)
);

--> statement-breakpoint
CREATE TABLE "saved_experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"visitor_id" uuid,
	"item_id" uuid NOT NULL,
	"state" text DEFAULT 'saved' NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_state" CHECK ("saved_experiences"."state" in ('saved','visited','removed')),
	CONSTRAINT "saved_owner_required" CHECK ("saved_experiences"."session_id" is not null or "saved_experiences"."visitor_id" is not null)
);

--> statement-breakpoint
CREATE TABLE "visitor_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_encrypted" text,
	"email_lookup_hash" text,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deletion_requested_at" timestamp with time zone,
	CONSTRAINT "visitor_accounts_email_lookup_hash_unique" UNIQUE("email_lookup_hash")
);

--> statement-breakpoint
CREATE TABLE "visitor_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"visitor_id" uuid,
	"locale" text NOT NULL,
	"country_declared" text,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"desired_trip_duration" text,
	"accessibility_preferences" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visitor_preferences_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "preferences_owner" CHECK ("visitor_preferences"."session_id" is not null or "visitor_preferences"."visitor_id" is not null)
);

--> statement-breakpoint
CREATE TABLE "visitor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"kiosk_device_id" uuid,
	"locale" text DEFAULT 'es' NOT NULL,
	"country_declared" text,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_user_id" uuid,
	"retention_class" text DEFAULT 'anonymous_operational' NOT NULL,
	CONSTRAINT "visitor_sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "session_locale" CHECK ("visitor_sessions"."locale" in ('es','en'))
);

--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_cultural_item_id_cultural_items_id_fk" FOREIGN KEY ("cultural_item_id") REFERENCES "public"."cultural_items"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_visitor_accounts_id_fk" FOREIGN KEY ("actor") REFERENCES "public"."visitor_accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_magic_links" ADD CONSTRAINT "auth_magic_links_user_id_visitor_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_visitor_id_visitor_accounts_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_visitor_id_visitor_accounts_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cultural_bridges" ADD CONSTRAINT "cultural_bridges_cultural_item_id_cultural_items_id_fk" FOREIGN KEY ("cultural_item_id") REFERENCES "public"."cultural_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "deletion_jobs" ADD CONSTRAINT "deletion_jobs_subject_id_visitor_accounts_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_recipient_ref_visitor_accounts_id_fk" FOREIGN KEY ("recipient_ref") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "email_subscriptions" ADD CONSTRAINT "email_subscriptions_visitor_id_visitor_accounts_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "kiosk_devices" ADD CONSTRAINT "kiosk_devices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_visitor_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "provider_leads" ADD CONSTRAINT "provider_leads_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "provider_leads" ADD CONSTRAINT "provider_leads_visitor_id_visitor_accounts_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "provider_leads" ADD CONSTRAINT "provider_leads_consent_record_id_consent_records_id_fk" FOREIGN KEY ("consent_record_id") REFERENCES "public"."consent_records"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "qr_handoffs" ADD CONSTRAINT "qr_handoffs_source_session_id_visitor_sessions_id_fk" FOREIGN KEY ("source_session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "qr_handoffs" ADD CONSTRAINT "qr_handoffs_consumed_by_session_id_visitor_sessions_id_fk" FOREIGN KEY ("consumed_by_session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_visitor_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_cultural_item_id_cultural_items_id_fk" FOREIGN KEY ("cultural_item_id") REFERENCES "public"."cultural_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "saved_experiences" ADD CONSTRAINT "saved_experiences_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "saved_experiences" ADD CONSTRAINT "saved_experiences_visitor_id_visitor_accounts_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "saved_experiences" ADD CONSTRAINT "saved_experiences_item_id_cultural_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."cultural_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "visitor_preferences" ADD CONSTRAINT "visitor_preferences_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "visitor_preferences" ADD CONSTRAINT "visitor_preferences_visitor_id_visitor_accounts_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_kiosk_device_id_kiosk_devices_id_fk" FOREIGN KEY ("kiosk_device_id") REFERENCES "public"."kiosk_devices"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_owner_user_id_visitor_accounts_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "analytics_org_date" ON "analytics_events" USING btree ("organization_id","created_at");
--> statement-breakpoint
CREATE INDEX "analytics_event_date" ON "analytics_events" USING btree ("event_type","created_at");
--> statement-breakpoint
CREATE INDEX "audit_org_date" ON "audit_logs" USING btree ("organization_id","created_at");
--> statement-breakpoint
CREATE INDEX "magic_expiry" ON "auth_magic_links" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "chat_session" ON "chat_messages" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "chat_retention" ON "chat_messages" USING btree ("retention_until");
--> statement-breakpoint
CREATE INDEX "consent_visitor_purpose" ON "consent_records" USING btree ("visitor_id","purpose");
--> statement-breakpoint
CREATE INDEX "consent_session" ON "consent_records" USING btree ("session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "bridge_country_item" ON "cultural_bridges" USING btree ("country_code","cultural_item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "content_language" ON "cultural_items" USING btree ("content_key","language");
--> statement-breakpoint
CREATE INDEX "content_published_language" ON "cultural_items" USING btree ("status","language");
--> statement-breakpoint
CREATE INDEX "outbox_pending" ON "email_outbox" USING btree ("delivery_state","scheduled_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_visitor_purpose" ON "email_subscriptions" USING btree ("visitor_id","purpose");
--> statement-breakpoint
CREATE UNIQUE INDEX "membership_owner_org" ON "memberships" USING btree ("user_id","organization_id");
--> statement-breakpoint
CREATE INDEX "membership_org" ON "memberships" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "offers_provider" ON "offers" USING btree ("provider_id");
--> statement-breakpoint
CREATE INDEX "leads_provider" ON "provider_leads" USING btree ("provider_id");
--> statement-breakpoint
CREATE INDEX "provider_org" ON "providers" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "handoff_session" ON "qr_handoffs" USING btree ("source_session_id");
--> statement-breakpoint
CREATE INDEX "handoff_expiry" ON "qr_handoffs" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "rate_limit_expiry" ON "rate_limits" USING btree ("reset_at");
--> statement-breakpoint
CREATE INDEX "recommendations_session" ON "recommendations" USING btree ("session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "saved_session_item" ON "saved_experiences" USING btree ("session_id","item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "saved_visitor_item" ON "saved_experiences" USING btree ("visitor_id","item_id");
--> statement-breakpoint
CREATE INDEX "saved_owner" ON "saved_experiences" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "sessions_expiry" ON "visitor_sessions" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "sessions_kiosk" ON "visitor_sessions" USING btree ("kiosk_device_id");
--> statement-breakpoint
CREATE INDEX "sessions_owner" ON "visitor_sessions" USING btree ("owner_user_id");
