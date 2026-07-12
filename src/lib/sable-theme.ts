import {
	DEFAULT_THEME_ID,
	SABLE_THEME_STORAGE_KEY,
	applySableTheme,
	getThemeManifest,
	isThemeId,
	themeManifests,
	type ThemeId,
} from "@cdecaire/sable/themes"

export type SableDesignTheme = ThemeId

export const sableDesignThemes = themeManifests
export const defaultSableDesignTheme = DEFAULT_THEME_ID as SableDesignTheme
export const sableDesignThemeStorageKey = SABLE_THEME_STORAGE_KEY
export const sableDesignThemeChangeEvent = "desperse:sable-theme-change"

/**
 * Google Fonts css2 specs for the primary faces the bundled Sable themes use.
 * Only the first family in each manifest stack needs loading — the rest of the
 * chain is system fallbacks (guaranteed loadable since Sable 0.30). A family
 * missing from this map simply isn't fetched and the theme renders on its
 * fallback chain, so an unmapped new theme degrades instead of breaking.
 */
const GOOGLE_FONT_SPECS: Record<string, string> = {
	// Loaded globally via styles.css (Desperse theme) — listed for completeness.
	Figtree: "Figtree:wght@300;400;500;600;700;800;900",
	"DM Mono": "DM+Mono:wght@300;400;500",
	// Theme-specific faces, loaded on demand when the theme is applied.
	Inter: "Inter:wght@300..700",
	"Martian Mono": "Martian+Mono:wght@300..700",
	"Instrument Sans": "Instrument+Sans:wght@400..700",
	"Geist Mono": "Geist+Mono:wght@300..700",
	Sora: "Sora:wght@400..800",
	"IBM Plex Mono": "IBM+Plex+Mono:wght@400;500;600",
	"Instrument Serif": "Instrument+Serif",
}

/** Already in the base bundle via the styles.css @import — never re-fetched. */
const GLOBALLY_LOADED_FAMILIES = new Set(["Figtree", "DM Mono"])

/** First family in a CSS font stack, unquoted: '"Geist Mono", ui-monospace, …' → 'Geist Mono'. */
export function primaryFontFamily(stack: string): string {
	return (stack.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "")
}

/** The Google Fonts css2 URL for a theme's faces, or null when nothing needs loading. */
export function sableThemeFontsUrl(themeId: SableDesignTheme): string | null {
	const manifest = getThemeManifest(themeId)
	const families = [manifest.fonts.sans, manifest.fonts.mono, manifest.fonts.display]
		.filter((stack): stack is string => Boolean(stack))
		.map(primaryFontFamily)
	const specs = [...new Set(families)]
		.filter((family) => !GLOBALLY_LOADED_FAMILIES.has(family))
		.map((family) => GOOGLE_FONT_SPECS[family])
		.filter((spec): spec is string => Boolean(spec))
	if (specs.length === 0) return null
	return `https://fonts.googleapis.com/css2?${specs.map((spec) => `family=${spec}`).join("&")}&display=swap`
}

/**
 * Injects the theme's Google Fonts stylesheet once per theme. Links are left
 * in place when switching away — the fonts are cached and re-selecting the
 * theme is then flash-free.
 */
function ensureSableThemeFonts(themeId: SableDesignTheme): void {
	if (typeof document === "undefined") return
	const href = sableThemeFontsUrl(themeId)
	if (!href) return

	const linkId = `sable-theme-fonts-${themeId}`
	if (document.getElementById(linkId)) return

	const link = document.createElement("link")
	link.id = linkId
	link.rel = "stylesheet"
	link.href = href
	document.head.appendChild(link)
}

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
	ensureSableThemeFonts(themeId)
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
