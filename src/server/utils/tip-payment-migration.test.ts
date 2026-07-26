import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
	new URL("../../../drizzle/0055_light_ezekiel.sql", import.meta.url),
	"utf8",
);

describe("tip payment integrity migration", () => {
	it("clears legacy collisions before creating the partial unique signature index", () => {
		const collisionCleanup = migration.indexOf("legacy_signature_collision");
		const uniqueIndex = migration.indexOf("tips_tx_signature_unique_idx");

		expect(collisionCleanup).toBeGreaterThan(-1);
		expect(uniqueIndex).toBeGreaterThan(collisionCleanup);
		expect(migration).toContain('WHERE "tips"."tx_signature" is not null');
	});

	it("fails unverifiable legacy pending rows and enforces complete v1 snapshots", () => {
		expect(migration).toContain("legacy_unverifiable");
		expect(migration).toContain("tips_version_one_snapshot_check");
		expect(migration).toContain('"prepared_message_hash" IS NOT NULL');
	});
});