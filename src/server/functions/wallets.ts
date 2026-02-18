import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getHeliusApiUrl, getHeliusRpcUrl, env } from '@/config/env'
import { db } from '@/server/db'
import { users } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { LAMPORTS_PER_SOL } from '@/server/services/blockchain/solanaClient'
import { USDC_MAINNET_MINT, SOL_NATIVE_MINT, SKR_MINT, APP_TOKEN_MINTS, COINGECKO_IDS } from '@/constants/tokens'
import {
	enrichTransactionHistory,
	fetchUserCollections,
	fetchUserPurchases,
	fetchUserTips,
	mergeActivityEntries,
	type RawHistoryEntry,
	type TxDirection,
} from '@/server/utils/enrichTransactionHistory'

type WalletBalance = {
  address: string
  walletClientType?: string
  sol: number
  usdc: number
  usdValue: number
}

type NFTAsset = {
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
    links?: {
      image?: string
    }
  }
  ownership?: {
    owner?: string
  }
  compression?: {
    compressed?: boolean
  }
}

type TokenBalance = {
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
}

// Token price entry from CoinGecko
type TokenPriceEntry = { priceUsd: number; changePct24h: number }

const heliusApiBase = getHeliusApiUrl()
const heliusApiKey = env.HELIUS_API_KEY

// Token price cache (90s TTL) - covers SOL, USDC, SKR in a single CoinGecko call
const tokenPriceCache: {
  data?: Map<string, TokenPriceEntry>
  updatedAt?: number
} = {}

/**
 * Fetch prices and 24h change for SOL, USDC, and SKR from CoinGecko in a single call.
 * Returns a map from mint address to { priceUsd, changePct24h }.
 */
