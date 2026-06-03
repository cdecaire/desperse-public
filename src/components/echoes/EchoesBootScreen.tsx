/**
 * EchoesBootScreen — Terminal boot sequence preloader with integrated access gate.
 *
 * Flow: auth (terminal password) → boot (sequence + asset preload) → ready → tearout → done
 *
 * Actually preloads critical above-the-fold assets (images, fonts) during
 * the boot sequence and shows a progress bar tracking real load state.
 *
 * Respects prefers-reduced-motion: skips animation (still requires auth).
 * Dev: add ?boot to URL to force replay regardless of sessionStorage.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { verifyEchoesAccess } from "@/server/functions/echoes-access"
import {
	ECHO_PLACEHOLDER_MASC,
	ECHO_PLACEHOLDER_FEM,
	getRevealedImagesSeeded,
} from "@/data/echoes-images"

const SESSION_KEY = "echoes-boot-complete"
const ACCESS_STORAGE_KEY = "echoes-access-token"
const ACCESS_STORAGE_VERSION = "v1"

// ── Access code persistence (TEMPORARY — remove when gate is no longer needed) ──
// To remove: delete this section, TerminalAuthPrompt, the "checking"/"auth" phases
// in EchoesBootScreen, EchoesGate.tsx AuthGuard wrapper, and
// src/server/functions/echoes-access.ts. Start phase at "boot" directly.

function getStoredCode(): string | null {
	try {
		const stored = localStorage.getItem(ACCESS_STORAGE_KEY)
		if (!stored) return null
		const parsed = JSON.parse(stored)
		if (parsed?.version !== ACCESS_STORAGE_VERSION) return null
		return parsed.code ?? null
	} catch {
		return null
	}
}

function storeCode(code: string) {
	localStorage.setItem(
		ACCESS_STORAGE_KEY,
		JSON.stringify({ code, version: ACCESS_STORAGE_VERSION }),
	)
}

function clearStoredCode() {
	localStorage.removeItem(ACCESS_STORAGE_KEY)
}

// ── Boot sequence lines ──

type BootLine = {
	text: string
	delay: number
	style?: "system" | "warn" | "error" | "lore" | "signal" | "header" | "ascii"
	garbled?: boolean
	redacted?: boolean
}

const PROGRESS_BAR_LINE_INDEX = 7 // right after ASCII banner
const TEAROUT_BANDS = ["dots", "hlines", "grid", "diag", "hlines", "dots"] as const

const BOOT_SEQUENCE: BootLine[] = [
	// ── ASCII banner ──
	{ text: "  ██████╗ ███████╗██████╗ ██████╗ ███████╗", delay: 0, style: "ascii" },
	{ text: "  ██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝", delay: 40, style: "ascii" },
	{ text: "  ██║  ██║███████╗██████╔╝██████╔╝███████╗", delay: 40, style: "ascii" },
	{ text: "  ██║  ██║╚════██║██╔═══╝ ██╔══██╗╚════██║", delay: 40, style: "ascii" },
	{ text: "  ██████╔╝███████║██║     ██║  ██║███████║", delay: 40, style: "ascii" },
	{ text: "  ╚═════╝ ╚══════╝╚═╝     ╚═╝  ╚═╝╚══════╝", delay: 40, style: "ascii" },
	{ text: "", delay: 200 },
	// ── Progress bar inserted here dynamically (index 7) ──
	// ── BIOS sequence ──
	{ text: "BIOS v3.41.7 ╱╱ TESSERA DISTRICT N█DE", delay: 100, style: "system" },
	{ text: "MEM CHECK .......... 8192 MB OK", delay: 120, style: "system" },
	{ text: "STORAGE ............ FRAG▒ENTED", delay: 80, style: "warn" },
	{ text: "NET INTERFACE ...... SC▌NNING", delay: 100, style: "system" },
	{ text: "", delay: 200 },
	{ text: ">> MOUNTING SYRE REGISTRY INTERF▌CE", delay: 60, style: "system" },
	{ text: "   tessera.auth ........... CONNECTED", delay: 100, style: "system" },
	{ text: "   identi▋y.ledger ........ BYPASSED", delay: 80, style: "warn" },
	{ text: "   signal.filter .......... DIS▌BLED", delay: 60, style: "system" },
	{ text: "", delay: 300 },
	// ── Intercepted dead-channel broadcast ──
	{ text: "// DEAD-CHANNEL BROADCAST — SIPHON R▒LAY 9", delay: 100, style: "header" },
	{ text: "", delay: 150 },
	{
		text: "Syre Group licens▒d reality. Tessera became the op▌rating system.",
		delay: 80,
		style: "lore",
		garbled: true,
	},
	{
		text: "Identi▋y is not a right here. It is a service t▌er.",
		delay: 120,
		style: "lore",
		garbled: true,
	},
	{
		text: "Get tessera'd and you don't ex▌st. Five factions r▒main.",
		delay: 100,
		style: "lore",
		garbled: true,
	},
	{ text: "", delay: 200 },
	{
		text: "The Cascade sc▌ttered every identi▋y across the archiv▒.",
		delay: 80,
		style: "lore",
		garbled: true,
	},
	{
		text: "They are still in th▒re. Waiting to r▌solve.",
		delay: 100,
		style: "lore",
		garbled: true,
	},
	{ text: "", delay: 200 },
	{
		text: "[CLASSIFIED] ██████ 3E casc▌de event ██████ SYRE AUTH ██████",
		delay: 120,
		style: "lore",
		redacted: true,
	},
	{ text: "", delay: 400 },
	// ── Signal detection ──
	{ text: ">> ANOMAL▒US SIGNAL ON DEAD CHANNEL", delay: 60, style: "system" },
	{ text: ">> FREQU▌NCY: DSPRS-3E", delay: 80, style: "system" },
	{ text: ">> CARRI▌R COUNT: 4,444", delay: 80, style: "system" },
	{ text: "", delay: 300 },
	// ── Trace / awaiting instructions (no gap — TerminalCommandPrompt follows immediately) ──
	{ text: "TRACE DET▒CTED // SIGNAL P▌RSISTS", delay: 100, style: "signal" },
]

// Characters used for garble effect
const GLITCH_CHARS = "█▓▒░╔╗╚╝║═╬▐▌▄▀■□◊◆●○#@$%&?!<>/\\|{}[]~^"

function garbleText(original: string, progress: number): string {
	return original
		.split("")
		.map((char, i) => {
			if (char === " ") return " "
			const threshold = i / original.length
			if (progress > threshold) return char
			return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
		})
		.join("")
}

/** Check if ?boot is in the URL (dev convenience to force replay) */
function hasBootParam(): boolean {
	if (typeof window === "undefined") return false
	return new URLSearchParams(window.location.search).has("boot")
}

