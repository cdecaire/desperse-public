import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { usePrivy, useWallets, useLinkAccount } from '@privy-io/react-auth'
import { useExportWallet } from '@privy-io/react-auth/solana'
import { buildSolanaWalletList } from '@/lib/wallets'
import { useAuth } from '@/hooks/useAuth'
import { useActiveWallet } from '@/hooks/useActiveWallet'
import { addWallet } from '@/server/functions/walletPreferences'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip } from '@/components/ui/tooltip'
import { toastSuccess, toastError } from '@/lib/toast'

export const Route = createFileRoute('/settings/account/wallets')({
  component: WalletsPage,
})

function WalletsPage() {
  const { wallets } = useWallets()
  const { user, unlinkWallet, unlinkGoogle, unlinkTwitter } = usePrivy()
  const { walletAddress, isAuthenticated, isReady, getAccessToken } = useAuth()
  const { activeWallet, wallets: dbWallets, setActiveWallet, refreshWallets } = useActiveWallet()
  const { exportWallet } = useExportWallet()
  const [unlinking, setUnlinking] = useState<string | null>(null)
  const [settingActiveId, setSettingActiveId] = useState<string | null>(null)

  const { linkWallet, linkGoogle, linkTwitter } = useLinkAccount({
    onSuccess: async ({ linkedAccount }) => {
      toastSuccess(`Successfully linked ${linkedAccount.type.replace('_oauth', '')}`)

      // If a wallet was linked, add it to the userWallets DB table
      if (linkedAccount.type === 'wallet' && 'address' in linkedAccount && linkedAccount.address) {
        try {
          const token = await getAccessToken()
          if (token) {
            await addWallet({
              data: {
                _authorization: token,
                address: linkedAccount.address,
                type: 'external',
                connector: 'privy',
                label: ('walletClient' in linkedAccount && linkedAccount.walletClient)
                  ? String(linkedAccount.walletClient)
                  : undefined,
              },
            } as never)
            refreshWallets()
          }
        } catch (e) {
          console.warn('[WalletsPage] Failed to add linked wallet to DB:', e)
        }
      }
    },
    onError: () => {
      toastError('Failed to link account')
    },
  })

  const solanaWallets = useMemo(
    () =>
      buildSolanaWalletList({
        wallets,
        linkedAccounts: user?.linkedAccounts,
        fallbackAddress: walletAddress,
      }),
    [wallets, user?.linkedAccounts, walletAddress],
  )

  const linkedSocials =
    user?.linkedAccounts?.filter((account) =>
      ['google_oauth', 'twitter_oauth'].includes(account.type),
    ) || []

  const hasGoogle = linkedSocials.some((a) => a.type === 'google_oauth')
  const hasTwitter = linkedSocials.some((a) => a.type === 'twitter_oauth')

  // Count login methods: external wallets (not embedded) + social accounts
  // Users must keep at least 1 login method
  const externalWallets = solanaWallets.filter((w) => w.walletClientType !== 'privy')
  const loginMethodCount = externalWallets.length + linkedSocials.length
  const canUnlinkLoginMethod = loginMethodCount > 1

  // Check if a Privy wallet is the active one (via DB wallets)
  const isActiveAddress = (address: string) => {
    // If we have DB wallets, check the primary flag
    if (dbWallets.length > 0) {
      return activeWallet?.address === address
    }
    // No DB wallets - embedded wallet is implicitly active
    return address === walletAddress
  }

  // Find the DB wallet for a given address
  const getDbWallet = (address: string) => {
    return dbWallets.find((w) => w.address === address)
  }

  // Find the DB wallet ID for a given address (for setting active)
  const getDbWalletId = (address: string) => {
    return getDbWallet(address)?.id
  }

  const handleSetActive = async (address: string) => {
    const dbWalletId = getDbWalletId(address)
    if (!dbWalletId) {
      toastError('Wallet not found in database')
      return
    }
    if (isActiveAddress(address)) return

    setSettingActiveId(dbWalletId)
    try {
      const result = await setActiveWallet(dbWalletId)
      if (result.success) {
        toastSuccess('Active wallet updated')
      } else {
        toastError(result.error || 'Failed to set active wallet')
      }
    } catch {
      toastError('Failed to set active wallet')
    } finally {
      setSettingActiveId(null)
    }
  }

  const handleUnlinkWallet = async (address: string) => {
    // Don't allow unlinking the primary wallet (embedded)
    if (address === walletAddress) {
      toastError('Cannot unlink your primary wallet')
      return
    }
    // Check if this would remove the last login method
    if (!canUnlinkLoginMethod) {
      toastError('Cannot unlink your only login method')
      return
    }
    setUnlinking(address)
    try {
      await unlinkWallet(address)
      toastSuccess('Wallet unlinked')
    } catch (error) {
      toastError('Failed to unlink wallet')
    } finally {
      setUnlinking(null)
    }
  }

  const handleUnlinkSocial = async (type: 'google_oauth' | 'twitter_oauth', subject: string) => {
    // Check if this would remove the last login method
    if (!canUnlinkLoginMethod) {
      toastError('Cannot unlink your only login method. Link another wallet or social account first.')
      return
    }
    setUnlinking(type)
    try {
      if (type === 'google_oauth') {
        await unlinkGoogle(subject)
      } else if (type === 'twitter_oauth') {
        await unlinkTwitter(subject)
      }
      toastSuccess(`${type === 'google_oauth' ? 'Google' : 'Twitter'} account unlinked`)
    } catch (error) {
      toastError('Failed to unlink account')
    } finally {
      setUnlinking(null)
    }
  }

  // Whether we can show wallet selection (need more than 1 visible wallet)
  const canSelectWallet = solanaWallets.length > 1

  return (
    <div className="space-y-6 pt-4">
        <div className="space-y-2">
          <h1 className="hidden md:block text-xl font-bold">Wallets & Linked</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Manage your connected wallets and linked social accounts.
        </p>
      </div>

      <div className="space-y-6">
        {/* Wallets Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">Wallets</p>
            <Button variant="default" onClick={() => linkWallet()}>
              <i className="fa-regular fa-plus mr-2" />
              Link Wallet
            </Button>
          </div>
          {solanaWallets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Solana wallets connected yet.</p>
          ) : (
            <div className="space-y-3">
              {solanaWallets.map((wallet) => {
                const isActive = isActiveAddress(wallet.address)
                const dbWallet = getDbWallet(wallet.address)
                const dbWalletId = dbWallet?.id
                const isSettingThis = settingActiveId === dbWalletId
                const walletLabel = dbWallet?.label || (wallet.walletClientType === 'privy' ? 'Embedded' : 'Linked')
                const typeTag = wallet.walletClientType === 'privy' ? 'Embedded' : 'External'

                return (
                  <div
                    key={wallet.address}
                    className={`flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 transition-colors ${
                      isActive
                        ? 'border-primary/40'
                        : 'border-border/60'
                    } ${canSelectWallet && dbWalletId ? 'cursor-pointer hover:border-primary/30' : ''}`}
                    onClick={canSelectWallet && dbWalletId && !isActive ? () => handleSetActive(wallet.address) : undefined}
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox indicator - only show when multiple wallets in DB */}
                      {canSelectWallet && (
                        <div className="shrink-0">
                          {isSettingThis ? (
                            <i className="fa-regular fa-spinner-third fa-spin text-primary text-sm" />
                          ) : (
                            <Checkbox
                              checked={isActive}
                              onCheckedChange={() => {
                                if (!isActive && dbWalletId) handleSetActive(wallet.address)
                              }}
                              className="text-primary"
                              aria-label={`Select ${walletLabel} as active wallet`}
                            />
                          )}
                        </div>
                      )}
                      <div className="w-10 h-10 rounded-full bg-muted grid place-items-center">
                        <i className="fa-regular fa-wallet text-lg text-muted-foreground" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{walletLabel}</p>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                            wallet.walletClientType === 'privy'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          }`}>
                            {typeTag}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground break-all">{wallet.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {wallet.walletClientType === 'privy' && (
                        <Tooltip content="Export private key" position="top">
                          <Button
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => exportWallet()}
                            disabled={!isReady || !isAuthenticated}
                            aria-label="Export private key"
                          >
                            <i className="fa-regular fa-key" />
                          </Button>
                        </Tooltip>
                      )}
                      {wallet.walletClientType !== 'privy' && wallet.address !== walletAddress && (
                        <Tooltip
                          content={!canUnlinkLoginMethod ? 'Cannot unlink your only login method' : 'Unlink wallet'}
                          position="top"
                        >
                          <Button
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleUnlinkWallet(wallet.address)}
                            disabled={unlinking === wallet.address || !canUnlinkLoginMethod}
                          >
                            {unlinking === wallet.address ? (
                              <i className="fa-regular fa-spinner-third fa-spin" />
                            ) : (
                              <i className="fa-regular fa-xmark" />
                            )}
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Linked Social Accounts Section */}
        <div className="space-y-3">
          <p className="text-lg font-semibold">Linked social accounts</p>

          {/* Link buttons for unlinked socials */}
          <div className="flex flex-wrap gap-2">
            {!hasGoogle && (
              <Button variant="default" onClick={() => linkGoogle()}>
                <i className="fa-brands fa-google mr-2" />
                Link Google
              </Button>
            )}
            {!hasTwitter && (
              <Button variant="default" onClick={() => linkTwitter()}>
                <i className="fa-brands fa-x-twitter mr-2" />
                Link Twitter
              </Button>
            )}
          </div>

          {linkedSocials.length === 0 ? (
            <p className="text-sm text-muted-foreground">No linked social accounts yet.</p>
          ) : (
            <div className="space-y-2">
              {linkedSocials.map((account) => (
                <div
                  key={`${account.type}-${'address' in account ? account.address : account.type}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted grid place-items-center">
                      <i
                        className={`fa-brands ${
                          account.type.startsWith('google') ? 'fa-google' : account.type.startsWith('twitter') ? 'fa-x-twitter' : 'fa-at'
                        } text-lg text-muted-foreground`}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-medium capitalize">{account.type.replace('_oauth', '')}</p>
                      {'email' in account && account.email ? (
                        <p className="text-xs text-muted-foreground break-all">{account.email}</p>
                      ) : 'username' in account && account.username ? (
                        <p className="text-xs text-muted-foreground break-all">@{account.username}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {'subject' in account && account.subject && (
                      <Tooltip
                        content={!canUnlinkLoginMethod ? 'Cannot unlink your only login method' : `Unlink ${account.type.replace('_oauth', '')}`}
                        position="top"
                      >
                        <Button
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleUnlinkSocial(account.type as 'google_oauth' | 'twitter_oauth', account.subject as string)}
                          disabled={unlinking === account.type || !canUnlinkLoginMethod}
                        >
                          {unlinking === account.type ? (
                            <i className="fa-regular fa-spinner-third fa-spin" />
                          ) : (
                            <i className="fa-regular fa-xmark" />
                          )}
                        </Button>
                      </Tooltip>
                    )}
                    <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground">
                      Connected
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
