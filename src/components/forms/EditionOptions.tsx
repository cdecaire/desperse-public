/**
 * EditionOptions Component
 * Commerce and supply configuration for edition posts (price, currency, max supply)
 * Includes timed edition (mint window) controls.
 *
 * NFT metadata fields (name, symbol, description, royalties, mutability) are now
 * handled by the shared NftMetadataOptions component.
 */

import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tooltip } from '@/components/ui/tooltip'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'

export type Currency = 'SOL' | 'USDC'

// Minimum edition prices (display units)
const MIN_PRICE_SOL = 0.1 // 0.1 SOL
const MIN_PRICE_USDC = 15 // $15 USDC

// Duration presets for the mint window
const DURATION_PRESETS = [
	{ label: '1h', hours: 1 },
	{ label: '24h', hours: 24 },
	{ label: '48h', hours: 48 },
	{ label: '72h', hours: 72 },
	{ label: '1 week', hours: 168 },
] as const

export interface MintWindowState {
	enabled: boolean
	startMode: 'now' | 'scheduled'
	startTime: string // datetime-local input value (ISO-ish local string)
	durationHours: number | null
}

interface EditionOptionsProps {
  price: number | null // In base units (lamports for SOL, 6 decimals for USDC)
  currency: Currency
  maxSupply: number | null
  protectDownload?: boolean
  // Mint window
  mintWindow?: MintWindowState
  onMintWindowChange?: (mintWindow: MintWindowState) => void
  mintWindowLocked?: boolean // True when time window fields are locked (after first purchase)
  // Existing mint window values from server (for read-only display)
  existingMintWindowStart?: Date | string | null
  existingMintWindowEnd?: Date | string | null
  onPriceChange: (value: number | null) => void
  onCurrencyChange: (currency: Currency) => void
  onMaxSupplyChange: (value: number | null) => void
  onProtectDownloadChange?: (value: boolean) => void
  disabled?: boolean // Disables all fields (e.g., during submission)
  pricingDisabled?: boolean // Disables pricing fields (price, currency, maxSupply)
}

// Convert display price to base units
function toBaseUnits(displayPrice: number, currency: Currency): number {
  if (currency === 'SOL') {
    return Math.round(displayPrice * 1_000_000_000) // lamports
  }
  return Math.round(displayPrice * 1_000_000) // USDC base units
}

// Convert base units to display price
function toDisplayPrice(baseUnits: number | null, currency: Currency): string {
  if (baseUnits === null || baseUnits === 0) return ''
  if (currency === 'SOL') {
    return (baseUnits / 1_000_000_000).toString()
  }
  return (baseUnits / 1_000_000).toString()
}

// Validate price meets minimum threshold
function validatePrice(displayPrice: string, currency: Currency): string | null {
  if (!displayPrice || displayPrice === '') return null // Empty is handled by required validation
  const num = parseFloat(displayPrice)
  if (isNaN(num)) return null

  if (currency === 'SOL' && num < MIN_PRICE_SOL) {
    return `Minimum price is ${MIN_PRICE_SOL} SOL`
  }
  if (currency === 'USDC' && num < MIN_PRICE_USDC) {
    return `Minimum price is $${MIN_PRICE_USDC} USDC`
  }
  return null
}

/**
 * Format a Date for display in the user's local timezone.
 */
function formatLocalDateTime(date: Date): string {
	return date.toLocaleString(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	})
}

/**
 * Get the minimum datetime-local value (now + 5 minutes, rounded to the minute).
 */
