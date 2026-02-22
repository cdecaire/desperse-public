import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toastError, toastInfo, toastSuccess } from '@/lib/toast';
import {
  buyEdition,
  checkPurchaseStatus,
  getUserPurchaseStatus,
  submitPurchaseSignature,
  cancelPendingPurchase,
  retryFulfillment,
} from '@/server/functions/editions';
import { getExplorerUrl } from '@/server/functions/preferences';
import { usePreferences } from '@/hooks/usePreferences';
import { useWallets as useSolanaWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { createSolanaRpc } from '@solana/kit';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRpcHealthContext } from '@/components/providers/RpcHealthProvider';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { useAuth } from '@/hooks/useAuth';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { getClientRpcUrl } from '@/lib/rpc';
import { Buffer } from 'buffer';
import bs58 from 'bs58';

type BuyState =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'confirming'       // Payment submitted, waiting for confirmation
  | 'minting'          // Payment confirmed, minting in progress
  | 'success'
  | 'failed'
  | 'sold_out'
  | 'insufficient_funds'
  | 'claiming';        // Payment confirmed but NFT not minted - user can claim

type TimeStatus = 'no_window' | 'not_started' | 'active' | 'ending_soon' | 'ended';

const ENDING_SOON_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/** Parse a Date, string, or null into a Date or null */
function parseDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Compute the time status from window boundaries */
function computeTimeStatus(
  start: Date | null,
  end: Date | null,
  now: Date,
): TimeStatus {
  if (start == null || end == null) return 'no_window';
  if (now < start) return 'not_started';
  if (now >= end) return 'ended';
  const remaining = end.getTime() - now.getTime();
  if (remaining <= ENDING_SOON_THRESHOLD_MS) return 'ending_soon';
  return 'active';
}

/** Format a millisecond duration into a human-readable countdown string */
function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  // Only show seconds when less than 1 hour remaining
  if (days === 0 && hours === 0) parts.push(`${seconds}s`);
  return parts.join(' ') || '0s';
}

interface BuyButtonProps {
  postId: string;
  userId: string;
  price: number;
  currency: 'SOL' | 'USDC';
  maxSupply?: number | null;
  currentSupply?: number;
  isAuthenticated: boolean;
  className?: string;
  onSuccess?: () => void;
  /** Notify parent when purchase is confirmed (including restored success state) */
  onPurchased?: () => void;
  /** Post type color for the icon when purchased */
  toneColor?: string;
  /** Button variant */
  variant?: 'default' | 'ghost' | 'outline';
  /** Compact mode - shows icon + count when disabled, icon when enabled */
  compact?: boolean;
  /** Whether the item is already collected/purchased */
  isCollected?: boolean;
  /** Whether the item is sold out */
  isSoldOut?: boolean;
  /** Timed edition: when the mint window opens */
  mintWindowStart?: Date | string | null;
  /** Timed edition: when the mint window closes */
  mintWindowEnd?: Date | string | null;
}

type ServerFnInput<T> = { data: T };
const wrapInput = <T,>(data: T): ServerFnInput<T> => ({ data });

const POLL_INTERVAL_MS = 3000;        // Poll more frequently for better UX
const MAX_POLL_TIME_MS = 120000;      // Allow longer for minting (2 minutes)
const EXTENDED_MESSAGE_TIME_MS = 30000; // Show extended message sooner
const SIGN_TIMEOUT_MS = 90000;        // Increased to 90s to account for slow RPC
const SEND_TX_TIMEOUT_MS = 30000;     // 30s timeout for sendRawTransaction specifically
const MINTING_MESSAGE_DELAY_MS = 10000; // Show "minting" message after 10s of confirming