async function getTokenPriceData(): Promise<Map<string, TokenPriceEntry>> {
  const now = Date.now()
  if (tokenPriceCache.data && tokenPriceCache.updatedAt && now - tokenPriceCache.updatedAt < 90_000) {
    return tokenPriceCache.data
  }

  const cgIds = Object.values(COINGECKO_IDS).join(',')
  const baseUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true`
  const url = env.COINGECKO_API_KEY ? `${baseUrl}&x_cg_demo_api_key=${env.COINGECKO_API_KEY}` : baseUrl

  const headers: Record<string, string> = {}
  if (env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = env.COINGECKO_API_KEY
  }

  const res = await fetch(url, {
    headers: Object.keys(headers).length > 0 ? headers : undefined,
  })
  if (!res.ok) {
    throw new Error('Failed to fetch token prices from CoinGecko')
  }

  const data = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>

  // Build mint-to-price map
  const result = new Map<string, TokenPriceEntry>()
  for (const [mint, cgId] of Object.entries(COINGECKO_IDS)) {
    const tokenData = data[cgId]
    if (tokenData?.usd !== undefined) {
      result.set(mint, {
        priceUsd: tokenData.usd,
        changePct24h: tokenData.usd_24h_change ?? 0,
      })
    }
  }

  // Ensure SOL price is available (critical)
  if (!result.has(SOL_NATIVE_MINT)) {
    throw new Error('SOL price unavailable from CoinGecko')
  }

  tokenPriceCache.data = result
  tokenPriceCache.updatedAt = now
  return result
}

/** Backward-compatible helper to get SOL price data */
async function getSolPriceData(): Promise<{ price: number; changePct: number }> {
  const prices = await getTokenPriceData()
  const sol = prices.get(SOL_NATIVE_MINT)!
  return { price: sol.priceUsd, changePct: sol.changePct24h }
}

// Basic Solana address validation (base58, 32-44 chars)
function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false
  // Solana addresses are base58 encoded and typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  return base58Regex.test(address)
}

async function fetchBalances(address: string, solPriceUsd: number): Promise<WalletBalance> {
  // Validate address before making RPC calls
  if (!isValidSolanaAddress(address)) {
    console.warn(`Invalid Solana address skipped: ${address}`)
    return {
      address,
      sol: 0,
      usdc: 0,
      usdValue: 0,
    }
  }

  let sol = 0
  let usdc = 0

  try {
    // Use Helius RPC directly for more reliable balance fetching
    const rpcUrl = getHeliusRpcUrl()

    // Fetch SOL balance
    try {
      const solResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `sol-balance-${Date.now()}`,
          method: 'getBalance',
          params: [address],
        }),
      })
      const solData = await solResponse.json()
      if (solData.result?.value !== undefined) {
        sol = Number(solData.result.value) / LAMPORTS_PER_SOL
      }
    } catch (solError) {
      console.warn(`[fetchBalances] Failed to fetch SOL balance for ${address}:`, solError instanceof Error ? solError.message : solError)
    }

    // Fetch USDC token accounts
    try {
      const tokenResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `usdc-balance-${Date.now()}`,
          method: 'getTokenAccountsByOwner',
          params: [
            address,
            { mint: USDC_MAINNET_MINT },
            { encoding: 'jsonParsed' },
          ],
        }),
      })
      const tokenData = await tokenResponse.json()
      const accounts = tokenData.result?.value
      if (Array.isArray(accounts)) {
        usdc = accounts.reduce((sum: number, acct: any) => {
          const amountStr = acct?.account?.data?.parsed?.info?.tokenAmount?.amount
          const decimals = acct?.account?.data?.parsed?.info?.tokenAmount?.decimals
          if (!amountStr || typeof decimals !== 'number') return sum
          const amount = Number(amountStr) / 10 ** decimals
          return sum + amount
        }, 0)
      }
    } catch (usdcError) {
      console.warn(`[fetchBalances] Failed to fetch USDC balance for ${address}:`, usdcError instanceof Error ? usdcError.message : usdcError)
    }

    const usdValue = sol * solPriceUsd + usdc

    return {
      address,
      sol,
      usdc,
      usdValue,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown RPC error'
    console.warn(`Failed to fetch balance for ${address}: ${errorMsg}`)
    return {
      address,
      sol: 0,
      usdc: 0,
      usdValue: 0,
    }
  }
}

function mapTransferDirection(address: string, from?: string | null, to?: string | null): TxDirection {
  if (to === address) return 'in'
  if (from === address) return 'out'
  return 'out'
}

async function fetchHistory(address: string): Promise<RawHistoryEntry[]> {
  // Validate address before making API calls
  if (!isValidSolanaAddress(address)) {
    console.warn(`Invalid Solana address skipped for history: ${address}`)
    return []
  }

  try {
    const url = `${heliusApiBase}/addresses/${address}/transactions?api-key=${heliusApiKey}&limit=20`
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`Failed to fetch history for ${address}: ${res.status}`)
      return []
    }
    const data = (await res.json()) as Array<{
      signature: string
      timestamp: number
      nativeTransfers?: Array<{ amount: number; fromUserAccount?: string | null; toUserAccount?: string | null }>
      tokenTransfers?: Array<{
        tokenAmount: number
        mint: string
        decimals: number
        fromUserAccount?: string | null
        toUserAccount?: string | null
      }>
    }>

    const entries: RawHistoryEntry[] = []

    for (const tx of data) {
      if (tx.nativeTransfers) {
        tx.nativeTransfers.forEach((t) => {
          if (!t || typeof t.amount !== 'number') return
          const amountSol = t.amount / LAMPORTS_PER_SOL
          entries.push({
            signature: tx.signature,
            address,
            token: 'SOL',
            amount: amountSol,
            direction: mapTransferDirection(address, t.fromUserAccount, t.toUserAccount),
            timestamp: tx.timestamp * 1000,
          })
        })
      }

      if (tx.tokenTransfers) {
        tx.tokenTransfers.forEach((t) => {
          if (!t || t.mint !== USDC_MAINNET_MINT) return

          // Debug: log the raw token transfer data
          if (process.env.NODE_ENV !== 'production') {
            console.log('[fetchHistory] USDC transfer raw data:', JSON.stringify(t))
          }

          // Helius tokenTransfers: tokenAmount may already be decimal-formatted
          // If decimals is provided, divide; otherwise use tokenAmount as-is
          let amountUsdc: number

          if (typeof t.tokenAmount === 'number' && !isNaN(t.tokenAmount)) {
            if (typeof t.decimals === 'number' && !isNaN(t.decimals) && t.decimals > 0) {
              // Raw amount with decimals provided - divide
              amountUsdc = t.tokenAmount / 10 ** t.decimals
            } else {
              // tokenAmount is likely already decimal-formatted (Helius enhanced API)
              amountUsdc = t.tokenAmount
            }
          } else {
            console.warn(`Invalid USDC transfer: tokenAmount=${t.tokenAmount}`)
            return
          }

          if (isNaN(amountUsdc) || amountUsdc === 0) return // Skip invalid or zero amounts
          entries.push({
            signature: tx.signature,
            address,
            token: 'USDC',
            amount: amountUsdc,
            direction: mapTransferDirection(address, t.fromUserAccount, t.toUserAccount),
            timestamp: tx.timestamp * 1000,
          })
        })
      }
    }

    return entries
  } catch (error) {
    console.error(`Error fetching history for ${address}:`, error)
    return []
  }
}

async function fetchNFTs(address: string): Promise<NFTAsset[]> {
  if (!heliusApiKey) {
    console.warn('Helius API key not configured, skipping NFT fetch')
    return []
  }

  // Validate address before making API calls
  if (!isValidSolanaAddress(address)) {
    console.warn(`Invalid Solana address skipped for NFTs: ${address}`)
    return []
  }

  try {
    const rpcUrl = getHeliusRpcUrl()
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `nfts-${Date.now()}`,
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: address,
          displayOptions: {
            showFungible: false, // Exclude fungible tokens, only NFTs
          },
          limit: 100, // Limit to 100 NFTs per wallet
        },
      }),
    })

    if (!response.ok) {
      console.error(`Failed to fetch NFTs for ${address}: ${response.statusText}`)
      return []
    }

    const data = await response.json()
    
    if (data.error) {
      console.error(`Error fetching NFTs: ${data.error.message || 'Unknown error'}`)
      return []
    }

    return data.result?.items || []
  } catch (error) {
    console.error(`Error fetching NFTs for ${address}:`, error)
    return []
  }
}

// Minimum USD value threshold for displaying tokens (filter out dust)
const TOKEN_VALUE_THRESHOLD_USD = 1

async function fetchAllTokens(address: string, cgPrices?: Map<string, TokenPriceEntry>): Promise<TokenBalance[]> {
  if (!heliusApiKey) {
    console.warn('Helius API key not configured, skipping token fetch')
    return []
  }

  if (!isValidSolanaAddress(address)) {
    console.warn(`Invalid Solana address skipped for tokens: ${address}`)
    return []
  }

  try {
    const rpcUrl = getHeliusRpcUrl()

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `tokens-${Date.now()}`,
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: address,
          displayOptions: {
            showFungible: true,
            showNativeBalance: true,
          },
          limit: 100,
        },
      }),
    })

    if (!response.ok) {
      console.error(`Failed to fetch tokens for ${address}: ${response.statusText}`)
      return []
    }

    const data = await response.json()

    if (data.error) {
      console.error(`Error fetching tokens: ${data.error.message || 'Unknown error'}`)
      return []
    }

    const items = data.result?.items || []
    const nativeBalance = data.result?.nativeBalance
    const tokens: TokenBalance[] = []

    // Process native SOL balance if present
    if (nativeBalance && typeof nativeBalance.lamports === 'number') {
      const solBalance = nativeBalance.lamports / LAMPORTS_PER_SOL
      const solPriceUsd = nativeBalance.price_per_sol ?? null
      const solCg = cgPrices?.get(SOL_NATIVE_MINT)

      tokens.push({
        mint: SOL_NATIVE_MINT,
        symbol: 'SOL',
        name: 'Solana',
        iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        balance: solBalance,
        decimals: 9,
        priceUsd: solPriceUsd,
        totalValueUsd: solPriceUsd !== null ? solBalance * solPriceUsd : null,
        changePct24h: solCg?.changePct24h ?? null,
        isAppToken: true,
      })
    }

    // Process fungible tokens from items
    for (const item of items) {
      const tokenInfo = item?.token_info
      if (!tokenInfo) continue

      const iface = item?.interface
      const tokenStandard = item?.content?.metadata?.token_standard
      const isNFT = iface === 'V1_NFT' || iface === 'ProgrammableNFT' ||
                    tokenStandard === 'NonFungible' || tokenStandard === 'ProgrammableNonFungible'
      if (isNFT) continue

      const mint = item.id
      const symbol = tokenInfo.symbol || item?.content?.metadata?.symbol || 'Unknown'
      const name = item?.content?.metadata?.name || symbol
      const decimals = tokenInfo.decimals ?? 0
      const balance = (tokenInfo.balance ?? 0) / 10 ** decimals

      const priceInfo = tokenInfo.price_info
      const priceUsd = priceInfo?.price_per_token ?? null
      const totalValueUsd = priceInfo?.total_price ?? (priceUsd !== null ? balance * priceUsd : null)

      const heliusIconUrl =
        item?.content?.links?.image ||
        item?.content?.files?.[0]?.cdn_uri ||
        item?.content?.files?.[0]?.uri ||
        null

      const isAppToken = APP_TOKEN_MINTS.has(mint)
      const iconUrl = heliusIconUrl || (mint === USDC_MAINNET_MINT
        ? 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
        : null)

      const cgEntry = cgPrices?.get(mint)
      const changePct24h = cgEntry?.changePct24h ?? null

      tokens.push({ mint, symbol, name, iconUrl, balance, decimals, priceUsd, totalValueUsd, changePct24h, isAppToken })
    }

    // Ensure all app tokens appear even if DAS didn't return them.
    // For missing tokens, query RPC directly for actual balance.
    const presentMints = new Set(tokens.map((t) => t.mint))
    const appTokenDefaults: Array<{ mint: string; symbol: string; name: string; decimals: number; iconUrl: string | null }> = [
      { mint: USDC_MAINNET_MINT, symbol: 'USDC', name: 'USD Coin', decimals: 6, iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
      { mint: SKR_MINT, symbol: 'SKR', name: 'Seeker', decimals: 6, iconUrl: '/S_Token_Circle_White.svg' },
    ]
    const missingAppTokens = appTokenDefaults.filter((def) => !presentMints.has(def.mint))
    if (missingAppTokens.length > 0) {
      const rpcUrl = getHeliusRpcUrl()
      const rpcResults = await Promise.all(
        missingAppTokens.map(async (def) => {
          try {
            const rpcRes = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: `app-token-${def.mint.slice(0, 8)}-${Date.now()}`,
                method: 'getTokenAccountsByOwner',
                params: [address, { mint: def.mint }, { encoding: 'jsonParsed' }],
              }),
            })
            const rpcData = await rpcRes.json()
            const accounts = rpcData.result?.value
            if (Array.isArray(accounts)) {
              return accounts.reduce((sum: number, acct: any) => {
                const amountStr = acct?.account?.data?.parsed?.info?.tokenAmount?.amount
                const decimals = acct?.account?.data?.parsed?.info?.tokenAmount?.decimals
                if (!amountStr || typeof decimals !== 'number') return sum
                return sum + Number(amountStr) / 10 ** decimals
              }, 0)
            }
            return 0
          } catch {
            console.warn(`[fetchAllTokens] RPC fallback failed for ${def.symbol}`)
            return 0
          }
        }),
      )
      missingAppTokens.forEach((def, i) => {
        const balance = rpcResults[i]
        const cg = cgPrices?.get(def.mint)
        const priceUsd = cg?.priceUsd ?? null
        tokens.push({
          mint: def.mint, symbol: def.symbol, name: def.name,
          iconUrl: def.iconUrl, balance, decimals: def.decimals,
          priceUsd,
          totalValueUsd: priceUsd !== null ? balance * priceUsd : 0,
          changePct24h: cg?.changePct24h ?? null,
          isAppToken: true,
        })
      })
    }

    // Sort: app tokens first, then by value descending
    tokens.sort((a, b) => {
      if (a.isAppToken && !b.isAppToken) return -1
      if (!a.isAppToken && b.isAppToken) return 1
      return (b.totalValueUsd ?? 0) - (a.totalValueUsd ?? 0)
    })

    // Filter out low-value non-app tokens
    return tokens.filter((t) => t.isAppToken || (t.totalValueUsd ?? 0) >= TOKEN_VALUE_THRESHOLD_USD)
  } catch (error) {
    console.error(`Error fetching tokens for ${address}:`, error)
    return []
  }
}

const walletsInputSchema = z.object({
  privyId: z.string().optional(),
  wallets: z
    .array(
      z.object({
        address: z.string(),
        walletClientType: z.string().optional(),
      }),
    )
    .optional(),
})

export const getWalletOverview = createServerFn({
  method: 'POST',
}).handler(async (input: unknown) => {
  try {
    const rawData = input && typeof input === 'object' && 'data' in input ? (input as { data: unknown }).data : input
    const { privyId, wallets } = walletsInputSchema.parse(rawData)

    const addresses = new Map<string, { walletClientType?: string }>()
    let userId: string | undefined

    if (wallets) {
      wallets.forEach((w) => {
        if (w.address) addresses.set(w.address, { walletClientType: w.walletClientType })
      })
    }

    if (privyId) {
      const [user] = await db.select().from(users).where(eq(users.privyId, privyId)).limit(1)
      if (user) {
        userId = user.id
        // Only add embedded wallet as fallback if no explicit wallets were provided
        if (!wallets?.length && user.walletAddress && !addresses.has(user.walletAddress)) {
          addresses.set(user.walletAddress, { walletClientType: 'privy' })
        }
      }
    }

    const addressList = Array.from(addresses.entries())
      .map(([address, meta]) => ({
        address,
        walletClientType: meta.walletClientType,
      }))
      // Filter out invalid addresses early
      .filter((w) => isValidSolanaAddress(w.address))

    if (addressList.length === 0) {
      return {
        success: true,
        wallets: [],
        tokens: [],
        totalUsd: 0,
        solPriceUsd: 0,
        activity: [],
        nfts: [],
      }
    }

    // Fetch token prices (SOL, USDC, SKR) from CoinGecko in a single call
    const cgPrices = await getTokenPriceData()
    const solPriceUsd = cgPrices.get(SOL_NATIVE_MINT)!.priceUsd
    const solChangePct24h = cgPrices.get(SOL_NATIVE_MINT)!.changePct24h

    const balances = await Promise.all(
      addressList.map(async (w) => {
        const bal = await fetchBalances(w.address, solPriceUsd)
        return { ...bal, walletClientType: w.walletClientType }
      }),
    )

    const rawHistory = (await Promise.all(addressList.map((w) => fetchHistory(w.address)))).flat()
    rawHistory.sort((a, b) => b.timestamp - a.timestamp)
    const rawHistoryLimited = rawHistory.slice(0, 20)

    // Enrich history with app context — non-critical, don't let enrichment errors
    // break the entire wallet overview (balances, NFTs, tokens should still load)
    let activity: ReturnType<typeof mergeActivityEntries> = []
    try {
      const walletAddresses = addressList.map((w) => w.address)
      const enrichedTransactions = await enrichTransactionHistory(rawHistoryLimited, walletAddresses)

      // Build a set of all on-chain signatures for the active wallet
      // Used to filter DB-sourced purchases (which lack a walletAddress column)
      const onChainSignatures = new Set(rawHistory.map((e) => e.signature))

      // Fetch user's collections and purchases directly from the database
      // Collections (free cNFT mints) don't appear as SOL/USDC transfers
      // Purchases are fetched directly to ensure they always appear, even if
      // the blockchain transaction falls outside the recent Helius history window
      const [userCollections, userPurchases, userTips] = userId
        ? await Promise.all([fetchUserCollections(userId, 20), fetchUserPurchases(userId, 20), fetchUserTips(userId, 20)])
        : [[], [], []]

      // Filter purchases to only those whose txSignature appears in any of the user's
      // wallets' on-chain history, or that have a buyerWalletAddress matching one of our wallets
      const filteredPurchases = userPurchases.filter(
        (p) => p.signature && onChainSignatures.has(p.signature)
      )

      // Merge transactions, collections, and purchases into unified activity feed
      // mergeActivityEntries deduplicates by signature so enriched Helius purchases
      // won't appear twice alongside direct DB purchases
      activity = mergeActivityEntries(enrichedTransactions, userCollections, filteredPurchases, userTips).slice(0, 30)
    } catch (enrichError) {
      console.warn(
        '[getWalletOverview] Failed to enrich transaction history:',
        enrichError instanceof Error ? enrichError.message : 'Unknown error'
      )
    }

    // Fetch NFTs and tokens for all requested wallets
    const [nftsResults, tokensResults] = await Promise.all([
      Promise.all(addressList.map((w) => fetchNFTs(w.address))),
      Promise.all(addressList.map((w) => fetchAllTokens(w.address, cgPrices))),
    ])

    const allNFTs = nftsResults.flat()

    // Merge and deduplicate tokens from all wallets
    const tokensByMint = new Map<string, TokenBalance>()
    for (const tokenList of tokensResults) {
      for (const token of tokenList) {
        const existing = tokensByMint.get(token.mint)
        if (existing) {
          // Merge balances for same token across wallets
          existing.balance += token.balance
          existing.totalValueUsd =
            existing.totalValueUsd !== null && token.totalValueUsd !== null
              ? existing.totalValueUsd + token.totalValueUsd
              : existing.totalValueUsd ?? token.totalValueUsd
        } else {
          tokensByMint.set(token.mint, { ...token })
        }
      }
    }

    // Reconcile USDC balance: DAS API (getAssetsByOwner) may not return USDC
    // even though the direct RPC (getTokenAccountsByOwner) in fetchBalances found it
    const totalUsdc = balances.reduce((sum, w) => sum + w.usdc, 0)
    const usdcToken = tokensByMint.get(USDC_MAINNET_MINT)
    if (usdcToken && usdcToken.balance === 0 && totalUsdc > 0) {
      const usdcCg = cgPrices.get(USDC_MAINNET_MINT)
      usdcToken.balance = totalUsdc
      usdcToken.priceUsd = usdcCg?.priceUsd ?? 1
      usdcToken.totalValueUsd = totalUsdc * (usdcCg?.priceUsd ?? 1)
    }

    // Convert to array and re-sort
    const allTokens = Array.from(tokensByMint.values()).sort((a, b) => {
      if (a.isAppToken && !b.isAppToken) return -1
      if (!a.isAppToken && b.isAppToken) return 1
      return (b.totalValueUsd ?? 0) - (a.totalValueUsd ?? 0)
    })

    const totalUsd = balances.reduce((sum, w) => sum + w.usdValue, 0)

    return {
      success: true,
      solPriceUsd,
      solChangePct24h,
      totalUsd,
      wallets: balances,
      tokens: allTokens,
      activity,
      nfts: allNFTs,
      currentUserId: userId,
    }
  } catch (error) {
    console.error('Error in getWalletOverview:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load wallets',
    }
  }
})

/**
 * Get current SOL price in USD
 * Uses server-side caching (90s TTL) to minimize API calls
 */
export const getSolPrice = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const { price, changePct } = await getSolPriceData()
    return {
      success: true,
      priceUsd: price,
      changePct24h: changePct,
    }
  } catch (error) {
    console.error('Error fetching SOL price:', error)
    return {
      success: false,
      priceUsd: 0,
      changePct24h: 0,
    }
  }
})

