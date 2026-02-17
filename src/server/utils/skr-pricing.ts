/**
 * SKR token pricing oracle.
 * Primary: Jupiter Price API
 * Fallback: DexScreener API
 * Cache: Module-scope Map with 60s TTL (serverless-safe)
 */

const SKR_MAINNET_MINT = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3'
const SOL_MINT = 'So11111111111111111111111111111111111111112'
const CACHE_TTL_MS = 60_000
const FETCH_TIMEOUT_MS = 5_000

interface PriceCache {
  price: number
  timestamp: number
}

const priceCache = new Map<string, PriceCache>()

export async function getSkrPriceUsd(): Promise<number | null> {
  const cached = priceCache.get('SKR_USD')
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price
  }

  // Try Jupiter Price API first
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const response = await fetch(
      `https://api.jup.ag/price/v2?ids=${SKR_MAINNET_MINT}`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      const price = data?.data?.[SKR_MAINNET_MINT]?.price
      if (typeof price === 'number' && price > 0) {
        priceCache.set('SKR_USD', { price, timestamp: Date.now() })
        return price
      }
    }
  } catch (e) {
    console.warn('[SKR Pricing] Jupiter API failed:', e instanceof Error ? e.message : e)
  }

  // Fallback: DexScreener API
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${SKR_MAINNET_MINT}`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      const pair = data?.pairs?.[0]
      const price = pair?.priceUsd ? parseFloat(pair.priceUsd) : null
      if (price && price > 0) {
        priceCache.set('SKR_USD', { price, timestamp: Date.now() })
        return price
      }
    }
  } catch (e) {
    console.warn('[SKR Pricing] DexScreener API failed:', e instanceof Error ? e.message : e)
  }

  // Return stale cache if both fail (better than nothing)
  const stale = priceCache.get('SKR_USD')
  if (stale) {
    console.warn('[SKR Pricing] Returning stale price from', new Date(stale.timestamp).toISOString())
    return stale.price
  }

  return null
}

export async function getSolPriceUsd(): Promise<number | null> {
  const cached = priceCache.get('SOL_USD')
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const response = await fetch(
      `https://api.jup.ag/price/v2?ids=${SOL_MINT}`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      const price = data?.data?.[SOL_MINT]?.price
      if (typeof price === 'number' && price > 0) {
        priceCache.set('SOL_USD', { price, timestamp: Date.now() })
        return price
      }
    }
  } catch (e) {
    console.warn('[SOL Pricing] Jupiter API failed:', e instanceof Error ? e.message : e)
  }

  return priceCache.get('SOL_USD')?.price ?? null
}

export function getSkrMintAddress(): string {
  return SKR_MAINNET_MINT
}
