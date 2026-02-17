'use client'

import { PrivyProvider as PrivySDKProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'
import { useTheme } from './ThemeProvider'

interface PrivyProviderProps {
  children: React.ReactNode
}

/**
 * Privy authentication provider wrapper
 * Wraps the app with Privy SDK context for auth functionality
 * 
 * Solana-Only Configuration:
 * - Set walletChainType to 'solana-only' for proper Solana wallet handling
 * - Configured Solana connectors for external wallet connections
 * 
 * Embedded Wallet Strategy:
 * - Automatically creates Solana embedded wallets for ALL new users
 * - This ensures every user has a wallet ready for NFT minting/collecting
 * - Users can later link external Solana wallets if desired
 * - Ethereum wallets are explicitly disabled to match app requirements
 */
export function PrivyProvider({ children }: PrivyProviderProps) {
  // Buffer polyfill is now loaded synchronously via buffer-polyfill.ts import in __root.tsx
  // No need for async loading here

  // Get current theme from ThemeProvider to sync Privy's theme
  const { resolvedTheme } = useTheme()
  // resolvedTheme will be 'light' or 'dark' (never 'system')
  const privyTheme = (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark'

  // Get app ID from environment - uses Vite's import.meta.env for client-side access
  const appId = import.meta.env.VITE_PRIVY_APP_ID
  const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY
  
  // Generate theme-aware SVG logo as data URI
  // This adapts to light/dark theme and overrides any logo uploaded in the Privy dashboard
  const logoColor = privyTheme === 'dark' ? '#fafafa' : '#09090b' // zinc-50 for dark, zinc-950 for light
  
  const logoSvg = `<svg width="473" height="500" viewBox="0 0 473 500" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M237.841 497.826C268.168 493.915 290.894 488.335 314.722 478.948C389.042 449.671 443.371 391.778 463.561 320.347C476.573 274.312 476.111 220.907 462.305 175.021C450.144 134.603 424.171 95.1888 390.847 66.582C373.509 51.6991 357.556 41.3516 334.416 29.9808C302.689 14.3902 276.507 7.08708 232.16 1.45806C227.42 0.856436 191.01 0.502448 112.671 0.296378L0 0V250V500L112.671 499.719C222.301 499.445 225.68 499.394 237.841 497.826ZM23.4811 449.187V424.572L196.503 251.571L369.526 78.5699L372.422 80.7653C374.015 81.9727 379.75 87.3003 385.166 92.6043L395.013 102.248L209.247 288.025L23.4811 473.801V449.187ZM23.4811 367.769V342.776L171.171 195.104L318.862 47.4325L325.503 50.6948C333.115 54.4344 350.701 64.5299 350.701 65.1605C350.701 65.3927 277.077 139.198 187.091 229.172L23.4811 392.762V367.769ZM23.4811 286.731V261.737L140.344 144.89L257.206 28.0434L262.799 29.2199C275.371 31.8642 296.165 37.7264 296.165 38.6264C296.165 38.8732 234.811 100.421 159.823 175.399L23.4811 311.724V286.731ZM23.4811 205.313V180.698L102.566 101.625L181.652 22.5514L202.74 23.0471C214.338 23.3197 224.937 23.7995 226.293 24.1132L228.759 24.6836L126.12 127.306L23.4811 229.928V205.313ZM23.4811 124.273V99.6572L61.9354 61.213L100.39 22.7687L124.806 22.9687L149.223 23.1688L86.352 86.0285L23.4811 148.888V124.273ZM23.4811 46.2685V22.7901H47.147H70.8128L47.3409 46.2685C34.4313 59.1816 23.7817 69.7468 23.675 69.7468C23.5684 69.7468 23.4811 59.1816 23.4811 46.2685Z" fill="${logoColor}"/>
</svg>`
  const logoUrl = `data:image/svg+xml,${encodeURIComponent(logoSvg)}`

  // Warn if Helius API key is missing (required for production to avoid rate limits)
  if (!heliusApiKey) {
    console.error(
      '⚠️ VITE_HELIUS_API_KEY is not set. Using public Solana RPC endpoint which is rate-limited.',
      'This will cause 403 errors in production. Please set VITE_HELIUS_API_KEY in your environment variables.'
    )
  }

  const heliusRpc = heliusApiKey
    ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
    : 'https://api.mainnet-beta.solana.com'
  const heliusWs = heliusApiKey
    ? `wss://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
    : 'wss://api.mainnet-beta.solana.com'

  if (!appId) {
    console.error('VITE_PRIVY_APP_ID is not set')
    // Return children without provider in development if no app ID
    // This allows the app to load even without Privy configured
    return <>{children}</>
  }

  return (
    <PrivySDKProvider
      appId={appId}
      config={{
        // Configure login methods (wallets enabled for Solana-only)
        loginMethods: ['wallet', 'email', 'google', 'twitter'],
        // Appearance settings - synced with app theme
        appearance: {
          // Theme matches app's dark/light mode
          theme: privyTheme,
          // Use purple-heart-600 as accent color (matches --highlight)
          accentColor: '#a213ff',
          // Logo configuration
          logo: logoUrl,
          // Surface wallet sign-in prominently while keeping only Solana wallets available
          showWalletLoginFirst: true,
          // Show only Solana wallets (detected first, plus common options)
          walletList: ['detected_solana_wallets', 'phantom', 'solflare', 'backpack', 'okx_wallet'],
          walletChainType: 'solana-only', // Required for Solana wallet connections
        },
        // Solana RPC configuration for embedded wallet UIs (required for transactions)
        solana: {
          rpcs: {
            'solana:mainnet': {
              rpc: createSolanaRpc(heliusRpc),
              // WebSocket subscriptions for transaction monitoring
              // Note: Privy uses this for transaction status updates
              // If WebSocket connection fails, transactions may still work via HTTP RPC
              rpcSubscriptions: createSolanaRpcSubscriptions(heliusWs),
            },
          },
        },
        // Embedded wallet configuration - create Solana wallets for ALL users automatically
        embeddedWallets: {
          // Create Solana embedded wallets only for users who don't already have a wallet
          solana: {
            createOnLogin: 'users-without-wallets',
          },
          // Explicitly disable Ethereum embedded wallets
          ethereum: {
            createOnLogin: 'off',
          },
          // Enable wallet UI modals for signing operations
          showWalletUIs: true,
        },
        // External Solana wallet connectors (Phantom, etc.)
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
      }}
    >
      {children}
    </PrivySDKProvider>
  )
}

export default PrivyProvider

