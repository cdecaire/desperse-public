/**
 * RPC health status banner
 * Shows when RPC/blockchain is unavailable and disables blockchain actions.
 *
 * Migration shim (Phase 2 — Sable adoption): @cdecaire/sable <Banner>,
 * variant="destructive" + fill="solid" for a loud error alert (replaces the
 * previous raw bg-red-500).
 */

import { useRpcHealthContext } from '@/components/providers/RpcHealthProvider'
import { Icon } from '@/components/ui/icon'
import { useAuth } from '@/hooks/useAuth'
import { Banner } from '@cdecaire/sable'

export function RpcHealthBanner() {
  const { isAuthenticated } = useAuth()
  const { isRpcHealthy } = useRpcHealthContext()

  if (!isAuthenticated || isRpcHealthy) {
    return null
  }

  return (
    <Banner variant="destructive" fill="solid" live="polite">
      <Icon name="triangle-exclamation" variant="regular" />
      Blockchain is currently unavailable. Collect and buy actions are temporarily disabled.
    </Banner>
  )
}

export default RpcHealthBanner
