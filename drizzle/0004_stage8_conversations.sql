CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" uuid NOT NULL,
	"encrypted_payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retention_until" timestamp with time zone NOT NULL
);

--> statement-breakpoint
CREATE TABLE "saved_places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"visitor_id" uuid,
	"encrypted_payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_owner" CHECK ("saved_places"."session_id" is not null or "saved_places"."visitor_id" is not null)
);

--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD COLUMN "pending_email_hash" text;
--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD COLUMN "conversation_id" uuid;
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_visitor_id_visitor_accounts_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_session_id_visitor_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."visitor_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_visitor_id_visitor_accounts_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "conversations_owner" ON "conversations" USING btree ("visitor_id");
--> statement-breakpoint
CREATE INDEX "conversations_retention" ON "conversations" USING btree ("retention_until");
--> statement-breakpoint
CREATE INDEX "places_session" ON "saved_places" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX "places_visitor" ON "saved_places" USING btree ("visitor_id");
--> statement-breakpoint
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;
