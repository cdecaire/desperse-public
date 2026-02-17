/**
 * Wallet utilities for REST API endpoints
 * Extracted from server functions to avoid createServerFn return issues
 *
 * Uses the Helius Wallet API (v1) for unified balance + NFT fetching,
 * CoinGecko for 24h price changes, and Helius parsed transactions for history.
 */

import { db } from '@/server/db'
import { collections, posts, users, userWallets } from '@/server/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { authenticateWithToken } from '@/server/auth'
import { getHeliusApiUrl, getHeliusRpcUrl, env } from '@/config/env'
import { LAMPORTS_PER_SOL } from '@/server/services/blockchain/solanaClient'
import { USDC_MAINNET_MINT, SOL_NATIVE_MINT, SOL_NATIVE_MINT_HELIUS, SKR_MINT, APP_TOKEN_MINTS, COINGECKO_IDS } from '@/constants/tokens'
import {
	enrichTransactionHistory,
	fetchUserCollections,
	fetchUserPurchases,
	fetchUserTips,
	mergeActivityEntries,
	type RawHistoryEntry,
	type TxDirection,
	type ActivityEntry,
} from '@/server/utils/enrichTransactionHistory'

// ─── Types ───────────────────────────────────────────────────────────────────

type WalletBalance = {
	address: string
	walletClientType?: string
	sol: number
	usdc: number
	usdValue: number
}

