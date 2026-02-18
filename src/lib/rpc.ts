/**
 * Client-side RPC URL helper
 *
 * Points all client-side Solana JSON-RPC calls to our server proxy
 * at /api/v1/rpc so the Helius API key never leaves the server.
 */
export function getClientRpcUrl(): string {
	const origin =
		typeof window !== "undefined"
			? window.location.origin
			: process.env.PUBLIC_APP_ORIGIN;
	return origin ? `${origin}/api/v1/rpc` : "/api/v1/rpc";
}
