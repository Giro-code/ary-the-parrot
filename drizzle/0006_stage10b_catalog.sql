ALTER TABLE "cultural_items" ADD COLUMN "aliases" jsonb NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE "cultural_items" ADD COLUMN "facts" jsonb NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE "cultural_items" ADD COLUMN "gallery" jsonb NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE "cultural_items" ADD COLUMN "sources" jsonb NOT NULL DEFAULT '[]';
--> statement-breakpoint
ALTER TABLE "cultural_items" ADD COLUMN "origin" text NOT NULL DEFAULT 'seed';
--> statement-breakpoint
ALTER TABLE "cultural_items" ADD COLUMN "hidden_at" timestamptz;
