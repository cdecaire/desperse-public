/**
 * EditionOptions Component
 * Commerce and supply configuration for edition posts (price, currency, max supply)
 * Includes timed edition (mint window) controls.
 *
 * NFT metadata fields (name, symbol, description, royalties, mutability) are now
 * handled by the shared NftMetadataOptions component.
 */

import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tooltip } from '@/components/ui/tooltip'
import { Badge, DateTimePicker, Description, DescriptionItem, NumberField, Note } from '@cdecaire/sable'
import { useState, useEffect, useMemo, useRef } from 'react'
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
 * Earliest selectable start (now + 5 minutes, rounded to the minute).
 */
function getMinDate(): Date {
	const d = new Date(Date.now() + 5 * 60_000)
	d.setSeconds(0, 0)
	return d
}

/**
 * Serialize a Date back to the datetime-local contract string "YYYY-MM-DDTHH:mm"
 * (local time) stored in MintWindowState.startTime.
 */
function toDateTimeLocal(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
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

  const priceError = validatePrice(displayPrice, currency)

  return (
    <div className="space-y-4 p-4 bg-card border border-border rounded-xl shadow-md">
      {/* Pricing locked warning */}
      {isPricingDisabled && (
        <Note variant="neutral" icon="lock">
          Pricing and supply cannot be changed after an edition has been purchased.
        </Note>
      )}
      
      {/* Price & Currency */}
      <div>
        <Label htmlFor="edition-price" className="mb-2 block">
          Price per edition <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-[200px]">
            <Input
              id="edition-price"
              type="number"
              step="any"
              min={0}
              value={displayPrice}
              onChange={(e) => handlePriceInput(e.target.value)}
              placeholder="0.00"
              disabled={isPricingDisabled}
              aria-required="true"
              aria-invalid={!!priceError}
              aria-describedby={priceError ? 'edition-price-error' : undefined}
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                  e.preventDefault()
                }
              }}
              className={`pr-16 ${priceError ? 'border-destructive' : ''}`}
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
        {priceError && (
          <p id="edition-price-error" className="text-sm text-destructive mt-1.5" role="alert">
            {priceError}
          </p>
        )}
      </div>
      
      {/* Max Supply */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Tooltip content="Maximum number of editions that can be sold. Leave open edition for unlimited.">
            <Label className="cursor-help border-b border-dotted border-muted-foreground/40">
              {isUnlimited ? 'Open Edition' : 'Limited Supply'}
            </Label>
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
            <NumberField
              id="edition-max-supply"
              min={1}
              step={1}
              largeStep={10}
              value={maxSupply ?? 1}
              onValueChange={(v) => onMaxSupplyChange(v && v > 0 ? v : 1)}
              disabled={isPricingDisabled}
              aria-label="Maximum supply"
              className="max-w-[200px]"
            />
          </div>
        )}
      </div>

      {/* Protect Download */}
      {onProtectDownloadChange && (
        <div className="flex items-center justify-between">
          <Tooltip content="Require NFT ownership to download the original file">
            <Label className="cursor-help border-b border-dotted border-muted-foreground/40">
              {protectDownload ? 'Protected Download' : 'Protect Download'}
            </Label>
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

	// Focus the custom-duration input when it's revealed. Sable's NumberField
	// spreads props onto Base UI's Root (not the inner <input>), so autoFocus
	// can't be passed through — reach the input via a container ref instead.
	// Deferred a tick: "Custom" is chosen from a Base UI Select, whose close
	// handler restores focus to its trigger AFTER this effect runs and would
	// silently steal an immediate focus() back.
	const customDurationRef = useRef<HTMLDivElement>(null)
	useEffect(() => {
		if (!isCustomMode) return
		const id = window.setTimeout(() => {
			customDurationRef.current?.querySelector("input")?.focus()
		}, 0)
		return () => window.clearTimeout(id)
	}, [isCustomMode])

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
						<Label className="cursor-help border-b border-dotted border-muted-foreground/40">
							Timed Edition
						</Label>
					</Tooltip>
					<Badge variant="muted" icon={<Icon name="lock" variant="regular" />}>
						Locked
					</Badge>
				</div>
				<Description cols="1">
					<DescriptionItem
						term="Start"
						detail={<span className="font-medium">{formatLocalDateTime(start)}</span>}
					/>
					<DescriptionItem
						term="End"
						detail={<span className="font-medium">{formatLocalDateTime(end)}</span>}
					/>
					<DescriptionItem
						term="Status"
						tone={isEnded ? "muted" : "success"}
						detail={
							<span className="font-medium">
								{isEnded ? "Ended" : now >= start ? "Active" : "Scheduled"}
							</span>
						}
					/>
				</Description>
			</div>
		)
	}

	return (
		<div className="space-y-3">
			{/* Toggle */}
			<div className="flex items-center justify-between">
				<Tooltip content="Set a time window during which collectors can purchase this edition.">
					<Label className="cursor-help border-b border-dotted border-muted-foreground/40">
						Timed Edition
					</Label>
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
							<Label>
								Launch type
							</Label>
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
							<Label>
								Set duration
							</Label>
							{isCustomMode ? (
								<div ref={customDurationRef} className="flex items-center gap-1.5">
									<NumberField
										min={1}
										step={1}
										largeStep={24}
										value={customDuration ? Number(customDuration) : null}
										onValueChange={(v) => {
											setCustomDuration(String(v ?? ""))
											onChange({
												...mintWindow,
												durationHours: v,
											})
										}}
										disabled={isDisabled}
										className="flex-1"
									/>
									<span className="text-xs text-muted-foreground shrink-0">
										hrs
									</span>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => {
											setIsCustomMode(false)
											setCustomDuration("")
											onChange({
												...mintWindow,
												durationHours: null,
											})
										}}
										className="shrink-0 size-8 text-muted-foreground hover:text-foreground"
										aria-label="Back to presets"
									>
										<Icon name="xmark" variant="regular" className="text-sm" />
									</Button>
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
							<Label className="hidden sm:block">
								Start schedule
							</Label>
							<div className="hidden sm:block" />
							<Label className="hidden sm:block">
								Calculated end result
							</Label>

							{/* Start */}
							<div>
								<Label className="sm:hidden mb-1.5 block">
									Start schedule
								</Label>
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
										value={mintWindow.startTime ? new Date(mintWindow.startTime) : undefined}
										defaultTime="12:00"
										minDate={getMinDate()}
										onChange={(date) =>
											onChange({
												...mintWindow,
												startTime: date ? toDateTimeLocal(date) : '',
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
								<Label className="sm:hidden mb-1.5 block">
									Calculated end result
								</Label>
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
