export const explorerOptions = ["orb", "solscan", "solana-explorer", "metaplex"] as const
export type ExplorerOption = (typeof explorerOptions)[number]

export const themeOptions = ["light", "dark", "system"] as const
export type ThemeOption = (typeof themeOptions)[number]

export const designThemeOptions = ["desperse", "dossier", "cove"] as const
export type DesignThemeOption = (typeof designThemeOptions)[number]

export function isDesignThemeOption(value: unknown): value is DesignThemeOption {
	return (
		typeof value === "string" &&
		designThemeOptions.includes(value as DesignThemeOption)
	)
}

export type UserPreferencesJson = {
	theme?: ThemeOption
	designTheme?: DesignThemeOption
	explorer?: ExplorerOption
	notifications?: {
		follows?: boolean
		likes?: boolean
		comments?: boolean
		collects?: boolean
		purchases?: boolean
		mentions?: boolean
		messages?: boolean
	}
	messaging?: {
		dmEnabled?: boolean
		allowBuyers?: boolean
		allowCollectors?: boolean
		collectorMinCount?: number
		allowTippers?: boolean
		tipMinAmount?: number
	}
	privacy?: {
		leaderboardParticipation?: boolean
	}
}

export const defaultPreferences: UserPreferencesJson = {
	theme: "system",
	designTheme: "desperse",
	explorer: "solana-explorer",
	notifications: {
		follows: true,
		likes: true,
		comments: true,
		collects: true,
		purchases: true,
		mentions: true,
		messages: true,
	},
	messaging: {
		dmEnabled: true,
		allowBuyers: true,
		allowCollectors: true,
		collectorMinCount: 3,
		allowTippers: true,
		tipMinAmount: 50,
	},
	privacy: {
		leaderboardParticipation: true,
	},
}

export function mergePreferencesWithDefaults(
	prefs: UserPreferencesJson | null | undefined,
): UserPreferencesJson {
	const stored = prefs || {}

	return {
		theme: stored.theme ?? defaultPreferences.theme,
		designTheme: stored.designTheme ?? defaultPreferences.designTheme,
		explorer: stored.explorer ?? defaultPreferences.explorer,
		notifications: {
			follows: stored.notifications?.follows ?? defaultPreferences.notifications?.follows,
			likes: stored.notifications?.likes ?? defaultPreferences.notifications?.likes,
			comments: stored.notifications?.comments ?? defaultPreferences.notifications?.comments,
			collects: stored.notifications?.collects ?? defaultPreferences.notifications?.collects,
			purchases:
				stored.notifications?.purchases ?? defaultPreferences.notifications?.purchases,
			mentions:
				stored.notifications?.mentions ?? defaultPreferences.notifications?.mentions,
			messages:
				stored.notifications?.messages ?? defaultPreferences.notifications?.messages,
		},
		messaging: {
			dmEnabled: stored.messaging?.dmEnabled ?? defaultPreferences.messaging?.dmEnabled,
			allowBuyers:
				stored.messaging?.allowBuyers ?? defaultPreferences.messaging?.allowBuyers,
			allowCollectors:
				stored.messaging?.allowCollectors ?? defaultPreferences.messaging?.allowCollectors,
			collectorMinCount:
				stored.messaging?.collectorMinCount ??
				defaultPreferences.messaging?.collectorMinCount,
			allowTippers:
				stored.messaging?.allowTippers ?? defaultPreferences.messaging?.allowTippers,
			tipMinAmount:
				stored.messaging?.tipMinAmount ?? defaultPreferences.messaging?.tipMinAmount,
		},
		privacy: {
			leaderboardParticipation:
				stored.privacy?.leaderboardParticipation ??
				defaultPreferences.privacy?.leaderboardParticipation,
		},
	}
}

export function getExplorerUrl(
	type: "tx" | "address" | "token",
	value: string,
	explorer: ExplorerOption = "solana-explorer",
): string {
	switch (explorer) {
		case "orb":
			if (type === "tx") return `https://orbmarkets.io/tx/${value}`
			if (type === "address") return `https://orbmarkets.io/address/${value}`
			if (type === "token") return `https://orbmarkets.io/token/${value}`
			break
		case "solscan":
			if (type === "tx") return `https://solscan.io/tx/${value}`
			if (type === "address") return `https://solscan.io/account/${value}`
			if (type === "token") return `https://solscan.io/token/${value}`
			break
		case "solana-explorer":
			if (type === "tx") return `https://explorer.solana.com/tx/${value}`
			if (type === "address") return `https://explorer.solana.com/address/${value}`
			if (type === "token") return `https://explorer.solana.com/address/${value}`
			break
		case "metaplex":
			if (type === "tx") return `https://explorer.solana.com/tx/${value}`
			if (type === "address") return `https://core.metaplex.com/explorer/${value}`
			if (type === "token") return `https://core.metaplex.com/explorer/${value}`
			break
	}

	if (type === "address") return `https://solscan.io/account/${value}`
	return `https://solscan.io/${type}/${value}`
}
