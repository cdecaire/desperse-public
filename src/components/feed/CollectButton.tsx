/**
 * CollectButton Component
 * Handles the full collect flow for free collectibles (cNFTs)
 * 
 * State machine:
 * - idle: Ready to collect
 * - preparing: Preparing transaction
 * - confirming: Waiting for blockchain confirmation
 * - success: Successfully collected (shows "Collected ✓")
 * - failed: Collection failed (shows retry option)
 * - already_collected: User already has this collectible
 * - rate_limited: User hit rate limit
 * 
 * UX Requirements:
 * - Persist pending state across page refreshes via DB
 * - Show "Pending..." / "Confirming..." while awaiting confirmation
 * - After ~60s show "Still confirming..." with explorer link
 * - Allow retry only when safe (leveraging idempotency)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { toastError, toastSuccess } from '@/lib/toast';
import {
  prepareCollect,
  getUserCollectionStatus,
  checkCollectionStatus,
  cancelPendingCollect,
  // submitCollectSignature, // No longer needed - server signs in prepareCollect
} from '@/server/functions/collect';
import { getExplorerUrl } from '@/server/functions/preferences';
import { usePreferences } from '@/hooks/usePreferences';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRpcHealthContext } from '@/components/providers/RpcHealthProvider';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { useAuth } from '@/hooks/useAuth';
import { useActiveWallet } from '@/hooks/useActiveWallet';

// Type helpers for server function calls
type ServerFnInput<T> = { data: T };
const wrapInput = <T,>(data: T): ServerFnInput<T> => ({ data });

// Collection states
type CollectState = 
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'confirming'
  | 'success'
  | 'failed'
  | 'already_collected'
  | 'sold_out'
  | 'rate_limited';

interface CollectButtonProps {
  /** The post ID to collect */
  postId: string;
  /** The current user's ID */
  userId: string;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Current collect count */
  currentCollectCount?: number;
  /** Optional callback when collect succeeds */
  onCollectSuccess?: () => void;
  /** Optional callback when state changes */
  onStateChange?: (state: CollectState) => void;
  /** Optional callback when collection is confirmed/owned */
  onCollected?: () => void;
  /** Additional class names */
  className?: string;
  /** Post type color for the icon when collected */
  toneColor?: string;
  /** Button variant */
  variant?: 'default' | 'ghost' | 'outline';
  /** Compact mode - shows Label (Count) Icon format */
  compact?: boolean;
}

// Polling configuration
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_TIME_MS = 60000; // 60 seconds
const EXTENDED_MESSAGE_TIME_MS = 60000; // Show extended message after 60s

