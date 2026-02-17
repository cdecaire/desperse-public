/**
 * RPC health status banner
 * Shows when RPC/blockchain is unavailable and disables blockchain actions
 */

import { useRpcHealthContext } from '@/components/providers/RpcHealthProvider'
import { useAuth } from '@/hooks/useAuth'

export function RpcHealthBanner() {
  const { isAuthenticated } = useAuth()
  const { isRpcHealthy } = useRpcHealthContext()

  if (!isAuthenticated || isRpcHealthy) {
    return null
  }

  return (
    <div className="w-full bg-red-500/90 dark:bg-red-600/90 text-red-900 dark:text-red-100 px-4 py-2 text-sm font-medium text-center border-b border-red-600 dark:border-red-700">
      <span className="flex items-center justify-center gap-2">
        <i className="fa-regular fa-triangle-exclamation" aria-hidden="true" />
        Blockchain is currently unavailable. Collect and buy actions are temporarily disabled.
      </span>
    </div>
  )
}

export default RpcHealthBanner

