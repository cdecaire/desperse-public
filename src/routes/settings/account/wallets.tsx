import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePrivy, useWallets, useLinkAccount } from '@privy-io/react-auth'
import { useExportWallet } from '@privy-io/react-auth/solana'
import { buildSolanaWalletList } from '@/lib/wallets'
import { useAuth } from '@/hooks/useAuth'
import { useActiveWallet } from '@/hooks/useActiveWallet'
import { addWallet, syncWallets } from '@/server/functions/walletPreferences'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip } from '@/components/ui/tooltip'
import { Icon } from '@/components/ui/icon'
import { toastSuccess, toastError } from '@/lib/toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { Stack, Row } from '@cdecaire/sable/layout'

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
  const hasSynced = useRef(false)

  // Reconcile: sync any Privy-linked wallets missing from the DB.
  // Handles the case where Privy linking succeeded but DB insert failed.
  // Includes both Solana (signing) and Ethereum (verification-only) wallets — the
  // server marks them with the correct primary flag based on address format.
  const linkedWalletAccounts = useMemo(() => {
    if (!user?.linkedAccounts) return []
    return user.linkedAccounts.filter(
      (a) =>
        a.type === 'wallet' &&
        (a.chainType === 'solana' || a.chainType === 'ethereum') &&
        'address' in a &&
        a.address,
    )
  }, [user?.linkedAccounts])

  useEffect(() => {
    if (hasSynced.current || !isAuthenticated || !isReady || linkedWalletAccounts.length === 0) return
    hasSynced.current = true

    const doSync = async () => {
      try {
        const token = await getAccessToken()
        if (!token) return

        const walletsToSync = linkedWalletAccounts.map((a) => ({
          address: (a as { address: string }).address,
          type: ('walletClientType' in a && a.walletClientType === 'privy' ? 'embedded' : 'external') as 'embedded' | 'external',
          label: ('walletClient' in a && a.walletClient) ? String(a.walletClient) : undefined,
        }))

        await syncWallets({ data: { _authorization: token, wallets: walletsToSync } } as never)
        refreshWallets()
      } catch (e) {
        console.warn('[WalletsPage] Background wallet sync failed:', e)
      }
    }
    doSync()
  }, [isAuthenticated, isReady, linkedWalletAccounts, getAccessToken, refreshWallets])

  const { linkWallet, linkGoogle, linkTwitter } = useLinkAccount({
    onSuccess: async ({ linkedAccount }) => {
      toastSuccess(`Successfully linked ${linkedAccount.type.replace('_oauth', '')}`)

      // If a wallet was linked, add it to the userWallets DB table
      if (linkedAccount.type === 'wallet' && 'address' in linkedAccount && linkedAccount.address) {
        try {
          const token = await getAccessToken()
          if (!token) {
            toastError('Failed to save wallet — please refresh the page')
            return
          }
          const result = await addWallet({
            data: {
              _authorization: token,
              address: linkedAccount.address,
              type: 'external',
              connector: 'privy',
              label: ('walletClient' in linkedAccount && linkedAccount.walletClient)
                ? String(linkedAccount.walletClient)
                : undefined,
            },
          } as never) as { success: boolean; error?: string }
          if (!result.success) {
            console.warn('[WalletsPage] addWallet returned error:', result.error)
            toastError('Wallet linked but failed to save — please refresh the page')
          }
        } catch (e) {
          console.warn('[WalletsPage] Failed to add linked wallet to DB:', e)
          toastError('Wallet linked but failed to save — please refresh the page')
        }
        refreshWallets()
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

  // Ethereum wallets are linked for verification/provenance only (e.g. Foundation
  // preservation). They never sign Desperse transactions and cannot be set as primary.
  const ethereumWallets = useMemo(() => {
    if (!user?.linkedAccounts) return []
    return user.linkedAccounts
      .filter(
        (a) => a.type === 'wallet' && a.chainType === 'ethereum' && 'address' in a && a.address,
      )
      .map((a) => ({
        address: (a as { address: string }).address,
        walletClientType:
          'walletClientType' in a ? (a.walletClientType as string | undefined) : undefined,
      }))
  }, [user?.linkedAccounts])

  const linkedSocials =
    user?.linkedAccounts?.filter((account) =>
      ['google_oauth', 'twitter_oauth'].includes(account.type),
    ) || []

  const hasGoogle = linkedSocials.some((a) => a.type === 'google_oauth')
  const hasTwitter = linkedSocials.some((a) => a.type === 'twitter_oauth')

  // Count login methods: external Solana wallets + Ethereum wallets + social accounts.
  // Users must keep at least 1 login method (the embedded Solana wallet doesn't count
  // because it can't be used to sign in on its own).
  const externalWallets = solanaWallets.filter((w) => w.walletClientType !== 'privy')
  const loginMethodCount = externalWallets.length + ethereumWallets.length + linkedSocials.length
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
    <Stack gap={3} className="pt-4">
        <PageHeader
          title="Wallets & Linked"
          description="Your Solana wallet signs all Desperse transactions. Ethereum and social accounts can be linked for verification and login."
        />

      <Stack gap={3}>
        {/* Wallets Section */}
        <Stack gap={1.5}>
          <Row align="center" justify="between">
            <p className="text-title-lg">Wallets</p>
            <Button variant="default" onClick={() => linkWallet()}>
              <Icon name="plus" variant="regular" className="mr-2" />
              Link Wallet
            </Button>
          </Row>
          {solanaWallets.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">No Solana wallets connected yet.</p>
          ) : (
            <Stack gap={1.5}>
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
                    <Row align="center" gap={1.5}>
                      {/* Checkbox indicator - only show when multiple wallets in DB */}
                      {canSelectWallet && (
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isSettingThis ? (
                            <Icon name="spinner-third" variant="regular" spin className="text-primary text-sm" />
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
                        <Icon name="wallet" variant="regular" className="text-lg text-muted-foreground" />
                      </div>
                      <Stack gap={0.25}>
                        <Row align="center" gap={1}>
                          <p className="font-medium">{walletLabel}</p>
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                            wallet.walletClientType === 'privy'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          }`}>
                            {typeTag}
                          </span>
                        </Row>
                        <p className="text-caption text-muted-foreground break-all">{wallet.address}</p>
                      </Stack>
                    </Row>
                    <Row align="center" gap={1} onClick={(e) => e.stopPropagation()}>
                      {wallet.walletClientType === 'privy' && (
                        <Tooltip content="Export private key" position="top">
                          <Button
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => exportWallet()}
                            disabled={!isReady || !isAuthenticated}
                            aria-label="Export private key"
                          >
                            <Icon name="key" variant="regular" />
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
                              <Icon name="spinner-third" variant="regular" spin />
                            ) : (
                              <Icon name="xmark" variant="regular" />
                            )}
                          </Button>
                        </Tooltip>
                      )}
                    </Row>
                  </div>
                )
              })}
            </Stack>
          )}
        </Stack>

        {/* Ethereum Wallets Section — verification/provenance only */}
        {ethereumWallets.length > 0 && (
          <Stack gap={1.5}>
            <Stack gap={0.5}>
              <p className="text-title-lg">Ethereum wallets</p>
              <p className="text-body-sm text-muted-foreground">
                Linked for verification only. Desperse signs all transactions on Solana —
                Ethereum wallets cannot be set as your active wallet.
              </p>
            </Stack>
            <Stack gap={1.5}>
              {ethereumWallets.map((wallet) => {
                const shortAddress = `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
                const walletLabel = wallet.walletClientType
                  ? wallet.walletClientType.charAt(0).toUpperCase() + wallet.walletClientType.slice(1)
                  : 'Ethereum wallet'
                const isUnlinkingThis = unlinking === wallet.address
                return (
                  <div
                    key={wallet.address}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
                  >
                    <Row align="center" gap={1.5} className="min-w-0">
                      <div className="w-10 h-10 rounded-full bg-muted grid place-items-center shrink-0">
                        <Icon name="ethereum" variant="brands" className="text-lg text-muted-foreground" />
                      </div>
                      <Stack gap={0.25} className="min-w-0">
                        <Row align="center" gap={1}>
                          <p className="font-medium truncate">{walletLabel}</p>
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Verification
                          </span>
                        </Row>
                        <p className="text-caption text-muted-foreground font-mono">{shortAddress}</p>
                      </Stack>
                    </Row>
                    <Tooltip content={canUnlinkLoginMethod ? 'Unlink wallet' : 'You need at least one login method'}>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!canUnlinkLoginMethod || isUnlinkingThis}
                        onClick={() => handleUnlinkWallet(wallet.address)}
                        aria-label={`Unlink ${walletLabel}`}
                      >
                        {isUnlinkingThis ? (
                          <Icon name="spinner-third" variant="regular" spin />
                        ) : (
                          <Icon name="link-slash" variant="regular" />
                        )}
                      </Button>
                    </Tooltip>
                  </div>
                )
              })}
            </Stack>
          </Stack>
        )}

        {/* Linked Social Accounts Section */}
        <Stack gap={1.5}>
          <p className="text-title-lg">Linked social accounts</p>

          {/* Link buttons for unlinked socials */}
          <Row gap={1} wrap>
            {!hasGoogle && (
              <Button variant="default" onClick={() => linkGoogle()}>
                <Icon name="google" variant="brands" className="mr-2" />
                Link Google
              </Button>
            )}
            {!hasTwitter && (
              <Button variant="default" onClick={() => linkTwitter()}>
                <Icon name="x-twitter" variant="brands" className="mr-2" />
                Link Twitter
              </Button>
            )}
          </Row>

          {linkedSocials.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">No linked social accounts yet.</p>
          ) : (
            <Stack gap={1}>
              {linkedSocials.map((account) => (
                <div
                  key={`${account.type}-${'address' in account ? account.address : account.type}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
                >
                  <Row align="center" gap={1.5}>
                    <div className="w-10 h-10 rounded-full bg-muted grid place-items-center">
                      <Icon
                        name={account.type.startsWith('google') ? 'google' : account.type.startsWith('twitter') ? 'x-twitter' : 'at'}
                        variant={account.type.startsWith('google') || account.type.startsWith('twitter') ? 'brands' : 'solid'}
                        className="text-lg text-muted-foreground"
                      />
                    </div>
                    <Stack gap={0.25}>
                      <p className="font-medium capitalize">{account.type.replace('_oauth', '')}</p>
                      {'email' in account && account.email ? (
                        <p className="text-caption text-muted-foreground break-all">{account.email}</p>
                      ) : 'username' in account && account.username ? (
                        <p className="text-caption text-muted-foreground break-all">@{account.username}</p>
                      ) : null}
                    </Stack>
                  </Row>
                  <Row align="center" gap={1}>
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
                            <Icon name="spinner-third" variant="regular" spin />
                          ) : (
                            <Icon name="xmark" variant="regular" />
                          )}
                        </Button>
                      </Tooltip>
                    )}
                    <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground">
                      Connected
                    </span>
                  </Row>
                </div>
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Stack>
  )
}
