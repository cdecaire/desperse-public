import { describe, expect, it } from "vitest"
import { profileQueryKeys } from "./profile-query"

describe("profileQueryKeys", () => {
	it("separates public and viewer-aware profile data", () => {
		expect(profileQueryKeys.public("alice")).not.toEqual(profileQueryKeys.viewer("alice", "viewer-1"))
	})

	it("keeps both scopes under the existing profile invalidation prefix", () => {
		expect(profileQueryKeys.public("alice").slice(0, 2)).toEqual(profileQueryKeys.all("alice"))
		expect(profileQueryKeys.viewer("alice", "viewer-1").slice(0, 2)).toEqual(profileQueryKeys.all("alice"))
	})
})
