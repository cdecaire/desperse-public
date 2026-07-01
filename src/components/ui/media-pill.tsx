/**
 * MediaPill Component
 * Overlay pills for media showing price, status, and edition info
 *
 * Migration shim (Sable adoption).
 *
 * The app's <MediaPill> now renders @cdecaire/sable's MediaPill while keeping the
 * LEGACY API so existing call sites don't change:
 *   - variant:   dark | muted | tone
 *   - toneColor: CSS color value paired with the 'tone' variant
 *
 * Sable's MediaPill replaces the open-ended 'tone' + toneColor escape hatch with
 * three TOKENIZED tone variants (tone-standard / tone-collectible / tone-edition).
 * Every real call site passes one of three CSS vars into toneColor
 * (var(--tone-standard|collectible|edition) — see constants/postTypes.ts), so we
 * map those to the matching Sable tone variant. Any OTHER (arbitrary) color has no
 * Sable equivalent, so rather than silently drop it we fall back to the legacy
 * behavior: render Sable's neutral "tone-standard" surface and override its fill
 * via inline backgroundColor. `mediaPillVariants` is preserved (no external
 * importer today, but kept for API stability).
 */

import * as React from "react"
import { MediaPill as SableMediaPill } from "@cdecaire/sable"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Preserved for backward-compat / API stability. Mirrors the legacy classes.
const mediaPillVariants = cva(
	"inline-flex items-center h-6 px-3 rounded-full font-semibold backdrop-blur-sm text-white text-[10px] tracking-[0.2px]",
	{
		variants: {
			variant: {
				dark: "bg-zinc-950/85",
				muted: "bg-zinc-700",
				tone: "", // Background set via toneColor prop
			},
		},
		defaultVariants: {
			variant: "dark",
		},
	}
)

interface MediaPillProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof mediaPillVariants> {
	/** CSS color value for 'tone' variant (e.g., 'var(--tone-edition)' or '#10b981') */
	toneColor?: string
}

// Known tone CSS vars → Sable tokenized tone variants. Anything else has no
// Sable equivalent and falls back to an inline backgroundColor override.
const TONE_COLOR_TO_VARIANT = {
	"var(--tone-standard)": "tone-standard",
	"var(--tone-collectible)": "tone-collectible",
	"var(--tone-edition)": "tone-edition",
} as const

type SableVariant =
	| "dark"
	| "muted"
	| "tone-standard"
	| "tone-collectible"
	| "tone-edition"

function MediaPill({
	className,
	variant,
	toneColor,
	style,
	...props
}: MediaPillProps) {
	let sableVariant: SableVariant = "dark"
	let mergedStyle: React.CSSProperties | undefined = style

	if (variant === "tone") {
		const mapped = toneColor
			? TONE_COLOR_TO_VARIANT[toneColor as keyof typeof TONE_COLOR_TO_VARIANT]
			: undefined
		if (mapped) {
			sableVariant = mapped
		} else {
			// Arbitrary color with no tokenized Sable variant — preserve the legacy
			// escape hatch by overriding the fill inline on a neutral tone surface.
			sableVariant = "tone-standard"
			mergedStyle = {
				...style,
				...(toneColor ? { backgroundColor: toneColor } : {}),
			}
		}
	} else if (variant === "muted") {
		sableVariant = "muted"
	} else {
		sableVariant = "dark"
	}

	return (
		<SableMediaPill
			data-slot="media-pill"
			variant={sableVariant}
			className={cn(className)}
			style={mergedStyle}
			{...(props as React.HTMLAttributes<HTMLSpanElement>)}
		/>
	)
}

export { MediaPill, mediaPillVariants }
