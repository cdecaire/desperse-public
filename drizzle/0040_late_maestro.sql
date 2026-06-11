CREATE TABLE "asset_downloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_downloads" ADD CONSTRAINT "asset_downloads_asset_id_post_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."post_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_downloads" ADD CONSTRAINT "asset_downloads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_downloads_asset_user_unique_idx" ON "asset_downloads" USING btree ("asset_id","user_id");--> statement-breakpoint
CREATE INDEX "asset_downloads_asset_id_idx" ON "asset_downloads" USING btree ("asset_id");