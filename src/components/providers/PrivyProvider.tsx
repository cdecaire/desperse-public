'use client'

import { PrivyProvider as PrivySDKProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'
import { useTheme } from './ThemeProvider'
import { getClientRpcUrl } from '@/lib/rpc'
import { getEchoesClientRpcUrl } from '@/lib/echoes-rpc'

interface PrivyProviderProps {
  children: React.ReactNode
  /** Helius WebSocket URL passed from server (keeps API key out of client bundle) */
  heliusWsUrl?: string | null
}

/**
 * Privy authentication provider wrapper
 * Wraps the app with Privy SDK context for auth functionality
 * 
 * Multi-chain Configuration:
 * - walletChainType: 'ethereum-and-solana' so the Privy modal exposes both chains
 * - Solana wallets are the spending/signing wallets for the Desperse app
 * - Ethereum wallets are linked for verification/provenance only (e.g. Foundation
 *   preservation flow). They are never auto-created and never become the primary
 *   Desperse wallet — see the address-format guard in setDefaultWalletDirect.
 *
 * Embedded Wallet Strategy:
 * - Automatically creates Solana embedded wallets for ALL users on login
 * - Includes users who sign up with external wallets (Phantom, MetaMask, etc.)
 * - This ensures every user has an embedded Solana wallet for NFT minting/collecting
 * - Ethereum embedded wallets are explicitly disabled — we only accept external ETH wallets
 */
export function PrivyProvider({ children, heliusWsUrl }: PrivyProviderProps) {
  // Buffer polyfill is now loaded synchronously via buffer-polyfill.ts import in __root.tsx
  // No need for async loading here

  // Detect PWA standalone mode — wallet extensions don't work in PWAs on mobile,
  // so we hide wallet login and show only social/email methods
  const isPWA = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )

  // Get current theme from ThemeProvider to sync Privy's theme
  const { resolvedTheme } = useTheme()
  // Echoes pages are always dark — force Privy modals to dark mode on /echoes routes
  const isEchoes = typeof window !== 'undefined' && window.location.pathname.startsWith('/echoes')
  const privyTheme: 'light' | 'dark' = isEchoes ? 'dark' : (resolvedTheme === 'dark' ? 'dark' : 'light')

  // Get app ID from environment - uses Vite's import.meta.env for client-side access
  const appId = import.meta.env.VITE_PRIVY_APP_ID

  // Generate theme-aware SVG logo as data URI
  // This adapts to light/dark theme and overrides any logo uploaded in the Privy dashboard
  const logoColor = privyTheme === 'dark' ? '#fafafa' : '#09090b' // zinc-50 for dark, zinc-950 for light
  
  const logoSvg = `<svg width="473" height="500" viewBox="0 0 473 500" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M237.841 497.826C268.168 493.915 290.894 488.335 314.722 478.948C389.042 449.671 443.371 391.778 463.561 320.347C476.573 274.312 476.111 220.907 462.305 175.021C450.144 134.603 424.171 95.1888 390.847 66.582C373.509 51.6991 357.556 41.3516 334.416 29.9808C302.689 14.3902 276.507 7.08708 232.16 1.45806C227.42 0.856436 191.01 0.502448 112.671 0.296378L0 0V250V500L112.671 499.719C222.301 499.445 225.68 499.394 237.841 497.826ZM23.4811 449.187V424.572L196.503 251.571L369.526 78.5699L372.422 80.7653C374.015 81.9727 379.75 87.3003 385.166 92.6043L395.013 102.248L209.247 288.025L23.4811 473.801V449.187ZM23.4811 367.769V342.776L171.171 195.104L318.862 47.4325L325.503 50.6948C333.115 54.4344 350.701 64.5299 350.701 65.1605C350.701 65.3927 277.077 139.198 187.091 229.172L23.4811 392.762V367.769ZM23.4811 286.731V261.737L140.344 144.89L257.206 28.0434L262.799 29.2199C275.371 31.8642 296.165 37.7264 296.165 38.6264C296.165 38.8732 234.811 100.421 159.823 175.399L23.4811 311.724V286.731ZM23.4811 205.313V180.698L102.566 101.625L181.652 22.5514L202.74 23.0471C214.338 23.3197 224.937 23.7995 226.293 24.1132L228.759 24.6836L126.12 127.306L23.4811 229.928V205.313ZM23.4811 124.273V99.6572L61.9354 61.213L100.39 22.7687L124.806 22.9687L149.223 23.1688L86.352 86.0285L23.4811 148.888V124.273ZM23.4811 46.2685V22.7901H47.147H70.8128L47.3409 46.2685C34.4313 59.1816 23.7817 69.7468 23.675 69.7468C23.5684 69.7468 23.4811 59.1816 23.4811 46.2685Z" fill="${logoColor}"/>
</svg>`
  const logoUrl = `data:image/svg+xml,${encodeURIComponent(logoSvg)}`

  // RPC URL points to our server proxy — API key never reaches the client
  const rpcUrl = getClientRpcUrl()

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
        // In PWA mode, hide wallet login — extensions don't work, deep links open wallet's
        // in-app browser instead of returning to the PWA. Users get an embedded wallet via social login.
        loginMethods: isPWA
          ? ['email', 'google', 'twitter']
          : ['wallet', 'email', 'google', 'twitter'],
        appearance: {
          theme: privyTheme,
          accentColor: isEchoes ? '#00BFA6' : (privyTheme === 'dark' ? '#fafafa' : '#09090b'),
          logo: logoUrl,
          showWalletLoginFirst: !isPWA,
          ...(isEchoes ? {
            landingHeader: 'Connect to Tessera',
            loginMessage: 'Link a wallet or sign in to recover your Echo.',
          } : {}),
          ...(isPWA ? {} : {
            walletList: [
              'detected_solana_wallets',
              'phantom',
              'solflare',
              'backpack',
              'okx_wallet',
              'detected_ethereum_wallets',
              'metamask',
              'rainbow',
              'wallet_connect',
              'coinbase_wallet',
            ],
          }),
          walletChainType: 'ethereum-and-solana',
        },
        // Solana RPC configuration for embedded wallet UIs (required for transactions)
        // HTTP RPC goes through our server proxy (keeps Helius API key out of client bundle)
        // WebSocket URL is passed from the server via root loader (same Helius key, no VITE_ exposure)
        // Without rpcSubscriptions, Privy's signing modal shows "Something went wrong"
        solana: {
          rpcs: {
            'solana:mainnet': {
              rpc: createSolanaRpc(rpcUrl),
              ...(heliusWsUrl
                ? { rpcSubscriptions: createSolanaRpcSubscriptions(heliusWsUrl) }
                : {}),
            } as any,
            // Echoes PFP mint uses devnet — separate RPC proxy keeps devnet API key server-side
            'solana:devnet': {
              rpc: createSolanaRpc(getEchoesClientRpcUrl()),
            } as any,
          },
        },
        // Embedded wallet configuration - create Solana wallets for ALL users automatically
        embeddedWallets: {
          // Create Solana embedded wallets for ALL users, even those with external wallets
          solana: {
            createOnLogin: 'all-users',
          },
          // Explicitly disable Ethereum embedded wallets
          ethereum: {
            createOnLogin: 'off',
          },
          // Enable wallet UI modals for signing operations
          showWalletUIs: true,
        },
        // External Solana wallet connectors — skip in PWA mode (no extensions available)
        ...(isPWA ? {} : {
          externalWallets: {
            solana: {
              connectors: toSolanaWalletConnectors(),
            },
          },
        }),
      }}
    >
      {children}
    </PrivySDKProvider>
  )
}

export default PrivyProvider

