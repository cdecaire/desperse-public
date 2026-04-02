/**
 * Client-side Echoes devnet RPC URL helper
 *
 * Points Echoes client-side Solana calls to a separate devnet proxy
 * at /api/v1/echoes-rpc so the devnet API key never leaves the server.
 * Completely isolated from the mainnet proxy at /api/v1/rpc.
 */
export function getEchoesClientRpcUrl(): string {
	const origin =
		typeof window !== "undefined"
			? window.location.origin
			: process.env.PUBLIC_APP_ORIGIN;
	return origin ? `${origin}/api/v1/echoes-rpc` : "/api/v1/echoes-rpc";
}