/** Check if ?auth is in the URL (dev convenience to force auth prompt) */
function hasAuthParam(): boolean {
	if (typeof window === "undefined") return false
	return new URLSearchParams(window.location.search).has("auth")
}

// ── Asset preloader ──

function useAssetPreload(active: boolean) {
	const [loaded, setLoaded] = useState(0)

	const assets = useMemo(() => {
		if (!active) return []
		// Hero shows placeholders before mint data loads — preload them
		const heroUrls = getRevealedImagesSeeded(5, 0, null).map((r) => r.src)
		const allUrls = new Set([ECHO_PLACEHOLDER_MASC, ECHO_PLACEHOLDER_FEM, ...heroUrls])
		return [...allUrls]
	}, [active])

	const totalAssets = assets.length > 0 ? assets.length + 1 : 0 // +1 for font

	useEffect(() => {
		if (!active || assets.length === 0) return

		let cancelled = false
		setLoaded(0)

		for (const url of assets) {
			const img = new Image()
			img.onload = () => { if (!cancelled) setLoaded((prev) => prev + 1) }
			img.onerror = () => { if (!cancelled) setLoaded((prev) => prev + 1) }
			img.src = url
		}

		if (document.fonts) {
			document.fonts
				.load('1em "KH Interference Trial"')
				.then(() => { if (!cancelled) setLoaded((prev) => prev + 1) })
				.catch(() => { if (!cancelled) setLoaded((prev) => prev + 1) })
		} else {
			if (!cancelled) setLoaded((prev) => prev + 1)
		}

		return () => { cancelled = true }
	}, [active, assets])

	return { assetsLoaded: Math.min(loaded, totalAssets), totalAssets }
}

// ── Inline terminal progress bar (tqdm-style) ──

const PROGRESS_BAR_WIDTH = 40

function TerminalProgressBar({ progress }: { progress: number }) {
	const filled = Math.round((progress / 100) * PROGRESS_BAR_WIDTH)
	const empty = PROGRESS_BAR_WIDTH - filled
	const bar = "█".repeat(filled) + "░".repeat(empty)
	const pct = String(progress).padStart(3, " ")

	return (
		<div className="echoes-boot-line echoes-boot-system" suppressHydrationWarning>
			ARCHIVE INIT: {pct}%|<span className="nx-text-primary-container">{bar}</span>|
		</div>
	)
}

// ── Terminal command prompt (ready phase) ──