type NFTAsset = {
	mint: string
	name: string | null
	imageUri: string | null
	collectionName: string | null
	collectionAddress: string | null
	compressed: boolean
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

export interface WalletOverviewResult {
	success: boolean
	error?: string
	solPriceUsd?: number
	solChangePct24h?: number
	totalUsd?: number
	wallets?: WalletBalance[]
	tokens?: TokenBalance[]
	activity?: ActivityEntry[]
	nfts?: NFTAsset[]
}

const heliusApiBase = getHeliusApiUrl()
const heliusApiKey = env.HELIUS_API_KEY

// ─── Token Price Data (CoinGecko) ────────────────────────────────────────────

// Token price cache (90s TTL) - keyed by CoinGecko ID
type TokenPriceEntry = { priceUsd: number; changePct24h: number }
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

// ─── Utility ─────────────────────────────────────────────────────────────────

function isValidSolanaAddress(address: string): boolean {
	if (!address || typeof address !== 'string') return false
	const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
	return base58Regex.test(address)
}

/** Known app token fallbacks (metadata for tokens that the Wallet API may not return) */
const APP_TOKEN_DEFAULTS: Array<{ mint: string; symbol: string; name: string; decimals: number; iconUrl: string | null }> = [
	{ mint: USDC_MAINNET_MINT, symbol: 'USDC', name: 'USD Coin', decimals: 6, iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
	{ mint: SKR_MINT, symbol: 'SKR', name: 'Seeker', decimals: 6, iconUrl: '/S_Token_Circle_White.svg' },
]

const TOKEN_VALUE_THRESHOLD_USD = 1

// ─── Helius Wallet API (unified balances + NFTs) ─────────────────────────────

/** Wallet API token response shape */
interface WalletApiToken {
	mint: string
	symbol: string
	name: string
	balance: number
	decimals: number
	pricePerToken: number | null
	usdValue: number | null
	logoUri: string | null
	tokenProgram: string
}

/** Wallet API NFT response shape */
interface WalletApiNft {
	mint: string
	name: string | null
	imageUri: string | null
	collectionName: string | null
	collectionAddress: string | null
	compressed: boolean
}

/** Wallet API response shape */
interface WalletApiResponse {
	balances: WalletApiToken[]
	nfts?: WalletApiNft[]
	totalUsdValue: number
	pagination: { page: number; limit: number; hasMore: boolean }
}

/** Combined result from the Wallet API */
interface WalletDataResult {
	walletBalance: WalletBalance
	tokens: TokenBalance[]
	nfts: NFTAsset[]
}

/**
 * Fetch all wallet data (balances, tokens, NFTs) from the Helius Wallet API.
 * Single request replaces separate getBalance, getTokenAccountsByOwner, and getAssetsByOwner calls.
 * Returns raw Helius pricing; CoinGecko prices are merged separately via mergeTokenPrices().
 */
async function fetchWalletData(
	address: string,
): Promise<WalletDataResult> {
	const empty: WalletDataResult = {
		walletBalance: { address, sol: 0, usdc: 0, usdValue: 0 },
		tokens: [],
		nfts: [],
	}

	if (!heliusApiKey || !isValidSolanaAddress(address)) return empty

	try {
		const url = `https://api.helius.xyz/v1/wallet/${address}/balances?api-key=${heliusApiKey}&showNfts=true&showZeroBalance=false`
		const res = await fetch(url)
		if (!res.ok) {
			console.warn(`[fetchWalletData] Wallet API returned ${res.status} for ${address}`)
			return empty
		}

		const data = (await res.json()) as WalletApiResponse

		// ── Map tokens ──────────────────────────────────────────────────
		const tokens: TokenBalance[] = []
		const processedMints = new Set<string>()
		let solBalance = 0
		let usdcBalance = 0

		for (const t of data.balances) {
			// Normalize Helius native SOL mint to standard wSOL mint
			const mint = t.mint === SOL_NATIVE_MINT_HELIUS ? SOL_NATIVE_MINT : t.mint
			const isAppToken = APP_TOKEN_MINTS.has(mint)

			if (mint === SOL_NATIVE_MINT) solBalance += t.balance
			if (mint === USDC_MAINNET_MINT) usdcBalance += t.balance

			// Deduplicate by mint — merge balances for duplicate entries (e.g., native SOL + wSOL)
			if (processedMints.has(mint)) {
				const existing = tokens.find((tok) => tok.mint === mint)
				if (existing) {
					existing.balance += t.balance
					existing.totalValueUsd = (existing.totalValueUsd ?? 0) + (t.usdValue ?? 0)
				}
				continue
			}
			processedMints.add(mint)

			tokens.push({
				mint,
				symbol: t.symbol,
				name: t.name,
				iconUrl: t.logoUri,
				balance: t.balance,
				decimals: t.decimals,
				priceUsd: t.pricePerToken ?? null,
				totalValueUsd: t.usdValue ?? null,
				changePct24h: null,
				isAppToken,
			})
		}

		// Ensure app tokens appear even if not returned by the Wallet API
		// For missing tokens, query RPC directly for actual balance
		const missingAppTokens = APP_TOKEN_DEFAULTS.filter((def) => !processedMints.has(def.mint))
		if (missingAppTokens.length > 0) {
			const rpcUrl = getHeliusRpcUrl()
			// Batch RPC calls for all missing app tokens in parallel
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
								params: [
									address,
									{ mint: def.mint },
									{ encoding: 'jsonParsed' },
								],
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
						console.warn(`[fetchWalletData] RPC fallback failed for ${def.symbol}`)
						return 0
					}
				}),
			)

			missingAppTokens.forEach((def, i) => {
				const balance = rpcResults[i]
				tokens.push({
					mint: def.mint, symbol: def.symbol, name: def.name,
					iconUrl: def.iconUrl, balance, decimals: def.decimals,
					priceUsd: null,
					totalValueUsd: null,
					changePct24h: null,
					isAppToken: true,
				})
			})
		}

		// Sort: app tokens first, then by USD value
		tokens.sort((a, b) => {
			if (a.isAppToken && !b.isAppToken) return -1
			if (!a.isAppToken && b.isAppToken) return 1
			return (b.totalValueUsd ?? 0) - (a.totalValueUsd ?? 0)
		})

		const filteredTokens = tokens.filter((t) => t.isAppToken || (t.totalValueUsd ?? 0) >= TOKEN_VALUE_THRESHOLD_USD)

		// ── Map NFTs to flat format ──────────────────────────────────────
		const nfts: NFTAsset[] = (data.nfts ?? []).map((nft) => ({
			mint: nft.mint,
			name: nft.name,
			imageUri: nft.imageUri,
			collectionName: nft.collectionName,
			collectionAddress: nft.collectionAddress,
			compressed: nft.compressed,
		}))

		// ── Build wallet balance summary (totalUsd computed after CoinGecko merge) ──
		const walletBalance: WalletBalance = {
			address,
			sol: solBalance,
			usdc: usdcBalance,
			usdValue: 0, // will be overwritten by mergeTokenPrices
		}

		return { walletBalance, tokens: filteredTokens, nfts }
	} catch (error) {
		console.warn('[fetchWalletData] Wallet API error:', error instanceof Error ? error.message : 'Unknown')
		return empty
	}
}

// ─── Transaction History (Helius Parsed Transactions API) ────────────────────

function mapTransferDirection(address: string, from?: string | null, to?: string | null): TxDirection {
	if (to === address) return 'in'
	if (from === address) return 'out'
	return 'out'
}

