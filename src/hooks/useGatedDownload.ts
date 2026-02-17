/**
 * Hook for handling gated asset downloads
 * 
 * Flow:
 * 1. Get nonce from server
 * 2. Sign message with wallet
 * 3. Verify signature and get token
 * 4. Return download URL with token
 */

import { useState } from 'react'
import { useWallets, useSignMessage } from '@privy-io/react-auth/solana'
import { toastError, toastInfo } from '@/lib/toast'
import bs58 from 'bs58'
import { getDownloadNonce, verifyAndIssueToken } from '@/server/functions/downloadAuth'

interface UseGatedDownloadReturn {
  downloadProtectedAsset: (assetId: string) => Promise<string | null>
  isAuthenticating: boolean
}

export function useGatedDownload(): UseGatedDownloadReturn {
  const { wallets: solanaWallets } = useWallets()
  const { signMessage } = useSignMessage()
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const downloadProtectedAsset = async (assetId: string): Promise<string | null> => {
    try {
      setIsAuthenticating(true)

      // Get wallet
      const wallet = solanaWallets[0]
      if (!wallet || !wallet.address) {
        toastError('Wallet not connected. Please connect your wallet.')
        return null
      }

      // Step 1: Get nonce
      const nonceResult = await getDownloadNonce({
        data: {
          assetId,
          wallet: wallet.address,
        },
      } as never)

      if (!nonceResult.success || !nonceResult.message) {
        toastError(nonceResult.error || 'Failed to get download authorization')
        return null
      }

      // Step 2: Sign message
      toastInfo('Please sign the message to verify ownership...')
      
      const messageBytes = new TextEncoder().encode(nonceResult.message)
      
      const modalUiOptions = {
        title: 'Verify ownership',
        description: 'Sign to prove you own this NFT and download the file',
        showWalletUIs: true,
      }

      const signResult = await signMessage({
        message: messageBytes,
        wallet: wallet,
        options: { uiOptions: modalUiOptions },
      })

      if (!signResult || !signResult.signature) {
        toastError('Signature cancelled or failed')
        return null
      }

      // Step 3: Verify signature and get token
      const signature = bs58.encode(signResult.signature)

      const tokenResult = await verifyAndIssueToken({
        data: {
          assetId,
          wallet: wallet.address,
          signature,
          message: nonceResult.message,
        },
      } as never)

      if (!tokenResult.success || !tokenResult.token) {
        toastError(tokenResult.error || 'Failed to verify ownership')
        return null
      }

      // Step 4: Return API route URL with token
      // The API route streams the file without exposing the blob URL
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://desperse.app'
      const downloadUrl = `${origin}/api/assets/${assetId}?token=${tokenResult.token}`
      return downloadUrl
    } catch (error) {
      console.error('Error in downloadProtectedAsset:', error)
      toastError(error instanceof Error ? error.message : 'Failed to authenticate download')
      return null
    } finally {
      setIsAuthenticating(false)
    }
  }

  return {
    downloadProtectedAsset,
    isAuthenticating,
  }
}

