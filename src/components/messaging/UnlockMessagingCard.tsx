/**
 * UnlockMessagingCard Component
 * Shows unlock paths for users who cannot message a creator
 */

import { useState } from 'react'
import type { DmEligibilityResult } from '@/hooks/useDmEligibility'
import { TipDialog } from '@/components/tipping/TipButton'
import { SeekerIcon } from '@/components/tipping/SeekerIcon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UnlockMessagingCardProps {
  eligibility: DmEligibilityResult
  creatorName?: string
  creatorSlug?: string
  creatorAvatarUrl?: string | null
  className?: string
}

function getUnlockPathIcon(method: string): string {
  switch (method) {
    case 'edition_purchase':
      return 'fa-bag-shopping'
    case 'collectible_count':
      return 'fa-gem'
    case 'tip_unlock':
      return 'fa-coins'
    default:
      return 'fa-circle-question'
  }
}

export function UnlockMessagingCard({
  eligibility,
  creatorName = 'this creator',
  creatorAvatarUrl,
  className,
}: UnlockMessagingCardProps) {
  const [tipDialogOpen, setTipDialogOpen] = useState(false)

  if (eligibility.allowed) {
    return null
  }

  if (eligibility.creatorDmsDisabled) {
    return (
      <div className={cn('flex flex-col items-center text-center', className)}>
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
          <i className="fa-regular fa-message-slash text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium">Messaging not available</p>
        <p className="text-xs text-muted-foreground mt-1">
          {creatorName} has direct messages disabled.
        </p>
      </div>
    )
  }

  const hasTipPath = eligibility.unlockPaths.some((p) => p.method === 'tip_unlock')

  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <i className="fa-regular fa-lock text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium">Unlock messaging</p>
      <p className="text-xs text-muted-foreground mt-1">
        To prevent spam, messaging unlocks after supporting {creatorName}.
      </p>

      {/* Unlock requirements */}
      {eligibility.unlockPaths.length > 0 && (
        <ul className="mt-4 space-y-2 w-full">
          {eligibility.unlockPaths.map((path) => (
            <li key={path.method} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <i
                className={cn('fa-regular', getUnlockPathIcon(path.method))}
                aria-hidden="true"
              />
              <span>{path.message}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Tip-to-unlock action button */}
      {hasTipPath && eligibility.creatorId && eligibility.tipMinAmount && (
        <>
          <Button
            variant="outline"
            size="default"
            onClick={() => setTipDialogOpen(true)}
            className="mt-4 gap-2"
          >
            <SeekerIcon className="w-4 h-4" />
            Tip {eligibility.tipMinAmount} SKR to Unlock
          </Button>

          <TipDialog
            open={tipDialogOpen}
            onOpenChange={setTipDialogOpen}
            creatorId={eligibility.creatorId}
            creatorName={creatorName}
            creatorAvatarUrl={creatorAvatarUrl}
            context="message_unlock"
            defaultAmount={eligibility.tipMinAmount}
          />
        </>
      )}
    </div>
  )
}
