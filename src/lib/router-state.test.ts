import { describe, expect, it } from "vitest"
import { getCommittedPathname, hasUncommittedNavigation } from "./router-state"

describe("getCommittedPathname", () => {
	it("keeps the rendered route while a destination is still pending", () => {
		expect(
			getCommittedPathname({
				location: { pathname: "/post/123" },
				matches: [{ pathname: "/explore" }],
				resolvedLocation: { pathname: "/explore" },
			}),
		).toBe("/explore")
	})

	it("uses the newly rendered match before resolvedLocation catches up", () => {
		expect(
			getCommittedPathname({
				location: { pathname: "/" },
				matches: [{ pathname: "/" }],
				resolvedLocation: { pathname: "/explore" },
			}),
		).toBe("/")
	})

	it("uses the current location during initial router setup", () => {
		expect(
			getCommittedPathname({
				location: { pathname: "/" },
			}),
		).toBe("/")
	})
})

describe("hasUncommittedNavigation", () => {
	it("tracks URL changes only until the destination commits", () => {
		expect(
			hasUncommittedNavigation({
				location: { pathname: "/profile/alice", href: "/profile/alice" },
				resolvedLocation: { pathname: "/explore", href: "/explore" },
			}),
		).toBe(true)

		expect(
			hasUncommittedNavigation({
				location: { pathname: "/profile/alice", href: "/profile/alice" },
				resolvedLocation: { pathname: "/profile/alice", href: "/profile/alice" },
			}),
		).toBe(false)
	})
})
