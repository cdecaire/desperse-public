/**
 * EchoesGate — Login gate for Echoes pages.
 * Requires Privy authentication. Access code verification is handled
 * by EchoesBootScreen's terminal auth phase.
 */

import { AuthGuard } from "@/components/shared/AuthGuard"

/**
 * Echoes gate: login required (Privy auth).
 * Access code is verified inside the boot screen terminal.
 */
export function EchoesGate({ children }: { children: React.ReactNode }) {
	return (
		<AuthGuard>
			{children}
		</AuthGuard>
	)
}
