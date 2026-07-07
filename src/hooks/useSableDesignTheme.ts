import { useCallback, useEffect, useState } from "react"
import {
	defaultSableDesignTheme,
	isSableDesignThemeAvailable,
	readStoredSableDesignTheme,
	sableDesignThemeChangeEvent,
	sableDesignThemeStorageKey,
	sableDesignThemes,
	storeSableDesignTheme,
	type SableDesignTheme,
} from "@/lib/sable-theme"

export function useSableDesignTheme() {
	const [themeId, setThemeIdState] = useState<SableDesignTheme>(
		defaultSableDesignTheme,
	)
	const [isAvailable, setIsAvailable] = useState(false)

	useEffect(() => {
		const available = isSableDesignThemeAvailable()
		setIsAvailable(available)

		if (!available) {
			setThemeIdState(defaultSableDesignTheme)
			return
		}

		const storedTheme = readStoredSableDesignTheme()
		setThemeIdState(storedTheme)
		storeSableDesignTheme(storedTheme)
	}, [])

	useEffect(() => {
		if (typeof window === "undefined") return

		const handleStorage = (event: StorageEvent) => {
			if (event.key !== sableDesignThemeStorageKey) return
			const nextTheme = readStoredSableDesignTheme()
			setThemeIdState(nextTheme)
			storeSableDesignTheme(nextTheme)
		}

		window.addEventListener("storage", handleStorage)
		return () => window.removeEventListener("storage", handleStorage)
	}, [])

	useEffect(() => {
		if (typeof window === "undefined") return

		const handleThemeChange = (event: Event) => {
			const nextTheme = (event as CustomEvent<SableDesignTheme>).detail
			setThemeIdState(nextTheme || readStoredSableDesignTheme())
		}

		window.addEventListener(sableDesignThemeChangeEvent, handleThemeChange)
		return () =>
			window.removeEventListener(sableDesignThemeChangeEvent, handleThemeChange)
	}, [])

	const setThemeId = useCallback((nextThemeId: SableDesignTheme) => {
		setThemeIdState(nextThemeId)
		storeSableDesignTheme(nextThemeId)
	}, [])

	return {
		isAvailable,
		themeId,
		themes: sableDesignThemes,
		setThemeId,
	}
}
