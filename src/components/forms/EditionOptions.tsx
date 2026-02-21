/**
 * EditionOptions Component
 * Commerce and supply configuration for edition posts (price, currency, max supply)
 * Includes timed edition (mint window) controls.
 *
 * NFT metadata fields (name, symbol, description, royalties, mutability) are now
 * handled by the shared NftMetadataOptions component.
 */

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tooltip } from '@/components/ui/tooltip'
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
            <i className="fa-regular fa-lock mr-2" />
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
        <Tooltip content="Maximum number of editions that can be sold. Leave open edition for unlimited.">
          <label className="text-sm text-foreground cursor-help border-b border-dotted border-muted-foreground/40">
            Maximum Supply
          </label>
        </Tooltip>
        
        {/* Toggle for unlimited */}
        <div className="flex items-center gap-3">
          <Switch
            checked={isUnlimited}
            onCheckedChange={(checked) => onMaxSupplyChange(checked ? null : 100)}
            disabled={isPricingDisabled}
            aria-label="Toggle open edition"
          />
          <span className="text-sm">
            {isUnlimited ? 'Open Edition' : 'Limited supply'}
          </span>
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
        <div className="space-y-3">
          <Tooltip content="Require NFT ownership to download the original file">
            <label className="text-sm text-foreground cursor-help border-b border-dotted border-muted-foreground/40">
              Protect download
            </label>
          </Tooltip>

          <div className="flex items-center gap-3">
            <Switch
              checked={protectDownload}
              onCheckedChange={onProtectDownloadChange}
              disabled={disabled}
              aria-label="Toggle download protection"
            />
            <span className="text-sm">
              {protectDownload ? 'Protected' : 'Unprotected'}
            </span>
          </div>
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
			<div className="space-y-3 pt-3 border-t border-border">
				<div className="flex items-center gap-2">
					<Tooltip content="Mint window settings are locked after the first edition purchase.">
						<label className="text-sm text-foreground cursor-help border-b border-dotted border-muted-foreground/40">
							Timed Edition
						</label>
					</Tooltip>
					<span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
						<i className="fa-regular fa-lock mr-1" />
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
		<div className="space-y-3 pt-3 border-t border-border">
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
				<div className="space-y-4 pl-1">
					{/* Start mode */}
					<div className="space-y-2">
						<label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
							Start
						</label>
						<div className="flex gap-2">
							<Button
								type="button"
								variant={mintWindow.startMode === "now" ? "default" : "outline"}
								className="h-8 px-3 text-xs"
								onClick={() =>
									onChange({ ...mintWindow, startMode: "now" })
								}
								disabled={isDisabled}
							>
								Start now
							</Button>
							<Button
								type="button"
								variant={
									mintWindow.startMode === "scheduled" ? "default" : "outline"
								}
								className="h-8 px-3 text-xs"
								onClick={() =>
									onChange({ ...mintWindow, startMode: "scheduled" })
								}
								disabled={isDisabled}
							>
								Schedule for later
							</Button>
						</div>

						{/* Scheduled start time */}
						{mintWindow.startMode === "scheduled" && (
							<Input
								type="datetime-local"
								value={mintWindow.startTime}
								min={getMinDateTimeLocal()}
								onChange={(e) =>
									onChange({ ...mintWindow, startTime: e.target.value })
								}
								disabled={isDisabled}
								className="max-w-[260px]"
							/>
						)}
					</div>

					{/* Duration */}
					<div className="space-y-2">
						<label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
							Duration
						</label>
						<div className="flex flex-wrap gap-1.5">
							{DURATION_PRESETS.map((preset) => (
								<Button
									key={preset.hours}
									type="button"
									variant={
										mintWindow.durationHours === preset.hours
											? "default"
											: "outline"
									}
									className="h-8 px-3 text-xs"
									onClick={() => {
										onChange({
											...mintWindow,
											durationHours: preset.hours,
										})
										setCustomDuration("")
									}}
									disabled={isDisabled}
								>
									{preset.label}
								</Button>
							))}
							<Button
								type="button"
								variant={
									mintWindow.durationHours !== null && !isPreset
										? "default"
										: "outline"
								}
								className="h-8 px-3 text-xs"
								onClick={() => {
									// Switch to custom mode — keep existing custom value or clear
									if (isPreset) {
										onChange({ ...mintWindow, durationHours: null })
										setCustomDuration("")
									}
								}}
								disabled={isDisabled}
							>
								Custom
							</Button>
						</div>

						{/* Custom duration input */}
						{!isPreset && (
							<div className="flex items-center gap-2">
								<Input
									type="number"
									min={1}
									step={1}
									value={customDuration}
									onChange={(e) => {
										const val = e.target.value
										setCustomDuration(val)
										if (val === "") {
											onChange({ ...mintWindow, durationHours: null })
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
									className="max-w-[120px]"
								/>
								<span className="text-sm text-muted-foreground">hours</span>
							</div>
						)}
					</div>

					{/* Preview */}
					{preview && (
						<div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									{mintWindow.startMode === "now" ? "Starts:" : "Scheduled start:"}
								</span>
								<span className="font-medium">
									{mintWindow.startMode === "now" ? "On publish" : preview.start}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Ends:</span>
								<span className="font-medium">{preview.end}</span>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export default EditionOptions
