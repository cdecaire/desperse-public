/**
 * verify-referrals — HTTP smoke test for the referral route + OG-render layer
 * against a locally running dev server (default http://localhost:3000).
 *
 * Purpose: cover the gap unit tests can't — that the OG image pipeline actually
 * renders real bytes and that the invite routes are wired/reachable in the
 * running app. The behavioural logic (attribution cookies, safe/unsafe `next`,
 * custom-code validation/cooldown/retirement) is already covered by:
 *   - server/routes/i/[code].get.test.ts
 *   - server/middleware/referral-welcome-attribution.test.ts
 *   - src/server/utils/referrals.test.ts   (custom-code lifecycle)
 *   - src/lib/referrals.test.ts, src/lib/og-meta.test.ts
 * so this script does NOT re-trigger the valid-code write paths (which would
 * insert attribution sessions into the shared prod DB). It only exercises
 * read-only reads and dead-code paths (which create no rows).
 *
 * Usage:
 *   pnpm verify:referrals <yourInviteCode>       # slug you supply; used for OG render only (read-only)
 *   pnpm verify:referrals                          # skips the valid-code OG render check
 *   BASE_URL=http://localhost:3000 pnpm verify:referrals <code>
 *
 * Exit codes: 0 = all checks passed/skipped, 1 = a check failed or server unreachable.
 */

const BASE = process.env.BASE_URL || "http://localhost:3000"
const validCode = process.argv[2] || null

const COOKIE = "desperse_referral_attribution"
const GARBAGE = "definitely-not-a-real-invite-code-000"