export function CollectButton({
  postId,
  userId,
  isAuthenticated,
  currentCollectCount = 0,
  onCollectSuccess,
  onStateChange,
  onCollected,
  className,
  toneColor,
  variant = 'default',
  compact = false,
}: CollectButtonProps) {
  // Note: Using browser APIs (atob) instead of Node Buffer for base64 decoding

  const queryClient = useQueryClient();
  const { wallets: solanaWallets, ready: solanaWalletsReady } = useSolanaWallets();
  const { activePrivyWallet, activeAddress } = useActiveWallet();

  // Network and RPC health status
  const { isOffline } = useNetworkStatus();
  const { getAuthHeaders } = useAuth();
  const { isRpcHealthy } = useRpcHealthContext();
  const { onWalletDisconnect } = useWalletConnection();

  // User preferences for explorer
  const { preferences } = usePreferences();

  const [state, setState] = useState<CollectState>('idle');
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [showExtendedMessage, setShowExtendedMessage] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const pollStartTime = useRef<number | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const extendedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle wallet disconnection
  useEffect(() => {
    const cleanup = onWalletDisconnect(() => {
      // Reset transaction state on wallet disconnect
      if (state === 'preparing' || state === 'signing' || state === 'confirming') {
        setState('idle');
        setCollectionId(null);
        setTxSignature(null);
        stopPolling();
      }
    });
    
    return cleanup;
  }, [onWalletDisconnect, state]);
  
  // Update button state when wallet becomes available/disconnected
  useEffect(() => {
    const walletAvailable = solanaWalletsReady && activePrivyWallet;

    // If wallet becomes available and we're in failed state (due to no wallet), reset to idle
    if (walletAvailable && state === 'failed' && !collectionId) {
      setState('idle');
    }

    // If wallet disconnects and we're in idle, keep it disabled (hasWallet check handles this)
  }, [solanaWalletsReady, activePrivyWallet, state, collectionId]);
  
  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
    if (state === 'success' || state === 'already_collected') {
      onCollected?.();
    }
  }, [state, onStateChange]);
  
  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (extendedTimeoutRef.current) {
        clearTimeout(extendedTimeoutRef.current);
      }
    };
  }, []);
  
  // Check initial collection status on mount
  useEffect(() => {
    if (!isAuthenticated || !userId || isInitialized) return;
    
    async function checkInitialStatus() {
      try {
        const result = await getUserCollectionStatus(wrapInput({ postId, userId }) as never);
        
        if (result.success) {
          // Only 'confirmed' status means collected - server now auto-marks stale pending as failed
          if (result.hasCollected && result.collection?.status === 'confirmed') {
            setState('already_collected');
            setCollectionId(result.collection.id);
            setTxSignature(result.collection.txSignature);
          } else if (result.collection?.status === 'pending' && result.collection.txSignature) {
            // Fresh pending with signature - resume polling (server handles stale pending)
            setState('confirming');
            setCollectionId(result.collection.id);
            setTxSignature(result.collection.txSignature);
            startPolling(result.collection.id);
          } else if (result.collection?.status === 'failed') {
            // Failed status - allow retry (show idle/Collect button)
            setState('idle');
            setCollectionId(null);
            setTxSignature(null);
          } else {
            // No record or any other state - show idle (Collect button)
            setState('idle');
            setCollectionId(null);
            setTxSignature(null);
          }
        }
      } catch (error) {
        console.error('Error checking initial collection status:', error);
        // On error, default to idle to allow retry
        setState('idle');
      } finally {
        setIsInitialized(true);
      }
    }
    
    checkInitialStatus();
  }, [postId, userId, isAuthenticated, isInitialized]);
  
  // Note: Collectibles are always unlimited (no max supply)
  
  // Start polling for collection status
  const startPolling = useCallback((collId: string) => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    pollStartTime.current = Date.now();
    setShowExtendedMessage(false);
    
    // Set timeout for extended message
    extendedTimeoutRef.current = setTimeout(() => {
      setShowExtendedMessage(true);
    }, EXTENDED_MESSAGE_TIME_MS);
    
    // Start polling
    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await checkCollectionStatus(wrapInput({ collectionId: collId }) as never);
        
        if (result.success) {
          if (result.status === 'confirmed') {
            // Success!
            setState('success');
            setTxSignature(result.txSignature || null);
            stopPolling();
            toastSuccess('Successfully collected!');
            onCollectSuccess?.();
            // Refresh wallet NFTs
            queryClient.invalidateQueries({ queryKey: ['wallets-overview'] });
            
            // After a moment, show "already collected" state
            setTimeout(() => {
              setState('already_collected');
            }, 2000);
          } else if (result.status === 'failed') {
            setState('failed');
            toastError('Transaction failed. You can try again.');
            stopPolling();
          }
          // If still pending, continue polling
        }
        
        // Check if we've been polling too long
        if (pollStartTime.current && Date.now() - pollStartTime.current > MAX_POLL_TIME_MS) {
          console.warn('Collect confirm timeout reached, stopping poll');
          stopPolling();

          // If we never recorded a signature, try to cancel pending collect so user can retry
          if (!txSignature && collectionId) {
            try {
              await cancelPendingCollect(wrapInput({ collectionId }) as never);
            } catch (e) {
              console.error('Failed to cancel pending collect after timeout:', e);
            }
          }

          setState('failed');
          toastError('Taking too long to confirm. Please retry.');
        }
      } catch (error) {
        console.error('Error polling collection status:', error);
      }
    }, POLL_INTERVAL_MS);
  }, [onCollectSuccess]);
  
  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (extendedTimeoutRef.current) {
      clearTimeout(extendedTimeoutRef.current);
      extendedTimeoutRef.current = null;
    }
    pollStartTime.current = null;
  }, []);
  
  // Handle collect action
  const handleCollect = async () => {
    if (!isAuthenticated || !userId) return;
    if (state !== 'idle' && state !== 'failed') return;
    if (!hasWallet) {
      toastError('Please connect your Solana wallet to collect.');
      setState('failed');
      return;
    }
    
    setState('preparing');
    setShowExtendedMessage(false);
    
    try {
      const authHeaders = await getAuthHeaders();
      const prepare = await prepareCollect(wrapInput({ postId, walletAddress: activeAddress || undefined, _authorization: authHeaders.Authorization }) as never);

      if (!prepare.success || !prepare.collectionId) {
        if (prepare.error === 'Rate limited') {
          setState('rate_limited');
          toastError(prepare.message || 'Rate limited. Please try again later.');
          return;
        }
        if (prepare.status === 'already_collected') {
          setState('already_collected');
          setCollectionId(prepare.collectionId || null);
          // Don't show error toast for already collected - it's just informational
          return;
        }
        // Check for sold out error
        const errorMsg = (prepare.message || prepare.error || '').toLowerCase();
        if (errorMsg.includes('sold out') || errorMsg.includes('supply') && errorMsg.includes('exceeded')) {
          setState('sold_out');
          toastError('This collectible is sold out.');
          return;
        }
        setState('failed');
        toastError(prepare.message || prepare.error || 'Failed to collect. Please try again.');
        return;
      }

      // Server has already signed and submitted the transaction
      // Just set the signature and start polling
      if (prepare.txSignature) {
        setCollectionId(prepare.collectionId);
        setTxSignature(prepare.txSignature);
        setState('confirming'); // Start in confirming state, not pending

        // Start polling for confirmation
        if (prepare.collectionId) {
          startPolling(prepare.collectionId);
        }
        return;
      }

      // Should not reach here, but handle gracefully
      setState('failed');
      toastError('Transaction was prepared but no signature was returned. Please try again.');
    } catch (error) {
      console.error('[collect][client] Error collecting post (full):', {
        error,
        errorString: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      
      // Better error messages based on error type
      let userMessage = 'Something went wrong. Please try again.';
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('user exited') || 
            errorMsg.includes('user cancelled') ||
            errorMsg.includes('user rejected')) {
          userMessage = 'Transaction cancelled.';
          setState('idle'); // Reset to idle for cancellation
          // Don't show error toast for user cancellation
          return;
        } else if (errorMsg.includes('simulation failed') || 
                   errorMsg.includes('transaction simulation')) {
          // This is likely a tree authority mismatch or program error
          userMessage = 'Transaction failed during simulation. This may indicate a tree authority mismatch. Check console for details.';
          console.error('[collect][client] Simulation failed - likely causes:');
          console.error('  1. Tree authority does not match user wallet');
          console.error('  2. Tree needs to be recreated with user wallet as authority');
          console.error('  3. Or tree needs to delegate authority to user wallet');
          console.error('  Check the error logs above for program error details.');
        } else if (errorMsg.includes('insufficient funds') || 
                   errorMsg.includes('insufficient balance')) {
          userMessage = 'Insufficient funds for transaction fees.';
        } else if (errorMsg.includes('network') || 
                   errorMsg.includes('connection') ||
                   errorMsg.includes('rpc')) {
          userMessage = 'Network error. Please check your connection and try again.';
        } else if (errorMsg.includes('signature verification')) {
          userMessage = 'Transaction verification failed. Please try again.';
        } else if (errorMsg.includes('timeout') || 
                   errorMsg.includes('timed out')) {
          userMessage = 'Transaction timed out. Please try again.';
        } else if (errorMsg.includes('tree') && errorMsg.includes('authority')) {
          userMessage = 'Tree authority mismatch. The tree must be created with your wallet as authority.';
        } else {
          // For other errors, use the error message if it's user-friendly
          userMessage = error.message || userMessage;
        }
      }
      
      setState('failed');
      toastError(userMessage);
    }
  };
  
  // Check if collected
  const isCollected = state === 'success' || state === 'already_collected';
  
  // Render button content based on state
  const renderContent = () => {
    // Compact mode: show Label (Count) Icon format
    if (compact) {
      if (state === 'preparing' || state === 'signing' || state === 'confirming') {
        return <Spinner />;
      }
      
      // Show number (ICON) format - just count and icon, no label
      return (
        <>
          {currentCollectCount > 0 && (
            <span className="text-sm font-medium">{currentCollectCount}</span>
          )}
          <span style={isCollected && toneColor ? { color: toneColor } : undefined}>
            <Icon name="gem" variant={isCollected ? "solid" : "regular"} className="text-base" />
          </span>
        </>
      );
    }
    
    // Show "Connect wallet" if no wallet available
    if (!hasWallet && state === 'idle') {
      return <span>Connect wallet</span>;
    }
    
    switch (state) {
      case 'idle':
        return <span>Collect</span>;
      
      case 'preparing':
        return (
          <>
            <Spinner />
            <span>Preparing...</span>
          </>
        );

      case 'signing':
        return (
          <>
            <Spinner />
            <span>Sign in wallet...</span>
          </>
        );
      
      case 'confirming':
        return (
          <>
            <Spinner />
            <span>{showExtendedMessage ? 'Still confirming...' : 'Confirming...'}</span>
          </>
        );
      
      case 'success':
        return <span>Collected!</span>;
      
      case 'already_collected':
        return <span>Collected</span>;
      
      case 'failed':
        // Show "Collect" instead of "Retry" if wallet is available, otherwise "Connect wallet"
        return <span>{hasWallet ? 'Collect' : 'Connect wallet'}</span>;
      
      case 'sold_out':
        return <span>Sold Out</span>;
      
      case 'rate_limited':
        return <span>Try Later</span>;
      
      default:
        return 'Collect';
    }
  };
  
  // Determine if button should be disabled
  const hasWallet = solanaWalletsReady && (activePrivyWallet || solanaWallets[0]);
  const isDisabled = 
    !isAuthenticated ||
    isOffline ||
    !isRpcHealthy ||
    !hasWallet ||
    state === 'preparing' ||
    state === 'signing' ||
    state === 'confirming' ||
    state === 'success' ||
    state === 'already_collected' ||
    state === 'sold_out' ||
    state === 'rate_limited';
  
  // Determine button variant
  const getButtonVariant = () => {
    // In compact mode, use the provided variant
    if (compact) {
      return variant;
    }
    
    switch (state) {
      case 'success':
      case 'already_collected':
        return 'secondary';
      case 'failed':
        return 'default'; // Keep original color for retry, not destructive
      case 'sold_out':
        return 'ghost';
      case 'rate_limited':
        return 'ghost';
      default:
        return 'default';
    }
  };
  
  // Check if in a loading/processing state
  const isLoadingState = state === 'preparing' || state === 'signing' || state === 'confirming';

  // Get status label for display outside button in compact mode
  const getStatusLabel = (): string | null => {
    switch (state) {
      case 'preparing':
        return 'Preparing...';
      case 'signing':
        return 'Sign in wallet';
      case 'confirming':
        return showExtendedMessage ? 'Still confirming...' : 'Confirming...';
      default:
        return null;
    }
  };

  const statusLabel = getStatusLabel();

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
          onClick={handleCollect}
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
        onClick={handleCollect}
        disabled={isDisabled}
        variant={getButtonVariant()}
        className={cn(
          'transition-all duration-200',
          className
        )}
        style={isLoadingState && toneColor ? { color: toneColor } : undefined}
      >
        {renderContent()}
      </Button>
      
      {/* Extended message with explorer link */}
      {showExtendedMessage && txSignature && state === 'confirming' && (
        <a
          href={getExplorerUrl('tx', txSignature, preferences.explorer)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Icon name="external-link" variant="regular" className="text-[10px]" />
          View on explorer
        </a>
      )}
      
    </div>
  );
}

// Simple spinner component
function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default CollectButton;

