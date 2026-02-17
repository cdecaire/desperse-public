ALTER TABLE "collections" ADD COLUMN "ip_address" text;--> statement-breakpoint
CREATE INDEX "collections_ip_address_idx" ON "collections" USING btree ("ip_address");