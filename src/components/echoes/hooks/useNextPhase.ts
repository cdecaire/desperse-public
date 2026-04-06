import type { PfpMintStatus } from "./useEchoesMintInfo"

const PHASE_LABELS: { key: keyof PfpMintStatus["windows"]; label: string }[] = [
	{ key: "ogFreeStart", label: "OG BREACH WINDOW OPENS" },
	{ key: "ogDiscountStart", label: "OG DISCOUNT OPENS" },
	{ key: "wlStart", label: "WHITELIST OPENS" },
	{ key: "publicStart", label: "PUBLIC MINT OPENS" },
]

export function getNextPhase(windows?: PfpMintStatus["windows"] | null): { label: string; date: string } | null {
	if (!windows) return null
	const now = Date.now()
	for (const { key, label } of PHASE_LABELS) {
		const date = windows[key]
		if (date && new Date(date).getTime() > now) {
			return { label, date }
		}
	}
	return null
}
