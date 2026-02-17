/**
 * PriceTooltip Component
 * Shows a breakdown of edition pricing including fees, royalties, and USD value
 * Only displays on hover (web only)
 */

import { Tooltip } from '@/components/ui/tooltip'
import { useSolPrice } from '@/hooks/useSolPrice'
import { env } from '@/config/env'

interface PriceTooltipProps {
  children: React.ReactNode
  /** Price in lamports (SOL) or micro units (USDC) */
  price: number
  currency: 'SOL' | 'USDC'
  /** Creator royalty in basis points (0-1000 = 0-10%) */
  sellerFeeBasisPoints?: number | null
}

// Minting fee in SOL (must match MINTING_FEE_LAMPORTS in transactionBuilder.ts)
// Defined here to avoid importing server-side Solana dependencies
const MINTING_FEE_SOL = 0.01 // 10,000,000 lamports

export function PriceTooltip({
  children,
  price,
  currency,
  sellerFeeBasisPoints,
}: PriceTooltipProps) {
  const { data: solPriceData } = useSolPrice()

  // Convert to display units
  const displayPrice = currency === 'SOL'
    ? price / 1_000_000_000
    : price / 1_000_000

  // Calculate fees
  const platformFeePct = env.PLATFORM_FEE_BPS / 100 // 5%
  const platformFee = displayPrice * (env.PLATFORM_FEE_BPS / 10_000)

  const royaltyPct = sellerFeeBasisPoints ? sellerFeeBasisPoints / 100 : 0

  const creatorReceives = displayPrice - platformFee

  // USD conversion
  const solPriceUsd = solPriceData?.priceUsd ?? 0
  const usdValue = currency === 'SOL'
    ? displayPrice * solPriceUsd
    : displayPrice // USDC is 1:1

  // Minting fee is always in SOL, even for USDC purchases
  const mintingFeeUsd = MINTING_FEE_SOL * solPriceUsd

  // Total cost to buyer (price + minting fee)
  const totalCostUsd = usdValue + mintingFeeUsd

  // Convert amounts to USD
  const toUsd = (amount: number) => {
    if (currency === 'SOL') {
      return amount * solPriceUsd
    }
    return amount // USDC is 1:1
  }

  const platformFeeUsd = toUsd(platformFee)
  const creatorReceivesUsd = toUsd(creatorReceives)

  const formatUsd = (amount: number) => {
    if (amount < 0.01 && amount > 0) return '<$0.01'
    return `$${amount.toFixed(2)}`
  }

  const tooltipContent = (
    <div className="space-y-2 text-xs">
      {/* Total cost to buyer */}
      <div className="flex justify-between gap-4">
        <span className="text-muted-foreground">You pay</span>
        <span className="font-medium">
          {formatUsd(totalCostUsd)}
        </span>
      </div>

      <div className="border-t border-border/50 pt-2 space-y-1.5">
        {/* Price breakdown */}
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Listed price</span>
          <span>{formatUsd(usdValue)}</span>
        </div>

        {/* Minting & network fee */}
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Minting & network</span>
          <span>{formatUsd(mintingFeeUsd)}</span>
        </div>
      </div>

      <div className="border-t border-border/50 pt-2 space-y-1.5">
        {/* Platform fee */}
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Platform fee ({platformFeePct}%)</span>
          <span>{formatUsd(platformFeeUsd)}</span>
        </div>

        {/* Creator royalty - only show if set */}
        {royaltyPct > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Resale royalty ({royaltyPct}%)</span>
            <span className="text-muted-foreground/70">on secondary</span>
          </div>
        )}
      </div>

      {/* Creator receives */}
      <div className="border-t border-border/50 pt-2">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Creator receives</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            {formatUsd(creatorReceivesUsd)}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <Tooltip content={tooltipContent} position="bottom">
      {children}
    </Tooltip>
  )
}