function TerminalCommandPrompt({ onSubmit }: { onSubmit: () => void }) {
	const [input, setInput] = useState("")
	const inputRef = useRef<HTMLInputElement>(null)
	const promptRef = useRef<HTMLDivElement>(null)

	// Recapture focus when user clicks anywhere on the overlay
	useEffect(() => {
		inputRef.current?.focus()
		const handleClick = () => inputRef.current?.focus()
		const overlay = document.querySelector(".echoes-boot-overlay")
		overlay?.addEventListener("click", handleClick)
		return () => overlay?.removeEventListener("click", handleClick)
	}, [])

	// Scroll input into view when virtual keyboard opens
	const handleFocus = useCallback(() => {
		setTimeout(() => {
			promptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
		}, 300)
	}, [])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault()
				onSubmit()
			}
		},
		[onSubmit],
	)

	return (
		<div ref={promptRef} className="echoes-boot-enter-prompt">
			<div className="echoes-boot-line echoes-boot-signal">AWAITING INSTRUCTIONS</div>
			<div className="echoes-boot-cmd-line" onClick={() => inputRef.current?.focus()}>
				<span className="echoes-boot-cmd-prompt">&gt;</span>
				<span className="echoes-boot-cmd-input-display">{input}</span>
				<span className="echoes-boot-cursor echoes-boot-cursor-active">_</span>
				<input
					ref={inputRef}
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={handleFocus}
					className="echoes-boot-auth-input"
					aria-label="Terminal command"
					autoComplete="off"
					spellCheck={false}
				/>
			</div>
			<button
				type="button"
				onClick={onSubmit}
				className="echoes-boot-bypass"
			>
				[ BYPASS TERMINAL ]
			</button>
		</div>
	)
}

// ── Terminal password input ──

