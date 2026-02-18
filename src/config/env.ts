/**
 * Typed environment variable access
 * All environment variables should be accessed through this file
 */

export function getEnvVar(key: string, defaultValue?: string): string {
  // Handle case where import.meta.env is undefined (Node.js scripts)
  const viteValue = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env[key] : undefined;
  const value = viteValue || process.env[key] || defaultValue;
  // Only throw if no value AND no default was provided (undefined means no default)
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

function getEnvVarAsNumber(key: string, defaultValue?: number): number {
  const value = getEnvVar(key, defaultValue?.toString());
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid number for environment variable: ${key}`);
  }
  return num;
}

// App Configuration
export const env = {
  // App Configuration
  PLATFORM_FEE_BPS: getEnvVarAsNumber('VITE_PLATFORM_FEE_BPS', 500),
  PLATFORM_WALLET_ADDRESS: getEnvVar('VITE_PLATFORM_WALLET_ADDRESS', ''),
  // Collect rate limits (conservative defaults to prevent abuse)
  // Daily limit: max collects per user per day
  COLLECT_RATE_LIMIT: getEnvVarAsNumber('VITE_COLLECT_RATE_LIMIT', 10),
  // Per-IP daily limit: protects against wallet rotation attacks
  COLLECT_IP_RATE_LIMIT: getEnvVarAsNumber('VITE_COLLECT_IP_RATE_LIMIT', 30),
  // Burst limit: max collects per user per minute (prevents rapid-fire bot behavior)
  COLLECT_BURST_LIMIT: getEnvVarAsNumber('VITE_COLLECT_BURST_LIMIT', 2),
  COLLECT_BURST_WINDOW_SECONDS: getEnvVarAsNumber('VITE_COLLECT_BURST_WINDOW_SECONDS', 60),

  POST_RATE_LIMIT: getEnvVarAsNumber('VITE_POST_RATE_LIMIT', 10),
  MAX_FILE_SIZE_MB: getEnvVarAsNumber('VITE_MAX_FILE_SIZE_MB', 100),
  HANDLE_CHANGE_RATE_LIMIT: getEnvVarAsNumber('VITE_HANDLE_CHANGE_RATE_LIMIT', 3),
  PROFILE_USERNAME_CHANGE_LIMIT_DAYS: getEnvVarAsNumber('VITE_PROFILE_USERNAME_CHANGE_LIMIT_DAYS', 30),

  // Feature flags
  FEATURE_MULTI_ASSET_STANDARD: getEnvVar('VITE_FEATURE_MULTI_ASSET_STANDARD', 'true') === 'true',
  FEATURE_MULTI_ASSET_COLLECTIBLE: getEnvVar('VITE_FEATURE_MULTI_ASSET_COLLECTIBLE', 'true') === 'true',
  FEATURE_MULTI_ASSET_EDITION: getEnvVar('VITE_FEATURE_MULTI_ASSET_EDITION', 'true') === 'true',

  // Rate limit window in seconds (24 hours for daily limits)
  RATE_LIMIT_WINDOW_SECONDS: getEnvVarAsNumber('VITE_RATE_LIMIT_WINDOW_SECONDS', 86400),

  // Database
  DATABASE_URL: getEnvVar('DATABASE_URL', ''),

  // Helius (Solana RPC)
  HELIUS_API_KEY: getEnvVar('HELIUS_API_KEY', ''),
  HELIUS_WEBHOOK_SECRET: getEnvVar('HELIUS_WEBHOOK_SECRET', ''),
  BUBBLEGUM_TREE_ADDRESS: getEnvVar('BUBBLEGUM_TREE_ADDRESS', ''),
  COMPRESSED_MINT_FEE_PAYER_PRIVATE_KEY: getEnvVar('COMPRESSED_MINT_FEE_PAYER_PRIVATE_KEY', ''),
  PLATFORM_AUTHORITY_PRIVATE_KEY: getEnvVar('PLATFORM_AUTHORITY_PRIVATE_KEY', ''),

  // Vercel Blob Storage
  BLOB_READ_WRITE_TOKEN: getEnvVar('BLOB_READ_WRITE_TOKEN', ''),

  // Privy
  PRIVY_APP_ID: getEnvVar('VITE_PRIVY_APP_ID', ''),
  PRIVY_APP_SECRET: getEnvVar('PRIVY_APP_SECRET', ''),

  // CoinGecko (for SOL price data)
  COINGECKO_API_KEY: getEnvVar('COINGECKO_API_KEY', ''),

  // Ably (for real-time messaging)
  ABLY_API_KEY: getEnvVar('ABLY_API_KEY', ''),

  // RPC Fallback Configuration
  FALLBACK_RPC_URL: getEnvVar('FALLBACK_RPC_URL', ''),
  RPC_TIMEOUT_MS: getEnvVarAsNumber('RPC_TIMEOUT_MS', 10000),

  // Fee Subsidy Circuit Breaker
  // When enabled, returns error instead of subsidizing fees
  DISABLE_FEE_SUBSIDY: getEnvVar('DISABLE_FEE_SUBSIDY', 'false') === 'true',
} as const;

/**
 * Get the Helius RPC URL with API key (server-side only)
 * Uses HELIUS_API_KEY — the key is never exposed to the client.
 * Client code should use `getClientRpcUrl()` from `@/lib/rpc` instead.
 */
export function getHeliusRpcUrl(): string {
  const apiKey = env.HELIUS_API_KEY;
  if (apiKey) {
    return `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  }
  // Fallback to public RPC (rate limited, not recommended for production)
  console.warn('HELIUS_API_KEY not set, using public RPC endpoint');
  return 'https://api.mainnet-beta.solana.com';
}

