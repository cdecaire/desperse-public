export const USDC_MAINNET_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

// Native SOL mint addresses
// Helius Wallet API v1 uses the native representation (41 ones + 1)
// DAS API / SPL token registry uses the wrapped SOL mint (40 ones + 12)
export const SOL_NATIVE_MINT = 'So11111111111111111111111111111111111111112'
export const SOL_NATIVE_MINT_HELIUS = 'So11111111111111111111111111111111111111111'

// SKR (Seeker) token mint address
export const SKR_MINT = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3'

// App-supported tokens for transactions
export const APP_TOKEN_MINTS = new Set([SOL_NATIVE_MINT, SOL_NATIVE_MINT_HELIUS, USDC_MAINNET_MINT, SKR_MINT])

// CoinGecko IDs for price fetching
export const COINGECKO_IDS: Record<string, string> = {
	[SOL_NATIVE_MINT]: 'solana',
	[SOL_NATIVE_MINT_HELIUS]: 'solana',
	[USDC_MAINNET_MINT]: 'usd-coin',
	[SKR_MINT]: 'seeker',
}

