/**
 * EchoesGate — Access gate for Echoes pages.
 * Password protection is handled by EchoesBootScreen's terminal auth phase.
 * No login required — unauthenticated visitors can browse freely.
 */

export function EchoesGate({ children }: { children: React.ReactNode }) {
	return <>{children}</>
}