let failures = 0
const pass = (name: string, detail = "") => console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`)
const fail = (name: string, detail: string) => {
	failures++
	console.error(`  ✖ ${name} — ${detail}`)
}
const skip = (name: string, why: string) => console.log(`  ○ ${name} — SKIPPED (${why})`)

function hasAttributionCookie(res: Response): boolean {
	// Node's undici exposes getSetCookie(); fall back to the raw header.
	const jar =
		typeof (res.headers as { getSetCookie?: () => string[] }).getSetCookie === "function"
			? (res.headers as { getSetCookie: () => string[] }).getSetCookie()
			: [res.headers.get("set-cookie") || ""]
	return jar.some((c) => c.startsWith(`${COOKIE}=`) && !/=;|=deleted/i.test(c))
}

async function main() {
	console.log(`[verify:referrals] target: ${BASE}\n`)

	// Reachability guard.
	try {
		await fetch(`${BASE}/api/og/default`, { redirect: "manual" })
	} catch {
		console.error(`✖ Dev server not reachable at ${BASE}. Start it with \`pnpm dev\`.`)
		process.exit(1)
	}

	// ── OG image pipeline (read-only) ──────────────────────────────────────────
	console.log("OG image pipeline (#60):")

	{
		const res = await fetch(`${BASE}/api/og/invite/${GARBAGE}`, { redirect: "manual" })
		const loc = res.headers.get("location") || ""
		if (res.status === 302 && loc.endsWith("/api/og/default")) pass("invalid code → 302 to /api/og/default")
		else fail("invalid code fallback", `expected 302→/api/og/default, got ${res.status} loc=${loc}`)
	}

	{
		const res = await fetch(`${BASE}/api/og/default`, { redirect: "manual" })
		const ct = res.headers.get("content-type") || ""
		const buf = new Uint8Array(await res.arrayBuffer())
		if (res.status === 200 && ct.startsWith("image/") && buf.byteLength > 2000)
			pass("default OG renders", `${ct}, ${buf.byteLength}B`)
		else fail("default OG render", `status=${res.status} ct=${ct} size=${buf.byteLength}`)
	}

	if (validCode) {
		const res = await fetch(`${BASE}/api/og/invite/${encodeURIComponent(validCode)}`, { redirect: "manual" })
		if (res.status === 302) {
			fail("valid code OG render", `code "${validCode}" did not resolve to a referrer (302→fallback). Pass a real invite code/slug.`)
		} else {
			const ct = res.headers.get("content-type") || ""
			const buf = new Uint8Array(await res.arrayBuffer())
			if (res.status === 200 && ct.startsWith("image/") && buf.byteLength > 5000)
				pass("valid code → rendered invite OG", `${ct}, ${buf.byteLength}B (identity + first-post art)`)
			else fail("valid code OG render", `status=${res.status} ct=${ct} size=${buf.byteLength}`)
		}
	} else {
		skip("valid code OG render", "no invite code arg — run `pnpm verify:referrals <yourSlug>`")
	}

	// ── Invite route wiring — dead-code paths only (no prod writes) ─────────────
	console.log("\nInvite route wiring (#57), dead-code paths (no DB writes):")

	{
		const res = await fetch(`${BASE}/i/${GARBAGE}`, { redirect: "manual" })
		const loc = res.headers.get("location") || ""
		const okRedirect = res.status === 302 && loc.includes("/welcome") && loc.includes("invalid=1")
		const noCookie = !hasAttributionCookie(res)
		if (okRedirect && noCookie) pass("/i/<dead> → 302 welcome?invalid=1, no attribution cookie")
		else fail("/i/<dead> handling", `status=${res.status} loc=${loc} cookieSet=${!noCookie}`)
	}

	{
		// Dead code with a post deep link: should still forward to the post,
		// attribution-free (per the handler's "clicked through for the art" path).
		const res = await fetch(`${BASE}/i/${GARBAGE}?next=/post/abc123`, { redirect: "manual" })
		const loc = res.headers.get("location") || ""
		if (res.status === 302 && loc === "/post/abc123" && !hasAttributionCookie(res))
			pass("/i/<dead>?next=/post/abc123 → forwards to post, no cookie")
		else fail("/i/<dead> safe next", `status=${res.status} loc=${loc} cookieSet=${hasAttributionCookie(res)}`)
	}

	{
		// Open-redirect guard: unsafe next must NOT be honoured. For a dead code
		// with an unsafe next, the handler drops next and lands on welcome?invalid=1.
		const res = await fetch(`${BASE}/i/${GARBAGE}?next=https://evil.example.com`, { redirect: "manual" })
		const loc = res.headers.get("location") || ""
		if (res.status === 302 && !loc.includes("evil.example.com") && loc.includes("/welcome"))
			pass("/i/<dead>?next=<external> → open-redirect rejected")
		else fail("open-redirect guard", `status=${res.status} loc=${loc}`)
	}

	{
		// Middleware (#57): a dead code hitting /welcome?invalid=1 directly must
		// never mint attribution.
		const res = await fetch(`${BASE}/i/${GARBAGE}/welcome?invalid=1`, { redirect: "manual" })
		if (!hasAttributionCookie(res)) pass("direct /i/<dead>/welcome?invalid=1 → no attribution cookie")
		else fail("welcome middleware dead-code", "attribution cookie was set for a dead code")
	}

	// ── Summary ────────────────────────────────────────────────────────────────
	console.log(
		"\nNote: valid-code attribution writes (cookie set, safe/unsafe next with a REAL code, custom-code" +
			"\nlifecycle) are intentionally NOT exercised here — they insert rows into the shared prod DB and are" +
			"\nalready covered by the route + utils unit tests. Run those with:" +
			"\n  pnpm vitest run server/routes/i src/server/utils/referrals.test.ts src/lib/referrals.test.ts",
	)

	if (failures) {
		console.error(`\n[verify:referrals] ✖ ${failures} check(s) failed.`)
		process.exit(1)
	}
	console.log("\n[verify:referrals] ✓ All checks passed.")
}

main().catch((err) => {
	console.error("[verify:referrals] Error:", err instanceof Error ? err.message : err)
	process.exit(1)
})
