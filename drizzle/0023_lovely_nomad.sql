ALTER TYPE "public"."content_type_enum" ADD VALUE 'dm_thread';--> statement-breakpoint
ALTER TYPE "public"."content_type_enum" ADD VALUE 'dm_message';--> statement-breakpoint
CREATE TABLE "dm_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dm_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a_id" uuid NOT NULL,
	"user_b_id" uuid NOT NULL,
	"context_creator_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"last_message_at" timestamp,
	"last_message_preview" text,
	"user_a_last_read_at" timestamp,
	"user_b_last_read_at" timestamp,
	"user_a_archived" boolean DEFAULT false NOT NULL,
	"user_b_archived" boolean DEFAULT false NOT NULL,
	"user_a_blocked" boolean DEFAULT false NOT NULL,
	"user_b_blocked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_thread_id_dm_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."dm_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_threads" ADD CONSTRAINT "dm_threads_user_a_id_users_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_threads" ADD CONSTRAINT "dm_threads_user_b_id_users_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_threads" ADD CONSTRAINT "dm_threads_context_creator_id_users_id_fk" FOREIGN KEY ("context_creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_threads" ADD CONSTRAINT "dm_threads_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dm_messages_thread_id_idx" ON "dm_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "dm_messages_sender_id_idx" ON "dm_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "dm_messages_thread_created_at_idx" ON "dm_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dm_threads_user_pair_unique_idx" ON "dm_threads" USING btree ("user_a_id","user_b_id");--> statement-breakpoint
CREATE INDEX "dm_threads_user_a_last_message_idx" ON "dm_threads" USING btree ("user_a_id","last_message_at");--> statement-breakpoint
CREATE INDEX "dm_threads_user_b_last_message_idx" ON "dm_threads" USING btree ("user_b_id","last_message_at");--> statement-breakpoint
CREATE INDEX "dm_threads_created_by_user_id_idx" ON "dm_threads" USING btree ("created_by_user_id");