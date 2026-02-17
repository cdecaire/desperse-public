/**
 * EditionOptions Component
 * Commerce and supply configuration for edition posts (price, currency, max supply)
 * 
 * NFT metadata fields (name, symbol, description, royalties, mutability) are now
 * handled by the shared NftMetadataOptions component.
 */

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
import { useState, useEffect } from 'react'

export type Currency = 'SOL' | 'USDC'

// Minimum edition prices (display units)
const MIN_PRICE_SOL = 0.1 // 0.1 SOL
const MIN_PRICE_USDC = 15 // $15 USDC

interface EditionOptionsProps {
  price: number | null // In base units (lamports for SOL, 6 decimals for USDC)
  currency: Currency
  maxSupply: number | null
  protectDownload?: boolean
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

export function EditionOptions({
  price,
  currency,
  maxSupply,
  protectDownload = false,
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
    </div>
  )
}

export default EditionOptions