function getMinDateTimeLocal(): string {
	const d = new Date(Date.now() + 5 * 60_000)
	d.setSeconds(0, 0)
	// datetime-local uses "YYYY-MM-DDTHH:mm"
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EditionOptions({
  price,
  currency,
  maxSupply,
  protectDownload = false,
  mintWindow,
  onMintWindowChange,
  mintWindowLocked,
  existingMintWindowStart,
  existingMintWindowEnd,
  onPriceChange,
  onCurrencyChange,
  onMaxSupplyChange,
  onProtectDownloadChange,
  disabled,
  pricingDisabled,
}: EditionOptionsProps) {
  // Compute effective disabled states
  const isPricingDisabled = disabled || pricingDisabled
  const isUnlimited = maxSupply === null
  const [displayPrice, setDisplayPrice] = useState(toDisplayPrice(price, currency))
  
  // Sync display price when currency or price changes externally
  useEffect(() => {
    setDisplayPrice(toDisplayPrice(price, currency))
  }, [price, currency])
  
  const handlePriceInput = (value: string) => {
    setDisplayPrice(value)
    
    if (value === '') {
      onPriceChange(null)
      return
    }
    
    const num = parseFloat(value)
    if (!isNaN(num) && num > 0) {
      onPriceChange(toBaseUnits(num, currency))
    }
  }

  return (
    <div className="space-y-4 p-4 bg-card border border-border rounded-xl shadow-md dark:bg-card">
      {/* Pricing locked warning */}
      {isPricingDisabled && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <Icon name="lock" variant="regular" className="mr-2" />
            Pricing and supply cannot be changed after an edition has been purchased.
          </p>
        </div>
      )}
      
      {/* Price & Currency */}
      <div>
        <label className="text-sm text-foreground mb-2 block">
          Price per edition <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-[200px]">
            <Input
              type="number"
              step="any"
              min={0}
              value={displayPrice}
              onChange={(e) => handlePriceInput(e.target.value)}
              placeholder="0.00"
              disabled={isPricingDisabled}
              className={`pr-16 ${validatePrice(displayPrice, currency) ? 'border-destructive' : ''}`}
            />

            {/* Currency selector inside input */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <Select
                value={currency}
                onValueChange={(value) => onCurrencyChange(value as Currency)}
                disabled={isPricingDisabled}
              >
                <SelectTrigger className="h-7 w-[70px] px-2 text-sm font-medium bg-muted dark:bg-zinc-700 border-0 shadow-none focus:ring-0 hover:bg-muted/80 dark:hover:bg-zinc-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {/* Price validation error */}
        {validatePrice(displayPrice, currency) && (
          <p className="text-sm text-destructive mt-1.5">
            {validatePrice(displayPrice, currency)}
          </p>
        )}
      </div>
      
      {/* Max Supply */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Tooltip content="Maximum number of editions that can be sold. Leave open edition for unlimited.">
            <label className="text-sm text-foreground cursor-help border-b border-dotted border-muted-foreground/40">
              {isUnlimited ? 'Open Edition' : 'Limited Supply'}
            </label>
          </Tooltip>
          <Switch
            checked={isUnlimited}
            onCheckedChange={(checked) => onMaxSupplyChange(checked ? null : 100)}
            disabled={isPricingDisabled}
            aria-label="Toggle open edition"
          />
        </div>

        {/* Supply input (when limited) */}
        {!isUnlimited && (
          <div className="space-y-1.5">
            <Input
              type="number"
              min={1}
              value={maxSupply || ''}
              onChange={(e) => {
                const val = e.target.value
                if (val === '') {
                  onMaxSupplyChange(1)
                } else {
                  const num = parseInt(val, 10)
                  if (!isNaN(num) && num > 0) {
                    onMaxSupplyChange(num)
                  }
                }
              }}
              placeholder="Enter max supply"
              disabled={isPricingDisabled}
              className="max-w-[200px]"
            />
          </div>
        )}
      </div>

      {/* Protect Download */}
      {onProtectDownloadChange && (
        <div className="flex items-center justify-between">
          <Tooltip content="Require NFT ownership to download the original file">
            <label className="text-sm text-foreground cursor-help border-b border-dotted border-muted-foreground/40">
              {protectDownload ? 'Protected Download' : 'Protect Download'}
            </label>
          </Tooltip>
          <Switch
            checked={protectDownload}
            onCheckedChange={onProtectDownloadChange}
            disabled={disabled}
            aria-label="Toggle download protection"
          />
        </div>
      )}

      {/* Timed Edition (Mint Window) */}
      {onMintWindowChange && mintWindow && (
        <MintWindowSection
          mintWindow={mintWindow}
          onChange={onMintWindowChange}
          locked={mintWindowLocked}
          existingStart={existingMintWindowStart}
          existingEnd={existingMintWindowEnd}
          disabled={disabled}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mint Window sub-component
// ---------------------------------------------------------------------------

interface MintWindowSectionProps {
	mintWindow: MintWindowState
	onChange: (state: MintWindowState) => void
	locked?: boolean
	existingStart?: Date | string | null
	existingEnd?: Date | string | null
	disabled?: boolean
}

function MintWindowSection({
	mintWindow,
	onChange,
	locked,
	existingStart,
	existingEnd,
	disabled,
}: MintWindowSectionProps) {
	const isDisabled = disabled || locked

	// Custom duration input value — synced from mintWindow.durationHours
	const [customDuration, setCustomDuration] = useState(
		mintWindow.durationHours !== null &&
			!DURATION_PRESETS.some((p) => p.hours === mintWindow.durationHours)
			? String(mintWindow.durationHours)
			: ""
	)

	// Whether the current duration matches a preset
	const isPreset = DURATION_PRESETS.some(
		(p) => p.hours === mintWindow.durationHours
	)

	// Track explicit custom mode selection (for the Select dropdown)
	const [isCustomMode, setIsCustomMode] = useState(
		mintWindow.durationHours !== null && !isPreset
	)

	// Compute Select value for the duration dropdown
	const durationSelectValue = useMemo(() => {
		if (mintWindow.durationHours !== null && isPreset) {
			return String(mintWindow.durationHours)
		}
		if (isCustomMode) return "custom"
		return ""
	}, [mintWindow.durationHours, isPreset, isCustomMode])

	// Computed preview of start/end times
	const preview = useMemo(() => {
		if (!mintWindow.enabled || mintWindow.durationHours === null) return null

		let start: Date
		if (mintWindow.startMode === "now") {
			start = new Date()
		} else {
			if (!mintWindow.startTime) return null
			start = new Date(mintWindow.startTime)
			if (Number.isNaN(start.getTime())) return null
		}

		const end = new Date(
			start.getTime() + mintWindow.durationHours * 3_600_000
		)
		return {
			start: formatLocalDateTime(start),
			end: formatLocalDateTime(end),
			endInPast: end <= new Date(),
		}
	}, [
		mintWindow.enabled,
		mintWindow.startMode,
		mintWindow.startTime,
		mintWindow.durationHours,
	])

	// Locked state — show read-only summary of existing window
	if (locked && existingStart && existingEnd) {
		const start = existingStart instanceof Date ? existingStart : new Date(existingStart)
		const end = existingEnd instanceof Date ? existingEnd : new Date(existingEnd)
		const now = new Date()
		const isEnded = now >= end

		return (
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Tooltip content="Mint window settings are locked after the first edition purchase.">
						<label className="text-sm text-foreground cursor-help border-b border-dotted border-muted-foreground/40">
							Timed Edition
						</label>
					</Tooltip>
					<span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
						<Icon name="lock" variant="regular" className="mr-1" />
						Locked
					</span>
				</div>
				<div className="p-3 bg-muted rounded-lg text-sm space-y-1">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Start:</span>
						<span className="font-medium">{formatLocalDateTime(start)}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">End:</span>
						<span className="font-medium">{formatLocalDateTime(end)}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Status:</span>
						<span className={cn("font-medium", isEnded ? "text-muted-foreground" : "text-green-600 dark:text-green-400")}>
							{isEnded ? "Ended" : now >= start ? "Active" : "Scheduled"}
						</span>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-3">
			{/* Toggle */}
			<div className="flex items-center justify-between">
				<Tooltip content="Set a time window during which collectors can purchase this edition.">
					<label className="text-sm text-foreground cursor-help border-b border-dotted border-muted-foreground/40">
						Timed Edition
					</label>
				</Tooltip>
				<Switch
					checked={mintWindow.enabled}
					onCheckedChange={(checked) =>
						onChange({ ...mintWindow, enabled: checked })
					}
					disabled={isDisabled}
					aria-label="Enable mint window"
				/>
			</div>

			{mintWindow.enabled && (
				<div className="space-y-4">
					{/* Launch Type + Duration selects */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{/* Launch Type */}
						<div className="space-y-1.5">
							<label className="text-sm text-foreground">
								Launch type
							</label>
							<Select
								value={mintWindow.startMode}
								onValueChange={(value) =>
									onChange({
										...mintWindow,
										startMode: value as "now" | "scheduled",
									})
								}
								disabled={isDisabled}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select..." />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="now">Start Now</SelectItem>
									<SelectItem value="scheduled">
										Scheduled Launch
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Set Duration */}
						<div className="space-y-1.5">
							<label className="text-sm text-foreground">
								Set duration
							</label>
							{isCustomMode ? (
								<div className="flex items-center gap-1.5">
									<Input
										type="number"
										min={1}
										step={1}
										value={customDuration}
										onChange={(e) => {
											const val = e.target.value
											setCustomDuration(val)
											if (val === "") {
												onChange({
													...mintWindow,
													durationHours: null,
												})
											} else {
												const num = parseFloat(val)
												if (!isNaN(num) && num >= 1) {
													onChange({
														...mintWindow,
														durationHours: num,
													})
												}
											}
										}}
										placeholder="Hours"
										disabled={isDisabled}
										className="flex-1"
										autoFocus
									/>
									<span className="text-xs text-muted-foreground shrink-0">
										hrs
									</span>
									<button
										type="button"
										onClick={() => {
											setIsCustomMode(false)
											setCustomDuration("")
											onChange({
												...mintWindow,
												durationHours: null,
											})
										}}
										className="shrink-0 size-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
										aria-label="Back to presets"
									>
										<Icon name="xmark" variant="regular" className="text-sm" />
									</button>
								</div>
							) : (
								<Select
									value={durationSelectValue}
									onValueChange={(value) => {
										if (value === "custom") {
											setIsCustomMode(true)
											onChange({
												...mintWindow,
												durationHours: null,
											})
											setCustomDuration("")
										} else {
											setCustomDuration("")
											onChange({
												...mintWindow,
												durationHours: Number(value),
											})
										}
									}}
									disabled={isDisabled}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select..." />
									</SelectTrigger>
									<SelectContent>
										{DURATION_PRESETS.map((preset) => (
											<SelectItem
												key={preset.hours}
												value={String(preset.hours)}
											>
												{preset.label}
											</SelectItem>
										))}
										<SelectItem value="custom">
											Custom
										</SelectItem>
									</SelectContent>
								</Select>
							)}
						</div>
					</div>

					{/* Detail panel */}
					<div className="border rounded-xl p-4">
						<div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-x-4 sm:gap-y-1.5">
							{/* Labels — hidden on mobile, shown in grid row on sm+ */}
							<label className="hidden sm:block text-sm text-foreground">
								Start schedule
							</label>
							<div className="hidden sm:block" />
							<label className="hidden sm:block text-sm text-foreground">
								Calculated end result
							</label>

							{/* Start */}
							<div>
								<label className="sm:hidden text-sm text-foreground mb-1.5 block">
									Start schedule
								</label>
								{mintWindow.startMode === "now" ? (
									<div className="bg-muted rounded-xl px-4 py-3">
										<p className="text-sm font-medium">On publish</p>
										{preview && (
											<p className="text-xs text-muted-foreground mt-0.5">
												~ {preview.start}
											</p>
										)}
									</div>
								) : (
									<DateTimePicker
										value={mintWindow.startTime}
										min={getMinDateTimeLocal()}
										onChange={(value) =>
											onChange({
												...mintWindow,
												startTime: value,
											})
										}
										disabled={isDisabled}
										placeholder="Pick start date"
									/>
								)}
							</div>

							<div className="flex items-center justify-center text-muted-foreground">
								<Icon name="arrow-right" variant="regular" className="sm:rotate-0 rotate-90" />
							</div>

							{/* End */}
							<div>
								<label className="sm:hidden text-sm text-foreground mb-1.5 block">
									Calculated end result
								</label>
								{preview ? (
									<div className={cn(
										"rounded-xl px-4 py-3 text-center",
										preview.endInPast
											? "bg-destructive/10 text-destructive border border-destructive/20"
											: "bg-foreground text-background"
									)}>
										<p className="text-sm font-semibold">
											{preview.end}
										</p>
										<p className={cn("text-xs mt-0.5", preview.endInPast ? "text-destructive/80" : "opacity-70")}>
											{preview.endInPast ? "End time is in the past" : "Sale auto-closes"}
										</p>
									</div>
								) : (
									<div className="bg-muted rounded-xl px-4 py-3 text-center">
										<p className="text-sm text-muted-foreground italic">
											Select a duration
										</p>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Info note */}
					<p className="text-xs text-muted-foreground">
						The system will automatically switch the listing status
						to &lsquo;Closed&rsquo; once the end time is reached.
						Users will no longer be able to purchase or bid.
					</p>
				</div>
			)}
		</div>
	)
}

export default EditionOptions
