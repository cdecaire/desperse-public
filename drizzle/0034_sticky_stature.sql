ALTER TYPE "public"."notification_type_enum" ADD VALUE 'content_hidden';--> statement-breakpoint
ALTER TYPE "public"."notification_type_enum" ADD VALUE 'content_deleted';--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "metadata" jsonb DEFAULT 'null'::jsonb;