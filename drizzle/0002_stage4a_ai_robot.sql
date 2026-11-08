CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"model" text NOT NULL,
	"mode" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer NOT NULL,
	"error_code" text
);

--> statement-breakpoint
CREATE TABLE "robot_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"state" text NOT NULL,
	"gesture" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "maintenance_only" CHECK ("robot_commands"."state" = 'maintenance' and "robot_commands"."gesture" in ('rest','stop'))
);

--> statement-breakpoint
CREATE TABLE "robot_events" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"device_id" uuid NOT NULL,
	"state" text NOT NULL,
	"hardware" text NOT NULL,
	"payload_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "robot_commands" ADD CONSTRAINT "robot_commands_device_id_kiosk_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."kiosk_devices"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "robot_events" ADD CONSTRAINT "robot_events_device_id_kiosk_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."kiosk_devices"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ai_usage_date" ON "ai_usage" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "robot_commands_device" ON "robot_commands" USING btree ("device_id");
--> statement-breakpoint
CREATE INDEX "robot_events_device_date" ON "robot_events" USING btree ("device_id","created_at");