/**
 * Get the Helius API base URL for REST API calls
 */
export function getHeliusApiUrl(): string {
  const apiKey = env.HELIUS_API_KEY;
  if (!apiKey) {
    throw new Error('HELIUS_API_KEY is required for Helius API calls');
  }
  return `https://api.helius.xyz/v0`;
}

/**
 * Check if blockchain features are available
 * Returns false if required env vars are missing
 */
export function isBlockchainEnabled(): boolean {
  return Boolean(env.HELIUS_API_KEY);
}

/**
 * Check if multi-asset posts feature is enabled for standard posts
 */
export function isMultiAssetEnabled(): boolean {
  return env.FEATURE_MULTI_ASSET_STANDARD;
}

/**
 * Check if multi-asset posts feature is enabled for collectibles
 */
export function isMultiAssetCollectibleEnabled(): boolean {
  return env.FEATURE_MULTI_ASSET_COLLECTIBLE;
}

/**
 * Check if multi-asset posts feature is enabled for editions
 */
export function isMultiAssetEditionEnabled(): boolean {
  return env.FEATURE_MULTI_ASSET_EDITION;
}

/**
 * Get and validate the platform wallet address
 * Throws if the platform wallet is not configured
 * Note: This function validates the address exists and has correct length.
 * Full PublicKey validation happens when the address is used in transactions.
 */
export function getPlatformWalletAddress(): string {
  const address = env.PLATFORM_WALLET_ADDRESS;
  if (!address || address.trim() === '') {
    throw new Error(
      'PLATFORM_WALLET_ADDRESS is not configured. Please set VITE_PLATFORM_WALLET_ADDRESS environment variable. Platform fees cannot be collected without a valid platform wallet address.'
    );
  }
  
  // Basic format validation: Solana addresses are base58 and typically 32-44 characters
  const trimmed = address.trim();
  if (trimmed.length < 32 || trimmed.length > 44) {
    throw new Error(
      `PLATFORM_WALLET_ADDRESS appears to be invalid (length ${trimmed.length}, expected 32-44 characters). Please verify it is a valid Solana public key.`
    );
  }
  
  return trimmed;
}

