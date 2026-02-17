import type { User, ConnectedWallet } from '@privy-io/react-auth'

export type SolanaWalletInfo = {
  address: string
  walletClientType?: string
}

interface BuildWalletListArgs {
  wallets: ConnectedWallet[]
  linkedAccounts?: User['linkedAccounts']
  fallbackAddress?: string | null
}

export function buildSolanaWalletList({
  wallets,
  linkedAccounts,
  fallbackAddress,
}: BuildWalletListArgs): SolanaWalletInfo[] {
  const walletList: SolanaWalletInfo[] = []
  const addedAddresses = new Set<string>()

  const addWallet = (address: string, walletClientType?: string) => {
    if (!addedAddresses.has(address)) {
      addedAddresses.add(address)
      walletList.push({ address, walletClientType })
    }
  }

  // 1. First, add the embedded wallet from linkedAccounts (walletClientType === 'privy')
  // This ensures the embedded wallet is always first in the list
  if (linkedAccounts) {
    const embeddedWallet = linkedAccounts.find(
      (account) =>
        account.type === 'wallet' &&
        account.chainType === 'solana' &&
        'walletClientType' in account &&
        account.walletClientType === 'privy'
    )
    if (embeddedWallet && 'address' in embeddedWallet) {
      addWallet(embeddedWallet.address as string, 'privy')
    }
  }

  // 2. Add connected wallets from useWallets() (actively connected)
  // ConnectedWallet has 'type' property for chain type ('ethereum' | 'solana')
  // Using type assertion since the generic ConnectedWallet type may not include 'solana'
  const solanaWallets = wallets.filter((wallet) => (wallet as { type?: string }).type === 'solana')
  solanaWallets.forEach((wallet) => {
    addWallet(wallet.address, wallet.walletClientType)
  })

  // 3. Add remaining linked wallets (external wallets that may not be connected)
  if (linkedAccounts) {
    const linkedSolanaWallets = linkedAccounts.filter(
      (account) => account.type === 'wallet' && account.chainType === 'solana',
    )
    linkedSolanaWallets.forEach((account) => {
      if ('address' in account) {
        const clientType = 'walletClientType' in account ? (account.walletClientType as string | undefined) : undefined
        addWallet(account.address as string, clientType)
      }
    })
  }

  // 4. Fallback: add the primary wallet address if not already in list
  // Don't assume walletClientType - it will be undefined if we don't know
  if (fallbackAddress) {
    addWallet(fallbackAddress, undefined)
  }

  return walletList
}

