import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createElement } from "react"
import { useSearch } from "@tanstack/react-router"

export type MintPhase = "premint" | "minting" | "postmint"

/** Configure these dates as mint schedule is finalized */
const PHASE_DATES = {
	mintStart: new Date("2026-05-01T00:00:00Z"),
	mintEnd: new Date("2026-05-08T00:00:00Z"),
}

function getPhaseFromDate(): MintPhase {
	const now = Date.now()
	if (now < PHASE_DATES.mintStart.getTime()) return "premint"
	if (now < PHASE_DATES.mintEnd.getTime()) return "minting"
	return "postmint"
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

	const [phase, setPhase] = useState<MintPhase>(overridePhase ?? getPhaseFromDate())

	useEffect(() => {
		if (overridePhase) {
			setPhase(overridePhase)
			return
		}
		// Re-check phase every minute
		setPhase(getPhaseFromDate())
		const interval = setInterval(() => setPhase(getPhaseFromDate()), 60_000)
		return () => clearInterval(interval)
	}, [overridePhase])

	return createElement(MintPhaseContext.Provider, { value: phase }, children)
}
