import { createContext, useContext, type ReactNode } from "react"
import { createElement } from "react"
import { useSearch } from "@tanstack/react-router"
import { useEchoesMintInfo, type PfpMintStatus } from "./useEchoesMintInfo"

export type MintPhase = "premint" | "minting" | "postmint"

/**
 * Map server CM phase → client UI phase.
 * Any active mint phase → minting (breach window active)
 * closed + sold out → postmint (archive resolved)
 * closed + future start date → premint (countdown)
 * null / not-configured (loading / unauthenticated / no CM) → premint
 */
function cmPhaseToUiPhase(cmPhase: string | null, mintInfo?: PfpMintStatus | null): MintPhase {
	if (!cmPhase || cmPhase === "not-configured") return "premint"
	if (cmPhase === "closed") {
		// If there's a future public start date and nothing minted yet, it's premint (countdown)
		if (mintInfo?.windows?.publicStart) {
			const publicStart = new Date(mintInfo.windows.publicStart).getTime()
			if (publicStart > Date.now() && mintInfo.supply.minted === 0) {
				return "premint"
			}
		}
		return "postmint"
	}
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
	const phase = overridePhase ?? cmPhaseToUiPhase(mintInfo?.phase ?? null, mintInfo)

	return createElement(MintPhaseContext.Provider, { value: phase }, children)
}
