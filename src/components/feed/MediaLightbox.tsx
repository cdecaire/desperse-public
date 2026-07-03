/**
 * MediaLightbox Component
 * Full-size media viewer shell for post detail — thin wrapper over Sable's
 * Lightbox (full-bleed overlay, focus trap, Esc/backdrop dismiss).
 *
 * Content-agnostic on purpose: it knows nothing about posts/assets/media
 * types. Callers (PostMedia, MediaCarousel) render THEMSELVES as children in
 * `contained` mode — this avoids a circular import (both of those already
 * compose this shell for their own "expandable" case).
 */

import type { ReactNode } from 'react'
import { Lightbox, LightboxContent } from '@cdecaire/sable'

interface MediaLightboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function MediaLightbox({ open, onOpenChange, children }: MediaLightboxProps) {
  return (
    <Lightbox open={open} onOpenChange={onOpenChange}>
      <LightboxContent className="flex items-center justify-center">
        <div className="relative h-full w-full">{children}</div>
      </LightboxContent>
    </Lightbox>
  )
}

export default MediaLightbox
