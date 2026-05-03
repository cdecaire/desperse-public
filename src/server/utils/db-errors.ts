/**
 * Drizzle 2.x wraps Postgres errors in DrizzleQueryError, exposing the
 * original PostgresError on `.cause`. Detection helpers must look there,
 * not on the wrapper, since the wrapper's message is `"Failed query: ..."`
 * and its own `.code` is undefined.
 */

export function isUniqueViolation(err: unknown): boolean {
	if (!err || typeof err !== "object") return false
	const wrapped = err as { code?: string; message?: string; cause?: { code?: string; message?: string } }
	if (wrapped.code === "23505" || wrapped.cause?.code === "23505") return true
	const msg = (wrapped.message ?? "") + " " + (wrapped.cause?.message ?? "")
	return msg.includes("unique") || msg.includes("duplicate")
}
