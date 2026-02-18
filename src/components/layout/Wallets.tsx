/**
 * Wallets Component
 * - Desktop (sidebar): Popover menu anchored above settings
 * - Mobile (bottomnav): Native-feeling bottom sheet
 * Shows Privy wallet details including wallet ID
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useWallets, usePrivy } from '@privy-io/react-auth'
import { useFundWallet } from '@privy-io/react-auth/solana'
import { useQuery } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '../../hooks/useAuth'
import { useActiveWallet } from '@/hooks/useActiveWallet'
import { buildSolanaWalletList } from '@/lib/wallets'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getWalletOverview } from '@/server/functions/wallets'
import { getResponsiveImageProps, resolveDecentralizedUri } from '@/lib/imageUrl'
import { usePreferences } from '@/hooks/usePreferences'
import { getExplorerUrl } from '@/server/functions/preferences'
import { SeekerIcon } from '@/components/tipping/SeekerIcon'

interface WalletsProps {
  /** Display variant - sidebar for desktop, bottomnav for mobile */
  variant?: 'sidebar' | 'bottomnav'
}

export default function Wallets({ variant = 'sidebar' }: WalletsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts' | 'activity'>('tokens')
  const [nftLayout, setNftLayout] = useState<'grid' | 'list'>('grid')
  const menuRef = useRef<HTMLDivElement>(null)
  const { wallets } = useWallets()
  const { user } = usePrivy()
  const { isAuthenticated, isReady, walletAddress, privyId } = useAuth()
  const { activeWallet, activeAddress } = useActiveWallet()
  const { fundWallet } = useFundWallet()
  const { preferences } = usePreferences()

  const isMobile = variant === 'bottomnav'

  const solanaWallets = useMemo(
    () =>
      buildSolanaWalletList({
        wallets,
        linkedAccounts: user?.linkedAccounts,
        fallbackAddress: walletAddress,
      }),
    [wallets, user?.linkedAccounts, walletAddress],
  )

  // Close popover menu when clicking outside (desktop only)
  useEffect(() => {
    if (isMobile) return // Sheet handles its own outside clicks

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isMobile])

  // Close menu on escape
  useEffect(() => {
    if (isMobile) return // Sheet handles its own escape key

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, isMobile])

  // Show only the active wallet in the panel
  const walletsForQuery = activeAddress
    ? [{ address: activeAddress, walletClientType: activeWallet?.type === 'embedded' ? ('privy' as const) : undefined }]
    : solanaWallets.length > 0
      ? [solanaWallets[0]] // Fallback: first Privy wallet if no active wallet set
      : walletAddress
        ? [{ address: walletAddress, walletClientType: 'privy' as const }]
        : []

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['wallets-overview', walletsForQuery],
    queryFn: async () => {
      const result = await getWalletOverview({
        data: {
          privyId: privyId || undefined,
          wallets: walletsForQuery,
        },
      } as any)
      return result as {
        success: boolean
        error?: string
        totalUsd: number
        solPriceUsd: number
        solChangePct24h?: number
        wallets: Array<{ address: string; walletClientType?: string; sol: number; usdc: number; usdValue: number }>
        tokens: Array<{
          mint: string
          symbol: string
          name: string
          iconUrl: string | null
          balance: number
          decimals: number
          priceUsd: number | null
          totalValueUsd: number | null
          changePct24h: number | null
          isAppToken: boolean
        }>
        activity: Array<{
          id: string
          signature?: string
          token: 'SOL' | 'USDC' | null
          amount: number | null
          direction: 'in' | 'out' | null
          timestamp: number
          type: 'edition_sale' | 'edition_purchase' | 'collection' | 'transfer_in' | 'transfer_out'
          context: {
            type: 'edition_sale' | 'edition_purchase' | 'collection' | 'transfer_in' | 'transfer_out'
            post?: {
              id: string
              caption: string | null
              coverUrl: string | null
              mediaUrl: string
            }
            counterparty?: {
              id: string
              displayName: string | null
              usernameSlug: string
              avatarUrl: string | null
            }
            creator?: {
              id: string
              displayName: string | null
              usernameSlug: string
              avatarUrl: string | null
            }
          }
        }>
        nfts: Array<{
          id: string
          content?: {
            json_uri?: string
            metadata?: {
              name?: string
              symbol?: string
              description?: string
              image?: string
            }
            files?: Array<{
              uri?: string
              mime?: string
            }>
          }
          ownership?: {
            owner?: string
          }
          compression?: {
            compressed?: boolean
          }
        }>
      }
    },
    enabled: isAuthenticated && isReady && walletsForQuery.length > 0,
  })

  // Refetch wallet data when menu opens
  useEffect(() => {
    if (isOpen && isAuthenticated && isReady) {
      refetch()
    }
  }, [isOpen, isAuthenticated, isReady, refetch])

  // Shared menu content
  const MenuContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="px-4 py-3 text-sm text-muted-foreground text-center">
          Please log in to view wallets
        </div>
      )
    }

    if (!isReady) {
      return (
        <div className="px-4 py-3 text-sm text-muted-foreground text-center">
          Loading wallets...
        </div>
      )
    }

    if (isError) {
      return (
        <div className="px-4 py-3 text-sm text-muted-foreground text-center">
          Unable to load wallets right now.
        </div>
      )
    }

    if (isLoading || !data) {
      return (
        <div className="space-y-3 px-3 py-2">
          <div className="h-10 bg-muted rounded-lg animate-pulse" />
          <div className="h-8 bg-muted rounded-lg animate-pulse" />
          <div className="h-8 bg-muted rounded-lg animate-pulse" />
        </div>
      )
    }

    if (!data.success) {
      return (
        <div className="px-4 py-3 text-sm text-muted-foreground text-center space-y-2">
          <p>Unable to load wallet</p>
          {data.error && <p className="text-xs">{data.error}</p>}
        </div>
      )
    }

    if (data.wallets.length === 0) {
      return (
        <div className="px-4 py-3 text-sm text-muted-foreground text-center space-y-2">
          <p>No Solana wallets found</p>
          <p className="text-xs">Your embedded Solana wallet will appear here once created.</p>
        </div>
      )
    }

    const activity = data.activity ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentUserId = (data as any).currentUserId as string | undefined
    // Use the active wallet for balance display and funding
    const displayWallet = data.wallets[0] // We only query one wallet now (the active one)
    const primaryAddress = displayWallet?.address

    // Calculate totals based on the active wallet (with NaN protection)
    const walletSol = typeof displayWallet?.sol === 'number' && !isNaN(displayWallet.sol) ? displayWallet.sol : 0
    const walletUsdc = typeof displayWallet?.usdc === 'number' && !isNaN(displayWallet.usdc) ? displayWallet.usdc : 0
    const solPrice = typeof data.solPriceUsd === 'number' && !isNaN(data.solPriceUsd) ? data.solPriceUsd : 0
    const totalSolUsd = walletSol * solPrice
    const totalUsdcUsd = walletUsdc
    const totalUsd = totalSolUsd + totalUsdcUsd
    const solChangePct = typeof data.solChangePct24h === 'number' && !isNaN(data.solChangePct24h) ? data.solChangePct24h : 0
    const solDeltaUsd = totalSolUsd * (solChangePct / 100)
    const totalDeltaUsd = solDeltaUsd // USDC assumed stable
    const totalChangePct = totalUsd > 0 ? (totalDeltaUsd / totalUsd) * 100 : 0
    const changePositive = totalDeltaUsd >= 0

    const handleFundWallet = async () => {
      if (!primaryAddress) {
        toast.error('No wallet address available')
        return
      }

      if (!isReady || !isAuthenticated) {
        toast.error('Please wait for wallet to be ready')
        return
      }

      try {
        await fundWallet({ address: primaryAddress })
      } catch (error) {
        console.error('Error funding wallet:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const errorDetails = error instanceof Error ? error.stack : String(error)
        console.error('Full error details:', errorDetails)
        
        // Provide more helpful error message
        if (errorMessage.includes('not authenticated') || errorMessage.includes('not ready')) {
          toast.error('Wallet not ready. Please try again.')
        } else {
          toast.error(`Failed to open funding dialog: ${errorMessage}`)
        }
      }
    }

    const TokensView = () => {
      const tokens = data.tokens || []
      const solPrice = typeof data.solPriceUsd === 'number' && !isNaN(data.solPriceUsd) ? data.solPriceUsd : 0

      // Separate app tokens from other tokens
      const appTokens = tokens.filter((t) => t.isAppToken)
      const otherTokens = tokens.filter((t) => !t.isAppToken)

      // Fallback: if no tokens from API, use the wallet balances (backward compat)
      const fallbackWallet = data.wallets[0]
      const useWalletFallback = appTokens.length === 0 && fallbackWallet

      // Token card component
      const TokenCard = ({ token, showPriceChange = false }: { token: typeof tokens[0]; showPriceChange?: boolean }) => {
        const balance = token.balance
        const priceUsd = token.priceUsd ?? 0
        const totalValue = token.totalValueUsd ?? balance * priceUsd

        // Format balance based on size
        const formatBalance = (bal: number, decimals: number) => {
          if (bal === 0) return '0'
          if (bal < 0.0001) return bal.toExponential(2)
          if (bal < 1) return bal.toFixed(Math.min(decimals, 6))
          if (bal < 100) return bal.toFixed(4)
          return bal.toLocaleString(undefined, { maximumFractionDigits: 2 })
        }

        return (
          <div className="flex items-center justify-between rounded-md border border-border bg-card dark:bg-transparent px-3 py-2">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-background dark:bg-muted border border-border flex items-center justify-center overflow-hidden">
                {token.iconUrl ? (
                  <img
                    src={token.iconUrl}
                    alt={token.symbol}
                    className={cn(
                      // Local SOL icon has built-in padding, everything else fills
                      token.iconUrl === '/solana-sol-logo.svg'
                        ? 'h-5 w-5 object-contain'
                        : 'w-full h-full object-cover'
                    )}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to placeholder on error
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        const fallback = document.createElement('span')
                        fallback.className = 'text-xs font-semibold text-muted-foreground'
                        fallback.textContent = token.symbol.slice(0, 2).toUpperCase()
                        parent.appendChild(fallback)
                      }
                    }}
                  />
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {token.symbol.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{token.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground -mt-0.5">
                  {priceUsd > 0 && <span>${priceUsd.toFixed(priceUsd < 1 ? 4 : 2)}</span>}
                  {showPriceChange && typeof token.changePct24h === 'number' && !isNaN(token.changePct24h) && (
                    <span
                      className={
                        token.changePct24h >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {token.changePct24h >= 0 ? '+' : ''}
                      {token.changePct24h.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">${totalValue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground -mt-0.5">
                {formatBalance(balance, token.decimals)} {token.symbol}
              </p>
            </div>
          </div>
        )
      }

      // Fallback card for when API doesn't return tokens
      const FallbackCard = ({ symbol, name, iconUrl, balance, priceUsd, showPriceChange, decimals = 4 }: {
        symbol: string
        name: string
        iconUrl: string
        balance: number
        priceUsd: number
        showPriceChange?: { value: number } | null
        decimals?: number
      }) => (
        <div className="flex items-center justify-between rounded-md border border-border bg-card dark:bg-transparent px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-background dark:bg-muted border border-border flex items-center justify-center overflow-hidden">
              <img
                src={iconUrl}
                alt={symbol}
                className={cn(
                  // Local SOL icon has built-in padding, everything else fills
                  iconUrl === '/solana-sol-logo.svg'
                    ? 'h-5 w-5 object-contain'
                    : 'w-full h-full object-cover'
                )}
                loading="lazy"
              />
            </div>
            <div>
              <p className="text-sm font-semibold">{name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground -mt-0.5">
                <span>${priceUsd.toFixed(2)}</span>
                {showPriceChange && (
                  <span
                    className={
                      showPriceChange.value >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }
                  >
                    {showPriceChange.value >= 0 ? '+' : ''}
                    {showPriceChange.value.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">${(balance * priceUsd).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground -mt-0.5">
              {balance.toFixed(decimals)} {symbol}
            </p>
          </div>
        </div>
      )

      return (
        <div className="space-y-4">
          {/* App Tokens Section */}
          <div className="space-y-2">
            {useWalletFallback ? (
              // Fallback to wallet balances if no tokens from API
              <>
                <FallbackCard
                  symbol="SOL"
                  name="Solana"
                  iconUrl="/solana-sol-logo.svg"
                  balance={fallbackWallet.sol}
                  priceUsd={solPrice}
                  showPriceChange={typeof data.solChangePct24h === 'number' ? { value: data.solChangePct24h } : null}
                />
                <FallbackCard
                  symbol="USDC"
                  name="USDC"
                  iconUrl="/usd-coin-usdc-logo.svg"
                  balance={fallbackWallet.usdc}
                  priceUsd={1}
                  showPriceChange={{ value: 0 }}
                  decimals={2}
                />
              </>
            ) : (
              appTokens.map((token) => (
                <TokenCard key={token.mint} token={token} showPriceChange />
              ))
            )}
          </div>

          {/* Other Tokens Section */}
          {otherTokens.length > 0 && (
            <div className="space-y-2">
              {/* Separator */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-border" />
                <p className="text-xs text-muted-foreground">Other Holdings</p>
                <div className="flex-1 h-px bg-border" />
              </div>
              <p className="text-xs text-muted-foreground text-center -mt-1 mb-2">
                Not usable in Desperse
              </p>

              {/* Other token cards */}
              {otherTokens.map((token) => (
                <TokenCard key={token.mint} token={token} />
              ))}
            </div>
          )}
        </div>
      )
    }

    const NFTsView = () => {
      const nfts = data.nfts || []

      if (nfts.length === 0) {
        return (
          <div className="px-1 py-8 text-center">
            <i className="fa-regular fa-image text-4xl text-muted-foreground mb-3 block" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No NFTs found</p>
            <p className="text-xs text-muted-foreground mt-1">Your NFTs will appear here</p>
          </div>
        )
      }

      // Get image URL from NFT content, resolving IPFS/Arweave URIs to gateway URLs
      const getNFTImage = (nft: typeof nfts[0]): string | null => {
        // Try metadata.image first (direct image field)
        if (nft.content?.metadata?.image) {
          return resolveDecentralizedUri(nft.content.metadata.image)
        }
        // Try files array for image files
        if (nft.content?.files && nft.content.files.length > 0) {
          const imageFile = nft.content.files.find(f =>
            f.mime?.startsWith('image/') ||
            f.uri?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
          )
          if (imageFile?.uri) return resolveDecentralizedUri(imageFile.uri)
          // Fallback to first file if no image-specific file found
          if (nft.content.files[0]?.uri) return resolveDecentralizedUri(nft.content.files[0].uri)
        }
        // Note: json_uri would require fetching the metadata JSON, which we skip for performance
        return null
      }

      // Get collection name from NFT content
      const getNFTCollection = (nft: typeof nfts[0]): string | null => {
        return nft.content?.metadata?.symbol || null
      }

      return (
        <div className="space-y-3">
          {/* Layout Toggle Header */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground">
              {nfts.length} {nfts.length === 1 ? 'item' : 'items'}
            </p>
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setNftLayout('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  nftLayout === 'grid'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="Grid view"
              >
                <i className="fa-regular fa-grid-2 text-sm" aria-hidden="true" />
              </button>
              <button
                onClick={() => setNftLayout('list')}
                className={cn(
                  'p-1.5 rounded-md transition-all',
                  nftLayout === 'list'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title="List view"
              >
                <i className="fa-regular fa-list text-sm" aria-hidden="true" />
              </button>
            </div>
          </div>

          {nftLayout === 'grid' ? (
            /* Grid View - 2 columns with visible names */
            <div className="grid grid-cols-2 gap-2">
              {nfts.map((nft) => {
                const imageUrl = getNFTImage(nft)
                const nftName = nft.content?.metadata?.name || nft.content?.metadata?.symbol || 'Unnamed NFT'
                const nftCollection = getNFTCollection(nft)
                const explorerUrl = getExplorerUrl('token', nft.id, preferences.explorer)

                // Get optimized image props for NFT thumbnails
                const optimizedProps = imageUrl ? getResponsiveImageProps(imageUrl, {
                  sizes: '160px',
                  quality: 75,
                  includeRetina: true,
                }) : null

                return (
                  <a
                    key={nft.id}
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-lg overflow-hidden border border-border bg-card hover:border-foreground/20 transition-colors"
                    aria-label={`View ${nftName} on explorer`}
                  >
                    <div className="relative aspect-square">
                      {imageUrl && optimizedProps ? (
                        <img
                          src={optimizedProps.src}
                          srcSet={optimizedProps.srcSet || undefined}
                          sizes={optimizedProps.sizes || undefined}
                          alt={nftName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const placeholder = target.nextElementSibling as HTMLElement
                            if (placeholder) placeholder.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div
                        className={cn(
                          'w-full h-full flex items-center justify-center bg-muted/40',
                          imageUrl ? 'hidden' : 'flex'
                        )}
                      >
                        <i className="fa-regular fa-image text-2xl text-muted-foreground" aria-hidden="true" />
                      </div>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <i className="fa-solid fa-circle-arrow-up-right text-white text-lg" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="text-sm font-medium truncate">{nftName}</p>
                      {nftCollection && (
                        <p className="text-xs text-muted-foreground truncate -mt-0.5">{nftCollection}</p>
                      )}
                    </div>
                  </a>
                )
              })}
            </div>
          ) : (
            /* List View - compact rows */
            <div className="space-y-2">
              {nfts.map((nft) => {
                const imageUrl = getNFTImage(nft)
                const nftName = nft.content?.metadata?.name || nft.content?.metadata?.symbol || 'Unnamed NFT'
                const nftCollection = getNFTCollection(nft)
                const explorerUrl = getExplorerUrl('token', nft.id, preferences.explorer)

                // Get optimized image props for list thumbnails
                const optimizedProps = imageUrl ? getResponsiveImageProps(imageUrl, {
                  sizes: '40px',
                  quality: 75,
                  includeRetina: true,
                }) : null

                return (
                  <a
                    key={nft.id}
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-md border border-border bg-card dark:bg-transparent px-3 py-2 hover:border-foreground/20 transition-colors"
                    aria-label={`View ${nftName} on explorer`}
                  >
                    <div className="w-10 h-10 rounded-sm overflow-hidden shrink-0">
                      {imageUrl && optimizedProps ? (
                        <img
                          src={optimizedProps.src}
                          srcSet={optimizedProps.srcSet || undefined}
                          sizes={optimizedProps.sizes || undefined}
                          alt={nftName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/40">
                          <i className="fa-regular fa-image text-sm text-muted-foreground" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{nftName}</p>
                      {nftCollection && (
                        <p className="text-xs text-muted-foreground truncate -mt-0.5">{nftCollection}</p>
                      )}
                    </div>
                    <i className="fa-regular fa-arrow-up-right text-muted-foreground text-xs shrink-0 mr-1" aria-hidden="true" />
                  </a>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    const ActivityView = () => {
      if (activity.length === 0) {
        return (
          <div className="px-1 py-8 text-center">
            <i className="fa-regular fa-clock-rotate-left text-4xl text-muted-foreground mb-3 block" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">Your transactions will appear here</p>
          </div>
        )
      }

      // Group entries by date
      const groupByDate = (entries: typeof activity) => {
        const groups: { label: string; entries: typeof activity }[] = []
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const yesterday = new Date(today.getTime() - 86400000)

        let currentGroup: { label: string; entries: typeof activity } | null = null

        for (const entry of entries) {
          const entryDate = new Date(entry.timestamp)
          const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate())

          let label: string
          if (entryDay.getTime() === today.getTime()) {
            label = 'Today'
          } else if (entryDay.getTime() === yesterday.getTime()) {
            label = 'Yesterday'
          } else {
            label = entryDate.toLocaleDateString('en-US', { month: 'long', year: entryDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
          }

          if (!currentGroup || currentGroup.label !== label) {
            currentGroup = { label, entries: [] }
            groups.push(currentGroup)
          }
          currentGroup.entries.push(entry)
        }

        return groups
      }

      // Get badge info for activity type (past-tense, action-oriented)
      const getBadgeInfo = (type: typeof activity[0]['type']): { label: string; variant: 'success' | 'default' | 'secondary' } | null => {
        switch (type) {
          case 'edition_sale':
            return { label: 'SOLD', variant: 'success' }
          case 'edition_purchase':
            return { label: 'MINTED', variant: 'default' }
          case 'collection':
            return { label: 'COLLECTED', variant: 'secondary' }
          case 'tip_received':
            return { label: 'TIP', variant: 'success' }
          case 'tip_sent':
            return { label: 'TIPPED', variant: 'default' }
          default:
            return null
        }
      }

      // Get title for activity entry (no JS truncation - CSS handles it)
      const getTitle = (entry: typeof activity[0]) => {
        if (entry.context.post?.caption) {
          return entry.context.post.caption
        }
        switch (entry.type) {
          case 'edition_sale':
            return 'Edition Sale'
          case 'edition_purchase':
            return 'Edition Purchase'
          case 'collection':
            return 'Collected'
          case 'tip_sent':
            return 'Seeker Tip'
          case 'tip_received':
            return 'Seeker Tip'
          case 'transfer_in':
            return `Received ${entry.token}`
          case 'transfer_out':
            return `Sent ${entry.token}`
          default:
            return 'Transaction'
        }
      }

      // Get the person to show in footer with appropriate preposition
      // Returns isSelf=true when the person is the current user
      type PersonInfo = { id: string; displayName: string | null; usernameSlug: string; avatarUrl: string | null }
      const getFooterPerson = (entry: typeof activity[0]): { person: PersonInfo; preposition: string; isSelf: boolean } | null => {
        let person: PersonInfo | undefined
        let preposition = ''

        switch (entry.type) {
          case 'edition_sale':
            // For sales: show who bought from you
            person = entry.context.counterparty
            preposition = 'to'
            break
          case 'edition_purchase':
            // For purchases: show who you bought from (the seller/creator)
            person = entry.context.counterparty
            preposition = 'from'
            break
          case 'collection':
            // For collections: show who you collected from (the creator)
            person = entry.context.creator
            preposition = 'from'
            break
          case 'tip_sent':
            // For tips sent: show who you tipped
            person = entry.context.counterparty
            preposition = 'to'
            break
          case 'tip_received':
            // For tips received: show who tipped you
            person = entry.context.counterparty
            preposition = 'from'
            break
          default:
            return null
        }

        if (!person) return null

        const isSelf = currentUserId ? person.id === currentUserId : false
        return { person, preposition, isSelf }
      }

      // Format amount with sign
      const formatAmount = (entry: typeof activity[0]) => {
        if (entry.amount === null || entry.token === null) {
          return { text: 'Free', isPositive: true }
        }
        const isPositive = entry.direction === 'in'
        const sign = isPositive ? '+' : '-'
        // SKR doesn't have a USD price feed; SOL uses live price; USDC is ~$1
        const usdValue = entry.token === 'SOL'
          ? entry.amount * solPrice
          : entry.token === 'SKR'
            ? undefined
            : entry.amount
        return {
          text: `${sign}${entry.amount.toFixed(entry.amount < 0.01 ? 4 : 2)}`,
          token: entry.token,
          isPositive,
          usdValue,
        }
      }

      const groups = groupByDate(activity)

      return (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              {/* Date header */}
              <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                {group.label}
              </p>

              {/* Activity cards */}
              <div className="space-y-2">
                {group.entries.map((entry) => {
                  const badge = getBadgeInfo(entry.type)
                  const title = getTitle(entry)
                  const footerPerson = getFooterPerson(entry)
                  const amount = formatAmount(entry)
                  const mediaUrl = entry.context.post?.mediaUrl
                  const coverUrl = entry.context.post?.coverUrl
                  const thumbnail = coverUrl || mediaUrl
                  const isVideo = !coverUrl && mediaUrl
                    ? /\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl)
                    : false
                  const postId = entry.context.post?.id
                  const isBasicTransfer = entry.type === 'transfer_in' || entry.type === 'transfer_out'

                  // Compact row for basic transfers
                  if (isBasicTransfer) {
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card dark:bg-transparent px-3 py-2"
                      >
                        {/* Icon */}
                        <div className="shrink-0 h-8 w-8 rounded-full border border-border bg-muted flex items-center justify-center">
                          <i
                            className={cn(
                              'text-sm text-muted-foreground',
                              entry.type === 'transfer_in' ? 'fa-regular fa-arrow-down' : 'fa-regular fa-arrow-up'
                            )}
                            aria-hidden="true"
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{title}</p>
                        </div>

                        {/* Amount */}
                        <div className="shrink-0 text-right">
                          <p className={cn(
                            'text-sm font-medium',
                            amount.isPositive ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                          )}>
                            {amount.text}
                            <span className="text-xs font-normal text-muted-foreground ml-1">{amount.token}</span>
                          </p>
                        </div>

                        {/* Explorer link */}
                        {entry.signature && (
                          <a
                            href={getExplorerUrl('tx', entry.signature, preferences.explorer)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground p-1 shrink-0"
                            aria-label="View on explorer"
                          >
                            <i className="fa-regular fa-arrow-up-right text-xs" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    )
                  }

                  // Rich card for enriched entries (edition_sale, edition_purchase, collection)
                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-border bg-card dark:bg-transparent p-3"
                    >
                      {/* Main row: thumbnail, content, amount */}
                      <div className="flex items-start gap-3">
                        {/* Thumbnail */}
                        {thumbnail ? (
                          <a
                            href={postId ? `/post/${postId}` : undefined}
                            className="shrink-0 h-12 w-12 rounded-lg overflow-hidden border border-border bg-muted hover:border-foreground/30 transition-colors"
                          >
                            {isVideo ? (
                              <video
                                src={thumbnail}
                                className="h-full w-full object-cover"
                                muted
                                autoPlay
                                loop
                                playsInline
                              />
                            ) : (
                              <img
                                src={thumbnail}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            )}
                          </a>
                        ) : (
                          <div className="shrink-0 h-12 w-12 rounded-lg border border-border bg-muted flex items-center justify-center">
                            {entry.type === 'tip_sent' || entry.type === 'tip_received' ? (
                              <SeekerIcon size={20} className="text-muted-foreground" />
                            ) : (
                              <i
                                className={cn(
                                  'text-lg text-muted-foreground',
                                  entry.type === 'collection' && 'fa-regular fa-bookmark',
                                  (entry.type === 'edition_sale' || entry.type === 'edition_purchase') && 'fa-regular fa-gem'
                                )}
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        )}

                        {/* Content - title wraps to 2 lines max */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold line-clamp-2">{title}</p>
                        </div>

                        {/* Amount */}
                        <div className="shrink-0 text-right">
                          <p className={cn(
                            'text-sm font-semibold',
                            amount.isPositive ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                          )}>
                            {amount.text}
                            {amount.token && (
                              <span className="text-xs font-normal text-muted-foreground ml-1">{amount.token}</span>
                            )}
                          </p>
                          {amount.usdValue !== undefined && amount.usdValue > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ~${amount.usdValue.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer row: badge, person, actions */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          {badge && (
                            <Badge variant={badge.variant} size="sm">
                              {badge.label}
                            </Badge>
                          )}
                          {footerPerson && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">{footerPerson.preposition}</span>
                              {footerPerson.isSelf ? (
                                <span className="text-xs text-muted-foreground">yourself</span>
                              ) : (
                                <a
                                  href={`/profile/${footerPerson.person.usernameSlug}`}
                                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                                >
                                  {footerPerson.person.avatarUrl ? (
                                    <img
                                      src={footerPerson.person.avatarUrl}
                                      alt=""
                                      className="h-4 w-4 rounded-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center">
                                      <i className="fa-solid fa-user text-[8px] text-muted-foreground" aria-hidden="true" />
                                    </div>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    @{footerPerson.person.usernameSlug}
                                  </span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Explorer link */}
                        {entry.signature && (
                          <a
                            href={getExplorerUrl('tx', entry.signature, preferences.explorer)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground p-1"
                            aria-label="View on explorer"
                          >
                            <i className="fa-regular fa-arrow-up-right text-xs" aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="relative flex flex-col flex-1 min-h-0">
        <div className="relative shrink-0 px-1">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground tracking-wide">Balance</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">${totalUsd.toFixed(2)}</p>
              <p
                className={
                  changePositive
                    ? 'text-xs font-medium text-green-600 dark:text-green-400'
                    : 'text-xs font-medium text-red-600 dark:text-red-400'
                }
              >
                {changePositive ? '+ ' : '- '}$
                {Math.abs(totalDeltaUsd).toFixed(2)} ({changePositive ? '+' : '- '}
                {Math.abs(totalChangePct).toFixed(2)}%)
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 px-1">
          <div className="flex gap-6">
            <button
              className={cn(
                'py-3 text-sm font-medium relative no-hover-bg',
                activeTab === 'tokens'
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
              onClick={() => setActiveTab('tokens')}
            >
              Tokens
              {activeTab === 'tokens' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-foreground rounded-full" />
              )}
            </button>
            <button
              className={cn(
                'py-3 text-sm font-medium relative no-hover-bg',
                activeTab === 'nfts'
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
              onClick={() => setActiveTab('nfts')}
            >
              NFTs
              {activeTab === 'nfts' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-foreground rounded-full" />
              )}
            </button>
            <button
              className={cn(
                'py-3 text-sm font-medium relative no-hover-bg',
                activeTab === 'activity'
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
              onClick={() => setActiveTab('activity')}
            >
              Activity
              {activeTab === 'activity' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-hide mt-3">
          {activeTab === 'tokens' ? <TokensView /> : activeTab === 'nfts' ? <NFTsView /> : <ActivityView />}
        </div>

        {primaryAddress && activeTab === 'tokens' && (
          <div className="pt-3 shrink-0 mt-3">
            <Button
              onClick={handleFundWallet}
              className="w-full"
              variant="default"
            >
              <i className="fa-regular fa-arrow-down mr-2" aria-hidden="true" />
              Deposit
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            className="flex items-center justify-center rounded-lg transition-colors min-w-[44px] min-h-[44px] text-foreground"
            aria-label="Wallets"
          >
            <span className="w-6 h-6 grid place-items-center">
              <i className={`${isOpen ? 'fa-solid' : 'fa-regular'} fa-wallet text-xl`} aria-hidden="true" />
            </span>
          </button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl pb-8 max-h-[80vh] overflow-hidden flex flex-col"
          showClose={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Wallets</SheetTitle>
          </SheetHeader>
          <div className="px-3 pt-4 flex flex-col flex-1 min-h-0" role="menu">
            <MenuContent />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: Popover Menu
  return (
    <div ref={menuRef} className="relative">
      {/* Menu Dropdown */}
      {isOpen && (
        <div
          className="absolute bottom-full left-3 mb-2 w-[340px] max-w-[90vw] bg-popover border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 h-[480px] z-300 flex flex-col"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="wallets-button"
        >
          <div className="p-4 flex flex-col flex-1 min-h-0">
            <MenuContent />
          </div>
        </div>
      )}

      {/* Wallets Button */}
      <button
        id="wallets-button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-3 py-2.5 mx-3 w-[calc(100%-1.5rem)] text-left rounded-md hover-fade text-foreground hover:bg-accent hover:text-accent-foreground ${
          isOpen ? 'font-semibold' : 'font-medium'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="w-6 h-6 grid place-items-center">
          <i className={`${isOpen ? 'fa-solid' : 'fa-regular'} fa-wallet text-xl`} aria-hidden="true" />
        </span>
        <span className="text-sm leading-none">Wallets</span>
      </button>
    </div>
  )
}