async function fetchHistory(address: string): Promise<RawHistoryEntry[]> {
	if (!isValidSolanaAddress(address)) return []

	try {
		const url = `${heliusApiBase}/addresses/${address}/transactions?api-key=${heliusApiKey}&limit=20`
		const res = await fetch(url)
		if (!res.ok) return []

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
					entries.push({
						signature: tx.signature,
						address,
						token: 'SOL',
						amount: t.amount / LAMPORTS_PER_SOL,
						direction: mapTransferDirection(address, t.fromUserAccount, t.toUserAccount),
						timestamp: tx.timestamp * 1000,
					})
				})
			}

			if (tx.tokenTransfers) {
				tx.tokenTransfers.forEach((t) => {
					if (!t || t.mint !== USDC_MAINNET_MINT) return
					let amountUsdc: number
					if (typeof t.tokenAmount === 'number' && !isNaN(t.tokenAmount)) {
						if (typeof t.decimals === 'number' && !isNaN(t.decimals) && t.decimals > 0) {
							amountUsdc = t.tokenAmount / 10 ** t.decimals
						} else {
							amountUsdc = t.tokenAmount
						}
					} else {
						return
					}
					if (isNaN(amountUsdc) || amountUsdc === 0) return
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
	} catch {
		return []
	}
}

/**
 * Fetch recent confirmed collections from the database and convert to NFTAsset format.
 * This ensures newly minted cNFTs show up immediately, before Helius indexes them.
 * Filters by wallet address so only NFTs minted to the viewed wallet are shown.
 * Legacy rows without walletAddress are included as a fallback.
 */
async function fetchRecentCollectionsAsNFTs(userId: string, walletAddr: string): Promise<NFTAsset[]> {
	try {
		const recentCollections = await db
			.select({
				nftMint: collections.nftMint,
				collectionWallet: collections.walletAddress,
				postCaption: posts.caption,
				postMediaUrl: posts.mediaUrl,
				postCoverUrl: posts.coverUrl,
				postNftName: posts.nftName,
				postNftSymbol: posts.nftSymbol,
				postNftDescription: posts.nftDescription,
			})
			.from(collections)
			.innerJoin(posts, eq(collections.postId, posts.id))
			.where(
				and(
					eq(collections.userId, userId),
					eq(collections.status, 'confirmed')
				)
			)
			.orderBy(desc(collections.createdAt))
			.limit(50)

		return recentCollections
			.filter((c) => c.nftMint)
			// Only include NFTs minted to this wallet (or legacy rows without wallet info)
			.filter((c) => !c.collectionWallet || c.collectionWallet === walletAddr)
			.map((c) => ({
				mint: c.nftMint!,
				name: c.postNftName || c.postCaption?.slice(0, 50) || 'Collectible',
				imageUri: c.postCoverUrl || c.postMediaUrl || null,
				collectionName: c.postNftSymbol || 'DESP',
				collectionAddress: null,
				compressed: true,
			}))
	} catch (error) {
		console.warn('[fetchRecentCollectionsAsNFTs] Failed:', error instanceof Error ? error.message : 'Unknown')
		return []
	}
}

// ─── Merge CoinGecko prices into raw wallet data ─────────────────────────────

/**
 * Overlay CoinGecko real-time prices onto Helius wallet data.
 * For app tokens, CoinGecko prices replace Helius (hourly DAS) prices.
 * Also recomputes totalUsd as sum of all token USD values, and updates walletBalance.usdValue.
 */
function mergeTokenPrices(
	walletData: WalletDataResult,
	cgPrices: Map<string, TokenPriceEntry>,
): WalletDataResult {
	const tokens = walletData.tokens.map((t) => {
		const cgEntry = cgPrices.get(t.mint)
		const isAppToken = t.isAppToken

		// For app tokens, prefer CoinGecko price (real-time) over Wallet API (hourly DAS)
		const priceUsd = (isAppToken && cgEntry?.priceUsd) ? cgEntry.priceUsd : (t.priceUsd ?? null)
		const totalValueUsd = priceUsd !== null ? t.balance * priceUsd : (t.totalValueUsd ?? null)

		return {
			...t,
			priceUsd,
			totalValueUsd,
			changePct24h: cgEntry?.changePct24h ?? t.changePct24h,
		}
	})

	// totalUsd = sum of ALL token USD values
	const totalUsd = tokens.reduce((sum, t) => sum + (t.totalValueUsd ?? 0), 0)

	return {
		...walletData,
		tokens,
		walletBalance: {
			...walletData.walletBalance,
			usdValue: totalUsd,
		},
	}
}

// ─── Wallet Overview (main entry point) ──────────────────────────────────────

/**
 * Get wallet overview (core logic)
 * Requires authentication
 *
 * Data sources:
 *   - Helius Wallet API (v1) → balances, tokens, NFTs (single request)
 *   - CoinGecko → 24h price changes for app tokens
 *   - Helius Parsed Transactions API → transaction history
 *   - Database → recently minted cNFTs (covers Helius indexing lag)
 */
export async function getWalletOverviewDirect(token: string): Promise<WalletOverviewResult> {
	try {
		// Authenticate user
		let userId: string
		let walletAddress: string | null = null
		let walletClientType: string | null = null

		try {
			const auth = await authenticateWithToken(token)
			if (!auth?.userId) {
				return { success: false, error: 'Authentication required' }
			}
			userId = auth.userId

			// Get user's primary wallet from userWallets table
			const [primaryWallet] = await db
				.select({ address: userWallets.address, connector: userWallets.connector })
				.from(userWallets)
				.where(and(eq(userWallets.userId, userId), eq(userWallets.isPrimary, true)))
				.limit(1)

			if (primaryWallet?.address) {
				walletAddress = primaryWallet.address
				walletClientType = primaryWallet.connector
			} else {
				// Fallback: first wallet by creation date, or users.walletAddress
				const [fallbackWallet] = await db
					.select({ address: userWallets.address, connector: userWallets.connector })
					.from(userWallets)
					.where(eq(userWallets.userId, userId))
					.orderBy(userWallets.createdAt)
					.limit(1)

				if (fallbackWallet?.address) {
					walletAddress = fallbackWallet.address
					walletClientType = fallbackWallet.connector
				} else {
					const [user] = await db.select({ walletAddress: users.walletAddress }).from(users).where(eq(users.id, userId)).limit(1)
					walletAddress = user?.walletAddress ?? null
				}
			}
		} catch (authError) {
			const message = authError instanceof Error ? authError.message : 'Authentication failed'
			return { success: false, error: message }
		}

		if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
			return {
				success: true,
				solPriceUsd: 0,
				solChangePct24h: 0,
				totalUsd: 0,
				wallets: [],
				tokens: [],
				activity: [],
				nfts: [],
			}
		}

		// Fetch all three data sources in parallel
		const [rawWalletData, rawHistory, cgPrices] = await Promise.all([
			fetchWalletData(walletAddress),
			fetchHistory(walletAddress),
			getTokenPriceData().catch(() => new Map<string, TokenPriceEntry>()),
		])

		// Merge CoinGecko prices into wallet data (overlay real-time prices, compute totalUsd)
		const walletData = mergeTokenPrices(rawWalletData, cgPrices)
		const solPriceUsd = cgPrices.get(SOL_NATIVE_MINT)?.priceUsd ?? 0
		const solChangePct24h = cgPrices.get(SOL_NATIVE_MINT)?.changePct24h ?? 0

		// Process history — non-critical, don't let enrichment errors break the entire wallet overview
		let activity: ActivityEntry[] = []
		try {
			const rawHistoryFlat = rawHistory.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20)
			const enrichedTransactions = await enrichTransactionHistory(rawHistoryFlat, [walletAddress])
			const [userCollections, userPurchases, userTips] = await Promise.all([
				fetchUserCollections(userId, 20, walletAddress),
				fetchUserPurchases(userId, 20),
				fetchUserTips(userId, 20),
			])
			activity = mergeActivityEntries(enrichedTransactions, userCollections, userPurchases, userTips).slice(0, 30)
		} catch (enrichError) {
			console.warn(
				'[getWalletOverviewDirect] Failed to enrich transaction history:',
				enrichError instanceof Error ? enrichError.message : 'Unknown error'
			)
		}

		// Supplement NFTs with DB collections to cover Helius indexing lag
		const dbNFTs = await fetchRecentCollectionsAsNFTs(userId, walletAddress)
		const apiNftMints = new Set(walletData.nfts.map((n) => n.mint))
		const provisionalNFTs = dbNFTs.filter((n) => !apiNftMints.has(n.mint))
		const allNFTs = [...walletData.nfts, ...provisionalNFTs]

		return {
			success: true,
			solPriceUsd,
			solChangePct24h,
			totalUsd: walletData.walletBalance.usdValue,
			wallets: [{ ...walletData.walletBalance, walletClientType: walletClientType || 'privy' }],
			tokens: walletData.tokens,
			activity,
			nfts: allNFTs,
		}
	} catch (error) {
		console.error('Error in getWalletOverviewDirect:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to load wallet',
		}
	}
}