export function BuyButton({
  postId,
  userId,
  price,
  currency,
  maxSupply,
  currentSupply = 0,
  isAuthenticated,
  className,
  onSuccess,
  onPurchased,
  toneColor,
  variant = 'default',
  compact = false,
  isCollected = false,
  isSoldOut = false,
  mintWindowStart: mintWindowStartProp,
  mintWindowEnd: mintWindowEndProp,
}: BuyButtonProps) {
  // Ensure Buffer is available for privy/solana SDKs in the browser
  if (typeof window !== 'undefined' && !(window as any).Buffer) {
    (window as any).Buffer = Buffer;
  }

  const { wallets: solanaWallets, ready: solanaWalletsReady } = useSolanaWallets();
  const { signTransaction } = useSignTransaction();
  const { activePrivyWallet, activeAddress } = useActiveWallet();

  // Network and RPC health status
  const { isOffline } = useNetworkStatus();
  const { isAuthenticated: isAuthForRpc, getAuthHeaders } = useAuth();
  const { isRpcHealthy } = useRpcHealthContext();
  const { onWalletDisconnect } = useWalletConnection();

  // User preferences for explorer
  const { preferences } = usePreferences();

  const [state, setState] = useState<BuyState>('idle');
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [nftMint, setNftMint] = useState<string | null>(null);
  const [showExtendedMessage, setShowExtendedMessage] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const pollStartTime = useRef<number | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const extendedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mintingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // ---- Timed edition countdown ----
  const windowStart = useMemo(() => parseDate(mintWindowStartProp), [mintWindowStartProp]);
  const windowEnd = useMemo(() => parseDate(mintWindowEndProp), [mintWindowEndProp]);

  const [timeStatus, setTimeStatus] = useState<TimeStatus>(() =>
    computeTimeStatus(windowStart, windowEnd, new Date()),
  );
  const [countdown, setCountdown] = useState<string>('');
  // Override from server rejection (authoritative)
  const [serverTimeOverride, setServerTimeOverride] = useState<TimeStatus | null>(null);

  // Effective time status: server override wins, unless user has an active reservation
  const hasActiveReservation = purchaseId != null &&
    (state === 'preparing' || state === 'signing' || state === 'confirming' || state === 'minting' || state === 'claiming');
  const effectiveTimeStatus = hasActiveReservation
    ? 'active' // reservation is the user's "contract" — don't disable
    : serverTimeOverride ?? timeStatus;

  // Countdown timer — ticks every second when there is a visible time window
  useEffect(() => {
    if (windowStart == null && windowEnd == null) {
      setTimeStatus('no_window');
      setCountdown('');
      return;
    }

    const tick = () => {
      const now = new Date();
      const status = computeTimeStatus(windowStart, windowEnd, now);
      setTimeStatus(status);

      if (status === 'not_started' && windowStart) {
        const remaining = windowStart.getTime() - now.getTime();
        setCountdown(remaining > 0 ? formatCountdown(remaining) : '');
      } else if ((status === 'active' || status === 'ending_soon') && windowEnd) {
        const remaining = windowEnd.getTime() - now.getTime();
        setCountdown(remaining > 0 ? formatCountdown(remaining) : '');
      } else {
        setCountdown('');
      }
    };

    // Run immediately
    tick();

    // Only run interval if we need a live countdown
    const status = computeTimeStatus(windowStart, windowEnd, new Date());
    if (status === 'no_window' || status === 'ended') return;

    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [windowStart, windowEnd]);

  // Clear server override when props change (e.g., page navigated to a different post)
  useEffect(() => {
    setServerTimeOverride(null);
  }, [mintWindowStartProp, mintWindowEndProp]);

  // Lock refs to prevent duplicate calls
  const isMintingRef = useRef(false);
  const isPollingActiveRef = useRef(false);

  // Stop polling function (defined later, but referenced here)
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (extendedTimeoutRef.current) {
      clearTimeout(extendedTimeoutRef.current);
      extendedTimeoutRef.current = null;
    }
    if (mintingTimeoutRef.current) {
      clearTimeout(mintingTimeoutRef.current);
      mintingTimeoutRef.current = null;
    }
    pollStartTime.current = null;
    isPollingActiveRef.current = false;
    setPollCount(0);
  }, []);

  // Handle wallet disconnection
  useEffect(() => {
    const cleanup = onWalletDisconnect(() => {
      // Reset transaction state on wallet disconnect
      if (state === 'preparing' || state === 'signing' || state === 'confirming') {
        setState('idle');
        setPurchaseId(null);
        setTxSignature(null);
        stopPolling();
      }
    });
    
    return cleanup;
  }, [onWalletDisconnect, state, stopPolling]);
  
  // Update button state when wallet becomes available/disconnected
  useEffect(() => {
    const walletAvailable = solanaWalletsReady && activePrivyWallet;

    // If wallet becomes available and we're in failed state (due to no wallet), reset to idle
    if (walletAvailable && state === 'failed' && !purchaseId) {
      setState('idle');
    }

    // If wallet disconnects and we're in idle, keep it disabled (hasWallet check handles this)
  }, [solanaWalletsReady, activePrivyWallet, state, purchaseId]);

  // Determine sold out from props
  useEffect(() => {
    if (maxSupply !== null && maxSupply !== undefined && currentSupply >= (maxSupply ?? 0) && state === 'idle') {
      setState('sold_out');
      // Button will show "Sold Out" text, no need for toast
    }
  }, [currentSupply, maxSupply, state]);

  // Cleanup: Clear polling and cancel reserved purchases on unmount
  useEffect(() => {
    return () => {
      // Cancel reserved purchase if component unmounts while still in preparing/signing state
      // (user navigated away or closed the page before completing the transaction)
      if (purchaseId && (state === 'preparing' || state === 'signing')) {
        // Fire and forget - we can't await in cleanup
        cancelPendingPurchase(wrapInput({ purchaseId }) as never).catch((e) => {
          console.error('[BuyButton] Failed to cancel purchase on unmount:', e);
        });
      }
      
      // Clear intervals
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (extendedTimeoutRef.current) clearTimeout(extendedTimeoutRef.current);
      if (mintingTimeoutRef.current) clearTimeout(mintingTimeoutRef.current);
    };
  }, [purchaseId, state]);

  // Define startPolling before the effect that uses it
  const startPolling = useCallback(
    (purchase: string) => {
      // Prevent multiple polling instances
      if (isPollingActiveRef.current) {
        return;
      }

      isPollingActiveRef.current = true;

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollStartTime.current = Date.now();
      setShowExtendedMessage(false);
      setPollCount(0);

      extendedTimeoutRef.current = setTimeout(() => {
        setShowExtendedMessage(true);
      }, EXTENDED_MESSAGE_TIME_MS);

      // After some time in confirming, switch to "minting" state
      // This provides better feedback that minting is happening
      mintingTimeoutRef.current = setTimeout(() => {
        setState((currentState) => {
          // Only switch to minting if still in confirming state
          if (currentState === 'confirming') {
            return 'minting';
          }
          return currentState;
        });
      }, MINTING_MESSAGE_DELAY_MS);

      // Define the poll function so we can call it immediately
      const doPoll = async () => {
        try {
          setPollCount((c) => c + 1);
          const result = await checkPurchaseStatus(wrapInput({ purchaseId: purchase }) as never);
          if (result.success) {
            if (result.status === 'confirmed') {
              // Check if NFT was actually minted
              if (result.nftMint) {
                stopPolling();
                toastSuccess('Edition minted successfully!');

                // Brief delay to show "Minted!" before transitioning to success
                setState('success');
                setNftMint(result.nftMint);
                onPurchased?.();
                setTxSignature(result.txSignature || null);
                onSuccess?.();
              } else {
                // Payment confirmed but NFT not minted - show "Claim NFT" button
                setState('claiming');
                stopPolling();
              }
            } else if (result.status === 'awaiting_fulfillment') {
              // Payment confirmed! Check if minting is already in progress
              if (isMintingRef.current) {
                return;
              }

              isMintingRef.current = true;
              toastInfo('Payment confirmed! Minting your edition...');
              setState('minting');
              stopPolling(); // Stop polling, we'll trigger minting directly

              // Trigger minting immediately
              try {
                const mintResult = await retryFulfillment(wrapInput({ purchaseId: purchase }) as never);
                if (mintResult.success && mintResult.nftMint) {
                  toastSuccess('Edition minted successfully!');
                  setState('success');
                  setNftMint(mintResult.nftMint);
                  onPurchased?.();
                  onSuccess?.();
                } else {
                  // Minting failed but payment was made - show claim button
                  setState('claiming');
                  toastError(mintResult.error || 'Minting failed. Click "Claim NFT" to retry.');
                }
              } catch (mintError) {
                console.error('[BuyButton] Minting error:', mintError);
                setState('claiming');
                toastError('Minting failed. Click "Claim NFT" to retry.');
              } finally {
                isMintingRef.current = false;
              }
            } else if (result.status === 'minting' || result.status === 'master_created') {
              // Minting already in progress - just show minting state and keep polling
              setState('minting');
            } else if (result.status === 'failed' || result.status === 'blocked_missing_master') {
              setState('failed');
              toastError(result.error || 'Transaction failed. You can try again.');
              stopPolling();
            } else if (
              result.status === 'reserved' &&
              !result.txSignature &&
              pollStartTime.current &&
              Date.now() - pollStartTime.current > MAX_POLL_TIME_MS
            ) {
              // Reserved too long without signature — cancel and fail
              try {
                await cancelPendingPurchase(wrapInput({ purchaseId: purchase }) as never);
              } catch (e) {
                console.error('Failed to cancel long-pending purchase:', e);
              }
              setState('failed');
              toastError('Transaction timed out. Please try again.');
              stopPolling();
            }
          }

          if (pollStartTime.current && Date.now() - pollStartTime.current > MAX_POLL_TIME_MS) {
            // continue polling but show extended message
          }
        } catch (error) {
          console.error('Error polling purchase status:', error);
        }
      };

      // Call immediately, then set up interval
      doPoll();
      pollIntervalRef.current = setInterval(doPoll, POLL_INTERVAL_MS);
    },
    [onSuccess, onPurchased, stopPolling],
  );

  // Resume any existing purchase on mount
  useEffect(() => {
    if (!isAuthenticated || !userId || isInitialized) return;

    async function loadExistingPurchase() {
      try {
        const result = await getUserPurchaseStatus(wrapInput({ postId, userId }) as never);
        if (result.success && result.purchase) {
          const purchase = result.purchase;
          setPurchaseId(purchase.id);
          setTxSignature(purchase.txSignature);

          // Only 'confirmed' status means purchased - server now auto-marks stale reserved as abandoned
          if (purchase.status === 'confirmed') {
            // Check if NFT was actually minted (payment confirmed but fulfillment may have failed)
            if (purchase.nftMint) {
              setState('success');
              setNftMint(purchase.nftMint);
              onPurchased?.();
            } else {
              // Payment confirmed but NFT not minted - show "Claim NFT" button
              setState('claiming');
              setPurchaseId(purchase.id); // Ensure purchaseId is set for claiming
            }
          } else if (purchase.status === 'awaiting_fulfillment') {
            // Payment confirmed but minting not started - check lock before triggering
            if (isMintingRef.current) {
              setState('minting');
              setPurchaseId(purchase.id);
              return;
            }

            isMintingRef.current = true;
            setState('minting');
            setPurchaseId(purchase.id);

            // Trigger minting immediately (don't wait for polling)
            try {
              const mintResult = await retryFulfillment(wrapInput({ purchaseId: purchase.id }) as never);
              if (mintResult.success && mintResult.nftMint) {
                toastSuccess('Edition minted successfully!');
                setState('success');
                setNftMint(mintResult.nftMint);
                onPurchased?.();
              } else {
                setState('claiming');
                toastError(mintResult.error || 'Minting failed. Click "Claim NFT" to retry.');
              }
            } catch (mintError) {
              console.error('[BuyButton] Minting error on load:', mintError);
              setState('claiming');
              toastError('Minting failed. Click "Claim NFT" to retry.');
            } finally {
              isMintingRef.current = false;
            }
          } else if (purchase.status === 'minting' || purchase.status === 'master_created') {
            // Minting in progress - poll to check when it's done
            setState('minting');
            setPurchaseId(purchase.id);
            startPolling(purchase.id);
          } else if ((purchase.status === 'reserved' || purchase.status === 'submitted') && purchase.txSignature) {
            // Reserved or submitted with signature - resume polling (server handles stale reserved)
            setState('confirming');
            startPolling(purchase.id);
          } else {
            // Failed, abandoned, stale reserved (now marked as abandoned), or no signature - allow retry
            setState('idle');
            setPurchaseId(null);
            setTxSignature(null);
          }
        } else {
          // No purchase record - show idle (Buy button)
          setState('idle');
          setPurchaseId(null);
          setTxSignature(null);
        }
      } catch (error) {
        console.error('Error loading purchase status:', error);
        // On error, default to idle to allow retry
        setState('idle');
      } finally {
        setIsInitialized(true);
      }
    }

    loadExistingPurchase();
  }, [isAuthenticated, userId, postId, isInitialized, onPurchased, startPolling]);

  const formatPrice = useCallback(() => {
    if (currency === 'SOL') {
      const sol = price / 1_000_000_000;
      return `${sol.toFixed(sol < 1 ? 3 : 2)} SOL`;
    }
    const usdc = price / 1_000_000;
    return `$${usdc.toFixed(2)}`;
  }, [price, currency]);

  const handleClaimNFT = async () => {
    if (!purchaseId) return;

    // Prevent duplicate claim attempts
    if (isMintingRef.current) {
      return;
    }

    isMintingRef.current = true;
    setState('minting'); // Show minting state while claiming
    try {
      const result = await retryFulfillment(wrapInput({ purchaseId }) as never);

      if (result.success && result.nftMint) {
        setState('success');
        setNftMint(result.nftMint);
        onPurchased?.();
        toastSuccess('NFT claimed successfully!');
        onSuccess?.();
      } else {
        setState('claiming'); // Keep in claiming state to allow retry
        toastError(result.error || 'Failed to claim NFT. Please try again.');
      }
    } catch (error) {
      console.error('Error claiming NFT:', error);
      setState('claiming'); // Keep in claiming state to allow retry
      toastError('Failed to claim NFT. Please try again.');
    } finally {
      isMintingRef.current = false;
    }
  };

  const handleBuy = async () => {
    if (!isAuthenticated || !userId) return;
    if (!hasWallet) {
      toastError('Please connect your Solana wallet to purchase.');
      return;
    }
    if (state !== 'idle' && state !== 'failed' && state !== 'insufficient_funds') return;

    // Ensure wallets are ready before proceeding
    if (!solanaWalletsReady) {
      toastError('Wallets are still initializing. Please wait a moment and try again.');
      return;
    }

    setState('preparing');
    setShowExtendedMessage(false);

    try {
      // Pass the active wallet address to ensure transaction is built for the correct wallet
      const walletAddress = activeAddress;

      if (!walletAddress) {
        setState('failed');
        toastError('No wallet address available. Please connect your wallet.');
        return;
      }

      const authHeaders = await getAuthHeaders();
      const prepare = await buyEdition(wrapInput({ postId, walletAddress, _authorization: authHeaders.Authorization }) as never);

      if (!prepare.success || !prepare.transaction || !prepare.purchaseId) {
        if (prepare.status === 'sold_out') {
          setState('sold_out');
          toastError('This edition is sold out.');
          return;
        }
        if (prepare.status === 'not_started') {
          // Server says mint hasn't started — authoritative override
          setState('idle');
          setServerTimeOverride('not_started');
          toastInfo(prepare.message || 'This edition is not available for purchase yet.');
          return;
        }
        if (prepare.status === 'ended') {
          // Server says mint ended — authoritative override
          setState('idle');
          setServerTimeOverride('ended');
          toastInfo(prepare.message || 'The minting window for this edition has closed.');
          return;
        }
        if (prepare.status === 'insufficient_funds') {
          setState('insufficient_funds');
          const errorMsg = prepare.message || 'Insufficient balance.';
          toastError(errorMsg);
          return;
        }
        setState('failed');
        toastError(prepare.message || 'Failed to prepare transaction. Please try again.');
        return;
      }

      setState('signing');
      setPurchaseId(prepare.purchaseId);

      // Re-validate wallet before signing (it may have disconnected)
      const currentWallet = activePrivyWallet;
      if (!currentWallet || !currentWallet.address) {
        setState('failed');
        toastError('Wallet disconnected. Please reconnect and try again.');
        // Cancel the purchase reservation
        try {
          await cancelPendingPurchase(wrapInput({ purchaseId: prepare.purchaseId }) as never);
        } catch (e) {
          console.error('Failed to cancel pending purchase after wallet disconnect:', e);
        }
        return;
      }

      const txBytes = Uint8Array.from(Buffer.from(prepare.transaction, 'base64'));

      const modalUiOptions = {
        title: 'Sign purchase transaction',
        description: `Buying for ${formatPrice()}`,
        showWalletUIs: true,
      };

      // Wrap transaction sending with retry logic for transient network/RPC errors
      // Capture wallet reference to ensure we use the same wallet throughout
      const walletToUse = currentWallet;
      const { retryWithBackoff } = await import('@/lib/retryUtils');

      // Use signTransaction + manual HTTP send for ALL wallet types.
      // Privy's signAndSendTransaction relies on WebSocket for confirmation,
      // but our RPC proxy (/api/v1/rpc) is HTTP-only, causing WebSocket failures.
      // By signing separately and sending via HTTP RPC, we avoid this entirely.
      let signature: string;

      const signed = await Promise.race([
        retryWithBackoff(
          async () => {
            // Validate wallet again inside retry function (check current state)
            const wallet = walletToUse;
            if (!wallet || !wallet.address) {
              throw new Error('Wallet not connected. Please reconnect your wallet.');
            }

            // Sign the transaction (works for both embedded and external wallets)
            const signedTx = await signTransaction({
              transaction: txBytes,
              wallet: wallet,
              chain: 'solana:mainnet',
              options: {
                uiOptions: modalUiOptions,
              },
            });

            // Manually send the signed transaction via HTTP RPC (no WebSocket needed)
            const rpc = createSolanaRpc(getClientRpcUrl());
            const base64Tx = Buffer.from(signedTx.signedTransaction).toString('base64');
            const sendTxPromise = rpc.sendTransaction(base64Tx, {
              encoding: 'base64',
              skipPreflight: false,
              maxRetries: 3,
            }).send();

            const txSignature = await Promise.race([
              sendTxPromise,
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Transaction send timeout - RPC may be slow. Please try again.')), SEND_TX_TIMEOUT_MS)
              ),
            ]);

            return { signature: bs58.decode(txSignature) };
          },
          { maxRetries: 3, baseDelayMs: 1000 }
        ),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Transaction signing timeout')), SIGN_TIMEOUT_MS)),
      ]);

      signature = bs58.encode(signed.signature);
      setTxSignature(signature);

      await submitPurchaseSignature(wrapInput({ purchaseId: prepare.purchaseId, txSignature: signature }) as never);

      toastInfo('Payment submitted. Confirming on-chain...');
      setState('confirming');
      startPolling(prepare.purchaseId);
    } catch (error) {
      console.error('Error in buy flow:', error);
      
      // Check if this is a WebSocket or timeout error - transaction might have succeeded
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isWebSocketError = 
        errorMessage.includes('WebSocket') || 
        errorMessage.includes('websocket') ||
        errorMessage.includes('wss://') ||
        errorMessage.includes('Failed to connect to wallet');
      
      const isTimeoutError = 
        errorMessage.includes('timeout') || 
        errorMessage.includes('timed out') ||
        errorMessage.includes('Transaction signing timeout') ||
        errorMessage.includes('Transaction send timeout');
      
      // If WebSocket or timeout error, check if purchase already has a signature (transaction succeeded)
      if ((isWebSocketError || isTimeoutError) && purchaseId) {
        try {
          const purchaseStatus = await getUserPurchaseStatus(wrapInput({ postId, userId }) as never);
          if (purchaseStatus.success && purchaseStatus.purchase?.txSignature) {
            // Transaction succeeded! Use the existing signature
            setTxSignature(purchaseStatus.purchase.txSignature);
            setPurchaseId(purchaseStatus.purchase.id);
            setState('confirming');
            startPolling(purchaseStatus.purchase.id);
            toastInfo('Transaction found! Continuing with confirmation...');
            return; // Exit early, transaction succeeded
          }
          // No signature found yet - transaction may still be in flight
          // Don't cancel immediately - set to claiming state so user can check/retry
          setState('claiming');
          toastInfo('Transaction may have succeeded. Please check your wallet or refresh the page to verify.');
          return; // Exit early, don't cancel - let user recover
        } catch (checkError) {
          console.error('[BuyButton] Error checking purchase status:', checkError);
          // On check error, still set claiming state to be safe
          setState('claiming');
          toastInfo('Could not verify transaction status. Please check your wallet or refresh the page.');
          return;
        }
      }

      // For non-WebSocket/timeout errors, cancel the purchase
      try {
        if (purchaseId) {
          await cancelPendingPurchase(wrapInput({ purchaseId }) as never);
        }
      } catch (e) {
        console.error('Failed to cancel pending purchase after error:', e);
      }
      setState('failed');

      // Provide more specific error messages
      let errorMsg = 'Something went wrong. Please try again.';
      if (error instanceof Error) {
        const errMsg = error.message.toLowerCase();
        if (errMsg.includes('wallet') || errMsg.includes('connect')) {
          errorMsg = 'Wallet connection failed. Please ensure your wallet is connected and try again.';
        } else if (errMsg.includes('timeout') || errMsg.includes('timed out')) {
          errorMsg = 'Transaction signing timed out. Please try again.';
        } else {
          errorMsg = error.message;
        }
      }
      toastError(errorMsg);
    }
  };

  // Check if purchased
  const isPurchased = state === 'success' || isCollected;
  
  // Get status label for display outside button
  const getStatusLabel = (): string | null => {
    switch (state) {
      case 'preparing':
        return 'Preparing...';
      case 'signing':
        return 'Sign in wallet';
      case 'confirming':
        return showExtendedMessage ? 'Still confirming...' : 'Confirming payment...';
      case 'minting':
        return showExtendedMessage ? 'Still minting...' : 'Minting edition...';
      default:
        return null;
    }
  };

  const statusLabel = getStatusLabel();

  const renderContent = () => {
    // Compact mode: show Label (Count) Icon format
    if (compact) {
      if (state === 'preparing' || state === 'signing' || state === 'confirming' || state === 'minting') {
        return <Spinner />;
      }
      // Show "Claim NFT" text when in claiming state (payment confirmed but NFT not minted)
      if (state === 'claiming') {
        return <span className="text-sm font-semibold">Claim NFT</span>;
      }

      // Use fa-hexagon-image for 1/1 editions, fa-image-stack for others
      const editionIcon = maxSupply === 1 ? 'fa-hexagon-image' : 'fa-image-stack'

      // Show "Sold Out" for sold out state
      if (state === 'sold_out' || isSoldOut) {
        return (
          <>
            <span className="text-sm font-medium text-muted-foreground">Sold Out</span>
            <i className={cn('fa-regular', editionIcon, 'text-base text-muted-foreground')} />
          </>
        );
      }

      // Timed edition states (compact) — show before purchased check so ended overrides
      if (effectiveTimeStatus === 'not_started') {
        return (
          <>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {countdown ? `Starts in ${countdown}` : 'Checking...'}
            </span>
            <i className={cn('fa-regular', editionIcon, 'text-base text-muted-foreground')} />
          </>
        );
      }
      if (effectiveTimeStatus === 'ended') {
        return (
          <>
            <span className="text-sm font-medium text-muted-foreground">Mint Ended</span>
            <i className={cn('fa-regular', editionIcon, 'text-base text-muted-foreground')} />
          </>
        );
      }

      // Show "Purchased" for success state or already collected
      if (state === 'success' || isPurchased) {
        let displayCount: string | null = null
        if (maxSupply === 1) {
          displayCount = '1/1'
        } else if (maxSupply !== null && maxSupply !== undefined) {
          displayCount = `${currentSupply}/${maxSupply}`
        } else {
          displayCount = `${currentSupply}`
        }

        return (
          <>
            <span className="text-sm font-medium">{displayCount}</span>
            <i
              className={cn('fa-solid', editionIcon, 'text-base')}
              style={toneColor ? { color: toneColor } : undefined}
            />
          </>
        );
      }

      // "ending_soon" compact — show countdown badge next to normal icon
      if (effectiveTimeStatus === 'ending_soon' && countdown) {
        let displayCount: string | null = null
        if (maxSupply === 1) {
          displayCount = `${currentSupply}/1`
        } else if (maxSupply !== null && maxSupply !== undefined) {
          displayCount = `${currentSupply}/${maxSupply}`
        } else {
          displayCount = `${currentSupply}`
        }

        return (
          <>
            <span className="text-xs font-medium text-amber-500 whitespace-nowrap">{countdown}</span>
            {displayCount && (
              <span className="text-sm font-medium">{displayCount}</span>
            )}
            <i className={cn('fa-regular', editionIcon, 'text-base')} />
          </>
        );
      }

      // Show number (ICON) format - just count/fraction and icon, no label
      // Format: "0/2 [icon]" or "143 [icon]"
      let displayCount: string | null = null
      if (maxSupply === 1) {
        // 1/1: show "0/1" or "1/1"
        displayCount = `${currentSupply}/1`
      } else if (maxSupply !== null && maxSupply !== undefined) {
        // Limited Edition: show "0/2" or "2/2"
        displayCount = `${currentSupply}/${maxSupply}`
      } else {
        // Open Edition: show count
        displayCount = `${currentSupply}`
      }

      return (
        <>
          {displayCount && (
            <span className="text-sm font-medium">{displayCount}</span>
          )}
          <i
            className={cn('fa-regular', editionIcon, 'text-base')}
          />
        </>
      );
    }

    // ---- Non-compact (full) mode ----

    // Timed edition states take priority when idle (not in active buy flow)
    if (state === 'idle' || state === 'failed' || state === 'insufficient_funds') {
      if (effectiveTimeStatus === 'not_started') {
        return (
          <span className="text-sm font-semibold leading-5">
            {countdown ? `Starts in ${countdown}` : 'Checking availability...'}
          </span>
        );
      }
      if (effectiveTimeStatus === 'ended') {
        return <span className="text-sm font-semibold leading-5">Mint Ended</span>;
      }
    }

    // Show "Connect wallet" if no wallet available
    if (!hasWallet && state === 'idle') {
      return <span className="text-sm font-semibold leading-5">Connect wallet</span>;
    }

    switch (state) {
      case 'idle': {
        // "ending_soon" — show buy price with urgency countdown
        if (effectiveTimeStatus === 'ending_soon' && countdown) {
          return (
            <span className="text-sm font-semibold leading-5">
              Buy {formatPrice()} <span className="text-amber-500">({countdown} left)</span>
            </span>
          );
        }
        return <span className="text-sm font-semibold leading-5">Buy {formatPrice()}</span>;
      }
      case 'preparing':
        return (
          <>
            <Spinner />
            <span className="text-sm font-semibold leading-5">Preparing...</span>
          </>
        );
      case 'signing':
        return (
          <>
            <Spinner />
            <span className="text-sm font-semibold leading-5">Sign in wallet...</span>
          </>
        );
      case 'confirming':
        return (
          <>
            <Spinner />
            <span className="text-sm font-semibold leading-5">
              {showExtendedMessage ? 'Still confirming...' : 'Confirming payment...'}
            </span>
          </>
        );
      case 'minting':
        return (
          <>
            <Spinner />
            <span className="text-sm font-semibold leading-5">
              {showExtendedMessage ? 'Still minting...' : 'Minting edition...'}
            </span>
          </>
        );
      case 'success':
        return <span className="text-sm font-semibold leading-5">Purchased</span>;
      case 'claiming':
        // Show "Claim NFT" button text (not "Claiming..." unless actively processing)
        return <span className="text-sm font-semibold leading-5">Claim NFT</span>;
      case 'failed':
        // Show "Buy" instead of "Retry" if wallet is available, otherwise "Connect wallet"
        return (
          <span className="text-sm font-semibold leading-5">
            {hasWallet ? `Buy ${formatPrice()}` : 'Connect wallet'}
          </span>
        );
      case 'sold_out':
        return <span className="text-sm font-semibold leading-5">Sold Out</span>;
      case 'insufficient_funds':
        return <span className="text-sm font-semibold leading-5">Insufficient</span>;
      default:
        return <span className="text-sm font-semibold leading-5">Buy</span>;
    }
  };

  const hasWallet = solanaWalletsReady && (activePrivyWallet || solanaWallets[0]);

  // Disable button for time-gated states (not_started / ended) unless user has reservation
  const isTimeDisabled = (effectiveTimeStatus === 'not_started' || effectiveTimeStatus === 'ended');

  const isDisabled =
    !isAuthenticated ||
    isOffline ||
    !isRpcHealthy ||
    (state !== 'claiming' && !hasWallet) || // Allow claiming without wallet (server-side)
    state === 'preparing' ||
    state === 'signing' ||
    state === 'confirming' ||
    state === 'minting' ||
    state === 'success' ||
    state === 'sold_out' ||
    isCollected ||
    isSoldOut ||
    isTimeDisabled;

  const getButtonVariant = () => {
    // In compact mode, use the provided variant
    if (compact) {
      return variant;
    }

    // Muted styling for time-gated states
    if (isTimeDisabled) {
      return 'ghost';
    }

    switch (state) {
      case 'success':
        return 'secondary';
      case 'failed':
        return 'primary'; // Keep original color for retry, not destructive
      case 'sold_out':
      case 'insufficient_funds':
        return 'ghost';
      default:
        return 'primary';
    }
  };

  // Check if in a loading/processing state
  const isLoadingState = state === 'confirming' || state === 'minting' || state === 'claiming';

  // In compact mode, show status label to the left of button
  if (compact) {
    return (
      <div className="flex flex-row items-center gap-2">
        {/* Status label for processing states */}
        {statusLabel && (
          <span className="text-[10px] text-muted-foreground animate-pulse whitespace-nowrap">
            {statusLabel}
          </span>
        )}
        <Button
          onClick={state === 'claiming' ? handleClaimNFT : handleBuy}
          disabled={isDisabled}
          variant={getButtonVariant()}
          className={cn(
            'gap-1 px-2 transition-all duration-200 disabled:opacity-100',
            className
          )}
          style={isLoadingState && toneColor ? { color: toneColor } : undefined}
        >
          {renderContent()}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={state === 'claiming' ? handleClaimNFT : handleBuy}
        disabled={isDisabled}
        variant={getButtonVariant()}
        className={cn(
          'transition-all duration-200 text-sm font-semibold leading-5 px-4',
          className,
        )}
        style={isLoadingState && toneColor ? { color: toneColor } : undefined}
      >
        {state === 'claiming' && !pollIntervalRef.current ? (
          <span className="text-sm font-semibold leading-5">Claim NFT</span>
        ) : (
          renderContent()
        )}
      </Button>

      {showExtendedMessage && txSignature && (state === 'confirming' || state === 'minting') && (
        <a
          href={getExplorerUrl('tx', txSignature, preferences.explorer)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <i className="fa-regular fa-external-link text-[10px]" />
          View on explorer
        </a>
      )}

      {state === 'success' && nftMint && (
        <a
          href={getExplorerUrl('token', nftMint, preferences.explorer)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <i className="fa-regular fa-cube text-[10px]" />
          View NFT
        </a>
      )}

    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default BuyButton;

