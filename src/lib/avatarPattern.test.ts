import { describe, expect, it } from "vitest"
import { getAvatarPatternClass } from "./avatarPattern"

describe("getAvatarPatternClass", () => {
	it("returns the same pattern for the same identity, regardless of casing or surrounding whitespace", () => {
		expect(getAvatarPatternClass("  KIKI.SOL ")).toBe(getAvatarPatternClass("kiki.sol"))
	})

	it("uses the generic pattern only when no identity is available", () => {
		expect(getAvatarPatternClass()).toBe(getAvatarPatternClass(""))
	})

	it("spreads identities across the available pattern set", () => {
		const patterns = new Set(
			["aurelia", "basil", "coral", "dahlia", "ember", "flora", "gale", "halcyon"].map(getAvatarPatternClass),
		)

		expect(patterns.size).toBeGreaterThan(1)
	})
})
