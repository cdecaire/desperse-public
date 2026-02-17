/**
 * Network status banner
 * Shows when user is offline and disables network-required actions
 */

import { useNetworkStatus } from '@/hooks/useNetworkStatus'

export function NetworkBanner() {
  const { isOffline } = useNetworkStatus()

  if (!isOffline) {
    return null
  }

  return (
    <div className="w-full bg-(--flush-orange-500)/90 dark:bg-(--flush-orange-600)/90 text-(--flush-orange-950) dark:text-(--flush-orange-50) px-4 py-2 text-sm font-medium text-center border-b border-(--flush-orange-600) dark:border-(--flush-orange-700)">
      <span className="flex items-center justify-center gap-2">
        <i className="fa-regular fa-wifi-slash" aria-hidden="true" />
        You're offline. Some actions are disabled until you're back online.
      </span>
    </div>
  )
}

export default NetworkBanner

