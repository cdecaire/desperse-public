CREATE TABLE "download_nonces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nonce" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"wallet" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "download_nonces_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
CREATE TABLE "download_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"wallet" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "download_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "post_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"storage_provider" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer,
	"sha256" text,
	"download_name" text,
	"is_gated" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "is_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "hidden_at" timestamp;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "hidden_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "hidden_reason" text;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "deleted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "delete_reason" text;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "report_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "download_nonces" ADD CONSTRAINT "download_nonces_asset_id_post_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."post_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_tokens" ADD CONSTRAINT "download_tokens_asset_id_post_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."post_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_assets" ADD CONSTRAINT "post_assets_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "download_nonces_nonce_idx" ON "download_nonces" USING btree ("nonce");--> statement-breakpoint
CREATE INDEX "download_nonces_asset_id_idx" ON "download_nonces" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "download_nonces_expires_at_idx" ON "download_nonces" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "download_tokens_token_idx" ON "download_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "download_tokens_asset_id_idx" ON "download_tokens" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "download_tokens_expires_at_idx" ON "download_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "post_assets_post_id_idx" ON "post_assets" USING btree ("post_id");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;