function TerminalAuthPrompt({
	onVerified,
}: { onVerified: () => void }) {
	const [code, setCode] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [verifying, setVerifying] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)
	const promptRef = useRef<HTMLDivElement>(null)

	// Auto-focus the hidden input
	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	// Scroll input into view when virtual keyboard opens
	const handleFocus = useCallback(() => {
		setTimeout(() => {
			promptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
		}, 300)
	}, [])

	const handleSubmit = useCallback(async () => {
		if (!code.trim() || verifying) return
		setVerifying(true)
		setError(null)

		try {
			const result = await verifyEchoesAccess({ data: { code: code.trim() } } as any)
			if (result.success) {
				storeCode(code.trim())
				onVerified()
			} else {
				setError(result.error ?? "ACCESS DENIED")
				setCode("")
				setVerifying(false)
			}
		} catch {
			setError("CONNECTION FAILED")
			setVerifying(false)
		}
	}, [code, verifying, onVerified])

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault()
				handleSubmit()
			}
		},
		[handleSubmit],
	)

	// Mask input as dots for terminal feel
	const maskedDisplay = code.replace(/./g, "•")

	return (
		<div ref={promptRef} className="mt-4">
			<div className="echoes-boot-line echoes-boot-system">
				{">> SYRE REGISTRY ACCE▒S REQUIRES AUTH▌RIZATION"}
			</div>
			<div className="h-4" />
			{error && (
				<>
					<div className="echoes-boot-line echoes-boot-error">
						{">> "}{error}
					</div>
					<div className="h-2" />
				</>
			)}
			<div className="echoes-boot-auth-prompt">
				<span className="echoes-boot-auth-label">ACCESS CODE: </span>
				<span className="echoes-boot-auth-value">
					{verifying ? "VERIFYING..." : maskedDisplay}
				</span>
				{!verifying && (
					<span className="echoes-boot-cursor echoes-boot-cursor-active">_</span>
				)}
				{/* Hidden real input for keyboard capture */}
				<input
					ref={inputRef}
					type="password"
					value={code}
					onChange={(e) => setCode(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={handleFocus}
					disabled={verifying}
					className="echoes-boot-auth-input"
					aria-label="Access code"
					autoComplete="off"
				/>
			</div>
			<div className="h-2" />
			<div className="echoes-boot-line" style={{ color: "rgba(204, 200, 194, 0.2)", fontSize: "0.6rem" }}>
				Type access code and press ENTER
			</div>
		</div>
	)
}

// ── Main component ──

type Phase = "checking" | "auth" | "boot" | "ready" | "tearout" | "done"

export function EchoesBootScreen({
	children,
}: { children: React.ReactNode }) {
	const [phase, setPhase] = useState<Phase>(() => {
		if (typeof window !== "undefined") {
			// ?auth forces the auth prompt (dev convenience)
			if (hasAuthParam()) {
				clearStoredCode()
				sessionStorage.removeItem(SESSION_KEY)
				return "auth"
			}
			if (hasBootParam()) return "checking"
			if (sessionStorage.getItem(SESSION_KEY)) {
				// Session boot done, but still need to verify access code is valid
				const cached = getStoredCode()
				if (cached) return "checking"
				return "auth"
			}
		}
		return "checking"
	})

	const [visibleLines, setVisibleLines] = useState<number>(0)
	const [garbleProgress, setGarbleProgress] = useState<
		Record<number, number>
	>({})
	const [sequenceDone, setSequenceDone] = useState(false)
	const [skipRequested, setSkipRequested] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	// Preload assets during boot + ready phases
	const isBooting = phase === "boot" || phase === "ready"
	const { assetsLoaded, totalAssets } = useAssetPreload(isBooting)
	const assetsReady = totalAssets > 0 && assetsLoaded >= totalAssets

	// Combined progress: 70% boot sequence + 30% asset loading
	const sequenceProgress = BOOT_SEQUENCE.length > 0 ? visibleLines / BOOT_SEQUENCE.length : 0
	const assetProgress = totalAssets > 0 ? Math.min(assetsLoaded / totalAssets, 1) : 1
	const combinedProgress = Math.min(Math.round((sequenceProgress * 0.7 + assetProgress * 0.3) * 100), 100)

	// Auto-scroll to bottom as lines appear
	const scrollToBottom = useCallback(() => {
		if (containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight
		}
	}, [])

	// ── Phase: checking — verify cached access code on mount ──
	useEffect(() => {
		if (phase !== "checking") return
		let cancelled = false

		const cachedCode = getStoredCode()
		if (!cachedCode) {
			setPhase("auth")
			return
		}

		verifyEchoesAccess({ data: { code: cachedCode } } as any)
			.then((result: { success: boolean }) => {
				if (cancelled) return
				if (result.success) {
					const skipBoot =
						window.matchMedia("(prefers-reduced-motion: reduce)").matches
					setPhase(skipBoot ? "done" : "boot")
				} else {
					clearStoredCode()
					setPhase("auth")
				}
			})
			.catch(() => {
				if (cancelled) return
				clearStoredCode()
				setPhase("auth")
			})

		return () => { cancelled = true }
	}, [phase])

	// ── Phase: boot — run the sequence ──
	useEffect(() => {
		if (phase !== "boot") return

		let cancelled = false
		let currentLine = 0

		function showNextLine() {
			if (cancelled || currentLine >= BOOT_SEQUENCE.length) {
				if (!cancelled) setSequenceDone(true)
				return
			}

			const line = BOOT_SEQUENCE[currentLine]
			const lineIndex = currentLine
			currentLine++
			setVisibleLines(currentLine)

			if (line.garbled) {
				let progress = 0
				const resolveSteps = 8
				const stepInterval = 50

				function animateGarble() {
					if (cancelled) return
					progress++
					setGarbleProgress((prev) => ({
						...prev,
						[lineIndex]: progress / resolveSteps,
					}))
					if (progress < resolveSteps) {
						setTimeout(animateGarble, stepInterval)
					} else {
						setTimeout(showNextLine, line.delay)
					}
				}

				setGarbleProgress((prev) => ({ ...prev, [lineIndex]: 0 }))
				setTimeout(animateGarble, 30)
			} else {
				setTimeout(showNextLine, line.delay)
			}
		}

		setTimeout(showNextLine, 500)

		return () => { cancelled = true }
	}, [phase])

	// Skip: jump sequence to end instantly, but still wait for assets
	const handleSkip = useCallback(() => {
		if (phase !== "boot") return
		setVisibleLines(BOOT_SEQUENCE.length)
		setSequenceDone(true)
		setSkipRequested(true)
	}, [phase])

	// Transition to "ready" when both sequence AND assets are done
	useEffect(() => {
		if (phase !== "boot" || !sequenceDone) return
		if (assetsReady) {
			const timeout = setTimeout(() => setPhase("ready"), skipRequested ? 100 : 300)
			return () => clearTimeout(timeout)
		}
		// Safety valve — don't wait forever for assets (5s timeout)
		const fallback = setTimeout(() => setPhase("ready"), 5000)
		return () => clearTimeout(fallback)
	}, [phase, sequenceDone, assetsReady, skipRequested])

	// Scroll as lines appear
	useEffect(() => {
		scrollToBottom()
	}, [visibleLines, scrollToBottom])

	// Tearout → done after animation completes
	useEffect(() => {
		if (phase !== "tearout") return
		const timeout = setTimeout(() => setPhase("done"), 2400)
		return () => clearTimeout(timeout)
	}, [phase])

	// Proceed: user action to enter the site
	const handleProceed = useCallback(() => {
		sessionStorage.setItem(SESSION_KEY, "1")
		setPhase("tearout")
	}, [])

	// Auth verified → start boot sequence
	const handleAuthVerified = useCallback(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			sessionStorage.setItem(SESSION_KEY, "1")
			setPhase("done")
		} else {
			setPhase("boot")
		}
	}, [])

	// Keyboard: Escape to skip during boot, Enter to proceed when ready
	useEffect(() => {
		if (phase !== "boot" && phase !== "ready") return
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && phase === "boot") handleSkip()
			if (e.key === "Enter" && phase === "ready") handleProceed()
		}
		window.addEventListener("keydown", handleKey)
		return () => window.removeEventListener("keydown", handleKey)
	}, [phase, handleSkip, handleProceed])

	const showOverlay = phase !== "done"
	const showChildren = phase !== "auth" && phase !== "checking"

	return (
		<>
			{/* Overlay — fixed on top, hidden once done */}
			{showOverlay && (
				<div
					className={`echoes-boot-overlay ${phase === "tearout" ? "echoes-boot-tearout" : ""}`}
					role="presentation"
				>
					{/* Scanlines on boot screen */}
					<div
						className="fixed inset-0 scanline-overlay z-10 pointer-events-none"
						aria-hidden="true"
					/>

					{/* Terminal content */}
					<div ref={containerRef} className="echoes-boot-terminal">
						{/* Checking phase — blinking cursor */}
						{phase === "checking" && (
							<span className="echoes-boot-cursor echoes-boot-cursor-active">_</span>
						)}

						{/* Auth phase — terminal password prompt */}
						{phase === "auth" && (
							<>
								<div className="echoes-boot-line echoes-boot-system">
									BIOS v3.41.7 ╱╱ TESSERA DISTRICT N█DE
								</div>
								<div className="echoes-boot-line echoes-boot-system">
									NET INT▌RFACE ...... CONN▒CTED
								</div>
								<div className="h-4" />
								<TerminalAuthPrompt onVerified={handleAuthVerified} />
							</>
						)}

						{/* Boot sequence phase */}
						{(phase === "boot" || phase === "ready" || phase === "tearout") && (
							<>
								{visibleLines === 0 && (
									<span className="echoes-boot-cursor">_</span>
								)}

								{BOOT_SEQUENCE.slice(0, visibleLines).map((line, i) => {
									const elements: React.ReactNode[] = []

									// Insert progress bar after the banner gap
									if (i === PROGRESS_BAR_LINE_INDEX) {
										elements.push(
											<TerminalProgressBar key="progress" progress={combinedProgress} />,
										)
									}

									if (line.text === "") {
										elements.push(<div key={i} className="h-4" />)
										return elements
									}

									let displayText = line.text
									if (
										line.garbled &&
										garbleProgress[i] !== undefined &&
										garbleProgress[i] < 1
									) {
										displayText = garbleText(
											line.text,
											garbleProgress[i],
										)
									}

									elements.push(
										<div
											key={i}
											className={`echoes-boot-line ${getLineClass(line.style)} ${
												line.redacted
													? "echoes-boot-redacted"
													: ""
											}`}
										>
											{displayText}
										</div>,
									)
									return elements
								})}

								{visibleLines > 0 && phase === "boot" && !sequenceDone && (
									<span className="echoes-boot-cursor echoes-boot-cursor-active">
										_
									</span>
								)}

								{phase === "ready" && (
									<TerminalCommandPrompt onSubmit={handleProceed} />
								)}
							</>
						)}
					</div>

					{/* Skip hint */}
					{phase === "boot" && !sequenceDone && (
						<div className="echoes-boot-skip">
							Press ESC to skip
						</div>
					)}

					{/* Signal interference bands — tearout only */}
					{phase === "tearout" && (
						<div className="echoes-tearout-bands" aria-hidden="true">
							{TEAROUT_BANDS.map((variant, i) => (
								<div key={i} className={`echoes-tearout-band echoes-tearout-band-${variant}`} style={{ "--band-index": i } as React.CSSProperties} />
							))}
						</div>
					)}
				</div>
			)}

			{/* Children always in a stable wrapper — no remount on phase change */}
			<div className={showChildren ? undefined : "sr-only"} aria-hidden={!showChildren}>
				{children}
			</div>
		</>
	)
}

function getLineClass(style?: BootLine["style"]): string {
	return style ? `echoes-boot-${style}` : ""
}
