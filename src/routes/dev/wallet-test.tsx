/**
 * Development route to test Privy wallet functionality
 * Route: /dev/wallet-test
 */

import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import {
  useWallets as useSolanaWallets,
  useSignMessage,
  useSignTransaction,
  useSignAndSendTransaction,
} from '@privy-io/react-auth/solana';
import bs58 from 'bs58';
import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
import { getTransferSolInstruction } from '@solana-program/system';
import { address } from '@solana/addresses';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { getWalletBalance } from '@/server/functions/dev';

export const Route = createFileRoute('/dev/wallet-test')({
  component: WalletTestPage,
});

interface WalletBalance {
  address: string;
  balance: bigint | null;
  loading: boolean;
  error: string | null;
}

function WalletTestPage() {
  return (
    <AuthGuard>
      <WalletTestContent />
    </AuthGuard>
  );
}

function WalletTestContent() {
  const { user } = usePrivy();
  const { wallets: solanaWallets, ready: solanaWalletsReady } = useSolanaWallets();
  const { signMessage } = useSignMessage();
  const { signTransaction } = useSignTransaction();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const [balances, setBalances] = useState<Map<string, WalletBalance>>(new Map());
  const [signingMessage, setSigningMessage] = useState('');
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string>('');
  const [signResult, setSignResult] = useState<{ success: boolean; signature?: string; error?: string } | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signStatus, setSignStatus] = useState<string>('');
  const [txSignResult, setTxSignResult] = useState<{ success: boolean; signedTx?: string; error?: string } | null>(null);
  const [isSigningTx, setIsSigningTx] = useState(false);
  const [txSignStatus, setTxSignStatus] = useState<string>('');
  const [txSendResult, setTxSendResult] = useState<{ success: boolean; signature?: string; error?: string } | null>(null);
  const [isSendingTx, setIsSendingTx] = useState(false);
  const [txSendStatus, setTxSendStatus] = useState<string>('');

  // Get connected embedded Solana wallets (check linkedAccounts for connectorType='embedded')
  const embeddedWallets = useMemo(() => {
    return solanaWallets.filter((wallet) => {
      if (!user?.linkedAccounts) return false;
      const account = user.linkedAccounts.find(
        (acc) => acc.type === 'wallet' && 
                  acc.chainType === 'solana' && 
                  'address' in acc && 
                  acc.address === wallet.address
      );
      return account && 'connectorType' in account && account.connectorType === 'embedded';
    });
  }, [solanaWallets, user?.linkedAccounts]);

  // Get external Solana wallets (not embedded)
  const externalWallets = useMemo(() => {
    return solanaWallets.filter((wallet) => {
      if (!user?.linkedAccounts) return true; // If no linkedAccounts, treat as external
      const account = user.linkedAccounts.find(
        (acc) => acc.type === 'wallet' && 
                  acc.chainType === 'solana' && 
                  'address' in acc && 
                  acc.address === wallet.address
      );
      // External if not found in linkedAccounts OR connectorType is not 'embedded'
      return !account || !('connectorType' in account) || account.connectorType !== 'embedded';
    });
  }, [solanaWallets, user?.linkedAccounts]);

  // Format SOL from lamports
  const formatSol = (lamports: bigint | null) => {
    if (lamports === null) return 'Loading...';
    return (Number(lamports) / 1_000_000_000).toFixed(9);
  };

  // Fetch balance for a wallet
  const fetchBalance = async (address: string) => {
    setBalances((prev) => {
      const newMap = new Map(prev);
      newMap.set(address, { address, balance: null, loading: true, error: null });
      return newMap;
    });

    try {
      const result = await getWalletBalance({ data: { walletAddress: address } } as any);
      if (result.success && result.balance) {
        setBalances((prev) => {
          const newMap = new Map(prev);
          newMap.set(address, {
            address,
            balance: BigInt(result.balance!),
            loading: false,
            error: null,
          });
          return newMap;
        });
      } else {
        throw new Error(result.error || 'Failed to fetch balance');
      }
    } catch (error) {
      setBalances((prev) => {
        const newMap = new Map(prev);
        newMap.set(address, {
          address,
          balance: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return newMap;
      });
    }
  };

  // Fetch all wallet balances
  const fetchAllBalances = async () => {
    for (const wallet of solanaWallets) {
      await fetchBalance(wallet.address);
    }
  };

  // Get balance for a specific address
  const getBalance = (address: string): WalletBalance | undefined => {
    return balances.get(address);
  };

  const walletClientLabel = (wallet: unknown) =>
    (wallet as { walletClientType?: string } | undefined)?.walletClientType || 'unknown';

  // Handle message signing
  const handleSignMessage = async () => {
    if (!signingMessage.trim() || !selectedWalletAddress) {
      setSignResult({ success: false, error: 'Please enter a message and select a wallet' });
      return;
    }

    const selectedWallet = solanaWallets.find((w) => w.address === selectedWalletAddress);
    if (!selectedWallet) {
      setSignResult({ success: false, error: 'Selected wallet not found' });
      return;
    }

    // Verify wallet is ready and has required properties
    console.log('Selected wallet object:', {
      address: selectedWallet.address,
      walletClientType: walletClientLabel(selectedWallet),
      hasSignMessage: 'signMessage' in selectedWallet,
      walletKeys: Object.keys(selectedWallet),
    });
    
    if (!selectedWallet.address) {
      setSignResult({ success: false, error: 'Selected wallet has no address' });
      return;
    }

      // Check if wallet is embedded for logging purposes
      const isEmbedded = embeddedWallets.some((w) => w.address === selectedWalletAddress);

    setIsSigning(true);
    setSignResult(null);
    setSignStatus('Preparing to sign...');

    console.log('=== Starting Message Signing ===');
    console.log('Selected wallet:', {
      address: selectedWallet.address,
      walletClientType: walletClientLabel(selectedWallet),
      isEmbedded: isEmbedded,
      fullWalletObject: selectedWallet,
    });
    console.log('Message:', signingMessage);
    console.log('Message length:', signingMessage.length);

    try {
      const messageUint8Array = new TextEncoder().encode(signingMessage);
      console.log('Encoded message as Uint8Array:', {
        length: messageUint8Array.length,
        bytes: Array.from(messageUint8Array).slice(0, 20) + '...',
      });

      setSignStatus('Calling signMessage... Waiting for modal...');

      // Add a timeout to prevent infinite hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Signing timed out after 60 seconds. The signing modal may not have appeared. Check the browser console for errors.'));
        }, 60000); // 60 second timeout
      });

      console.log('Calling signMessage with:', {
        walletAddress: selectedWallet.address,
      walletClientType: walletClientLabel(selectedWallet),
        messageLength: messageUint8Array.length,
        isEmbedded: isEmbedded,
      });

      // Log wallet type for debugging
      if (isEmbedded) {
        console.log('Signing with embedded wallet');
      }

      // Check for modal container in DOM before calling
      const checkForModal = () => {
        const privyModals = document.querySelectorAll(
          '[data-privy], [id*="privy"], iframe[src*="privy"], [class*="privy"]'
        );
        console.log('Privy modal elements found:', privyModals.length);
        if (privyModals.length > 0) {
          console.log(
            'Modal elements:',
            Array.from(privyModals).map((el) => {
              const rect = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              return {
                tag: el.tagName,
                id: el.id,
                classes: el.className,
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity,
                zIndex: style.zIndex,
                position: style.position,
                rect: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                },
              };
            })
          );
        }
        return privyModals.length > 0;
      };

      console.log('Before signMessage call - checking for existing modals:', checkForModal());

      // Build UI options once so we can re-use for both Privy helper and direct wallet call
      const modalUiOptions = {
        title: 'Sign this message',
        description: 'Requested by Desperse (wallet-test)',
        buttonText: 'Sign and continue',
        isCancellable: true,
        showWalletUIs: true, // Force Privy to render confirmation UI even if disabled in dashboard
      };

      // Always use Privy's helper so it injects the correct address/chain metadata.
      let signingPromise: Promise<{ signature: Uint8Array }>;
      try {
        signingPromise = signMessage({
          message: messageUint8Array,
          wallet: selectedWallet,
          options: { uiOptions: modalUiOptions },
        });
        console.log('signMessage promise created successfully (via Privy helper)');
      } catch (syncError) {
        console.error('Synchronous error creating signMessage promise:', syncError);
        throw syncError;
      }

      setSignStatus('Waiting for signature... Please approve in the modal.');
      
      // Check for modal after a short delay
      setTimeout(() => {
        const hasModal = checkForModal();
        console.log('After signMessage call (1s delay) - modal appeared?', hasModal);
        if (!hasModal) {
          console.warn('⚠️ No Privy modal detected after 1 second.');
          console.warn('This could mean:');
          console.warn('- The modal hasn\'t rendered yet (check again in a few seconds)');
          console.warn('- Browser popup blocker might be blocking it');
          console.warn('- There might be a Privy SDK error (check console)');
          console.warn('- The wallet might not support this operation');
        }
      }, 1000);
      
      // Check again after 3 seconds
      setTimeout(() => {
        const hasModal = checkForModal();
        console.log('After signMessage call (3s delay) - modal appeared?', hasModal);
        if (hasModal) {
          console.log('If the modal is still not visible, check its bounding rect / styles above. It may be off-screen or hidden by CSS.');
        }
      }, 3000);

      const result = await Promise.race([signingPromise, timeoutPromise]);

      console.log('=== Signing Successful ===');
      console.log('Result:', result);

      if (!result || !result.signature) {
        throw new Error('Invalid response from signMessage - no signature received');
      }

      setSignStatus('Signature received, encoding...');
      const signature = bs58.encode(result.signature);
      console.log('Encoded signature (base58):', signature);
      
      setSignResult({ success: true, signature });
      setSignStatus('');
    } catch (error) {
      console.error('=== Error Signing Message ===');
      console.error('Error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      
      // Check if it's an HTTPError
      let httpErrorDetails = null;
      if (error && typeof error === 'object') {
        // Check for HTTPError structure
        if ('status' in error && 'message' in error) {
          httpErrorDetails = {
            status: error.status,
            message: error.message,
            unhandled: 'unhandled' in error ? error.unhandled : undefined,
          };
          console.error('HTTPError detected:', httpErrorDetails);
        }
        // Check if error has response property (common in fetch errors)
        if ('response' in error && error.response) {
          console.error('Error response:', error.response);
        }
        // Check for Privy-specific error structure
        if ('code' in error) {
          console.error('Error code:', error.code);
        }
      }
      
      console.error('Full error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        httpErrorDetails,
        errorString: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      
      let errorMessage = 'Unknown error occurred';
      let errorTitle = 'Signing Failed';
      
      if (httpErrorDetails) {
        // Handle HTTP errors specifically
        errorTitle = `HTTP Error ${httpErrorDetails.status}`;
        if (httpErrorDetails.status === 500) {
          errorMessage = 'Server error (500) from Privy backend. This is a Privy server-side issue. Check the browser console for detailed error information.';
        } else if (httpErrorDetails.status === 400) {
          errorMessage = 'Bad request (400). The signing request may be invalid. Check that the wallet is properly connected.';
        } else if (httpErrorDetails.status === 401 || httpErrorDetails.status === 403) {
          errorMessage = 'Authentication error. Please refresh the page and try again.';
        } else if (httpErrorDetails.status === 404) {
          errorMessage = 'Not found (404). The signing endpoint may not be available.';
        } else {
          errorMessage = `HTTP ${httpErrorDetails.status}: ${httpErrorDetails.message || 'An error occurred'}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = String(error.message);
        } else {
          errorMessage = JSON.stringify(error);
        }
      }

      // Provide more helpful error messages
      if (errorMessage.includes('timeout')) {
        errorMessage += ' The signing modal might not have appeared. Check the browser console (F12) for errors.';
      } else if (errorMessage.includes('reject') || errorMessage.includes('denied') || errorMessage.includes('cancel')) {
        errorMessage = 'Signing was cancelled or rejected.';
      } else if (errorMessage.includes('not connected') || errorMessage.includes('not found')) {
        errorMessage += ' Please ensure the wallet is connected and try again.';
      } else if (errorMessage.includes('HTTPError')) {
        errorMessage = `HTTP Error occurred. Check the browser console (F12) for details. Status: ${httpErrorDetails?.status || 'unknown'}`;
      } else if (!errorMessage || errorMessage === 'Unknown error occurred') {
        errorMessage = 'An unexpected error occurred. Check the browser console (F12) for details.';
      }

      setSignResult({
        success: false,
        error: `${errorTitle}: ${errorMessage}`,
      });
      setSignStatus('');
    } finally {
      setIsSigning(false);
    }
  };

  // Handle simple transaction signing (1 lamport self-transfer)
  const handleSignTransaction = async () => {
    if (!selectedWalletAddress) {
      setTxSignResult({ success: false, error: 'Please select a wallet' });
      return;
    }

    const selectedWallet = solanaWallets.find((w) => w.address === selectedWalletAddress);
    if (!selectedWallet) {
      setTxSignResult({ success: false, error: 'Selected wallet not found' });
      return;
    }

    setIsSigningTx(true);
    setTxSignResult(null);
    setTxSignStatus('Building transaction...');

    try {
      const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
      const heliusRpc = heliusApiKey
        ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
        : 'https://api.mainnet-beta.solana.com';

      const rpc = createSolanaRpc(heliusRpc);
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const feePayer = address(selectedWallet.address);
      const instruction = getTransferSolInstruction({
        amount: 1n, // 1 lamport
        destination: feePayer,
        source: createNoopSigner(feePayer),
      });

      const transaction = pipe(
        createTransactionMessage({ version: 0 }),
        (tx: Parameters<typeof setTransactionMessageFeePayer>[1]) =>
          setTransactionMessageFeePayer(feePayer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([instruction], tx),
        (tx) => compileTransaction(tx)
      );

      const encodedTx = getTransactionEncoder().encode(transaction);

      setTxSignStatus('Calling signTransaction... Waiting for modal...');

      const modalUiOptions = {
        title: 'Sign 1 lamport transaction',
        description: 'Self-transfer test (1 lamport)',
        showWalletUIs: true,
      };

      const result = await signTransaction({
        transaction: new Uint8Array(encodedTx),
        wallet: selectedWallet,
        options: { uiOptions: modalUiOptions },
      });

      const signedTx = bs58.encode(result.signedTransaction);
      setTxSignResult({ success: true, signedTx });
      setTxSignStatus('');
    } catch (error) {
      console.error('=== Error Signing Transaction ===', error);
      const message =
        error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      setTxSignResult({ success: false, error: message });
      setTxSignStatus('');
    } finally {
      setIsSigningTx(false);
    }
  };

  // Handle sign and send transaction (1 lamport self-transfer)
  const handleSendTransaction = async () => {
    if (!selectedWalletAddress) {
      setTxSendResult({ success: false, error: 'Please select a wallet' });
      return;
    }

    const selectedWallet = solanaWallets.find((w) => w.address === selectedWalletAddress);
    if (!selectedWallet) {
      setTxSendResult({ success: false, error: 'Selected wallet not found' });
      return;
    }

    setIsSendingTx(true);
    setTxSendResult(null);
    setTxSendStatus('Building transaction...');

    try {
      const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
      const heliusRpc = heliusApiKey
        ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
        : 'https://api.mainnet-beta.solana.com';

      const rpc = createSolanaRpc(heliusRpc);
      const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

      const feePayer = address(selectedWallet.address);
      const instruction = getTransferSolInstruction({
        amount: 1n, // 1 lamport
        destination: feePayer,
        source: createNoopSigner(feePayer),
      });

      const transaction = pipe(
        createTransactionMessage({ version: 0 }),
        (tx: Parameters<typeof setTransactionMessageFeePayer>[1]) =>
          setTransactionMessageFeePayer(feePayer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions([instruction], tx),
        (tx) => compileTransaction(tx)
      );

      const encodedTx = getTransactionEncoder().encode(transaction);

      setTxSendStatus('Calling signAndSendTransaction... Waiting for modal...');

      const modalUiOptions = {
        title: 'Send 1 lamport transaction',
        description: 'Self-transfer test (1 lamport)',
        showWalletUIs: true,
      };

      const result = await signAndSendTransaction({
        transaction: new Uint8Array(encodedTx),
        wallet: selectedWallet,
        options: { uiOptions: modalUiOptions },
      });

      const signature = bs58.encode(result.signature);
      setTxSendResult({ success: true, signature });
      setTxSendStatus('');
    } catch (error) {
      console.error('=== Error Sending Transaction ===', error);
      const message =
        error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      setTxSendResult({ success: false, error: message });
      setTxSendStatus('');
    } finally {
      setIsSendingTx(false);
    }
  };

  if (!solanaWalletsReady) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingSpinner size="lg" />
          <p className="ml-4 text-muted-foreground">Loading wallets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Wallet Test Page</h1>
        <p className="text-muted-foreground">Connected Solana wallets from useSolanaWallets()</p>
      </div>

      {/* Summary */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{embeddedWallets.length}</div>
            <div className="text-sm text-muted-foreground mt-1">Embedded</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{externalWallets.length}</div>
            <div className="text-sm text-muted-foreground mt-1">External</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{solanaWallets.length}</div>
            <div className="text-sm text-muted-foreground mt-1">Total</div>
          </div>
        </div>
        {solanaWallets.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button onClick={fetchAllBalances} variant="outline">
              Refresh All Balances
            </Button>
          </div>
        )}
      </Card>

      {/* Embedded Wallets */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Embedded Wallets {embeddedWallets.length > 0 && `(${embeddedWallets.length})`}
        </h2>
        {embeddedWallets.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No embedded wallets connected
          </p>
        ) : (
          <div className="space-y-4">
            {embeddedWallets.map((wallet) => {
              const balance = getBalance(wallet.address);
              return (
                <div
                  key={wallet.address}
                  className="p-4 rounded-lg border-2 border-green-500/50 bg-green-50 dark:bg-green-950"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-green-900 dark:text-green-100">Embedded</span>
                  </div>
                  <p className="text-sm font-mono break-all mb-3">{wallet.address}</p>
                  <div>
                    <span className="text-sm text-muted-foreground">Balance: </span>
                    {balance?.loading ? (
                      <LoadingSpinner size="sm" className="inline" />
                    ) : balance?.error ? (
                      <span className="text-sm text-destructive">{balance.error}</span>
                    ) : balance?.balance !== undefined ? (
                      <span className="font-semibold">{formatSol(balance.balance)} SOL</span>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => fetchBalance(wallet.address)}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        Check Balance
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* External Wallets */}
      {externalWallets.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            External Wallets ({externalWallets.length})
          </h2>
          <div className="space-y-4">
            {externalWallets.map((wallet) => {
              const balance = getBalance(wallet.address);
              return (
                <div
                  key={wallet.address}
                  className="p-4 rounded-lg border border-border/50 bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">External</span>
                    <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
                      {walletClientLabel(wallet)}
                    </span>
                  </div>
                  <p className="text-sm font-mono break-all mb-3">{wallet.address}</p>
                  <div>
                    <span className="text-sm text-muted-foreground">Balance: </span>
                    {balance?.loading ? (
                      <LoadingSpinner size="sm" className="inline" />
                    ) : balance?.error ? (
                      <span className="text-sm text-destructive">{balance.error}</span>
                    ) : balance?.balance !== undefined ? (
                      <span className="font-semibold">{formatSol(balance.balance)} SOL</span>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => fetchBalance(wallet.address)}
                        className="h-auto py-0 px-2 text-xs"
                      >
                        Check Balance
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Wallet Actions - Message Signing */}
      {solanaWallets.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Wallet Actions</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="wallet-select" className="block text-sm font-medium mb-2">
                Select Wallet
              </label>
              <select
                id="wallet-select"
                value={selectedWalletAddress}
                onChange={(e) => {
                  setSelectedWalletAddress(e.target.value);
                  setSignResult(null);
                  setSignStatus('');
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="">Choose a wallet...</option>
                {solanaWallets.map((wallet) => (
                  <option key={wallet.address} value={wallet.address}>
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                    {embeddedWallets.some((w) => w.address === wallet.address) && ' (Embedded)'}
                    {!embeddedWallets.some((w) => w.address === wallet.address) && walletClientLabel(wallet) !== 'unknown' && ` (${walletClientLabel(wallet)})`}
                  </option>
                ))}
              </select>
              {selectedWalletAddress && (
                <div className="mt-2 p-2 rounded bg-muted text-xs">
                  <p className="font-mono break-all">{selectedWalletAddress}</p>
                  <p className="text-muted-foreground mt-1">
                    Type: {embeddedWallets.some((w) => w.address === selectedWalletAddress) ? 'Embedded' : 'External'}
                    {walletClientLabel(solanaWallets.find((w) => w.address === selectedWalletAddress)) !== 'unknown' && 
                      ` (${walletClientLabel(solanaWallets.find((w) => w.address === selectedWalletAddress))})`
                    }
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="sign-message" className="block text-sm font-medium mb-2">
                Message to Sign
              </label>
              <textarea
                id="sign-message"
                value={signingMessage}
                onChange={(e) => setSigningMessage(e.target.value)}
                placeholder="Enter message to sign..."
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
              />
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleSignMessage}
                disabled={isSigning || !signingMessage.trim() || !selectedWalletAddress}
                className="w-full"
              >
                {isSigning ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Signing... (Check for signing modal)
                  </>
                ) : (
                  'Sign Message'
                )}
              </Button>
              
              {isSigning && (
                <div className="p-3 rounded-lg bg-[var(--azure-radiance-50)] dark:bg-[var(--azure-radiance-950)] border border-[var(--tone-info)]/50">
                  <p className="text-sm text-[var(--azure-radiance-900)] dark:text-[var(--azure-radiance-100)]">
                    <strong>{signStatus || 'Waiting for signature...'}</strong>
                  </p>
                  <p className="text-xs text-[var(--azure-radiance-700)] dark:text-[var(--azure-radiance-300)] mt-1">
                    A signing modal should appear. If no modal appears:
                  </p>
                  <ul className="text-xs text-[var(--azure-radiance-700)] dark:text-[var(--azure-radiance-300)] mt-1 list-disc list-inside space-y-1">
                    <li>Check browser console (F12) for errors or modal detection logs</li>
                    <li>Check if browser popup blocker is enabled</li>
                    <li>Look for Privy iframe/modals in the DOM (inspect element → search for "privy")</li>
                    <li>Try refreshing the page and attempting again</li>
                  </ul>
                </div>
              )}
            </div>

            {signResult && (
              <div
                className={`p-4 rounded-lg ${
                  signResult.success
                    ? 'bg-green-50 dark:bg-green-950 border border-green-500/50'
                    : 'bg-red-50 dark:bg-red-950 border border-red-500/50'
                }`}
              >
                {signResult.success ? (
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      ✅ Message signed successfully
                    </p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-muted-foreground">Signature:</span>
                        <p className="text-sm font-mono break-all mt-1">{signResult.signature}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                      ❌ Signing failed
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">{signResult.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Sign Transaction (1 lamport self-transfer) */}
            <div className="space-y-2 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Sign Transaction (1 lamport self-transfer)</h3>
                <span className="text-xs text-muted-foreground">uses @solana/kit</span>
              </div>
              <Button
                onClick={handleSignTransaction}
                disabled={isSigningTx || !selectedWalletAddress}
                className="w-full"
                variant="secondary"
              >
                {isSigningTx ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Signing transaction... (check modal)
                  </>
                ) : (
                  'Sign 1 lamport transaction'
                )}
              </Button>
              {isSigningTx && (
                <div className="p-3 rounded-lg bg-[var(--azure-radiance-50)] dark:bg-[var(--azure-radiance-950)] border border-[var(--tone-info)]/50 text-sm text-[var(--azure-radiance-900)] dark:text-[var(--azure-radiance-100)]">
                  {txSignStatus || 'Waiting for transaction signature...'}
                </div>
              )}
              {txSignResult && (
                <div
                  className={`p-4 rounded-lg ${
                    txSignResult.success
                      ? 'bg-green-50 dark:bg-green-950 border border-green-500/50'
                      : 'bg-red-50 dark:bg-red-950 border border-red-500/50'
                  }`}
                >
                  {txSignResult.success ? (
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                        ✅ Transaction signed
                      </p>
                      <p className="text-xs text-muted-foreground">Signed tx (base58):</p>
                      <p className="text-sm font-mono break-all mt-1">{txSignResult.signedTx}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                        ❌ Transaction signing failed
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">{txSignResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Send Transaction (1 lamport self-transfer) */}
            <div className="space-y-2 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Send Transaction (1 lamport self-transfer)</h3>
                <span className="text-xs text-muted-foreground">uses @solana/kit + Privy send</span>
              </div>
              <Button
                onClick={handleSendTransaction}
                disabled={isSendingTx || !selectedWalletAddress}
                className="w-full"
                variant="secondary"
              >
                {isSendingTx ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Sending transaction... (check modal)
                  </>
                ) : (
                  'Send 1 lamport transaction'
                )}
              </Button>
              {isSendingTx && (
                <div className="p-3 rounded-lg bg-[var(--azure-radiance-50)] dark:bg-[var(--azure-radiance-950)] border border-[var(--tone-info)]/50 text-sm text-[var(--azure-radiance-900)] dark:text-[var(--azure-radiance-100)]">
                  {txSendStatus || 'Waiting for transaction send...'}
                </div>
              )}
              {txSendResult && (
                <div
                  className={`p-4 rounded-lg ${
                    txSendResult.success
                      ? 'bg-green-50 dark:bg-green-950 border border-green-500/50'
                      : 'bg-red-50 dark:bg-red-950 border border-red-500/50'
                  }`}
                >
                  {txSendResult.success ? (
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                        ✅ Transaction sent
                      </p>
                      <p className="text-xs text-muted-foreground">Signature (base58):</p>
                      <p className="text-sm font-mono break-all mt-1">{txSendResult.signature}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                        ❌ Transaction send failed
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">{txSendResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
