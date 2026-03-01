/**
 * StorageSelector Component
 * Radio card selector for storage type (centralized CDN vs Arweave permanent storage)
 */

import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"

type StorageType = "centralized" | "arweave"

interface StorageSelectorProps {
	value: StorageType
	onChange: (v: StorageType) => void
	disabled?: boolean
}

const STORAGE_OPTIONS: Array<{
	id: StorageType
	label: string
	description: string
	icon: string
	iconVariant: "regular" | "solid"
	tone: string
}> = [
	{
		id: "centralized",
		label: "Free Storage",
		description: "Media stored on Vercel CDN. Fast and free.",
		icon: "cloud-arrow-up",
		iconVariant: "regular",
		tone: "var(--color-muted-foreground)",
	},
	{
		id: "arweave",
		label: "Permanent Storage",
		description: "Media permanently stored on Arweave. Requires storage credits.",
		icon: "shield",
		iconVariant: "solid",
		tone: "#e2a529",
	},
]

export function StorageSelector({ value, onChange, disabled }: StorageSelectorProps) {
	const arweaveEnabled =
		typeof window !== "undefined" &&
		import.meta.env.VITE_FEATURE_ARWEAVE_STORAGE === "true"

	return (
		<div className="space-y-2">
			<label className="text-sm font-medium">Storage</label>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{STORAGE_OPTIONS.map((option) => {
					const isSelected = value === option.id
					const isOptionDisabled =
						disabled || (option.id === "arweave" && !arweaveEnabled)

					return (
						<button
							key={option.id}
							type="button"
							onClick={() => !isOptionDisabled && onChange(option.id)}
							disabled={isOptionDisabled}
							className={cn(
								"relative flex flex-col items-start p-4 rounded-xl border transition-all text-left",
								"hover:border-foreground/20",
								isSelected
									? "bg-card shadow-md dark:bg-card"
									: "border-border bg-card shadow-sm dark:bg-card",
								isOptionDisabled && "opacity-50 cursor-not-allowed",
							)}
							style={isSelected ? { borderColor: option.tone } : undefined}
						>
							{/* Radio indicator */}
							<div
								className={cn(
									"absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center",
									isSelected
										? "border-transparent"
										: "border-muted-foreground/30",
								)}
								style={isSelected ? { borderColor: option.tone } : undefined}
							>
								{isSelected && (
									<div
										className="w-2.5 h-2.5 rounded-full"
										style={{ backgroundColor: option.tone }}
									/>
								)}
							</div>

							{/* Icon */}
							<div className="mb-3">
								<Icon
									name={option.icon}
									variant={option.iconVariant}
									className="text-lg"
								/>
							</div>

							{/* Label & Description */}
							<div className="font-medium text-sm">{option.label}</div>
							<div className="text-xs text-muted-foreground mt-0.5">
								{option.description}
							</div>

							{/* Coming soon badge for disabled Arweave */}
							{option.id === "arweave" && !arweaveEnabled && (
								<div className="mt-2 text-xs text-muted-foreground/70 italic">
									Coming soon
								</div>
							)}
						</button>
					)
				})}
			</div>
		</div>
	)
}

export type { StorageType }
