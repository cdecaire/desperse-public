import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { type IconVariant, resolveIcon } from "@/lib/icons"

interface IconProps {
	/** Icon name: "heart", "fa-heart", or full class "fa-solid fa-heart" */
	name: string
	/** Style variant. Defaults to "solid". Overridden if name includes a variant prefix. */
	variant?: IconVariant
	/** Spin animation (replaces fa-spin) */
	spin?: boolean
	/** Additional Tailwind classes (text-xl, text-muted-foreground, etc.) */
	className?: string
}

/**
 * Parse a Font Awesome class string and extract icon name + variant.
 * Handles: "heart", "fa-heart", "fa-solid fa-heart", "fa-regular fa-clock", "fa-brands fa-google"
 */
function parseIconString(input: string): {
	name: string
	variant?: IconVariant
} {
	const parts = input.trim().split(/\s+/)
	let variant: IconVariant | undefined
	let name: string | undefined

	for (const part of parts) {
		if (part === "fa-solid") variant = "solid"
		else if (part === "fa-regular") variant = "regular"
		else if (part === "fa-brands") variant = "brands"
		else if (part.startsWith("fa-")) name = part.slice(3)
		else name = part
	}

	return { name: name || input, variant }
}

export function Icon({
	name,
	variant = "solid",
	spin = false,
	className,
}: IconProps) {
	const parsed = parseIconString(name)
	const resolvedVariant = parsed.variant || variant
	const iconDef = resolveIcon(parsed.name, resolvedVariant)

	if (!iconDef) {
		if (process.env.NODE_ENV === "development") {
			console.warn(
				`[Icon] Unknown icon: "${name}" (variant: ${resolvedVariant})`,
			)
		}
		return null
	}

	return (
		<FontAwesomeIcon
			icon={iconDef}
			spin={spin}
			className={className}
			aria-hidden="true"
		/>
	)
}
