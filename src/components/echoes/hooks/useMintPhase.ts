import { createContext, useContext, type ReactNode } from "react"
import { createElement } from "react"
import { useSearch } from "@tanstack/react-router"
import { useEchoesMintInfo } from "./useEchoesMintInfo"

export type MintPhase = "premint" | "minting" | "postmint"

/**
 * Map server CM phase → client UI phase.
 * Any active mint phase → minting (breach window active)
 * closed → postmint (archive resolved)
 * null / not-configured (loading / unauthenticated / no CM) → premint
 */
function cmPhaseToUiPhase(cmPhase: string | null): MintPhase {
	if (!cmPhase || cmPhase === "not-configured") return "premint"
	if (cmPhase === "closed") return "postmint"
	return "minting"
}

const MintPhaseContext = createContext<MintPhase>("premint")

export function useMintPhase(): MintPhase {
	return useContext(MintPhaseContext)
}

export function MintPhaseProvider({ children }: { children: ReactNode }) {
	// Allow dev override via ?phase= URL param
	let devOverride: string | undefined
	try {
		const search = useSearch({ strict: false }) as Record<string, unknown>
		devOverride = search?.phase as string | undefined
	} catch {
		// useSearch may fail outside router context during SSR
	}

	const validPhases: MintPhase[] = ["premint", "minting", "postmint"]
	const overridePhase = devOverride && validPhases.includes(devOverride as MintPhase)
		? (devOverride as MintPhase)
		: undefined

	// Derive phase from server CM status
	const { data: mintInfo } = useEchoesMintInfo()
	const phase = overridePhase ?? cmPhaseToUiPhase(mintInfo?.phase ?? null)

	return createElement(MintPhaseContext.Provider, { value: phase }, children)
}
