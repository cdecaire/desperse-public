/**
 * Post overlay pill state shared by PostCard (feed) and GalleryCard (grids).
 * Owns the timed-edition countdown clock and merges it with the display state
 * from getPostDisplayState, so both surfaces render identical pill text.
 */

import { useEffect, useState } from 'react'
import { getPostDisplayState, type PostDisplayState } from './postDisplay'
import type { PostCardData } from './PostCard'

// Format a millisecond countdown into a compact string
export function formatCountdownCompact(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 60) return `${totalMin}m`
  const hours = Math.floor(totalMin / 60)
  if (hours < 24) return `${hours}h ${totalMin % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

// Compute a compact time label for timed edition price pills
// Accepts `now` so it can use a live-updating clock
export function getMintTimeLabel(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
  now: Date,
): { text: string; isLive: boolean } | null {
  if (!start && !end) return null
  const startDate = start ? new Date(start) : null
  const endDate = end ? new Date(end) : null

  // Not started yet
  if (startDate && now < startDate) {
    const msUntilStart = startDate.getTime() - now.getTime()
    const hoursUntilStart = msUntilStart / 3600000

    // Within 12 hours → live countdown
    if (hoursUntilStart <= 12) {
      return { text: formatCountdownCompact(msUntilStart), isLive: true }
    }

    // Further out → static date
    return {
      text: startDate.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      }) + ' @ ' + startDate.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit',
      }),
      isLive: false,
    }
  }

  // Active → show time remaining
  if (endDate && now < endDate) {
    const ms = endDate.getTime() - now.getTime()
    return { text: `${formatCountdownCompact(ms)} left`, isLive: true }
  }

  // Ended
  return null
}

export interface PostOverlayPillState {
  display: PostDisplayState
  /** Merged countdown + price text for timed editions, e.g. "53m left · 0.10 SOL" */
  timedPillText: string | null
  /** True while the mint window hasn't opened yet */
  isScheduled: boolean
}

/**
 * Display state for a post's media-overlay pills, with a live 30s clock for
 * timed-edition countdowns. Pass `isVisible: false` to pause the clock while
 * the card is off-screen (the consumer owns its own visibility observer).
 */
export function usePostOverlayPill(
  post: PostCardData,
  {
    localCollectCount,
    localEditionSupply,
    isVisible = true,
  }: {
    localCollectCount?: number
    localEditionSupply?: number
    isVisible?: boolean
  } = {}
): PostOverlayPillState {
  const display = getPostDisplayState(post, { localCollectCount, localEditionSupply })

  // Live clock for timed edition countdowns (ticks every 30s when needed)
  const [now, setNow] = useState(() => new Date())
  const hasMintWindow = post.type === 'edition' && !!(post.mintWindowStart || post.mintWindowEnd)
  useEffect(() => {
    if (!hasMintWindow || !isVisible) return
    const result = getMintTimeLabel(post.mintWindowStart, post.mintWindowEnd, new Date())
    if (!result?.isLive) return
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [hasMintWindow, isVisible, post.mintWindowStart, post.mintWindowEnd])

  // Time-aware pill text for timed editions
  const mintTimeResult = post.type === 'edition'
    ? getMintTimeLabel(post.mintWindowStart, post.mintWindowEnd, now)
    : null
  const mintTimeLabel = mintTimeResult?.text ?? null
  const isScheduled = !!(post.mintWindowStart && new Date(post.mintWindowStart) > now)
  // Active: "53m left · 0.10 SOL"
  // Scheduled (>12h): "Starts Feb 22, 2026 @ 5:30PM · 0.10 SOL"
  // Scheduled (≤12h): "Starts in 2h 30m · 0.10 SOL"
  const timedPillText = mintTimeLabel
    ? isScheduled
      ? display.overlayPillText
        ? `Starts ${mintTimeResult?.isLive ? 'in ' : ''}${mintTimeLabel} · ${display.overlayPillText.replace(/^✓\s*/, '')}`
        : `Starts ${mintTimeResult?.isLive ? 'in ' : ''}${mintTimeLabel}`
      : display.overlayPillText
        ? `${mintTimeLabel} · ${display.overlayPillText.replace(/^✓\s*/, '')}`
        : mintTimeLabel
    : null

  return { display, timedPillText, isScheduled }
}
