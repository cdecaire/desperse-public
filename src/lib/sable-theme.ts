import {
	DEFAULT_THEME_ID,
	SABLE_THEME_STORAGE_KEY,
	applySableTheme,
	isThemeId,
	themeManifests,
	type ThemeId,
} from "@cdecaire/sable/themes"

export type SableDesignTheme = ThemeId

export const sableDesignThemes = themeManifests
export const defaultSableDesignTheme = DEFAULT_THEME_ID as SableDesignTheme
export const sableDesignThemeStorageKey = SABLE_THEME_STORAGE_KEY
export const sableDesignThemeChangeEvent = "desperse:sable-theme-change"

const NATIVE_APP_UA_PATTERN = /Desperse-(iOS|Android)/i

export function isSableDesignThemeAvailable(): boolean {
	if (typeof window === "undefined" || typeof navigator === "undefined") {
		return false
	}

	const maybeNativeWindow = window as Window & {
		ReactNativeWebView?: unknown
	}

	return (
		!NATIVE_APP_UA_PATTERN.test(navigator.userAgent || "") &&
		!maybeNativeWindow.ReactNativeWebView
	)
}

export function readStoredSableDesignTheme(): SableDesignTheme {
	if (typeof window === "undefined") {
		return defaultSableDesignTheme
	}

	try {
		const stored = window.localStorage.getItem(sableDesignThemeStorageKey)
		return stored && isThemeId(stored) ? stored : defaultSableDesignTheme
	} catch {
		return defaultSableDesignTheme
	}
}

export function applySableDesignTheme(themeId: SableDesignTheme): void {
	if (typeof document === "undefined") return
	applySableTheme(themeId, document.documentElement)
}

export function storeSableDesignTheme(themeId: SableDesignTheme): void {
	applySableDesignTheme(themeId)

	if (typeof window === "undefined") return

	try {
		window.localStorage.setItem(sableDesignThemeStorageKey, themeId)
	} catch {
		// Ignore storage failures. The selected theme still applies in-memory.
	}

	window.dispatchEvent(
		new CustomEvent<SableDesignTheme>(sableDesignThemeChangeEvent, {
			detail: themeId,
		}),
	)
}
