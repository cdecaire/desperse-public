/**
 * Network status banner
 * Shows when user is offline and disables network-required actions.
 *
 * Migration shim (Phase 2 — Sable adoption): @cdecaire/sable <Banner>,
 * variant="warning" + fill="solid" for a loud, can't-miss offline alert.
 */

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { Icon } from '@/components/ui/icon'
import { Banner } from '@cdecaire/sable'

export function NetworkBanner() {
  const { isOffline } = useNetworkStatus()

  if (!isOffline) {
    return null
  }

  return (
    <Banner variant="warning" fill="solid" live="polite">
      <Icon name="wifi-slash" variant="regular" />
      You're offline. Some actions are disabled until you're back online.
    </Banner>
  )
}

export default NetworkBanner
