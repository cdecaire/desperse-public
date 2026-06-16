import type { IconSet } from "@cdecaire/sable"
import { Icon } from "@/components/ui/icon"
import type { IconVariant } from "@/lib/icons"

/**
 * Sable icon-set adapter.
 *
 * `@cdecaire/sable` ships NO icons — its components reference semantic glyph
 * names (see the package's `registry.json` → `iconContract.names`) and expect
 * the consuming app to inject a concrete set via `<IconProvider set={…}>`.
 *
 * This adapter renders each Sable glyph through Desperse's existing FontAwesome
 * `<Icon>` (`@/components/ui/icon`), which resolves names via `resolveIcon` in
 * `@/lib/icons`. Where Sable's contract name differs from the FA registry key
 * Desperse uses, `NAME_MAP` bridges them. Names that already match the registry
 * pass straight through.
 *
 * Mount it once near the top of the provider tree (see `src/routes/__root.tsx`).
 */

/**
 * Sable contract name → Desperse/FA registry key (from `@/lib/icons`).
 * Only names that differ need an entry; matching names pass through unchanged.
 */
const NAME_MAP: Record<string, string> = {
	// Sable "share" → FA "share-nodes" (network-share glyph)
	share: "share-nodes",
	// Sable "external" → FA "external-link" alias (arrow-up-right-from-square)
	external: "external-link",
	// Sable "warning" → FA "triangle-exclamation" (caution triangle)
	warning: "triangle-exclamation",
	// Sable "sun" → FA "sun-bright" (the only sun in the Desperse set)
	sun: "sun-bright",
	// Sable "ellipsis" (horizontal overflow) → FA "ellipsis-vertical"
	// (Desperse only ships the vertical kebab — closest available match).
	ellipsis: "ellipsis-vertical",
	// Sable "copy" → FA "file" — Desperse's set has no copy/clone glyph;
	// "file" (a document) is the closest available fallback. Add a real
	// "copy" icon to @/lib/icons if a better match is desired.
	copy: "file",
}

/**
 * Map Sable's open-ended variant onto Desperse's three FA variants.
 * Sable defaults to "regular" via the IconProvider; anything Desperse doesn't
 * recognize falls back to "regular".
 */
function mapVariant(variant: string): IconVariant {
	if (variant === "solid" || variant === "regular" || variant === "brands") {
		return variant
	}
	return "regular"
}

export const sableIconSet: IconSet = ({
	name,
	variant,
	spin,
	className,
	title,
}) => {
	const resolvedName = NAME_MAP[name] ?? name
	const icon = (
		<Icon
			name={resolvedName}
			variant={mapVariant(variant)}
			spin={spin}
			className={className}
		/>
	)

	// Desperse's <Icon> always renders aria-hidden. When Sable supplies a `title`
	// the glyph is meaningful, so expose it to assistive tech via a labelled span.
	if (title) {
		return (
			<span role="img" aria-label={title}>
				{icon}
			</span>
		)
	}
	return icon
}
