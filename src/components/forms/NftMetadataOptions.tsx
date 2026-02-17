/**
 * NftMetadataOptions Component
 * Additional NFT metadata configuration (symbol, royalties, mutability)
 *
 * Main NFT fields (name, description) are now inline in CreatePostForm
 * Protected download toggle is now in EditionOptions
 */

import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface NftMetadataOptionsProps {
  nftSymbol: string | null
  sellerFeeBasisPoints: number | null // 0-1000 (0-10%)
  isMutable: boolean
  onNftSymbolChange: (value: string | null) => void
  onSellerFeeBasisPointsChange: (value: number | null) => void
  onIsMutableChange: (value: boolean) => void
  disabled?: boolean // Disables all fields (e.g., during submission)
  metadataDisabled?: boolean // Disables NFT metadata fields
  mutabilityDisabled?: boolean // Disables mutability toggle (locked after minting)
  mode: 'collectible' | 'edition'
}

export function NftMetadataOptions({
  nftSymbol,
  sellerFeeBasisPoints,
  isMutable = true,
  onNftSymbolChange,
  onSellerFeeBasisPointsChange,
  onIsMutableChange,
  disabled,
  metadataDisabled,
  mutabilityDisabled,
  mode,
}: NftMetadataOptionsProps) {
  const isMetadataDisabled = disabled || metadataDisabled
  const isMutabilityDisabled = disabled || mutabilityDisabled
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  // Convert seller fee basis points to percentage for display
  const sellerFeePercent = sellerFeeBasisPoints ? (sellerFeeBasisPoints / 100).toFixed(2) : '0.00'

  return (
    <div className="p-4 bg-card border border-border rounded-xl shadow-md dark:bg-card">
      <button
        type="button"
        onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
        className="flex items-center justify-between w-full text-sm text-foreground transition-colors hover:text-foreground/80"
      >
        <span>Additional details</span>
        <i className={cn(
          'fa-regular transition-transform',
          isAdvancedOpen ? 'fa-chevron-up' : 'fa-chevron-down'
        )} />
      </button>

      {isAdvancedOpen && (
        <div className="space-y-4 mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Optional metadata shown in wallets and marketplaces.
          </p>

          {/* NFT Symbol */}
          <div>
            <label className="text-sm text-foreground mb-2 block">
              Symbol
            </label>
            <div className="relative">
              <Input
                type="text"
                maxLength={10}
                value={nftSymbol || ''}
                onChange={(e) => onNftSymbolChange(e.target.value.trim().toUpperCase() || null)}
                placeholder="DSPRS"
                disabled={isMetadataDisabled}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                {(nftSymbol || '').length} / 10
              </div>
            </div>
          </div>

          {/* Royalties */}
          <div className="space-y-2">
            <Tooltip content="Royalties for secondary sales (0-10%).">
              <label className="text-sm text-foreground cursor-help border-b border-dotted border-muted-foreground/40">
                Royalties
              </label>
            </Tooltip>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={sellerFeePercent}
                onChange={(e) => {
                  const percent = parseFloat(e.target.value)
                  if (!isNaN(percent) && percent >= 0 && percent <= 10) {
                    onSellerFeeBasisPointsChange(Math.round(percent * 100))
                  } else if (e.target.value === '') {
                    onSellerFeeBasisPointsChange(0)
                  }
                }}
                placeholder="0.00"
                disabled={isMetadataDisabled}
                className="max-w-[120px]"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            {mode === 'collectible' && (
              <p className="text-xs text-muted-foreground">
                Royalties from secondary marketplace sales
              </p>
            )}
          </div>

          {/* Mutability */}
          <div className="space-y-3">
            <Tooltip content={
              isMutabilityDisabled
                ? 'Mutability cannot be changed after the NFT has been minted'
                : isMutable
                  ? 'Metadata can be updated after creation'
                  : 'Metadata will be locked and cannot be changed after creation'
            }>
              <label className="text-sm text-foreground cursor-help border-b border-dotted border-muted-foreground/40">
                Metadata Mutable
              </label>
            </Tooltip>

            {/* Locked message when minted */}
            {isMutabilityDisabled && (
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <i className="fa-regular fa-lock mr-2" />
                  Mutability is locked once the NFT has been minted.
                </p>
              </div>
            )}

            {/* Toggle for mutability */}
            <div className="flex items-center gap-3">
              <Switch
                checked={isMutable}
                onCheckedChange={onIsMutableChange}
                disabled={isMutabilityDisabled}
                aria-label="Toggle metadata mutability"
              />
              <span className="text-sm">
                {isMutable ? 'Mutable' : 'Immutable'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NftMetadataOptions
